import Link from "next/link";
import type { PatientSummary } from "@/src/types";
import RiskBadge from "@/src/components/ui/RiskBadge";
import { daysSince } from "@/src/lib/utils";

function getSubText(p: PatientSummary): string {
  if (p.dataStatus === "missing") {
    const days = daysSince(p.lastDataAt);
    return `데이터 미입력 ${days}일`;
  }
  const parts: string[] = [];
  if (p.alertCount24h > 0) parts.push(`최근 24시간 이상치 ${p.alertCount24h}회`);
  if (p.tir !== undefined) parts.push(`TIR ${p.tir}%`);
  if (p.avgGlucose7d !== undefined)
    parts.push(`7일 평균 ${p.avgGlucose7d} mg/dL`);
  return parts.slice(0, 2).join(" · ");
}

const RISK_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default function FocusList({
  patients,
}: {
  patients: PatientSummary[];
}) {
  const sorted = [...patients].sort((a, b) => {
    const diff = RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel];
    if (diff !== 0) return diff;
    return b.alertCount24h - a.alertCount24h;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">집중 관리 대상</h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {sorted.map((p) => (
          <li key={p.patientId}>
            <Link
              href={`/patients/${p.patientId}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-gray-900 w-16 shrink-0">
                  {p.name}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  #{p.patientId}
                </span>
                <span className="text-sm text-gray-500 truncate">
                  {getSubText(p)}
                </span>
              </div>
              <div className="shrink-0 ml-4">
                <RiskBadge level={p.riskLevel} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
