import json
from datetime import datetime, timezone

from shared.opensearch_client import get_client as get_os
from shared.dynamodb_client import get_table
from shared.config import (
    IDX_RAW, IDX_DAILY, IDX_ALERT,
    VERY_LOW, LOW, HIGH, VERY_HIGH,
    PATIENTS_TABLE,
)

# Lambda 외부 초기화 (재사용) : Lambda 컨테이너 연결에 사용 
os_client = get_os()


# lambda_handler : API Gateway가 lambda 호출할 때 event 변수에 호출 정보(HTTP) 정보를 담아 줌 ----------------------------------
def lambda_handler(event, context):
    method = event['httpMethod']
    path = event['path']
    path_params = event.get('pathParameters') or {}
    patient_id = path_params.get('id')

    try:
        if method == 'GET' and path.endswith('/today'):
            return resp(200, get_today(patient_id))
        elif method == 'POST' and path.endswith('/input'):
            body = json.loads(event.get('body') or '{}')
            return resp(200, post_input(patient_id, body))
        elif method == 'GET' and path.endswith('/metrics'):
            return resp(200, get_metrics(patient_id))
        else:
            return resp(404, {'error': 'Not found'})
    except Exception as e:
        return resp(500, {'error': str(e)})

# get_today : 당일(하루, 오늘) 혈당 시계열 ------------------------------------------------------------------------------------
def get_today(patient_id: str) -> dict:
    today = datetime.now(timezone.utc).date().isoformat() # 날짜 형태를 '2026-05-08'형태로 불러옴 
    # Opensearch 쿼리 
    query = {
        'query': {
            'bool': {
                'must': [
                    {'term': {'patient_id': patient_id}}, # 환자 특정
                    {'range': {'timestamp': {             # 날짜를 오늘로 특정
                        'gte': f'{today}T00:00:00Z',
                        'lte': f'{today}T23:59:59Z',
                    }}},
                ]
            }
        },
        'sort': [{'timestamp': {'order': 'asc'}}],
        'size': 100,  # 15분 간격 최대 96개/일
    }

    result = os_client.search(index=IDX_RAW, body=query)
    hits = result['hits']['hits']

    timeseries = [  # 그래프 그림 부분 
        {'time': h['_source']['timestamp'], 'glucose': h['_source']['glucose']}
        for h in hits 
    ]
    current = timeseries[-1]['glucose'] if timeseries else None #가장 최근 혈당값

    alert = _classify_alert(current) #경고 여부 판단

    return {'timeseries': timeseries, 'current': current, 'alert': alert, 'date': today}


# post_input : 환자의 수기 입력 저장 부분 -------------------------------------------------------------------------------
def post_input(patient_id: str, body: dict) -> dict:
    doc = {
        'patient_id': patient_id,
        'timestamp': body.get('time', datetime.now(timezone.utc).isoformat()), # 입력 시간 (없으면 지금으로)
        'glucose': float(body['glucose']), #혈당값
        'device_id': 'manual', # '수기 입력' 설정 방식 
        'input_type': body.get('type', 'glucose'),
    }
    os_client.index(index=IDX_RAW, body=doc) #Opensearch DB에 저장 (혈당 수치니까 기기로부터 측정되는 시계열 데이터에 추가되어야 함 따라서 Opensearch에 저장돼야)
    return {'success': True, 'recorded': doc}


# get_metrics : TIR/TAR/TBR 지표 --------------------------------------------------------------------------------------
def get_metrics(patient_id: str) -> dict:
    # 총 두 가지를 조회함 
    # 1) daily-summary index 에서 최근 7일 요약본을 얻어옴 
    # 2) alert-log에서 최근 7일 이상치를 얻어옴 
    
    # 1) 최근 7일 요약본 불러오기 
    summary_query = {
        'query': {'term': {'patient_id': patient_id}},
        'sort': [{'date': {'order': 'desc'}}],
        'size': 7,
    }
    summary_result = os_client.search(index=IDX_DAILY, body=summary_query)
    summaries = [h['_source'] for h in summary_result['hits']['hits']]
    latest = summaries[0] if summaries else {} # 가장 최근 날짜를 조회하여 tir, tar, tbr, 혈당 평균을 꺼냄

    # 2) 최근 7일 이상치 
    alert_query = {
        'query': {
            'bool': {
                'must': [
                    {'term': {'patient_id': patient_id}},
                    {'range': {'timestamp': {'gte': 'now-7d'}}},
                ]
            }
        },
        'sort': [{'timestamp': {'order': 'desc'}}],
        'size': 50,
    }
    alert_result = os_client.search(index=IDX_ALERT, body=alert_query)
    anomalies = [h['_source'] for h in alert_result['hits']['hits']]

    return {
        'tir': latest.get('tir', 0),
        'tar': latest.get('tar', 0),
        'tbr': latest.get('tbr', 0),
        'avg_glucose': latest.get('avg_glucose', 0),
        'std_glucose': latest.get('std_glucose', 0),
        'gmi': latest.get('gmi', 0),
        'cv': latest.get('cv', 0),
        'weekly_summaries': summaries,
        'anomalies': anomalies,
    }


# _classify_alert : 혈당 경고 분류 -> config에서 기준치 설정해둠 --------------------------------------------------------------
def _classify_alert(glucose) -> dict | None:
    if glucose is None:
        return None
    if glucose < VERY_LOW:
        return {'level': 'critical', 'type': 'very_low', 'message': '매우 심각한 저혈당입니다. 즉시 조치가 필요합니다.'}
    if glucose < LOW:
        return {'level': 'warning', 'type': 'low', 'message': '저혈당 주의가 필요합니다.'}
    if glucose > VERY_HIGH:
        return {'level': 'critical', 'type': 'very_high', 'message': '매우 심각한 고혈당입니다.'}
    if glucose > HIGH:
        return {'level': 'warning', 'type': 'high', 'message': '고혈당 주의가 필요합니다.'}
    return None


# resp : lambda 응답 포맷 (오류 방지) --------------------------------------------------------------------------------------
def resp(status: int, body: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }
