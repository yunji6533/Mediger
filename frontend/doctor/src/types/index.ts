// ─── Base Types ───────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";
export type DataStatus = "active" | "missing" | "stale";

export interface PatientInfo {
  patientId: string;
  name: string;
  age: number;
  gender: "M" | "F";
  diagnosis: string;
  registeredAt: string;
}

export interface DailySummary {
  date: string;
  avgGlucose: number;
  tir: number; // %
  tar: number; // %
  tbr: number; // %
  cv: number;  // %
  minGlucose: number;
  maxGlucose: number;
  mage?: number;
}

export interface TrendSummary {
  period: "7d" | "14d" | "30d";
  avgGlucose: number;
  tir: number;
  tar: number;
  tbr: number;
  cv: number;
  trend: "improving" | "stable" | "worsening";
}

export interface AlertLog {
  id: string;
  patientId: string;
  timestamp: string;
  type: "hypo" | "hyper" | "rapid_change" | "missing_data";
  severity: "mild" | "moderate" | "severe";
  value?: number;
  message: string;
}

export interface RiskStatus {
  patientId: string;
  level: RiskLevel;
  reasons: string[];
  lastUpdated: string;
}

export interface GlucosePoint {
  timestamp: string;
  value: number;
}

export interface PatientSummary {
  patientId: string;
  name: string;
  age: number;
  gender?: "M" | "F";
  heightCm?: number;
  weightKg?: number;
  lastVisitDate?: string;
  latestGlucose?: number;
  avgGlucose7d?: number;
  tir?: number;
  tar?: number;
  tbr?: number;
  cv?: number;
  alertCount24h: number;
  riskLevel: RiskLevel;
  dataStatus: DataStatus;
  lastDataAt?: string;
}

export interface BasePatientDetail {
  patientInfo: PatientInfo;
  dailySummary: DailySummary;
  trendSummary: TrendSummary;
  alerts: AlertLog[];
  llmSummary?: string;
}

export interface Prescription {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
}

export interface RxHistory {
  changedAt: string;
  prescriptions: Prescription[];
  note?: string;
}

export interface DoctorNote {
  id: string;
  patientId: string;
  doctorId: string;
  content: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalPatients: number;
  highRiskCount: number;
  alertCount24h: number;
  pendingSummaryCount: number;
}

// ─── Glucose Data Types ───────────────────────────────────────

export interface GlucoseDayPoint {
  time: string;
  value: number;
}

export interface GlucoseWeekPoint {
  date: string;
  avg: number;
  min: number;
  max: number;
  tir: number;
}

export interface GlucoseMultidayData {
  date: string;
  readings: GlucoseDayPoint[];
}

export interface AverageDayPoint {
  time: string;
  avg: number;
  min: number;
  max: number;
}

export interface ThresholdEvent {
  date: string;
  time: string;
  value: number;
  type: "hypo" | "hyper";
}

// ─── Patient Detail ───────────────────────────────────────────

export interface PatientDetail {
  patientInfo: PatientInfo;
  dailySummary: DailySummary;
  trendSummary: TrendSummary;
  llmSummary?: string;
}

// ─── Diagnosis Recommendation ─────────────────────────────────

export interface Recommendation {
  rank: number;
  source: string;
  page?: string;
  link?: string;
  description: string;
}

// 규칙 기반 감별 가설 (소수점 확률 없이 "유력 순" 서열만)
export interface PatternHypothesis {
  code: string;
  label: string;
}

// 최근 14일 이상치 실측 건수
export interface AnomalySummary {
  hypoCount: number;
  hyperCount: number;
}

// /report/recommendation 한 번 호출로 받는 진단 추천 페이지 데이터 묶음
export interface DiagnosisReportData {
  recommendations: Recommendation[];
  hypotheses: PatternHypothesis[];
  matchedRuleIds: string[];
  anomalySummary: AnomalySummary | null;
}

// ─── Pattern Log Types ────────────────────────────────────────

export type PatternType =
  | "nocturnal_hypo_pattern"
  | "evening_hyper_trend"
  | "postprandial_spike_pattern"
  | "rapid_glucose_change"
  | "post_hypo_glucose_rise"
  | "high_glucose_variability";

export type PatternSeverity = "high" | "medium" | "low";

export interface PatternLog {
  id: string;
  patientId: string;
  timestamp: string;
  patternType: PatternType;
  severity: PatternSeverity;
  value: number | null;
  detectedZones?: { start: string; end: string }[];
}
