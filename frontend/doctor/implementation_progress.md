# MEDIGER Doctor Dashboard — 구현 진행 현황

> **베이스**: `mediger-dashboard/` (Next.js 16 + React 19 + Tailwind CSS v4)  
> **마지막 업데이트**: 2026-05-11

---

## 아키텍처 결정 사항

- **데이터 레이어**: `src/lib/api.ts` — async fetch 함수 + `NEXT_PUBLIC_API_URL` 미설정 시 mock JSON 자동 fallback
- **Mock 전략**: 모든 환자가 013 데이터를 공유 (backend 연결 전 demo 목적)
- **진단 보조 데이터 흐름**:
  - 다중일 CGM (10d × 96pt) → `getAverageDayProfile()` (프론트 집계) → AGP 차트
  - 이상치 이벤트 집계 (`getThresholdAlerts`) → backend 전담 예정
  - 패턴 감지 (`getPatternLogs`) → backend 전담 예정, `detectedZones` 필드로 실측 구간 수신 가능
  - 진단 추천 (`getDiagnosisRecommendations`) → backend RAG 결과 수신 예정 (PDF page + link 포함)
- **Backend 전환 방법**: `NEXT_PUBLIC_API_URL` 환경변수 설정만으로 mock → 실 API 전환

---

## 파일 구조

```
mediger-dashboard/
├── app/
│   ├── layout.tsx                     ✅ 공통 헤더 포함 루트 레이아웃
│   ├── page.tsx                       ✅ /dashboard 리디렉트
│   ├── dashboard/
│   │   └── page.tsx                   ✅ 대시보드 (StatCards + FocusList)
│   ├── patients/
│   │   ├── page.tsx                   ✅ 환자 목록 (테이블 + 검색/필터)
│   │   └── [id]/
│   │       ├── page.tsx               ✅ 환자 상세
│   │       └── rx/
│   │           └── page.tsx           ✅ 진단 보조 (DiagnosisReport)
│   └── globals.css
├── src/
│   ├── types/index.ts                 ✅ 전체 타입 정의 (아래 참조)
│   ├── lib/
│   │   ├── api.ts                     ✅ async API 레이어 (BASE_URL 패턴)
│   │   └── mockData.ts                ✅ getAverageDayProfile 유틸만 보유
│   ├── mock/
│   │   ├── base/
│   │   │   ├── patients.json          ✅
│   │   │   ├── dashboard_summary.json ✅
│   │   │   ├── patient_013.json       ✅
│   │   │   ├── glucose_013_day.json   ✅
│   │   │   ├── glucose_013_week.json  ✅
│   │   │   ├── alerts_013.json        ✅ (15분 단위 스냅, 심각도 분류)
│   │   │   ├── rx_history_013.json    ✅
│   │   │   └── patterns_013.json      ✅ PatternLog 6건
│   │   └── datasets/
│   │       └── glucose_013_multiday.json ✅ 10일 × 96포인트 (15분 간격)
│   └── components/
│       ├── layout/
│       │   └── Header.tsx             ✅
│       ├── ui/
│       │   ├── RiskBadge.tsx          ✅
│       │   ├── StatCard.tsx           ✅
│       │   └── ChartFrame.tsx         ✅
│       ├── dashboard/
│       │   └── FocusList.tsx          ✅
│       ├── patients/
│       │   └── PatientTable.tsx       ✅
│       ├── patient/
│       │   ├── PatientAnalytics.tsx   ✅
│       │   ├── GlucoseChart.tsx       ✅
│       │   ├── SummaryCards.tsx       ✅
│       │   ├── AISummary.tsx          ✅
│       │   ├── AlertLog.tsx           ✅
│       │   ├── DoctorNotes.tsx        ✅
│       │   └── DiagnosisReport.tsx    ✅ 진단 보조 리포트 (3섹션)
```

---

## 타입 정의 현황 (`src/types/index.ts`)

| 타입 | 설명 |
|------|------|
| `PatientSummary`, `PatientInfo`, `PatientDetail` | 환자 기본 정보 |
| `DailySummary`, `TrendSummary` | 혈당 요약 통계 |
| `AlertLog` | 이상치 로그 (hypo/hyper/rapid_change) |
| `GlucoseDayPoint`, `GlucoseWeekPoint` | 일간/주간 혈당 포인트 |
| `GlucoseMultidayData` | 다중일 CGM 데이터 (date + readings[]) |
| `AverageDayPoint` | AGP 집계 포인트 (avg/min/max per slot) |
| `ThresholdEvent` | backend 집계 이상치 이벤트 (hypo/hyper) |
| `PatternType`, `PatternSeverity`, `PatternLog` | 패턴 감지 결과 (`detectedZones` 선택 필드 포함) |
| `Recommendation` | 진단 추천 (rank, source, page, link, description) |
| `RxHistory`, `Prescription` | 처방 이력 |

---

## API 엔드포인트 계획 (`src/lib/api.ts`)

| 함수 | 엔드포인트 | 상태 |
|------|-----------|------|
| `getPatients()` | `GET /patients` | Mock |
| `getDashboardSummary()` | `GET /dashboard/summary` | Mock |
| `getPatientDetail(id)` | `GET /patients/:id` | Mock |
| `getGlucoseDayData(id)` | `GET /patients/:id/glucose/day` | Mock |
| `getGlucoseWeekData(id)` | `GET /patients/:id/glucose/week` | Mock |
| `getGlucoseMultidayData(id)` | `GET /patients/:id/glucose/multiday` | Mock |
| `getAlerts(id)` | `GET /patients/:id/alerts` | Mock |
| `getThresholdAlerts(id)` | `GET /patients/:id/alerts/threshold` | Mock (프론트 임시 계산) |
| `getPatternLogs(id)` | `GET /patients/:id/patterns` | Mock |
| `getRxHistory(id)` | `GET /patients/:id/rx/history` | Mock |
| `getDiagnosisRecommendations(id)` | `GET /patients/:id/recommendations` | Mock (RAG 예정) |

---

## DiagnosisReport 구성 (`/patients/[id]/rx`)

### Section 1 — 혈당 패턴 분석 (macro)
- AGP 차트: 10일 평균/최고/최저 라인 (15분 96포인트 집계)
- 패턴 구간 shading: `PatternLog.detectedZones` 우선, 없으면 `PATTERN_ZONES` fallback
- 감지 패턴 유형 legend (색상 chip + 회색 pill)
- 텍스트 분석 결과 placeholder

### Section 2 — 이상치 분석 (micro)
- 최근 1일 원시 혈당 그래프 (TAR/TBR 컬러 dot)
- 텍스트 분석 결과 placeholder
- "Outlier log table 살펴보기" 버튼 → 모달 (전체 기간 이상치 목록, 스크롤)

### Section 3 — 진단 추천
- 2×2 그리드, 1순위 연한 초록 강조
- 출처(링크), 논문 페이지, 설명 텍스트
- backend RAG 응답 구조 그대로 렌더링 (`PDF #page=N` 앵커 지원)

---

## 구현 체크리스트

### P0 — Base MVP
- [x] 타입 정의 (`src/types/index.ts`)
- [x] Mock 데이터: 환자 목록, 대시보드 요약
- [x] Mock 데이터: 환자 상세, 혈당, 이상치, 처방 (013 기준 전 환자 공유)
- [x] Mock 데이터: 패턴 로그, 다중일 CGM (15분 간격 10일)
- [x] 공통 레이아웃 (Header + 라우터)
- [x] `/dashboard` — StatCards + FocusList
- [x] `/patients` — 테이블 + 검색/필터/정렬
- [x] `/patients/[id]` — 상세 (요약, 그래프, AI요약, 이상치, 메모)
- [x] `/patients/[id]/rx` — 진단 보조 (3섹션 리포트)
- [x] 모든 페이지 async Server Component + await API 호출

### P1 — 진단 보조 리포트
- [x] AGP 차트 (10일 평균/최고/최저, TIR 구간)
- [x] 패턴 구간 shading (detectedZones / PATTERN_ZONES fallback)
- [x] 이상치 raw 차트 (TAR/TBR 컬러 dot)
- [x] Outlier log table 모달
- [x] 진단 추천 그리드 (1순위 강조, 출처 링크 + 페이지)
- [x] API 레이어 분리 (`src/lib/api.ts`, BASE_URL 패턴)

### P2 — Backend 연결
- [ ] `NEXT_PUBLIC_API_URL` 설정으로 실 API 전환
- [ ] `getThresholdAlerts` backend 위임 (현재 프론트 임시 계산)
- [ ] `PatternLog.detectedZones` backend 실측 구간 수신
- [ ] RAG 추천 API 연결 (PDF page + link 포함)
- [ ] AWS 서비스 선택 및 연동 (API Gateway / Amplify 미정)

### P3 — 추후 확장
- [ ] motif 구간 그래프 하이라이트
- [ ] PDF/Excel 리포트 출력

---

## 디자인 토큰 (Tailwind 클래스)

| 용도 | 클래스 |
|------|--------|
| 위험 높음 | `bg-red-100 text-red-700 border-red-200` |
| 위험 보통 | `bg-amber-100 text-amber-700 border-amber-200` |
| 위험 낮음 | `bg-emerald-100 text-emerald-700 border-emerald-200` |
| 숫자 강조 | `text-3xl font-bold tabular-nums` |
| 카드 제목 | `text-sm font-medium text-gray-500` |
| AI 요약 | `text-sm text-gray-800 bg-gray-50 p-4 rounded` |
| 면책 문구 | `text-xs text-gray-400 italic` |
| TAR 기준선 | `stroke: #ef4444` dashed |
| TBR 기준선 | `stroke: #2563eb` dashed |
| TIR 배경 | `fill: #dcfce7 opacity 0.4` |
| 패턴 야간 | `fill: #93c5fd` (파랑) |
| 패턴 저녁 | `fill: #fca5a5` (빨강) |
| 패턴 식후 | `fill: #fdba74` (주황) |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-05-06 | P0 Base MVP 전체 구현 완료. TypeScript 빌드 통과. |
| 2026-05-11 | 진단 보조 리포트 3섹션 구현 (AGP 차트, 이상치 분석, 진단 추천). API 레이어 분리 (`src/lib/api.ts`). 다중일 CGM mock 데이터 추가 (10d × 96pt). 타입 통합. 진단 추천에 출처 링크/페이지 추가. |
