"""
glucose-raw 인덱스에서 환자별 TIR/TAR/TBR/위험도를 계산해서
risk-status 인덱스를 생성/갱신하는 스크립트.
"""

import os
from opensearchpy import OpenSearch, RequestsHttpConnection, helpers

OPENSEARCH_ENDPOINT = os.environ.get(
    'OPENSEARCH_ENDPOINT',
    'search-mediger-opensearch-aira7s6sswtm2lpup3snm2bfem.ap-northeast-2.es.amazonaws.com'
)
OPENSEARCH_USER = os.environ.get('OPENSEARCH_USER', 'MEDIGER')
OPENSEARCH_PASSWORD = os.environ.get('OPENSEARCH_PASSWORD', 'Mediger1234!')

RAW_INDEX = 'glucose-raw'
RISK_INDEX = 'risk-status'


def get_client():
    return OpenSearch(
        hosts=[{'host': OPENSEARCH_ENDPOINT, 'port': 443}],
        http_auth=(OPENSEARCH_USER, OPENSEARCH_PASSWORD),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
    )


def get_all_patient_ids(client):
    resp = client.search(
        index=RAW_INDEX,
        body={
            'size': 0,
            'aggs': {'patients': {'terms': {'field': 'patient_id.keyword', 'size': 200}}},
        },
    )
    return [b['key'] for b in resp['aggregations']['patients']['buckets']]


def calc_patient_stats(client, patient_id):
    resp = client.search(
        index=RAW_INDEX,
        body={
            'size': 0,
            'query': {'term': {'patient_id.keyword': patient_id}},
            'aggs': {
                'avg_glucose': {'avg': {'field': 'glucose'}},
                'latest': {'max': {'field': 'timestamp'}},
                'latest_glucose': {'top_hits': {
                    'size': 1,
                    'sort': [{'timestamp': {'order': 'desc'}}],
                    '_source': ['glucose'],
                }},
                'tbr': {'filter': {'range': {'glucose': {'lt': 70}}}},
                'tir': {'filter': {'range': {'glucose': {'gte': 70, 'lte': 180}}}},
                'tar': {'filter': {'range': {'glucose': {'gt': 180}}}},
                'severe_hypo': {'filter': {'range': {'glucose': {'lt': 54}}}},
                'severe_hyper': {'filter': {'range': {'glucose': {'gt': 250}}}},
                'total': {'value_count': {'field': 'glucose'}},
            },
        },
    )

    aggs = resp['aggregations']
    total = aggs['total']['value'] or 1

    tbr_pct = round(aggs['tbr']['doc_count'] / total * 100, 1)
    tir_pct = round(aggs['tir']['doc_count'] / total * 100, 1)
    tar_pct = round(aggs['tar']['doc_count'] / total * 100, 1)
    severe_hypo_pct = round(aggs['severe_hypo']['doc_count'] / total * 100, 1)
    severe_hyper_pct = round(aggs['severe_hyper']['doc_count'] / total * 100, 1)
    avg_glucose = round(aggs['avg_glucose']['value'] or 0, 1)

    latest_hits = aggs['latest_glucose']['hits']['hits']
    latest_glucose = latest_hits[0]['_source']['glucose'] if latest_hits else avg_glucose

    # 위험도 점수 계산 (0~100)
    risk_score = 0
    if tir_pct < 50:
        risk_score += 40
    elif tir_pct < 70:
        risk_score += 20

    if tbr_pct > 4:
        risk_score += 30
    elif tbr_pct > 1:
        risk_score += 15

    if severe_hypo_pct > 1:
        risk_score += 20
    if severe_hyper_pct > 5:
        risk_score += 10

    risk_score = min(risk_score, 100)

    return {
        'patient_id': patient_id,
        'avg_glucose': avg_glucose,
        'latest_glucose': latest_glucose,
        'tir': tir_pct,
        'tar': tar_pct,
        'tbr': tbr_pct,
        'severe_hypo_pct': severe_hypo_pct,
        'severe_hyper_pct': severe_hyper_pct,
        'risk_score': risk_score,
        'anomaly_count': aggs['severe_hypo']['doc_count'] + aggs['severe_hyper']['doc_count'],
        'last_updated': aggs['latest']['value_as_string'],
    }


def build_risk_status():
    client = get_client()

    print("환자 목록 조회 중...")
    patient_ids = get_all_patient_ids(client)
    print(f"총 {len(patient_ids)}명")

    def gen_docs():
        for pid in patient_ids:
            stats = calc_patient_stats(client, pid)
            yield {
                '_index': RISK_INDEX,
                '_id': pid,
                '_source': stats,
            }
            print(f"  [{pid}] risk={stats['risk_score']}, TIR={stats['tir']}%")

    success, errors = helpers.bulk(client, gen_docs(), raise_on_error=False)
    print(f"\n완료 - {success}건 인덱싱" + (f", {len(errors)}건 실패" if errors else ""))


if __name__ == '__main__':
    build_risk_status()
