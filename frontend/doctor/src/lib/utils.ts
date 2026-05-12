import type { RiskLevel, DataStatus } from "@/src/types";

export function riskLevelLabel(level: RiskLevel): string {
  return { high: "높음", medium: "보통", low: "낮음" }[level];
}

export function riskLevelEmoji(level: RiskLevel): string {
  return { high: "🔴", medium: "🟡", low: "🟢" }[level];
}

export function dataStatusLabel(status: DataStatus): string {
  return { active: "정상", missing: "미입력", stale: "오래됨" }[status];
}

export function alertTypeLabel(type: string): string {
  const map: Record<string, string> = {
    hypo: "저혈당",
    hyper: "고혈당",
    rapid_change: "급변",
    missing_data: "데이터 누락",
  };
  return map[type] ?? type;
}

export function severityLabel(severity: string): string {
  const map: Record<string, string> = {
    mild: "경증",
    moderate: "중등도",
    severe: "중증",
  };
  return map[severity] ?? severity;
}

export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

export function formatDateKo(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}
