import json
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key as DDBKey

from shared.opensearch_client import get_client as get_os
from shared.dynamodb_client import get_resource as get_dynamo, get_table
from shared.config import (
    IDX_RAW, IDX_DAILY, IDX_ALERT, IDX_RISK,
    PATIENTS_TABLE, PRESCRIPTIONS_TABLE,
    VERY_LOW, LOW, HIGH, VERY_HIGH,
)

os_client = get_os()
dynamodb = get_dynamo()


def lambda_handler(event, context):
    method = event['httpMethod']
    path = event['path']
    path_params = event.get('pathParameters') or {}
    query_params = event.get('queryStringParameters') or {}
    patient_id = path_params.get('id')

    try:
        # GET /patients
        if method == 'GET' and path.rstrip('/').endswith('/patients'):
            sort = query_params.get('sort', 'risk')
            doctor_id = query_params.get('doctor_id')
            return resp(200, get_patient_list(sort, doctor_id))

        # GET /dashboard/summary
        elif method == 'GET' and path.endswith('/dashboard/summary'):
            return resp(200, get_dashboard_summary())

        # GET /patients/{id}/glucose/day
        elif method == 'GET' and '/glucose/day' in path:
            return resp(200, get_timeseries(patient_id, 'daily'))

        # GET /patients/{id}/glucose/week
        elif method == 'GET' and '/glucose/week' in path:
            return resp(200, get_weekly_summary(patient_id))

        # GET /patients/{id}/glucose/multiday
        elif method == 'GET' and '/glucose/multiday' in path:
            return resp(200, get_timeseries(patient_id, 'max'))

        # GET /patients/{id}/alerts/threshold  (threshold 먼저 체크)
        elif method == 'GET' and '/alerts/threshold' in path:
            return resp(200, get_threshold_alerts(patient_id))

        # GET /patients/{id}/alerts
        elif method == 'GET' and path.endswith('/alerts'):
            return resp(200, get_alerts(patient_id))

        # GET /patients/{id}/patterns
        elif method == 'GET' and path.endswith('/patterns'):
            return resp(200, get_patterns(patient_id))

        # GET /patients/{id}/rx/history
        elif method == 'GET' and '/rx/history' in path:
            return resp(200, get_rx_history(patient_id))

        # GET /patients/{id}  (서브경로보다 마지막에 체크)
        elif method == 'GET' and patient_id:
            return resp(200, get_patient_detail(patient_id))

        else:
            return resp(404, {'error': 'Not found'})

    except Exception as e:
        return resp(500, {'error': str(e)})


# ── 환자 목록 ──────────────────────────────────────────────────────────────

def get_patient_list(sort: str, doctor_id: str | None) -> list:
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

        last_data_at = src.get('last_updated')
        patients.append({
            'patientId': pid,
            'name': dyn.get('name'),
            'age': dyn.get('age'),
            'gender': dyn.get('gender'),
            'hba1c': dyn.get('hba1c_pct'),
            'riskScore': risk_score,
            'riskLevel': risk_level,
            'latestGlucose': src.get('latest_glucose'),
            'tir': src.get('tir'),
            'tar': src.get('tar'),
            'tbr': src.get('tbr'),
            'alertCount24h': src.get('anomaly_count', 0),
            'lastDataAt': last_data_at,
            'dataStatus': 'active' if last_data_at else 'missing',
        })

    return patients


# ── 대시보드 요약 ───────────────────────────────────────────────────────────

def get_dashboard_summary() -> dict:
    result = os_client.search(
        index=IDX_RISK,
        body={
            'query': {'match_all': {}},
            'size': 0,
            'aggs': {
                'high_risk': {'filter': {'range': {'risk_score': {'gte': 60}}}},
                'total_anomalies': {'sum': {'field': 'anomaly_count'}},
            },
        }
    )
    aggs = result['aggregations']
    return {
        'totalPatients': result['hits']['total']['value'],
        'highRiskCount': aggs['high_risk']['doc_count'],
        'alertCount24h': int(aggs['total_anomalies']['value'] or 0),
        'pendingSummaryCount': 0,
    }


# ── 환자 상세 ──────────────────────────────────────────────────────────────

def get_patient_detail(patient_id: str) -> dict:
    patient = get_table(PATIENTS_TABLE).get_item(
        Key={'patient_id': patient_id}
    ).get('Item', {})

    daily_result = os_client.search(
        index=IDX_DAILY,
        body={
            'query': {'term': {'patient_id': patient_id}},
            'sort': [{'date': {'order': 'desc'}}],
            'size': 1,
        }
    )
    daily_hits = daily_result['hits']['hits']
    d = daily_hits[0]['_source'] if daily_hits else {}

    trend_result = os_client.search(
        index=IDX_DAILY,
        body={
            'query': {
                'bool': {
                    'must': [
                        {'term': {'patient_id': patient_id}},
                        {'range': {'date': {'gte': 'now-7d'}}},
                    ]
                }
            },
            'size': 7,
        }
    )
    trend_hits = trend_result['hits']['hits']
    avg_tir = (
        sum(h['_source'].get('tir', 0) for h in trend_hits) / len(trend_hits)
        if trend_hits else 0
    )

    return {
        'patientInfo': {
            'patientId': patient_id,
            'name': patient.get('name'),
            'age': patient.get('age'),
            'gender': patient.get('gender'),
            'diagnosis': patient.get('diagnosis', '2형 당뇨'),
            'registeredAt': patient.get('registered_at', ''),
        },
        'dailySummary': {
            'date': d.get('date', ''),
            'avgGlucose': d.get('avg_glucose', 0),
            'tir': d.get('tir', 0),
            'tar': d.get('tar', 0),
            'tbr': d.get('tbr', 0),
            'cv': d.get('cv', 0),
            'minGlucose': d.get('min_glucose', 0),
            'maxGlucose': d.get('max_glucose', 0),
        },
        'trendSummary': {
            'period': '7d',
            'avgGlucose': d.get('avg_glucose', 0),
            'tir': round(avg_tir, 1),
            'tar': d.get('tar', 0),
            'tbr': d.get('tbr', 0),
            'cv': d.get('cv', 0),
            'trend': 'stable',
        },
    }


# ── 혈당 시계열 ─────────────────────────────────────────────────────────────

def get_timeseries(patient_id: str, range_type: str) -> list:
    if range_type == 'daily':
        today = datetime.now(timezone.utc).date().isoformat()
        time_filter = {
            'gte': f'{today}T00:00:00Z',
            'lte': f'{today}T23:59:59Z',
        }
        size = 100
    else:
        time_filter = {'gte': 'now-30d'}
        size = 10000

    result = os_client.search(
        index=IDX_RAW,
        body={
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
    )
    return [
        {'time': h['_source']['timestamp'], 'value': h['_source']['glucose']}
        for h in result['hits']['hits']
    ]


# ── 주간 요약 ──────────────────────────────────────────────────────────────

def get_weekly_summary(patient_id: str) -> list:
    result = os_client.search(
        index=IDX_DAILY,
        body={
            'query': {
                'bool': {
                    'must': [
                        {'term': {'patient_id': patient_id}},
                        {'range': {'date': {'gte': 'now-7d'}}},
                    ]
                }
            },
            'sort': [{'date': {'order': 'asc'}}],
            'size': 7,
        }
    )
    return [
        {
            'date': h['_source']['date'],
            'avg': h['_source'].get('avg_glucose', 0),
            'min': h['_source'].get('min_glucose', 0),
            'max': h['_source'].get('max_glucose', 0),
            'tir': h['_source'].get('tir', 0),
        }
        for h in result['hits']['hits']
    ]


# ── 알림 로그 ──────────────────────────────────────────────────────────────

def get_alerts(patient_id: str) -> list:
    try:
        result = os_client.search(
            index=IDX_ALERT,
            body={
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
        )
        alerts = []
        for h in result['hits']['hits']:
            src = h['_source']
            glucose = src.get('glucose', 0)
            alert_type = src.get('alert_type', '')
            if glucose < VERY_LOW or glucose > VERY_HIGH:
                severity = 'severe'
            elif glucose < LOW or glucose > HIGH:
                severity = 'moderate'
            else:
                severity = 'mild'
            alerts.append({
                'id': h['_id'],
                'patientId': patient_id,
                'timestamp': src.get('timestamp'),
                'type': 'hypo' if 'low' in alert_type else 'hyper',
                'severity': severity,
                'value': glucose,
                'message': src.get('message', ''),
            })
        return alerts
    except Exception:
        return []


# ── 임계치 초과 이벤트 ─────────────────────────────────────────────────────

def get_threshold_alerts(patient_id: str) -> list:
    result = os_client.search(
        index=IDX_RAW,
        body={
            'query': {
                'bool': {
                    'must': [
                        {'term': {'patient_id': patient_id}},
                        {'range': {'timestamp': {'gte': 'now-30d'}}},
                        {'bool': {'should': [
                            {'range': {'glucose': {'lt': 70}}},
                            {'range': {'glucose': {'gt': 180}}},
                        ]}},
                    ]
                }
            },
            'sort': [{'timestamp': {'order': 'desc'}}],
            'size': 200,
        }
    )
    events = []
    for h in result['hits']['hits']:
        src = h['_source']
        ts = src.get('timestamp', '')
        events.append({
            'date': ts[:10],
            'time': ts[11:16] if len(ts) > 10 else '',
            'value': src['glucose'],
            'type': 'hypo' if src['glucose'] < 70 else 'hyper',
        })
    return events


# ── 패턴 로그 ──────────────────────────────────────────────────────────────

def get_patterns(patient_id: str) -> list:
    try:
        result = os_client.search(
            index=IDX_ALERT,
            body={
                'query': {
                    'bool': {
                        'must': [
                            {'term': {'patient_id': patient_id}},
                            {'range': {'timestamp': {'gte': 'now-14d'}}},
                        ]
                    }
                },
                'sort': [{'timestamp': {'order': 'desc'}}],
                'size': 50,
            }
        )
        return [
            {
                'id': h['_id'],
                'patientId': patient_id,
                'timestamp': h['_source'].get('timestamp'),
                'patternType': h['_source'].get('pattern_type', 'high_glucose_variability'),
                'severity': h['_source'].get('severity', 'medium'),
                'value': h['_source'].get('glucose'),
            }
            for h in result['hits']['hits']
        ]
    except Exception:
        return []


# ── 처방 이력 ──────────────────────────────────────────────────────────────

def get_rx_history(patient_id: str) -> list:
    try:
        response = get_table(PRESCRIPTIONS_TABLE).query(
            KeyConditionExpression=DDBKey('patient_id').eq(patient_id),
            ScanIndexForward=False,
            Limit=20,
        )
        history = []
        for item in response.get('Items', []):
            drugs = item.get('drugs', [])
            prescriptions = [
                {
                    'id': d.get('id', ''),
                    'drug': d.get('drug', ''),
                    'dose': d.get('dose', ''),
                    'frequency': d.get('frequency', ''),
                    'route': d.get('route', 'oral'),
                    'startDate': d.get('start_date', item.get('prescription_date', '')),
                    'endDate': d.get('end_date'),
                }
                for d in drugs
            ]
            history.append({
                'changedAt': item.get('prescription_date', ''),
                'prescriptions': prescriptions,
                'note': item.get('note'),
            })
        return history
    except Exception:
        return []


# ── 응답 포맷 ──────────────────────────────────────────────────────────────

def resp(status: int, body) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }
