import json
from datetime import datetime, timezone

from shared.opensearch_client import get_client as get_os  #lambda 호출
from shared.dynamodb_client import get_resource as get_dynamo
from shared.config import IDX_RISK, IDX_RAW, PATIENTS_TABLE

# Lambda 외부 초기화 (재사용)
os_client = get_os()
dynamodb = get_dynamo()


def lambda_handler(event, context):
    method = event['httpMethod']
    path = event['path']
    path_params = event.get('pathParameters') or {}
    query_params = event.get('queryStringParameters') or {}

    try:
        if method == 'GET' and '/doctor/patients' in path:
            sort = query_params.get('sort', 'risk')
            doctor_id = query_params.get('doctor_id')
            return resp(200, get_patient_list(sort, doctor_id))
        elif method == 'GET' and '/timeseries' in path:
            patient_id = path_params.get('id')
            range_type = query_params.get('range', 'daily')
            return resp(200, get_timeseries(patient_id, range_type))
        else:
            return resp(404, {'error': 'Not found'})
    except Exception as e:
        return resp(500, {'error': str(e)})


# get_patient_list : 환자 목록을 위험도 순으로 정렬할 수 있게 ---------------------------------------------------------------
def get_patient_list(sort: str, doctor_id: str | None) -> dict:
    """
    risk-status 인덱스에서 전체 환자 조회 후 DynamoDB에서 인구통계 합산.
    sort='risk'이면 위험도순, 아니면 patient_id순.
    """
    query: dict = {
        'query': {'match_all': {}},
        'size': 200,
    }

    if sort == 'risk':
        query['sort'] = [{'risk_score': {'order': 'desc'}}]
    else:
        query['sort'] = [{'patient_id.keyword': {'order': 'asc'}}]

    result = os_client.search(index=IDX_RISK, body=query)
    hits = result['hits']['hits']

    # DynamoDB batch_get_item 으로 인구통계 한번에 가져오기
    patient_ids = [h['_source'].get('patient_id') for h in hits if h['_source'].get('patient_id')]
    dynamo_map = {}

    for i in range(0, len(patient_ids), 100):
        batch_keys = patient_ids[i:i + 100]
        response = dynamodb.batch_get_item(
            RequestItems={
                PATIENTS_TABLE: {
                    'Keys': [{'patient_id': pid} for pid in batch_keys]
                }
            }
        )
        for item in response['Responses'].get(PATIENTS_TABLE, []):
            dynamo_map[item['patient_id']] = item

    patients = []
    for hit in hits:
        src = hit['_source']
        risk_score = src.get('risk_score', 0)
        pid = src.get('patient_id')
        dyn = dynamo_map.get(pid, {})

        if risk_score >= 60:
            risk_level = 'high'
        elif risk_score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        patients.append({
            'patient_id': pid,
            'gender': dyn.get('gender'),
            'age': dyn.get('age'),
            'hba1c_pct': dyn.get('hba1c_pct'),
            'risk_score': risk_score,
            'risk_level': risk_level,
            'latest_glucose': src.get('latest_glucose'),
            'tir': src.get('tir'),
            'anomaly_count': src.get('anomaly_count', 0),
            'last_updated': src.get('last_updated'),
        })

    return {'patients': patients, 'total': len(patients)}


# 혈당 시계열 데이터 : 의사가 환자 목록에서 환자를 클릭하면 혈당 그래프를 보여주는 함수 / 환자 상세 정보에서 보여주는 혈당 그래프를 보여주는 부분이라고 생각하면 됨 
def get_timeseries(patient_id: str, range_type: str) -> dict:
    """
    range_type='daily' → 오늘 하루치 (288포인트 이하)
    range_type='max'   → 전체 가용 데이터 (최대 30일)
    프론트엔드가 Recharts로 직접 시각화.
    """
    
    # 하루 치 
    if range_type == 'daily':
        today = datetime.now(timezone.utc).date().isoformat()
        time_filter = {
            'gte': f'{today}T00:00:00Z',
            'lte': f'{today}T23:59:59Z',
        }
        size = 100  # 15분 간격 최대 96개/일
    else: #daliy 가 아니라면 그냥 측정된 환자의 최대 일수만큼의 그래프를 보여줌 
        time_filter = {'gte': 'now-30d'}
        size = 10000

    query = {
        'query': {
            'bool': {
                'must': [
                    {'term': {'patient_id': patient_id}},
                    {'range': {'timestamp': time_filter}},
                ]
            }
        },
        'sort': [{'timestamp': {'order': 'asc'}}],
        'size': size,
    }

    result = os_client.search(index=IDX_RAW, body=query)
    timeseries = [
        {'time': h['_source']['timestamp'], 'glucose': h['_source']['glucose']}
        for h in result['hits']['hits']
    ]

    return {
        'patient_id': patient_id,
        'range': range_type,
        'timeseries': timeseries,
        'count': len(timeseries),
    }


def resp(status: int, body: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }
