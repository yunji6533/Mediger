"""
ShanghaiT2DM 데이터를 OpenSearch에 직접 인덱싱.

사용 예:
  # 전체 환자
  python replay.py --data-dir Shanghai_T2DM

  # 단일 환자
  python replay.py --single Shanghai_T2DM/2079_0_20210809.xlsx
"""

import argparse
import os
import threading
import time
from datetime import datetime, timezone

import pandas as pd
from opensearchpy import OpenSearch, RequestsHttpConnection, helpers

OPENSEARCH_ENDPOINT = os.environ.get(
    'OPENSEARCH_ENDPOINT',
    'search-mediger-opensearch-aira7s6sswtm2lpup3snm2bfem.ap-northeast-2.es.amazonaws.com'
)
OPENSEARCH_USER = os.environ.get('OPENSEARCH_USER', 'MEDIGER')
OPENSEARCH_PASSWORD = os.environ.get('OPENSEARCH_PASSWORD', 'Mediger1234!')
INDEX = 'glucose-raw'


def get_os_client():
    return OpenSearch(
        hosts=[{'host': OPENSEARCH_ENDPOINT, 'port': 443}],
        http_auth=(OPENSEARCH_USER, OPENSEARCH_PASSWORD),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
    )


def replay_patient(patient_id: str, file_path: str) -> None:
    try:
        df = pd.read_excel(file_path, usecols=['Date', 'CGM (mg / dl)'])
    except Exception as e:
        print(f"[{patient_id}] 파일 읽기 실패: {e}")
        return

    df = df.dropna(subset=['CGM (mg / dl)']).sort_values('Date').reset_index(drop=True)

    # 실제 날짜를 보존하되 마지막 측정값 = 지금으로 오프셋
    # → timeseries/today API의 날짜 필터에 잡히도록
    now = datetime.now(timezone.utc)
    max_date = pd.Timestamp(df['Date'].max())
    if max_date.tzinfo is None:
        max_date = max_date.tz_localize('UTC')
    offset = now - max_date

    def to_utc_iso(raw_date) -> str:
        ts = pd.Timestamp(raw_date)
        if ts.tzinfo is None:
            ts = ts.tz_localize('UTC')
        return (ts + offset).isoformat()

    client = get_os_client()

    def gen_actions():
        for _, row in df.iterrows():
            glucose_val = row['CGM (mg / dl)']
            if pd.isna(glucose_val):
                continue
            yield {
                '_index': INDEX,
                '_source': {
                    'patient_id': patient_id,
                    'timestamp': to_utc_iso(row['Date']),
                    'glucose': round(float(glucose_val), 1),
                    'device_id': 'freestyle_libre_h',
                    'source': 'simulator',
                },
            }

    try:
        success, errors = helpers.bulk(client, gen_actions(), chunk_size=500, raise_on_error=False)
        print(f"[{patient_id}] 완료 - {success}건 전송" + (f", {len(errors)}건 실패" if errors else ""))
    except Exception as e:
        print(f"[{patient_id}] 전송 실패: {e}")


def simulate_all_patients(data_dir: str, max_patients: int | None = None) -> None:
    files = sorted(f for f in os.listdir(data_dir) if f.endswith('.xlsx') or f.endswith('.xls'))
    if max_patients:
        files = files[:max_patients]

    threads = []
    for fname in files:
        patient_id = fname.split('_')[0]
        file_path = os.path.join(data_dir, fname)
        t = threading.Thread(
            target=replay_patient,
            args=(patient_id, file_path),
            daemon=True,
        )
        threads.append(t)
        t.start()
        time.sleep(0.05)

    print(f"환자 {len(threads)}명 OpenSearch 직접 인덱싱 시작")
    for t in threads:
        t.join()
    print("전체 완료")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='ShanghaiT2DM → OpenSearch 직접 인덱서')
    parser.add_argument('--data-dir', help='ShanghaiT2DM xlsx 디렉토리 경로')
    parser.add_argument('--single', help='단일 환자 xlsx 파일 경로')
    parser.add_argument('--max-patients', type=int, default=None)
    args = parser.parse_args()

    if args.single:
        patient_id = os.path.basename(args.single).split('_')[0]
        replay_patient(patient_id, args.single)
    elif args.data_dir:
        simulate_all_patients(args.data_dir, args.max_patients)
    else:
        parser.print_help()
