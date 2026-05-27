"""
ShanghaiT2DM_Summary.xlsx의 Hypoglycemic Agents 컬럼을 파싱해
DynamoDB Prescriptions 테이블에 처방 이력 생성.

사용법:
  python scripts/seed_prescriptions.py
"""

import os
import re
import uuid
from datetime import datetime, timezone

import boto3
import pandas as pd

AWS_REGION = os.environ.get('AWS_DEFAULT_REGION', 'ap-northeast-2')
PRESCRIPTIONS_TABLE = os.environ.get('PRESCRIPTIONS_TABLE', 'Prescriptions')
SUMMARY_FILE = os.path.join(
    os.path.dirname(__file__), '../../data/Shanghai_T2DM/Shanghai_T2DM_Summary.xlsx'
)

# 약물명 정규화 (엑셀의 영문 이름 → 한국어 표시명)
DRUG_MAP = {
    'insulin': '인슐린',
    'metformin': '메트포르민',
    'acarbose': '아카보스',
    'voglibose': '보글리보스',
    'glipizide': '글리피지드',
    'glimepiride': '글리메피리드',
    'gliclazide': '글리클라지드',
    'repaglinide': '레파글리나이드',
    'sitagliptin': '시타글립틴',
    'saxagliptin': '삭사글립틴',
    'alogliptin': '알로글립틴',
    'vildagliptin': '빌다글립틴',
    'dapagliflozin': '다파글리플로진',
    'empagliflozin': '엠파글리플로진',
    'pioglitazone': '피오글리타존',
    'rosiglitazone': '로시글리타존',
}

ROUTE_MAP = {
    '인슐린': 'injection',
}


def normalize_drug(raw: str) -> str:
    key = raw.strip().lower()
    for eng, kor in DRUG_MAP.items():
        if eng in key:
            return kor
    return raw.strip().title()


def parse_drugs(agents_str: str) -> list[dict]:
    if not agents_str or agents_str.lower() in ('nan', 'none', ''):
        return []
    parts = re.split(r'[,;/+\n]+', agents_str)
    drugs = []
    for part in parts:
        name = normalize_drug(part)
        if not name:
            continue
        route = ROUTE_MAP.get(name, 'oral')
        drugs.append({
            'id': str(uuid.uuid4())[:8],
            'drug': name,
            'dose': '',
            'frequency': 'qd',
            'route': route,
        })
    return drugs


def seed_prescriptions():
    df = pd.read_excel(SUMMARY_FILE)
    df['patient_id'] = df['Patient Number'].astype(str).str.split('_').str[0]
    df['visit_date'] = df['Patient Number'].astype(str).str.split('_').str[2]
    df = df.drop_duplicates(subset='patient_id', keep='last')

    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table(PRESCRIPTIONS_TABLE)

    with table.batch_writer() as batch:
        for _, row in df.iterrows():
            patient_id = row['patient_id']
            raw_date = str(row.get('visit_date', '')).strip()
            try:
                dt = datetime.strptime(raw_date, '%Y%m%d').replace(tzinfo=timezone.utc)
                prescription_date = dt.isoformat()
            except ValueError:
                prescription_date = datetime.now(timezone.utc).isoformat()

            agents = str(row.get('Hypoglycemic Agents', '')).strip()
            drugs = parse_drugs(agents)
            if not drugs:
                continue

            batch.put_item(Item={
                'patient_id': patient_id,
                'prescription_date': prescription_date,
                'drugs': drugs,
                'note': f'ShanghaiT2DM 초진 처방 ({raw_date})',
            })
            print(f"  [{patient_id}] {len(drugs)}개 약물: {[d['drug'] for d in drugs]}")

    print('\n완료')


if __name__ == '__main__':
    seed_prescriptions()
