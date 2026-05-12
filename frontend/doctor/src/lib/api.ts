import type {
  PatientSummary,
  DashboardSummary,
  PatientDetail,
  GlucoseDayPoint,
  GlucoseWeekPoint,
  GlucoseMultidayData,
  AlertLog,
  RxHistory,
  PatternLog,
  ThresholdEvent,
  Recommendation,
} from "@/src/types";

import patientsJson         from "@/src/mock/base/patients.json";
import dashboardJson        from "@/src/mock/base/dashboard_summary.json";
import patient013Json       from "@/src/mock/base/patient_013.json";
import glucose013DayJson    from "@/src/mock/base/glucose_013_day.json";
import glucose013WeekJson   from "@/src/mock/base/glucose_013_week.json";
import glucose013MultidayJson from "@/src/mock/datasets/glucose_013_multiday.json";
import alerts013Json        from "@/src/mock/base/alerts_013.json";
import rxHistory013Json     from "@/src/mock/base/rx_history_013.json";
import patterns013Json      from "@/src/mock/base/patterns_013.json";

// ─── Base fetch helper ────────────────────────────────────────
// BASE_URL 미설정 시 mock 데이터 반환, 설정 시 실제 API 호출

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function get<T>(path: string, mock: T): Promise<T> {
  if (!BASE_URL) return mock;
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Patient APIs ─────────────────────────────────────────────

export async function getPatients(): Promise<PatientSummary[]> {
  return get("/patients", patientsJson as PatientSummary[]);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return get("/dashboard/summary", dashboardJson as DashboardSummary);
}

export async function getPatientDetail(id: string): Promise<PatientDetail | null> {
  return get(`/patients/${id}`, patient013Json as PatientDetail);
}

// ─── Glucose APIs ─────────────────────────────────────────────

export async function getGlucoseDayData(id: string): Promise<GlucoseDayPoint[]> {
  return get(`/patients/${id}/glucose/day`, glucose013DayJson as GlucoseDayPoint[]);
}

export async function getGlucoseWeekData(id: string): Promise<GlucoseWeekPoint[]> {
  return get(`/patients/${id}/glucose/week`, glucose013WeekJson as GlucoseWeekPoint[]);
}

export async function getGlucoseMultidayData(id: string): Promise<GlucoseMultidayData[]> {
  return get(`/patients/${id}/glucose/multiday`, glucose013MultidayJson as GlucoseMultidayData[]);
}

// ─── Alert APIs ───────────────────────────────────────────────

export async function getAlerts(id: string): Promise<AlertLog[]> {
  return get(`/patients/${id}/alerts`, alerts013Json as AlertLog[]);
}

// Backend pre-computes threshold crossings from full CGM history
export async function getThresholdAlerts(id: string): Promise<ThresholdEvent[]> {
  return get(`/patients/${id}/alerts/threshold`, computeMockThresholdEvents());
}

// ─── Pattern APIs ─────────────────────────────────────────────

export async function getPatternLogs(id: string): Promise<PatternLog[]> {
  return get(`/patients/${id}/patterns`, patterns013Json as PatternLog[]);
}

// ─── Prescription APIs ────────────────────────────────────────

export async function getRxHistory(id: string): Promise<RxHistory[]> {
  return get(`/patients/${id}/rx/history`, rxHistory013Json as RxHistory[]);
}

// Backend runs clinical recommendation logic and returns ranked suggestions
export async function getDiagnosisRecommendations(id: string): Promise<Recommendation[]> {
  return get(`/patients/${id}/recommendations`, MOCK_RECOMMENDATIONS);
}

// ─── Mock helpers ─────────────────────────────────────────────

function computeMockThresholdEvents(): ThresholdEvent[] {
  const events: ThresholdEvent[] = [];
  for (const day of glucose013MultidayJson) {
    for (const r of day.readings) {
      if (r.value < 70 || r.value > 180) {
        events.push({
          date: day.date,
          time: r.time,
          value: r.value,
          type: r.value < 70 ? "hypo" : "hyper",
        });
      }
    }
  }
  return events.sort((a, b) =>
    `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
  );
}

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    rank: 1,
    source: "ADA Standards of Care 2024",
    page: "p. S58–S59",
    link: "https://diabetesjournals.org/care/issue/47/Supplement_1",
    description: "야간 저혈당 패턴 반복 관찰. 기저 인슐린 10~20% 감량 및 취침 전 혈당 목표 상향 조정 고려.",
  },
  {
    rank: 2,
    source: "KDA 임상진료지침 2023",
    page: "p. 112–115",
    link: "https://www.diabetes.or.kr/pro/publish/guide.php",
    description: "식후 혈당 스파이크 반복. 식사 구성 검토 및 속효성 인슐린 타이밍 조정 필요.",
  },
  {
    rank: 3,
    source: "KDA 임상진료지침 2023",
    page: "p. 204–207",
    link: "https://www.diabetes.or.kr/pro/publish/guide.php",
    description: "저녁 탄수화물 섭취 변동이 혈당 변동성의 주요 요인. 식이 일관성 지도 권장.",
  },
  {
    rank: 4,
    source: "ATTD 2023 CGM Consensus",
    page: "p. 8–10",
    link: "https://diabetesjournals.org/care/article/46/2/e1/148149",
    description: "Level 2 저혈당 이벤트 반복 감지. CGM 알람 임계값 상향 조정 및 알람 응답 교육 권장.",
  },
];
