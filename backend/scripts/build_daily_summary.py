"""
glucose-raw 인덱스에서 환자별 일별 요약(daily-summary) 인덱스 생성.

사용법:
  python scripts/build_daily_summary.py
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
DAILY_INDEX = 'daily-summary'


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


def calc_daily_stats(client, patient_id):
    resp = client.search(
        index=RAW_INDEX,
        body={
            'size': 0,
            'query': {'term': {'patient_id.keyword': patient_id}},
            'aggs': {
                'by_day': {
                    'date_histogram': {
                        'field': 'timestamp',
                        'calendar_interval': 'day',
                        'format': 'yyyy-MM-dd',
                    },
                    'aggs': {
                        'avg_glucose':  {'avg':           {'field': 'glucose'}},
                        'min_glucose':  {'min':           {'field': 'glucose'}},
                        'max_glucose':  {'max':           {'field': 'glucose'}},
                        'std_glucose':  {'extended_stats': {'field': 'glucose'}},
                        'tbr': {'filter': {'range': {'glucose': {'lt': 70}}}},
                        'tir': {'filter': {'range': {'glucose': {'gte': 70, 'lte': 180}}}},
                        'tar': {'filter': {'range': {'glucose': {'gt': 180}}}},
                        'total': {'value_count': {'field': 'glucose'}},
                    },
                }
            },
        },
    )

    days = []
    for bucket in resp['aggregations']['by_day']['buckets']:
        if bucket['doc_count'] < 5:
            continue
        total = bucket['total']['value'] or 1
        avg   = bucket['avg_glucose']['value'] or 0
        std   = bucket['std_glucose'].get('std_deviation') or 0
        cv    = round(std / avg * 100, 1) if avg > 0 else 0
        days.append({
            'patient_id':  patient_id,
            'date':         bucket['key_as_string'],
            'avg_glucose': round(avg, 1),
            'min_glucose': round(bucket['min_glucose']['value'] or 0, 1),
            'max_glucose': round(bucket['max_glucose']['value'] or 0, 1),
            'std_glucose': round(std, 1),
            'cv':           cv,
            'tir': round(bucket['tir']['doc_count'] / total * 100, 1),
            'tar': round(bucket['tar']['doc_count'] / total * 100, 1),
            'tbr': round(bucket['tbr']['doc_count'] / total * 100, 1),
        })
    return days


def build_daily_summary():
    client = get_client()

    print("환자 목록 조회 중...")
    patient_ids = get_all_patient_ids(client)
    print(f"총 {len(patient_ids)}명\n")

    def gen_docs():
        for pid in patient_ids:
            days = calc_daily_stats(client, pid)
            for day in days:
                yield {
                    '_index': DAILY_INDEX,
                    '_id': f"{pid}_{day['date']}",
                    '_source': day,
                }
            print(f"  [{pid}] {len(days)}일")

    success, errors = helpers.bulk(client, gen_docs(), raise_on_error=False)
    print(f"\n완료 - {success}건 인덱싱" + (f", {len(errors)}건 실패" if errors else ""))


if __name__ == '__main__':
    build_daily_summary()
