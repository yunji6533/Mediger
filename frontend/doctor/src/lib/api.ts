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
  PatternType,
  ThresholdEvent,
  Recommendation,
} from "@/src/types";

import patientsJson           from "@/src/mock/base/patients.json";
import dashboardJson          from "@/src/mock/base/dashboard_summary.json";
import patient013Json         from "@/src/mock/base/patient_013.json";
import glucose013DayJson      from "@/src/mock/base/glucose_013_day.json";
import glucose013WeekJson     from "@/src/mock/base/glucose_013_week.json";
import glucose013MultidayJson from "@/src/mock/datasets/glucose_013_multiday.json";
import alerts013Json          from "@/src/mock/base/alerts_013.json";
import rxHistory013Json       from "@/src/mock/base/rx_history_013.json";
import patterns013Json        from "@/src/mock/base/patterns_013.json";

// BASE_URL 없으면 mock, 있으면 실제 API 호출
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Patient APIs ─────────────────────────────────────────────

export async function getPatients(): Promise<PatientSummary[]> {
  if (!BASE_URL) return patientsJson as PatientSummary[];
  const data = await apiFetch<{ patients: any[]; total: number }>("/api/doctor/patients");
  return data.patients.map((p) => ({
    patientId: p.patient_id,
    name: p.name ?? `환자 ${p.patient_id}`,
    age: Number(p.age),
    gender: p.gender as "M" | "F",
    latestGlucose: p.latest_glucose,
    tir: p.tir,
    tar: p.tar,
    tbr: p.tbr,
    alertCount24h: p.anomaly_count ?? 0,
    riskLevel: p.risk_level,
    dataStatus: p.last_updated ? "active" : "missing",
    lastDataAt: p.last_updated,
  }));
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!BASE_URL) return dashboardJson as DashboardSummary;
  const data = await apiFetch<{ patients: any[]; total: number }>("/api/doctor/patients");
  const highRisk = data.patients.filter((p) => p.risk_level === "high").length;
  const totalAnomalies = data.patients.reduce((s, p) => s + (p.anomaly_count ?? 0), 0);
  return {
    totalPatients: data.total,
    highRiskCount: highRisk,
    alertCount24h: totalAnomalies,
    pendingSummaryCount: 0,
  };
}

export async function getPatientDetail(id: string): Promise<PatientDetail | null> {
  if (!BASE_URL) return patient013Json as PatientDetail;
  try {
    const [patientsData, tsData] = await Promise.all([
      apiFetch<{ patients: any[] }>("/api/doctor/patients"),
      apiFetch<{ timeseries: Array<{ time: string; glucose: number }> }>(
        `/api/patient/${id}/timeseries?range=max`
      ).catch(() => ({ timeseries: [] as Array<{ time: string; glucose: number }> })),
    ]);
    const p = patientsData.patients.find((pt) => pt.patient_id === id);
    if (!p) return null;

    const vals = (tsData.timeseries ?? []).map((pt) => pt.glucose);
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : (p.avg_glucose ?? 0);
    const std = vals.length > 1
      ? Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length)
      : 0;
    const cv = avg > 0 ? Math.round((std / avg) * 1000) / 10 : 0;
    const minGlucose = vals.length > 0 ? Math.round(Math.min(...vals) * 10) / 10 : 0;
    const maxGlucose = vals.length > 0 ? Math.round(Math.max(...vals) * 10) / 10 : 0;

    return {
      patientInfo: {
        patientId: p.patient_id,
        name: p.name ?? `환자 ${p.patient_id}`,
        age: Number(p.age),
        gender: p.gender as "M" | "F",
        diagnosis: "2형 당뇨",
        registeredAt: "",
      },
      dailySummary: {
        date: p.last_updated?.slice(0, 10) ?? "",
        avgGlucose: Math.round(avg * 10) / 10,
        tir: p.tir ?? 0,
        tar: p.tar ?? 0,
        tbr: p.tbr ?? 0,
        cv,
        minGlucose,
        maxGlucose,
      },
      trendSummary: {
        period: "7d",
        avgGlucose: Math.round(avg * 10) / 10,
        tir: p.tir ?? 0,
        tar: p.tar ?? 0,
        tbr: p.tbr ?? 0,
        cv,
        trend: "stable",
      },
    };
  } catch {
    return null;
  }
}

// ─── Glucose APIs ─────────────────────────────────────────────

export async function getGlucoseDayData(id: string): Promise<GlucoseDayPoint[]> {
  if (!BASE_URL) return glucose013DayJson as GlucoseDayPoint[];
  try {
    const data = await apiFetch<{ timeseries: Array<{ time: string; glucose: number }> }>(
      `/api/patient/${id}/today`
    );
    const pts = (data.timeseries ?? []).map((pt) => ({
      time: pt.time.slice(11, 16),
      value: pt.glucose,
    }));
    return pts.length > 0 ? pts : (glucose013DayJson as GlucoseDayPoint[]);
  } catch {
    return glucose013DayJson as GlucoseDayPoint[];
  }
}

async function fetchFullTimeseries(id: string) {
  return apiFetch<{ timeseries: Array<{ time: string; glucose: number }> }>(
    `/api/patient/${id}/timeseries?range=max`
  );
}

export async function getGlucoseWeekData(id: string): Promise<GlucoseWeekPoint[]> {
  if (!BASE_URL) return glucose013WeekJson as GlucoseWeekPoint[];
  try {
    const data = await fetchFullTimeseries(id);
    const byDate = new Map<string, number[]>();
    for (const pt of data.timeseries ?? []) {
      const date = pt.time.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(pt.glucose);
    }
    const result = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        const tir = (vals.filter((v) => v >= 70 && v <= 180).length / vals.length) * 100;
        return {
          date,
          avg: Math.round(avg * 10) / 10,
          min: Math.min(...vals),
          max: Math.max(...vals),
          tir: Math.round(tir * 10) / 10,
        };
      });
    return result.length > 0 ? result : (glucose013WeekJson as GlucoseWeekPoint[]);
  } catch {
    return glucose013WeekJson as GlucoseWeekPoint[];
  }
}

export async function getGlucoseMultidayData(id: string): Promise<GlucoseMultidayData[]> {
  if (!BASE_URL) return glucose013MultidayJson as GlucoseMultidayData[];
  try {
    const data = await fetchFullTimeseries(id);
    const byDate = new Map<string, GlucoseDayPoint[]>();
    for (const pt of data.timeseries ?? []) {
      const date = pt.time.slice(0, 10);
      const time = pt.time.slice(11, 16);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push({ time, value: pt.glucose });
    }
    const result = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, readings]) => ({ date, readings }));
    return result.length > 0 ? result : (glucose013MultidayJson as GlucoseMultidayData[]);
  } catch {
    return glucose013MultidayJson as GlucoseMultidayData[];
  }
}

// ─── Alert APIs ───────────────────────────────────────────────

export async function getAlerts(id: string): Promise<AlertLog[]> {
  if (!BASE_URL) return alerts013Json as AlertLog[];
  try {
    const data = await apiFetch<{ hypo: { events: any[] }; hyper: { events: any[] } }>(
      `/api/patient/${id}/report/anomaly`
    );
    const all = [...(data.hypo?.events ?? []), ...(data.hyper?.events ?? [])];
    return all
      .map((e, i) => {
        const g: number = e.glucose;
        const severity: "severe" | "moderate" | "mild" =
          g < 54 || g > 250 ? "severe" : g < 70 || g > 180 ? "moderate" : "mild";
        return {
          id: `${e.timestamp}-${i}`,
          patientId: id,
          timestamp: e.timestamp,
          type: g < 70 ? ("hypo" as const) : ("hyper" as const),
          severity,
          value: g,
          message: g < 70 ? `저혈당 ${g} mg/dL` : `고혈당 ${g} mg/dL`,
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return alerts013Json as AlertLog[];
  }
}

export async function getThresholdAlerts(id: string): Promise<ThresholdEvent[]> {
  if (!BASE_URL) return computeMockThresholdEvents();
  try {
    const data = await apiFetch<{ hypo: { events: any[] }; hyper: { events: any[] } }>(
      `/api/patient/${id}/report/anomaly`
    );
    const all = [...(data.hypo?.events ?? []), ...(data.hyper?.events ?? [])];
    return all
      .map((e) => ({
        date: (e.timestamp as string)?.slice(0, 10) ?? "",
        time: (e.timestamp as string)?.slice(11, 16) ?? "",
        value: e.glucose as number,
        type: (e.glucose as number) < 70 ? ("hypo" as const) : ("hyper" as const),
      }))
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  } catch {
    return computeMockThresholdEvents();
  }
}

// ─── Pattern APIs ─────────────────────────────────────────────

export async function getPatternLogs(id: string): Promise<PatternLog[]> {
  if (!BASE_URL) return patterns013Json as PatternLog[];
  try {
    const data = await apiFetch<{ hourly_pattern: any[] }>(`/api/patient/${id}/report/pattern`);
    return (data.hourly_pattern ?? [])
      .filter((h: any) => h.hypo_count > 0 || h.hyper_count > 0)
      .map((h: any) => {
        const hour = parseInt(h.hour);
        const patternType: PatternType =
          h.hypo_count > 0
            ? hour >= 0 && hour <= 6
              ? "nocturnal_hypo_pattern"
              : "postprandial_spike_pattern"
            : "evening_hyper_trend";
        const count: number = h.hypo_count + h.hyper_count;
        const severity = count > 50 ? "high" : count > 20 ? "medium" : ("low" as const);
        return {
          id: `pattern-${id}-${h.hour}`,
          patientId: id,
          timestamp: new Date().toISOString(),
          patternType,
          severity,
          value: (h.avg_glucose as number) ?? null,
        };
      });
  } catch {
    return patterns013Json as PatternLog[];
  }
}

// ─── Prescription APIs ────────────────────────────────────────

export async function getRxHistory(_id: string): Promise<RxHistory[]> {
  // 처방 이력 API 엔드포인트 미구현 → mock 유지
  return rxHistory013Json as RxHistory[];
}

// ─── Pattern / Anomaly Analysis Text ─────────────────────────

export async function getPatternAnalysis(id: string): Promise<string> {
  if (!BASE_URL) return "";
  try {
    const data = await apiFetch<{ analysis: string }>(`/api/patient/${id}/report/pattern`);
    return data.analysis ?? "";
  } catch {
    return "";
  }
}

export async function getAnomalyAnalysis(id: string): Promise<string> {
  if (!BASE_URL) return "";
  try {
    const data = await apiFetch<{
      hypo: { analysis?: string };
      hyper: { analysis?: string };
    }>(`/api/patient/${id}/report/anomaly`);
    const parts = [data.hypo?.analysis, data.hyper?.analysis].filter(Boolean);
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

// ─── Diagnosis Recommendation ─────────────────────────────────

export async function getDiagnosisRecommendations(id: string): Promise<Recommendation[]> {
  if (!BASE_URL) return MOCK_RECOMMENDATIONS;
  try {
    const data = await apiFetch<{
      recommendation: { text: string; sources: any[] };
    }>(`/api/patient/${id}/report/recommendation`);
    const recs = parseRecommendations(
      data.recommendation?.text ?? "",
      data.recommendation?.sources ?? []
    );
    return recs.length > 0 ? recs : MOCK_RECOMMENDATIONS;
  } catch {
    return MOCK_RECOMMENDATIONS;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function parseRecommendations(text: string, sources: any[]): Recommendation[] {
  const sourceTitle = sources.find((s) => s.section)?.title ?? "KDA 임상진료지침 2023";

  // "가이드라인 근거:" 섹션에서 번호 없는 설명 추출 (2021번 형식)
  const guidelineLines: string[] = [];
  const guidelineBlock = text.match(/가이드라인 근거:([\s\S]*?)(?=\n\n권고안:|\n권고안:|$)/);
  if (guidelineBlock) {
    for (const line of guidelineBlock[1].split("\n")) {
      const m = line.trim().match(/^\d+\.\s+(.+?)(?:\s*-\s*\[.+?\].*)?$/);
      if (m) guidelineLines.push(m[1].trim());
    }
  }

  return text
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)순위:\s*(.+)/))
    .filter(Boolean)
    .map((m) => {
      const rank = parseInt(m![1]);
      const rest = m![2];
      const drugName = rest.split(" - [근거:")[0].trim();

      // 형식 1: [근거: "quoted evidence"] → 인용문 사용
      const quotedMatch = rest.match(/\[근거:[^"]*"([^"]+)"/);
      if (quotedMatch) {
        return { rank, source: sourceTitle, description: `${drugName}: ${quotedMatch[1]}` };
      }

      // 형식 2: 인용문 없음 → 가이드라인 근거 섹션에서 약물명 매칭
      const firstWord = drugName.split(/[\s(]/)[0];
      const matched = guidelineLines.find(
        (g) => g.includes(firstWord) || firstWord.length > 3 && drugName.includes(g.split(" ")[0])
      );
      if (matched) {
        return { rank, source: sourceTitle, description: matched };
      }

      return { rank, source: sourceTitle, description: drugName };
    });
}

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
