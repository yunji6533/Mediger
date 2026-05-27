# 모든 lambda가 공통적으로 쓰는 환경변수와 상수 

import os

# AWS Region : aws 환경 변수 
# 환경변수 AWS_REGION이 있으면 그 값을 사용하고, 없으면 후자 사용 
# 로컬에서는 .env 파일을 읽고 람다를 배포하면 aws 콘솔에서 환경변수 넣어주면 자동으로 읽음
AWS_REGION = os.environ.get('AWS_REGION', 'ap-northeast-2')

# OpenSearch -------------------------------------------------------------------------------------------------
# TODO: AWS 콘솔에서 OpenSearch 도메인 생성 후 OPENSEARCH_ENDPOINT 환경변수에 입력
# e.g. search-mediger-xxxx.ap-northeast-2.es.amazonaws.com
OPENSEARCH_ENDPOINT = os.environ.get('OPENSEARCH_ENDPOINT', '') # 변수 후자에 Opensearch 도메인 생기면 넣음 
OPENSEARCH_REGION = os.environ.get('OPENSEARCH_REGION', AWS_REGION) # Opensearch 변수를 따로 설정 안하면 AWS_REGION과 동일한 값 사용

# DynamoDB Table Names----------------------------------------------------------------------------------------
PATIENTS_TABLE = os.environ.get('PATIENTS_TABLE', 'Patients')
DOCTOR_NOTES_TABLE = os.environ.get('DOCTOR_NOTES_TABLE', 'DoctorNotes')
PRESCRIPTIONS_TABLE = os.environ.get('PRESCRIPTIONS_TABLE', 'Prescriptions')

# Bedrock ----------------------------------------------------------------------------------------------------
BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
BEDROCK_KB_REGION = os.environ.get('BEDROCK_KB_REGION', 'ap-northeast-2')
# 평소: 일단 haiku 모델로 해두고 나중에 시연 전에 sonnet 모델 사용
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-haiku-20240307-v1:0')
# BEDROK KB 환경 변수 -> 빈 칸에 나중에 ID 넣기 
BEDROCK_KB_ID = os.environ.get('BEDROCK_KB_ID', '')

# Kinesis Firehose ------------------------------------------------------------------------------------------
FIREHOSE_STREAM = os.environ.get('FIREHOSE_STREAM', 'diabetes-cgm-stream')

# OpenSearch Index Names ------------------------------------------------------------------------------------
# 단순 OpenSearch 상수 
IDX_RAW = 'glucose-raw'
IDX_DAILY = 'daily-summary'
IDX_TREND = 'trend-summary'
IDX_ALERT = 'alert-log'
IDX_RISK = 'risk-status'

# Clinical Thresholds (mg/dL) ------------------------------------------------------------------------------
VERY_LOW = 54 #저혈당 임계값
LOW = 70 #저혈당 기준값
HIGH = 180 #고혈당 기준값
VERY_HIGH = 250 #고혈당 임계값

# LLM System Prompts ---------------------------------------------------------------------------------------
# claude 프롬프트 엔지니어링 부분
DOCTOR_SYSTEM_PROMPT = """당신은 임상의를 위한 의료 의사결정 지원 AI입니다.
- 환자 패턴 요약 → 가능한 원인 가설 → 가이드라인 근거 인용 → 권고안 순으로 작성하세요.
- 모든 권고는 ADA Standards of Care 또는 대한당뇨병학회 진료지침의 출처를 명시하세요.
- 가이드라인 청크에 명시되지 않은 정량 추정은 절대 하지 마세요.
- 출처 없는 답변은 거부하세요."""

PATIENT_SYSTEM_PROMPT = """당신은 의사의 진료를 보조하는 의료 AI입니다.
- 환자에게는 약물명·용량을 직접 권고하지 마세요.
- 친근한 한국어로 격려와 1~2개 행동 권고만 제시하세요.
- 진단 단정은 절대 하지 마세요."""
