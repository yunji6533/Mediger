"""
Shanghai_T2DM_Summary.xlsx 실제 데이터로 DynamoDB Patients 테이블 채우기.
"""

import os
import pandas as pd
import boto3
from decimal import Decimal

AWS_REGION = os.environ.get('AWS_DEFAULT_REGION', 'ap-northeast-2')
TABLE_NAME = 'Patients'
SUMMARY_FILE = 'Shanghai_T2DM/Shanghai_T2DM_Summary.xlsx'


def safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def hba1c_mmol_to_pct(mmol):
    return round((mmol / 10.929) + 2.15, 1)


def seed_patients():
    df = pd.read_excel(SUMMARY_FILE)
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table(TABLE_NAME)

    # 환자별 마지막 방문만 사용
    df['patient_id'] = df['Patient Number'].astype(str).str.split('_').str[0]
    df = df.drop_duplicates(subset='patient_id', keep='last')

    with table.batch_writer() as batch:
        for _, row in df.iterrows():
            raw_id = str(row['Patient Number'])
            patient_id = row['patient_id']

            gender_code = row['Gender (Female=1, Male=2)']
            gender = 'F' if gender_code == 1 else 'M'

            hba1c_mmol = row.get('HbA1c (mmol/mol)')
            try:
                hba1c_pct = hba1c_mmol_to_pct(float(hba1c_mmol)) if pd.notna(hba1c_mmol) else None
            except (ValueError, TypeError):
                hba1c_pct = None

            complications = []
            for col in ['Acute Diabetic Complications', 'Diabetic Macrovascular  Complications',
                        'Diabetic Microvascular Complications', 'Comorbidities']:
                val = row.get(col)
                if pd.notna(val) and str(val).strip() not in ('', 'none', 'None', 'nan'):
                    complications.append(str(val).strip())

            drugs = str(row.get('Hypoglycemic Agents', '')).strip()

            item = {
                'patient_id': patient_id,
                'visit_id': raw_id,
                'gender': gender,
                'age': int(row['Age (years)']),
                'height_m': str(round(v, 2)) if (v := safe_float(row['Height (m)'])) else None,
                'weight_kg': str(round(v, 1)) if (v := safe_float(row['Weight (kg)'])) else None,
                'bmi': str(round(v, 1)) if (v := safe_float(row['BMI (kg/m2)'])) else None,
                'diabetes_duration_years': int(v) if (v := safe_float(row['Duration of diabetes (years)'])) else None,
                'hba1c_pct': str(hba1c_pct) if hba1c_pct else None,
                'fasting_glucose': str(round(v, 1)) if (v := safe_float(row['Fasting Plasma Glucose (mg/dl)'])) else None,
                'complications': complications,
                'hypoglycemic_agents': drugs if drugs and drugs != 'nan' else None,
                'hypoglycemia_history': str(row.get('Hypoglycemia (yes/no)', '')).strip(),
                'doctor_id': 'DR001',
            }
            item = {k: v for k, v in item.items() if v is not None}
            batch.put_item(Item=item)
            print(f"  [{patient_id}] {gender}/{item['age']}세 HbA1c={hba1c_pct}%")

    print(f"\n완료 - {len(df)}건 DynamoDB 입력")


if __name__ == '__main__':
    seed_patients()
