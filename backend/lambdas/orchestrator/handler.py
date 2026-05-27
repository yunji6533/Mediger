import json
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key as DDBKey

from shared.opensearch_client import get_client as get_os
from shared.dynamodb_client import get_table
from shared.bedrock_client import get_runtime, get_agent
from shared.config import (
    IDX_RAW, IDX_DAILY, IDX_ALERT, IDX_RISK,
    BEDROCK_MODEL_ID, BEDROCK_KB_ID,
    PATIENTS_TABLE, PRESCRIPTIONS_TABLE, DOCTOR_NOTES_TABLE,
    VERY_LOW, LOW, HIGH, VERY_HIGH,
    DOCTOR_SYSTEM_PROMPT,
)

# Lambda 외부 초기화 (재사용)
os_client = get_os()
bedrock_rt = get_runtime()
bedrock_ag = get_agent()


# lambda_handler : path 끝으로 분기해서 용도에 따른 resp 호출 ------------------------------------------------------------
def lambda_handler(event, context):
    path = event['path']
    path_params = event.get('pathParameters') or {}
    patient_id = path_params.get('id')

    try:
        if path.endswith('/pattern'):
            return resp(200, get_pattern_report(patient_id))
        elif path.endswith('/anomaly'):
            return resp(200, get_anomaly_report(patient_id))
        elif path.endswith('/recommendation'):
            return resp(200, get_recommendation_report(patient_id))
        # 프론트엔드 /patients/{id}/recommendations 경로 (단순 Recommendation[] 포맷)
        elif path.endswith('/recommendations'):
            return resp(200, get_recommendations_simple(patient_id))
        else:
            return resp(404, {'error': 'Not found'})
    except Exception as e:
        return resp(500, {'error': str(e)})


# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# AI 보고서 1: 혈당 패턴 분석 (Opensearch DB 에서 24시간 집계 -> LLM에게 해석을 요청하고 -> 결과 반환 ) / 계산은 opensearch가, 해석은 LLM이 
# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def get_pattern_report(patient_id: str) -> dict:
    # 24시간대별 혈당 패턴 집계 (최근 14일)
    hourly_query = {
        'query': {
            'bool': {
                'must': [
                    {'term': {'patient_id': patient_id}},
                    {'range': {'timestamp': {'gte': 'now-14d'}}},
                ]
            }
        },
        'aggs': {  # 집계하는 부분
            'by_hour': {
                'terms': {
                    'script': "doc['timestamp'].value.getHour()",
                    'size': 24,
                    'order': {'_key': 'asc'},
                },
                'aggs': {
                    'avg_glucose': {'avg': {'field': 'glucose'}}, # 시간대별 평균 혈당 
                    'hypo_count': {'filter': {'range': {'glucose': {'lt': LOW}}}}, # 시간대별 저혈당 횟수
                    'hyper_count': {'filter': {'range': {'glucose': {'gt': HIGH}}}}, # 시간대벼 ㄹ고혈당 횟수 
                },
            }
        },
        'size': 0,
    }

    result = os_client.search(index=IDX_RAW, body=hourly_query)
    buckets = result['aggregations']['by_hour']['buckets']

    # 해당 쿼리로부터의 output
    hourly_pattern = [
        {
            'hour': b['key'],
            'avg_glucose': round(b['avg_glucose']['value'] or 0, 1),
            'hypo_count': b['hypo_count']['doc_count'],
            'hyper_count': b['hyper_count']['doc_count'],
        }
        for b in buckets
    ]

    prompt = f"""환자 ID: {patient_id}
최근 14일 시간대별 혈당 패턴 (시간 | 평균혈당 | 저혈당횟수 | 고혈당횟수):
{json.dumps(hourly_pattern, ensure_ascii=False)}

위 데이터에서 임상적으로 주목할 패턴을 분석해주세요.
- 위험 시간대 식별
- 패턴의 가능한 임상적 원인 (ADA/KDA 가이드라인 근거)
- 의사가 우선 확인해야 할 사항

형식: 패턴요약 / 임상의미 / 권고사항 / 출처"""

    analysis = _call_llm(prompt)

    return {
        'patient_id': patient_id,
        'hourly_pattern': hourly_pattern,  # 프론트엔드가 그래프로 시각화
        'analysis': analysis['text'],
        'sources': analysis['sources'],
    }


# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# AI 보고서 2: 이상치 분석 (alert-log에서 이벤트를 조회 -> 저혈당과 고혈당을 분리 -> 각각 LLM 해석을 요청 )
# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def get_anomaly_report(patient_id: str) -> dict:
    try:
        alert_query = {
            'query': {
                'bool': {
                    'must': [
                        {'term': {'patient_id': patient_id}},
                        {'range': {'timestamp': {'gte': 'now-14d'}}},
                    ]
                }
            },
            'sort': [{'timestamp': {'order': 'desc'}}],
            'size': 100,
        }
        result = os_client.search(index=IDX_ALERT, body=alert_query)
        alerts = [h['_source'] for h in result['hits']['hits']]
    except Exception:
        # alert-log 인덱스가 없으면 glucose-raw에서 임계값 기반으로 이상치 계산
        raw_query = {
            'query': {
                'bool': {
                    'must': [
                        {'term': {'patient_id': patient_id}},
                        {'range': {'timestamp': {'gte': 'now-14d'}}},
                        {'bool': {
                            'should': [
                                {'range': {'glucose': {'lt': LOW}}},
                                {'range': {'glucose': {'gt': HIGH}}},
                            ]
                        }},
                    ]
                }
            },
            'sort': [{'timestamp': {'order': 'desc'}}],
            'size': 100,
        }
        raw_result = os_client.search(index=IDX_RAW, body=raw_query)
        alerts = []
        for h in raw_result['hits']['hits']:
            src = h['_source']
            g = src.get('glucose', 0)
            if g < VERY_LOW:
                alert_type = 'very_low'
            elif g < LOW:
                alert_type = 'low'
            elif g > VERY_HIGH:
                alert_type = 'very_high'
            else:
                alert_type = 'high'
            alerts.append({**src, 'alert_type': alert_type})

    hypo_events = [a for a in alerts if a.get('alert_type') in ('low', 'very_low')]
    hyper_events = [a for a in alerts if a.get('alert_type') in ('high', 'very_high')]

    hypo_analysis = None
    hyper_analysis = None

    if hypo_events:
        prompt = f"""환자 ID: {patient_id}
저혈당 이벤트 목록 ({len(hypo_events)}건):
{json.dumps(hypo_events[:10], ensure_ascii=False, default=str)}

저혈당 패턴 분석:
- 발생 시간대 패턴
- Somogyi 효과 또는 새벽현상 가능성
- 임상적 의미 및 대응 방안 (ADA/KDA 가이드라인 근거 인용)"""
        hypo_analysis = _call_llm(prompt) # event가 있을 때만 llm을 호출

    if hyper_events:
        prompt = f"""환자 ID: {patient_id}
고혈당 이벤트 목록 ({len(hyper_events)}건):
{json.dumps(hyper_events[:10], ensure_ascii=False, default=str)}

고혈당 패턴 분석:
- 발생 시간대 패턴
- 식후 고혈당 vs 공복 고혈당 구분
- 임상적 의미 및 대응 방안 (ADA/KDA 가이드라인 근거 인용)"""
        hyper_analysis = _call_llm(prompt)

    return {
        'patient_id': patient_id,
        'hypo': {
            'events': hypo_events,
            'count': len(hypo_events),
            'analysis': hypo_analysis['text'] if hypo_analysis else None,
            'sources': hypo_analysis['sources'] if hypo_analysis else [],
        },
        'hyper': {
            'events': hyper_events,
            'count': len(hyper_events),
            'analysis': hyper_analysis['text'] if hyper_analysis else None,
            'sources': hyper_analysis['sources'] if hyper_analysis else [],
        },
    }


# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# AI 보고서 3: 처방 우선순위 (RAG 기반) (DynamoDB에서 환자 현재 정보 불러옴 / Opensearch에서 최신 TIR, TBR, TAR 정보를 불러옴 / BEDROCK KB에서 가이드 라인 검색 -> LLM은 약물 우선순위 결정 , BEDROCK KB 에서 약물별 효과 별도 검색)
# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def get_recommendation_report(patient_id: str) -> dict:
    # 1. DynamoDB에서 환자 정보 및 최근 처방 조회
    patient = get_table(PATIENTS_TABLE).get_item(
        Key={'patient_id': patient_id}
    ).get('Item', {})

    prescriptions = get_table(PRESCRIPTIONS_TABLE).query(
        KeyConditionExpression=DDBKey('patient_id').eq(patient_id),
        ScanIndexForward=False,
        Limit=5,
    ).get('Items', [])

    # 2. OpenSearch risk-status에서 최신 임상 지표 조회
    try:
        risk_doc = os_client.get(index=IDX_RISK, id=patient_id)
        latest = risk_doc['_source']
    except Exception:
        latest = {}

    patient_context = {
        'patient_id': patient_id,
        'age': patient.get('age'),
        'gender': patient.get('gender'),
        'hba1c': patient.get('hba1c'),
        'complications': patient.get('complications', []),
        'current_medications': [p.get('drug') for p in prescriptions],
        'tir': latest.get('tir'),
        'avg_glucose': latest.get('avg_glucose'),
        'tbr': latest.get('tbr'),
        'tar': latest.get('tar'),
    }

    # 3. RAG: 가이드라인 청크 검색 (LLM이 자유 생성 못 하게 근거 제공)
    rag_query = (
        f"2형 당뇨 약물 치료 "
        f"HbA1c {patient.get('hba1c', '')} "
        f"합병증 {patient.get('complications', '')}"
    )
    kb_result = _retrieve_from_kb(rag_query)

    # 4. LLM: 약물 우선순위만 (정량 추정 금지, 출처 강제)
    prompt = f"""환자 정보:
{json.dumps(patient_context, ensure_ascii=False, default=str)}

참고 가이드라인 청크:
{kb_result['text']}

위 가이드라인에 명시된 내용만을 기반으로 약물 추가 옵션 4개 우선순위를 제시해주세요.
가이드라인에 없는 정량 수치는 절대 추정하지 마세요.

형식 (반드시 준수):
1순위: [약물명/계열] - [근거: 가이드라인 출처]
2순위: [약물명/계열] - [근거: 가이드라인 출처]
3순위: [약물명/계열] - [근거: 가이드라인 출처]
4순위: [약물명/계열] - [근거: 가이드라인 출처]

주의: 처방 최종 결정은 반드시 담당 의사가 합니다."""
# 할루시에이션 방지 
    llm_result = _call_llm(prompt)

    # 5. 약물 계열별 정량 효과 데이터: LLM 아님, KB에서 별도 검색
    # 프론트엔드가 이 데이터로 처방 시나리오 비교 그래프 생성
    drug_effects = []
    for drug_class in ['SGLT-2 억제제', 'GLP-1 수용체 작용제', 'DPP-4 억제제', '메트포르민', '인슐린']:
        effect = _retrieve_from_kb(f"{drug_class} HbA1c 감소 효과 임상 데이터")
        if effect['text']:
            drug_effects.append({
                'drug_class': drug_class,
                'effect_summary': effect['text'][:300],
                'sources': effect['sources'],
            })

    return {
        'patient_id': patient_id,
        'patient_context': patient_context,
        'recommendation': {
            'text': llm_result['text'],
            'sources': llm_result['sources'] + kb_result['sources'],
        },
        'drug_effects': drug_effects,
        'disclaimer': '이 권고안은 의사의 임상적 판단을 보조하는 목적으로만 사용하며, 최종 처방 결정은 담당 의사가 합니다.',
    }


# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# LLM 호출 
# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def _call_llm(user_prompt: str) -> dict:
    request_body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 1024,
        'system': DOCTOR_SYSTEM_PROMPT,
        'messages': [{'role': 'user', 'content': user_prompt}],
    }

    response = bedrock_rt.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(request_body),
        contentType='application/json',
        accept='application/json',
    )

    result = json.loads(response['body'].read())
    text = result['content'][0]['text']

    # 응답 텍스트에서 출처 태그 추출
    sources = []
    if 'ADA' in text:
        sources.append({'title': 'ADA Standards of Care 2024', 'section': 'ADA'})
    if 'KDA' in text or '대한당뇨병학회' in text:
        sources.append({'title': '대한당뇨병학회 진료지침 2023', 'section': 'KDA'})

    return {'text': text, 'sources': sources}

# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# RAG 검색 헬퍼 
# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def _retrieve_from_kb(query: str) -> dict:
    if not BEDROCK_KB_ID:
        return {'text': '', 'sources': []}

    response = bedrock_ag.retrieve(
        knowledgeBaseId=BEDROCK_KB_ID,
        retrievalQuery={'text': query},
        retrievalConfiguration={
            'vectorSearchConfiguration': {'numberOfResults': 5}
        },
    )

    chunks = response.get('retrievalResults', [])
    text = '\n\n'.join(c['content']['text'] for c in chunks)
    sources = [
        {
            'title': c.get('location', {}).get('s3Location', {}).get('uri', ''),
            'score': round(c.get('score', 0), 3),
        }
        for c in chunks
    ]

    return {'text': text, 'sources': sources}


# ── 처방 추천 단순 포맷 (프론트엔드 Recommendation[] 타입에 맞춤) ──────────────

def get_recommendations_simple(patient_id: str) -> list:
    full = get_recommendation_report(patient_id)
    text = full['recommendation']['text']
    sources = full['recommendation']['sources']

    # "N순위: [약물명] - [근거: ...]" 형태 파싱
    lines = [l.strip() for l in text.split('\n') if '순위:' in l]
    recommendations = []
    for i, line in enumerate(lines[:4]):
        parts = line.split(' - ', 1)
        drug_part = parts[0].split(':', 1)[-1].strip() if ':' in parts[0] else parts[0].strip()
        desc_part = parts[1].strip() if len(parts) > 1 else drug_part
        source_info = sources[i] if i < len(sources) else {}
        recommendations.append({
            'rank': i + 1,
            'source': source_info.get('title', 'ADA Standards of Care 2024'),
            'description': desc_part,
        })

    return recommendations


def resp(status: int, body) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }
