# 당뇨 환자 관리 서비스 - 프로젝트 컨텍스트

> 이 문서는 Claude Code가 프로젝트 컨텍스트를 빠르게 파악할 수 있도록 작성된 마스터 문서입니다.
> 작업 시작 전 이 문서를 먼저 읽고 작업해주세요.

---

## 1. 프로젝트 개요

### 1.1 기본 정보
- **프로젝트명**: 당뇨 환자 관리 서비스 (가칭 MEDIGER)
- **목적**: AWS 의료 AI 해커톤 출품작
- **개발 기간**: 약 1개월 (2026년 5~6월)
- **사용자**: JoGuk (학생, 정밀의료 AI 과정 수강 중)
- **팀 구성**: 4명 추정 (백엔드, 프론트엔드, AI, 인프라)
- **예산**: AWS 크레딧 $500~600

### 1.2 한 줄 정의
> "환자가 자기 데이터를 보는 도구는 이미 충분하다. 우리는 의사가 환자 100명을 동시에 관리하기 위한 도구를 만든다."

### 1.3 핵심 가치 제안
당뇨용 웨어러블 기기(CGM)를 착용한 환자를 대상으로, **환자 인터페이스**와 **의사 인터페이스**를 분리 제공하는 의료 AI 서비스. 의사 인터페이스가 핵심 차별 포인트로, 실시간 이상치 알림과 RAG 기반 약물·치료 가이드 제공.

### 1.4 사용자 분리
- **환자 인터페이스 (안드로이드 앱)**: 단순하게. 자기 혈당 그래프, 알림, 수기 입력
- **의사 인터페이스 (웹 대시보드)**: 핵심. 다환자 위험도 정렬, 클릭 한 번 LLM 분석, RAG 약물 가이드

---

## 2. 시장 분석 및 차별화

### 2.1 시장 현황 (한국 CGM 시장)
- 시장 규모: 2020년 63억 원 → 2024년 575억 원 (4년 9배 성장)
- 연평균 성장률: 73.6%
- **양강 과점 구조**: Abbott·Dexcom 약 90% 점유
  - Abbott (FreeStyle Libre 1/2)
  - Dexcom (G6, G7)
  - Medtronic (Guardian 4) - 소수
  - 아이센스 (케어센스 에어, 국산) - 7.5%

### 2.2 LibreView (Abbott의 클라우드 플랫폼) 분석

LibreView는 우리의 직접 비교 대상이며, 아래 기능을 이미 제공함:
- 데이터 자동 업로드, 의사 Practice ID 연결
- AGP, GPI, Daily Patterns 등 의사용 리포트
- TIR, 평균 혈당, 추정 A1C 통계
- LibreLinkUp (가족 공유, 최대 20명)
- Libre Assist (생성형 AI - 음식·혈당 영향에 한정)

### 2.3 LibreView의 구조적 한계 (= 우리의 기회)
1. **책임 회피로 의사결정 지원 부재**: 약물 가이드라인 인용·처방 권고 못 함 (의료기기 제조사 책임 부담)
2. **벤더 종속**: Abbott 기기 데이터만 처리
3. **환자 중심 설계**: 의사 워크플로우 최적화 부재
4. **가이드라인 비인용**: 출처 명시·근거 인용 기능 없음
5. **한국어·한국 임상 미최적화**: 글로벌 표준 기반

### 2.4 우리의 차별화 포인트 - 의사 친화 4가지

**친화 1. 5분 외래 진료에 최적화**
- 의사가 대시보드에서 환자 클릭 1회 → LLM이 핵심 패턴 + 권고안 자동 요약

**친화 2. 다환자 동시 모니터링**
- 전체 환자 위험도순 자동 정렬, 위험 환자만 골라서 우선 검토

**친화 3. 가이드라인 근거 자동 인용**
- LLM 권고에 ADA Standards of Care, 대한당뇨병학회 진료지침 출처 자동 명시

**친화 4. 환자 맥락 통합**
- 혈당 + 의사 메모 + 처방 이력 + 환자 자가 입력(증상·식단)을 한 화면에

### 2.5 한계 인정 (정직한 포지셔닝)

다음 사항은 본 프로젝트 범위 밖이며, 발표 시 솔직히 인정:
- **EMR 연동 불가**: 한국 의료법·인증 이슈로 직접 연동 어려움. 시연은 EMR 독립 시스템 가정
- **데이터 수집**: 시연에서는 ShanghaiT2DM 데이터를 환자가 제출한 것으로 가정
- **상용화 가능성**: 이건 해커톤 시연이지 상용 제품이 아님. 평가는 기술 + 시연 명확성 위주

---

## 3. 데이터셋 - ShanghaiT2DM

### 3.1 선정 근거
5개 후보(OhioT1DM, ShanghaiT1DM, ShanghaiT2DM, OpenAPS, D1NAMO) 중 ShanghaiT2DM 선정.

| 근거 | 내용 |
|---|---|
| 즉시 사용 가능 | DUA 신청 없이 Figshare 즉시 다운로드 |
| 100명 환자 | 의사 대시보드 정렬 시연에 충분한 규모 |
| 약물 메타데이터 풍부 | 9개 계열, 192건 처방 |
| 2형 당뇨 | 한국 환자 분포 90%가 2형 |
| 임상 메타데이터 | HbA1c, 합병증, 검사 결과 포함 |

### 3.2 데이터 출처
- 출처: Zhao et al., Scientific Data (2023), Figshare 공개
- **수집 기관**: 상하이 푸단 인민병원·상하이 동방병원 (IRB 승인 하에 수집된 실제 임상 데이터)
- 측정 기기: **FreeStyle Libre H** (Abbott, 패치형 CGM)
  - 동전 크기 패치, 팔 뒤쪽 14일 부착
  - 15분 간격 자동 측정 (Flash 방식)
  - 간질액 포도당 측정 (혈액과 5~10분 시간차)

### 3.3 데이터 구조

```
diabetes_dataset/
├── ShanghaiT1DM_Summary.xlsx         # 사용 안 함 (1형, 12명)
├── ShanghaiT2DM_Summary.xlsx         # 환자 메타데이터 (33개 컬럼)
├── Shanghai_T1DM/                    # 사용 안 함
└── Shanghai_T2DM/                    # 109개 환자 방문 파일
    ├── 2000_0_20201230.xlsx          # {환자ID}_{방문번호}_{날짜}.xlsx
    ├── 2001_0_20201102.xlsx
    └── ...
```

### 3.4 EDA 핵심 결과

**기본 통계**
- 고유 환자 수: 100명
- 총 방문 기록: 109건
- 환자당 데이터 기간: 평균 10.7일 (2.6 ~ 13.9일)
- CGM 측정 간격: 15분
- 전체 측정 횟수: 112,287개

**인구통계**
- 나이: 평균 60.3세 (22~97세)
- 성별: 남 59 / 여 50
- BMI: 평균 24.1
- 당뇨 유병기간: 평균 8.7년
- HbA1c: 평균 9.0% (조절 불량 43%)

**임상 지표 (전체 평균)**
| 지표 | 평균 | 임상 목표 |
|---|---|---|
| TBR (저혈당 <70) | 2.4% | < 4% |
| TIR (목표범위 70-180) | 77.7% | > 70% |
| TAR (고혈당 >180) | 20.0% | < 25% |
| 심각한 저혈당 (<54) | 0.79% | - |
| 심각한 고혈당 (>250) | 4.14% | - |
| GMI (HbA1c 추정) | 6.7% | - |
| CV (변동성) | 28.4% | < 36% |

**위험도 분포 (시연용)**
- 저위험 (<30): 70건 (64%)
- 중위험 (30~60): 33건 (30%)
- **고위험 (≥60): 6건 (6%)** ← 시연에 적절한 규모

**약물 분포 (RAG 우선순위)**
| 약물 계열 | 처방 수 | RAG 우선순위 |
|---|---|---|
| Insulin | 65 | ★★★ |
| Metformin | 47 | ★★★ |
| α-glucosidase inhibitor | 31 | ★★ |
| DPP-4 inhibitor | 16 | ★★ |
| Sulfonylurea | 13 | ★★ |
| TZD/SGLT-2/GLP-1/기타 | 17 | ★ |

상위 5개 계열이 처방의 81% 커버 → S3에 올릴 가이드라인 우선순위 결정

**시연용 핵심 케이스**
- 환자 ID `2079_0_20210809`: 14일간 저혈당 114건, 심각한 고혈당 6건. 야간 저혈당 패턴 반복
- "OpenSearch RCF 야간 패턴 자동 탐지" + "Claude의 Somogyi 효과 의심 진단" 시연 가능

### 3.5 데이터 한계 및 보완

| 한계 | 보완 방안 |
|---|---|
| 샘플링 15분 (아키텍처는 5분 가정) | 선형 보간으로 5분 변환, 전처리 시연 명분 |
| 데이터 기간 짧음 (~14일) | 실시간 스트리밍 시뮬레이션으로 충분 |
| SGLT-2/GLP-1 비율 낮음 | 2020~2022 중국 데이터 특성, 발표 보충 멘트 |
| 중국 환자 데이터 | 한국 적용 시 재검증 필요 (발표 인정) |

---

## 4. AWS 아키텍처 - 7층 구조

### 4.1 데이터 흐름 3갈래

데이터 성격에 따라 3개 독립 파이프라인:

**갈래 ① 웨어러블 실시간 스트림 (왼쪽)**
```
CGM 시뮬레이터 → Kinesis Firehose → OpenSearch (glucose-raw)
              → ISM 자동 집계 → Anomaly Detection (RCF + 룰)
              → Alerting Plugin → SNS/Slack
```

**갈래 ② 환자/의사 입력 (가운데)**
```
프론트엔드 → API Gateway → Lambda → DynamoDB
```

**갈래 ③ 의료 지식 RAG (오른쪽)**
```
가이드라인 PDF → S3 → Bedrock Knowledge Base (자동 청킹·임베딩)
```

### 4.2 7층 아키텍처

| 층 | 서비스 |
|---|---|
| 1. 데이터 소스 | CGM 웨어러블, 환자/의사 입력, 가이드라인 PDF |
| 2. 수집 | Kinesis Firehose, API Gateway, S3 |
| 3. 저장 | OpenSearch, DynamoDB, Bedrock KB |
| 4. 전처리·분석 | OpenSearch ISM, Anomaly Detection (RCF + 룰) |
| 5. 파생·알림 | OpenSearch 파생 인덱스 4개, Alerting Plugin |
| 6. RAG + LLM | Lambda Orchestrator, Bedrock Claude |
| 7. 애플리케이션 | 환자 웹 앱, 의사 대시보드 |

**Cross-cutting (HIPAA 의식 보안)**
- Cognito (인증), IAM (환자별 접근 제어), KMS (전체 암호화)
- CloudTrail (감사 로그), Bedrock Guardrails (LLM 안전장치)

### 4.3 OpenSearch 인덱스 설계

| 인덱스 | 내용 | 누가 만드나 |
|---|---|---|
| `glucose-raw` | 5분 단위 원본 측정값 | Firehose 자동 |
| `daily-summary` | 환자별 일별 요약 (TIR/TAR/TBR/avg/std) | ISM 자동 |
| `trend-summary` | 환자별 7일 추세 | Lambda 스케줄러 |
| `alert-log` | 이상치 이벤트 기록 | Anomaly Detection 자동 |
| `risk-status` | 환자별 현재 위험도 (PK=patient_id, 1행/환자) | Lambda 주기 갱신 |

**왜 파생 인덱스?** 의사 대시보드가 11만 건 매번 집계하면 응답 10~30초. 미리 계산된 환자당 1행 인덱스 조회면 0.05초. **200배 빨라짐.**

### 4.4 DynamoDB 테이블 설계

| 테이블 | Partition Key | Sort Key | 주요 속성 |
|---|---|---|---|
| Patients | `patient_id` | - | name, age, gender, hba1c, complications |
| DoctorNotes | `patient_id` | `timestamp` | doctor_id, note_text |
| Prescriptions | `patient_id` | `prescription_date` | drug, dose, doctor_id |

### 4.5 단계별 구축 전략 (AWS 권고)

**Phase 1 (MVP, 필수)**
- Ingestion + 이상치 알림 + 기본 CRUD + 의사 대시보드

**Phase 2 (차별화)**
- RAG 약물 가이드 + LLM 분석

**Phase 3 (확장, 시간 남으면)**
- 환각 완화 (추론 엔진), 집계 대시보드, 환자 약 알림

---

## 5. 환각 완화 정책 (의료 AI 안전성)

### 5.1 환각이 의료에서 위험한 이유
- 일반 도메인 환각 = "조금 틀린 정보"
- 의료 도메인 환각 = "환자 생명에 직결되는 잘못된 권고"
- 같은 환각이라도 비용이 100배 다름

### 5.2 다층 방어 체계

| 장치 | 역할 |
|---|---|
| RAG (Bedrock KB) | LLM이 자유 답변 못 하게, 가이드라인 청크 안에서만 답하도록 |
| 출처 강제 인용 | 답변에 ADA/KDA 출처 명시 → 검증 가능 |
| Bedrock Guardrails | 위험한 약물 권고, 진단 단정 차단 |
| 시스템 프롬프트 | "환자에게는 약물명·용량 직접 권고 금지" |
| (Phase 2) 추론 엔진 | 의학적 가설 좁히기 후 LLM 호출 |

### 5.3 LLM에게 시키지 말 것 (절대 금지)

다음은 LLM이 못 하거나 하면 위험한 영역:

❌ **예후 예측** ("6개월 후 HbA1c 8.5% 예측")
- 데이터 부족 + 환각 위험 폭발
- 의료 책임 소재 불명

❌ **숫자 계산** (96개 측정값 평균 등)
- LLM은 5~10% 오차 발생
- 토큰 비용 큼
- 결정론적 결과 보장 안 됨 (temperature)

❌ **그래프 생성**
- LLM은 시각적 픽셀 못 만듦
- 차트 라이브러리(Recharts 등)가 데이터로 그림

❌ **약물 효과 정량 추정**
- "이 약 쓰면 HbA1c -0.7% 감소"는 가이드라인에서 가져와야지 LLM이 만들면 안 됨

### 5.4 LLM에게 시킬 것 (적합 영역)

✅ **자연어 해석**: "이 환자 시간대별 패턴에서 임상적 의미를 설명"
✅ **약물 우선순위 (RAG 기반)**: "가이드라인 청크 내에서 적합한 약물 순위"
✅ **환자/의사 톤 분기**: 같은 데이터를 다른 어조로 표현
✅ **요약**: 환자 메모, 처방 이력 자연어 요약

### 5.5 처방 시나리오 비교 (정통 RAG 방식)

발표용 슬라이드 9 "예후 예측 그래프"는 LLM 예측이 아님:

```python
# 1. 환자 상황 추출
patient_context = {age, complications, current_meds, recent_pattern}

# 2. RAG 검색 (LLM 아님)
kb_results = bedrock_agent.retrieve(query="...")

# 3. LLM은 우선순위만 (출처 강제)
prompt = f"""
환자 정보: {patient_context}
참고 가이드라인 청크: {kb_results}
위 가이드라인에 명시된 권고를 기반으로 약물 추가 옵션 4개 우선순위.
형식: N순위: [약물명] - [출처: 가이드라인 ID]
"""

# 4. 각 옵션의 정량 효과는 KB에서 별도 검색
for drug in recommended_drugs:
    effect = retrieve_drug_effect(drug)  # "ADA §9.4: SGLT-2 평균 -0.7%"

# 5. 프론트가 그래프 생성 (정량 데이터 시각화)
```

**핵심**: LLM은 우선순위 결정만, 숫자는 항상 RAG에서.

### 5.6 프롬프트 설계 원칙

❌ 금지 표현: "예측해줘", "예후를 알려줘", "추정해줘"
✅ 권장 표현: "가이드라인 출처와 함께 추천", "임상적 의미를 가이드라인 근거로 설명"

---

## 6. 프론트엔드 와이어프레임

### 6.1 환자 인터페이스 (안드로이드 앱)

**메인 화면**
- 상단: 사용자명, 날짜, 현재 혈당 값 + 색상 (정상=녹색, 저혈당=빨강, 고혈당=주황), 알림·설정 버튼
- 중앙: 하루 혈당 그래프 (00:00~23:59, 15분 간격, 정상범위 70-180 색칠)
- 하단: 환자 수기 입력 칸 (평소 숨김, 알림 시 표시)
  - 안내 멘트, 시간 입력, 혈당 입력

**상세 지표 화면**
- 하루치 그래프 (앞 페이지 동일)
- 상세 지표 테이블
- 이상치 분석 테이블
- (선택) "점심 식사 이후 혈당 급상승 패턴" 같은 LLM 코멘트

### 6.2 의사 인터페이스 (웹 대시보드)

**환자 목록 화면**
- 컬럼: 이름, 성별/나이, 위험도, 최근 혈당, TIR, 이상치, 최근 진료일
- 정렬: 위험도순 / 이름순
- 위험도 시각화: 🔴 높음 / 🟡 중간 / 🟢 낮음

**환자 세부 정보 화면**
- 헤더: 환자명, ID, 나이, 성별, 위험도 뱃지, "처방 보조 →" 버튼
- 그래프: 일간 / 환자 데이터별 최대 일수 (주간 대체) 토글
- TAR/TBR 점선 표시
- 그래프 하단 범례

**AI 세부 보고서 (3페이지)**

페이지 1 - 혈당 패턴 분석
- 고정 헤더: "MEDIGER REPORT", 구분선, "00님의 진단 보조 분석 report입니다"
- 그래프 영역 (프론트가 OpenSearch 데이터로 시각화)
- 텍스트 영역 (LLM이 패턴 해석)

페이지 2 - 이상치 분석
- 이상치 종류별 분리 (저혈당 패턴 / 고혈당 패턴 등)
- 각 종류별: 이상치 패턴 그래프 + 텍스트 + 이상치 로그 테이블
- 각 테이블 소제목 명시

페이지 3 - 결론
- 1순위~4순위 약물 추천 (동일 구조 박스 4개)
- **1순위 박스는 연한 초록색 강조**
- 처방 시나리오 비교 그래프 (LLM 아님, 가이드라인 정량 데이터 시각화)
- 출처 및 설명 텍스트 (각 시나리오별 ADA/KDA 출처)

### 6.3 화면 우선순위 (시연용)

| 우선순위 | 화면 | 이유 |
|---|---|---|
| ★★★ | 의사 환자 목록 (위험도순) | 시연 시작, "100명 정렬" 어필 |
| ★★★ | AI 보고서 결론 페이지 | RAG + 출처 인용, 핵심 차별화 |
| ★★ | 환자 세부 정보 그래프 | "환자 클릭 → 상세" 동선 |
| ★★ | 환자 메인 (혈당 그래프) | 환자 인터페이스 존재 증명 |
| ★ | AI 보고서 패턴/이상치 | 시간 되면 |
| ★ | 환자 입력·기록 | 시간 되면 |

---

## 7. API 명세

### 7.1 환자 인터페이스 API

```
GET  /api/patient/{id}/today
     → 오늘 혈당 시계열, 현재값, 알림 여부

POST /api/patient/{id}/input
     Body: { time, glucose, type }
     → 수기 혈당/증상 입력

GET  /api/patient/{id}/metrics
     → TIR/TAR/TBR + 이상치 테이블
```

### 7.2 의사 인터페이스 API

```
GET  /api/doctor/patients?sort=risk&doctor_id=xxx
     → 환자 목록 (risk-status 인덱스 조회, 위험도순)

GET  /api/patient/{id}/timeseries?range=daily|max
     → 환자별 시계열 (일간 또는 최대 기간)

GET  /api/patient/{id}/report/pattern
     → AI 보고서 1: 혈당 패턴 분석 (그래프 데이터 + LLM 해석)

GET  /api/patient/{id}/report/anomaly
     → AI 보고서 2: 이상치 분석

GET  /api/patient/{id}/report/recommendation
     → AI 보고서 3: 처방 우선순위 + 시나리오 비교 데이터
```

### 7.3 응답 형식 원칙

- 그래프 데이터는 JSON 배열 (프론트가 차트 라이브러리로 시각화)
- LLM 해석은 별도 필드 (`analysis`, `interpretation`)
- 출처는 항상 별도 필드 (`sources: [{title, url, section}]`)

---

## 8. 코드 컨벤션

### 8.1 백엔드 (Python Lambda)

```python
# 표준 import 순서
import os, json
from datetime import datetime, timedelta

import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

# 클라이언트는 Lambda 핸들러 외부에서 초기화 (재사용)
dynamodb = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime')
bedrock_agent = boto3.client('bedrock-agent-runtime')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        # 비즈니스 로직
        result = ...
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

### 8.2 그래프 데이터 vs LLM 해석 분리

```python
# API 1: 그래프 데이터 (LLM 안 씀)
def get_daily_glucose(patient_id, date):
    response = opensearch_client.search(...)
    return [{'time': ..., 'glucose': ...}, ...]

# API 2: AI 패턴 해석 (LLM 씀)
def get_pattern_analysis(patient_id):
    hourly_pattern = opensearch_client.search(...)  # 계산
    prompt = f"환자 패턴: {hourly_pattern}\n임상 의미 분석..."
    response = bedrock_runtime.invoke_model(...)
    return {'analysis': response_text, 'sources': [...]}
```

### 8.3 OpenSearch 쿼리 패턴

```python
# 환자 7일 요약
{
    'query': {
        'bool': {'must': [
            {'term': {'patient_id': pid}},
            {'range': {'timestamp': {'gte': 'now-7d'}}}
        ]}
    },
    'aggs': {
        'avg_glucose': {'avg': {'field': 'glucose'}},
        'tbr': {'filter': {'range': {'glucose': {'lt': 70}}}}
    },
    'size': 0
}

# 시간대별 패턴 (24시간)
{
    'query': {'term': {'patient_id': pid}},
    'aggs': {
        'by_hour': {
            'terms': {
                'script': "doc['timestamp'].value.hourOfDay",
                'size': 24
            },
            'aggs': {
                'avg_glucose': {'avg': {'field': 'glucose'}},
                'hypo_count': {'filter': {'range': {'glucose': {'lt': 70}}}}
            }
        }
    }
}
```

### 8.4 프론트엔드 (React + Recharts)

```jsx
import { LineChart, Line, XAxis, YAxis, ReferenceArea } from 'recharts';

function GlucoseChart({ glucoseData }) {
  return (
    <LineChart width={600} height={300} data={glucoseData}>
      <XAxis dataKey="time" />
      <YAxis domain={[0, 300]} />
      <ReferenceArea y1={70} y2={180} fill="#90EE90" fillOpacity={0.2} />
      <Line type="monotone" dataKey="glucose" stroke="#5B9BD5" />
    </LineChart>
  );
}
```

### 8.5 LLM 프롬프트 템플릿

**환자용 시스템 프롬프트**
```
당신은 의사의 진료를 보조하는 의료 AI입니다.
- 환자에게는 약물명·용량을 직접 권고하지 마세요
- 친근한 한국어로 격려와 1~2개 행동 권고만 제시하세요
- 진단 단정은 절대 하지 마세요
```

**의사용 시스템 프롬프트**
```
당신은 임상의를 위한 의료 의사결정 지원 AI입니다.
- 환자 패턴 요약 → 가능한 원인 가설 → 가이드라인 근거 인용 → 권고안 순으로 작성
- 모든 권고는 ADA Standards of Care 또는 대한당뇨병학회 진료지침의 출처를 명시
- 가이드라인 청크에 명시되지 않은 정량 추정은 절대 하지 마세요
- 환각 위험 인지: 출처 없는 답변은 거부
```

---

## 9. 시뮬레이터 설계

### 9.1 목적
ShanghaiT2DM 정적 데이터를 "실시간 스트림"처럼 재생.

### 9.2 동작 방식

```python
import boto3, json, time
import pandas as pd
from datetime import datetime

firehose = boto3.client('firehose')

def replay_patient(patient_id, file_path, speed_factor=180):
    """
    speed_factor: 실제 시간 대비 가속 (180 = 3시간이 1분)
    """
    df = pd.read_excel(file_path)
    df = df.sort_values('Date')
    
    prev_time = None
    for _, row in df.iterrows():
        record = {
            'patient_id': patient_id,
            'timestamp': datetime.now().isoformat(),
            'glucose': float(row['CGM (mg / dl)']),
            'device_id': 'freestyle_libre_h'
        }
        
        firehose.put_record(
            DeliveryStreamName='diabetes-cgm-stream',
            Record={'Data': json.dumps(record) + '\n'}
        )
        
        # 다음 측정까지 대기 (가속)
        if prev_time is not None:
            real_delta = (row['Date'] - prev_time).total_seconds()
            time.sleep(real_delta / speed_factor)
        prev_time = row['Date']
```

### 9.3 다중 환자 병렬 시뮬레이션

```python
import threading

def simulate_all_patients(file_dir):
    threads = []
    for f in os.listdir(file_dir):
        if f.endswith('.xlsx'):
            patient_id = f.split('_')[0]
            t = threading.Thread(
                target=replay_patient,
                args=(patient_id, os.path.join(file_dir, f))
            )
            threads.append(t)
            t.start()
    for t in threads:
        t.join()
```

### 9.4 5분 간격 보간 (선택)

ShanghaiT2DM은 15분 간격이지만 우리 아키텍처는 5분 가정.

```python
def interpolate_to_5min(df):
    df = df.set_index('Date').resample('5T').interpolate(method='linear')
    return df.reset_index()
```

발표 시 "결측치 보정·보간 시연 명분"으로 활용.

---

## 10. 비용 관리

### 10.1 예산 및 예상 비용 (4주 기준)

| 항목 | 예상 |
|---|---|
| OpenSearch (t3.small.search 1노드) | ~$30 |
| OpenSearch Serverless (Bedrock KB용) | ~$50~80 |
| Lambda 실행 | < $1 |
| API Gateway | < $5 |
| Kinesis Firehose | ~$5~10 |
| DynamoDB | < $5 |
| S3 | < $1 |
| Bedrock LLM (Haiku 위주) | ~$20~50 |
| **합계** | **~$130~190** (예산 $500~600 충분) |

### 10.2 비용 폭탄 방지 체크리스트

1. **AWS Budgets 알림**: 일일 $10 / 주간 $50 초과 시 메일
2. **Cost Explorer**: 매일 한 번 비용 추이 체크
3. **OpenSearch 인스턴스 작게**: t3.small.search로 시작
4. **밤에 OpenSearch 정지**: 안 쓰는 시간 비용 절감
5. **Bedrock 호출 모니터링**: Haiku 위주, 시연 직전만 Sonnet

### 10.3 가장 위험한 비용 항목
- **OpenSearch**: 켜두면 시간당 과금. 한 번 잊으면 며칠 만에 $100~200
- **Bedrock KB의 OpenSearch Serverless**: 백엔드 인덱스가 시간당 과금

---

## 11. 발표 대비 - 예상 질문 및 답변

| 질문 | 답변 방향 |
|---|---|
| LibreView랑 뭐가 달라요? | 1차 사용자가 다름 (환자 vs 의사). LibreView가 책임 이슈로 못 하는 의사결정 지원에 특화 |
| 여러 CGM 회사 통합 가능? | 구조적으로 가능하나 제조사 API 폐쇄성으로 현실 제약. Phase 1은 단일 포맷, 어댑터로 확장 가능 |
| 의료기기 인증은? | CDS(임상 의사결정 지원)로 분류, 처방 자동화 아니므로 인증 부담 낮음. 의사가 최종 판단 주체 |
| 환각 위험은? | RAG 출처 인용 강제 + Bedrock Guardrails. Phase 2에서 추론 엔진 추가 검토 |
| 한국 의사가 실제 쓸까요? | 5분 외래 최적화 + 한국어·KDA 가이드라인 + 다환자 동시 관리. 한국 임상 통증 포인트 대응 |
| 예후 예측 어떻게 했나요? | LLM 예측 아님. 가이드라인 임상 데이터 시각화. LLM은 약물 우선순위 RAG 추천만 |
| EMR 연동은요? | 의료법·인증 이슈로 본 프로젝트 범위 밖. 시연은 EMR 독립 시스템 가정. Phase 3에서 진료정보교류표준 검토 |
| 데이터 어떻게 수집? | 시연에서는 ShanghaiT2DM을 환자 제출 데이터로 가정. 실제 도입 시 환자 export·업로드 또는 CGM 직접 연동 |

---

## 12. 팀 분담 권장

| 담당 | 영역 | 핵심 서비스 |
|---|---|---|
| A | 스트리밍 & 시뮬레이터 | Kinesis Firehose, OpenSearch, Anomaly Detection, ISM, 시뮬레이터 |
| B | 백엔드 & DB | API Gateway, Lambda Orchestrator, DynamoDB |
| C | RAG & LLM | S3, Bedrock KB, Bedrock Claude, 프롬프트 설계 |
| D | 프론트엔드 | 환자 앱 (안드로이드) + 의사 대시보드 (React/Next.js) |

**첫 주 권장**: 4명이 모여 인터페이스 계약(API 명세, 인덱스 스키마, DynamoDB 테이블) 합의. 이후 각자 독립 개발.

---

## 13. 가이드라인 PDF 큐레이션 (S3 → Bedrock KB)

핵심 가이드라인 5~10개만:

1. **ADA Standards of Care** (미국당뇨병학회, 매년 업데이트)
2. **대한당뇨병학회 진료지침** (한국어, 한국 임상 어필)
3. **EASD-ADA Consensus Report** (2형 당뇨 약물 치료)
4. **주요 약물 인서트** (메트포르민, GLP-1, SGLT-2 5~6개)
5. **Review papers 2~3편** (필요시)

**주의**: 너무 많이 넣으면 RAG 검색 품질 떨어짐. 핵심만.

**테이블 추출**: PDF의 약물 효과 표를 Bedrock KB가 잘 못 읽을 수 있음. 별도 Markdown으로 변환해서 같이 올리는 것 추천.

---

## 14. 작업 우선순위 (Claude Code 활용 시)

오늘 시작할 작업 순서 권장:

### Day 1~3: 기초 인프라
1. AWS 계정 설정 (Cognito, IAM 역할)
2. OpenSearch 도메인 생성 (t3.small.search)
3. DynamoDB 테이블 3개 생성
4. S3 버킷 + 가이드라인 PDF 업로드

### Day 4~7: 데이터 파이프라인 (Phase 1)
1. Kinesis Firehose → OpenSearch 연결
2. 시뮬레이터 작성 (ShanghaiT2DM 재생)
3. OpenSearch ISM 정책 (5분/일/주 자동 집계)
4. Anomaly Detection 활성화 + Alerting

### Day 8~14: 백엔드 API
1. Lambda 함수들 (CRUD)
2. API Gateway 엔드포인트
3. Lambda Orchestrator 골격

### Day 15~21: RAG + LLM (Phase 2)
1. Bedrock KB 셋업 (가이드라인 PDF 인덱싱)
2. 프롬프트 설계 (환자/의사 분기)
3. Lambda Orchestrator 완성

### Day 22~28: 프론트엔드 + 통합
1. 의사 대시보드 (환자 목록, 세부, AI 보고서)
2. 환자 앱 (안드로이드)
3. 통합 테스트

### Day 29~30: 발표 준비
1. 시연 시나리오 리허설
2. 슬라이드 정리
3. Q&A 답변 준비

---

## 15. 중요 파일 위치

```
diabetes-project/
├── CLAUDE.md                              ← 이 파일
├── docs/
│   ├── diabetes_project_report.pdf        ← 보고서 (시장 분석 포함)
│   └── aws_services_code_reference.pdf    ← AWS 서비스 코드 참조
├── data/
│   ├── ShanghaiT2DM_Summary.xlsx
│   └── Shanghai_T2DM/                     ← 109개 환자 파일
├── infra/                                 ← AWS 리소스 정의
├── backend/
│   ├── lambdas/
│   │   ├── orchestrator/
│   │   ├── patient_api/
│   │   └── doctor_api/
│   └── simulator/                         ← ShanghaiT2DM 재생기
├── frontend/
│   ├── patient-app/                       ← 안드로이드
│   └── doctor-dashboard/                  ← React/Next.js
└── analysis/
    └── eda.py                             ← EDA 스크립트
```

---

## 16. 핵심 원칙 요약

1. **의사 친화 = 의사 입력 최소화** (EMR 연동 못 하면 의사 일 늘리지 말 것)
2. **LLM은 자연어 해석만**, 숫자 계산·그래프·예측은 절대 시키지 말 것
3. **모든 LLM 답변에 가이드라인 출처 인용 강제**
4. **Phase 단계 엄수**: 핵심부터, 점진적 확장
5. **데이터 한계 정직하게 인정**: 발표에서 강점으로 전환
6. **비용 폭탄 주의**: OpenSearch와 Bedrock KB가 가장 위험
7. **양강 과점 시장 인지**: 우리는 보완 도구, 대체재 아님

---

## 17. 참고 자료

- ShanghaiT2DM 데이터셋: https://figshare.com/articles/dataset/Diabetes_Datasets/20425518
- ADA Standards of Care 2024: 매년 1월 업데이트
- 대한당뇨병학회 진료지침: https://www.diabetes.or.kr
- AWS Bedrock 문서: https://docs.aws.amazon.com/bedrock/
- OpenSearch 공식 문서: https://opensearch.org/docs/

---

> **이 문서는 살아있는 문서입니다.** 프로젝트 진행하면서 결정사항 변경되면 이 파일도 같이 업데이트하세요. Claude Code가 매 세션마다 이 파일을 읽고 일관된 맥락으로 작업합니다.
