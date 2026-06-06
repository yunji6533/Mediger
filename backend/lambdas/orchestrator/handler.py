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
from rules import match_rules, H_QUERY_MAP, H_LABELS, rank_to_text

# Lambda 외부 초기화 (재사용)
os_client = get_os()
bedrock_rt = get_runtime()
bedrock_ag = get_agent()

_DRUG_EFFECTS_CACHE = None   # 환자 무관 정적 데이터: 컨테이너당 1회만 KB 조회


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
    # 24시간대별 혈당 패턴 집계 (최근 14일) — recommendation과 공유 헬퍼 사용
    hourly_pattern = _fetch_hourly_pattern(patient_id)

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

    # 2.5 혈당 패턴 → 규칙 기반 감별 가설(서열) + 이상치 건수(합산 도출)
    hourly_pattern = _fetch_hourly_pattern(patient_id)
    rule_result = match_rules(hourly_pattern)
    ranked = rule_result['ranked_hypotheses']
    matched_rule_ids = rule_result['matched_rule_ids']
    hypo_count = sum(b['hypo_count'] for b in hourly_pattern)
    hyper_count = sum(b['hyper_count'] for b in hourly_pattern)

    # 3. RAG: 가이드라인 청크 검색 (LLM이 자유 생성 못 하게 근거 제공)
    #    1순위 감별 가설 키워드로 쿼리를 정밀화
    top_keyword = H_QUERY_MAP.get(ranked[0], '') if ranked else ''
    rag_query = (
        f"2형 당뇨 약물 치료 {top_keyword} "
        f"HbA1c {patient.get('hba1c', '')} "
        f"합병증 {patient.get('complications', '')}"
    )
    kb_result = _retrieve_from_kb(rag_query)

    # 4. LLM: 약물 우선순위만 (정량 추정 금지, 출처 강제)
    #    감별 가설은 '어떤 문제를 우선 볼지' 맥락으로만 — 약물·수치는 가이드라인에서만
    pattern_context = ""
    if ranked:
        pattern_context = (
            f"\n혈당 패턴 감별 가설 (규칙 기반, 유력 순): {rank_to_text(ranked)}\n"
            f"이상치 요약 (최근 14일): 저혈당 {hypo_count}건 / 고혈당 {hyper_count}건\n"
        )

    prompt = f"""환자 정보:
{json.dumps(patient_context, ensure_ascii=False, default=str)}
{pattern_context}
참고 가이드라인 청크:
{kb_result['text']}

아래 가이드라인 청크에 명시된 내용에 근거하여 약물 추가 옵션 4개의 우선순위를 제시하세요.
위 '혈당 패턴 감별 가설'은 어떤 임상 문제를 우선 고려할지에 대한 맥락으로만 활용하고,
약물 선택과 정량 수치는 반드시 가이드라인 청크에서만 가져오세요. 가이드라인에 없는 내용은 추정 금지.

형식 (반드시 준수):
1순위: [약물명/계열] - [근거: 가이드라인 출처]
2순위: [약물명/계열] - [근거: 가이드라인 출처]
3순위: [약물명/계열] - [근거: 가이드라인 출처]
4순위: [약물명/계열] - [근거: 가이드라인 출처]

주의: 처방 최종 결정은 반드시 담당 의사가 합니다."""
    llm_result = _call_llm(prompt)

    # 5. 약물 계열별 정량 효과 데이터: LLM 아님, KB에서 별도 검색 (정적 → 캐시)
    # 프론트엔드가 이 데이터로 처방 시나리오 비교 그래프 생성
    drug_effects = _get_drug_effects()

    return {
        'patient_id': patient_id,
        'patient_context': patient_context,
        'recommendation': {
            'text': llm_result['text'],
            'sources': llm_result['sources'] + kb_result['sources'],
        },
        'drug_effects': drug_effects,
        'disclaimer': '이 권고안은 의사의 임상적 판단을 보조하는 목적으로만 사용하며, 최종 처방 결정은 담당 의사가 합니다.',
        # ── 추가 (서열, 소수점 없음) ──
        'pattern_hypotheses': [{'code': h, 'label': H_LABELS.get(h, h)} for h in ranked],
        'matched_rule_ids': matched_rule_ids,
        'anomaly_summary': {'hypo_count': hypo_count, 'hyper_count': hyper_count},
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


# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# 공유 헬퍼: 시간대별 패턴 조회 / 약물 효과 캐시
# ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

def _fetch_hourly_pattern(patient_id: str) -> list:
    """24시간대별 avg/hypo/hyper 집계 (최근 14일). pattern·recommendation 공유."""
    try:
        result = os_client.search(index=IDX_RAW, body={
            'query': {'bool': {'must': [
                {'term': {'patient_id': patient_id}},
                {'range': {'timestamp': {'gte': 'now-14d'}}},
            ]}},
            'aggs': {'by_hour': {
                'terms': {'script': "doc['timestamp'].value.getHour()", 'size': 24, 'order': {'_key': 'asc'}},
                'aggs': {
                    'avg_glucose': {'avg': {'field': 'glucose'}},
                    'hypo_count': {'filter': {'range': {'glucose': {'lt': LOW}}}},
                    'hyper_count': {'filter': {'range': {'glucose': {'gt': HIGH}}}},
                },
            }},
            'size': 0,
        })
        return [
            {'hour': b['key'],
             'avg_glucose': round(b['avg_glucose']['value'] or 0, 1),
             'hypo_count': b['hypo_count']['doc_count'],
             'hyper_count': b['hyper_count']['doc_count']}
            for b in result['aggregations']['by_hour']['buckets']
        ]
    except Exception:
        return []


def _get_drug_effects() -> list:
    """약물 계열별 정량 효과(환자 무관 정적 데이터). 컨테이너당 1회만 KB 조회 후 재사용."""
    global _DRUG_EFFECTS_CACHE
    if _DRUG_EFFECTS_CACHE is not None:
        return _DRUG_EFFECTS_CACHE
    effects = []
    for drug_class in ['SGLT-2 억제제', 'GLP-1 수용체 작용제', 'DPP-4 억제제', '메트포르민', '인슐린']:
        effect = _retrieve_from_kb(f"{drug_class} HbA1c 감소 효과 임상 데이터")
        if effect['text']:
            effects.append({
                'drug_class': drug_class,
                'effect_summary': effect['text'][:300],
                'sources': effect['sources'],
            })
    if effects:                       # 빈 결과(전송 실패/KB 미설정)는 캐시 안 함 → 다음 요청 재시도
        _DRUG_EFFECTS_CACHE = effects
    return effects


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
