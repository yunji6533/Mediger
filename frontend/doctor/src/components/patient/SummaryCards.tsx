import type { DailySummary, TrendSummary } from "@/src/types";
import clsx from "clsx";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}

function MetricCard({ label, value, sub, alert }: MetricCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4",
        alert ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
      )}
    >
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p
        className={clsx(
          "text-2xl font-bold tabular-nums",
          alert ? "text-red-700" : "text-gray-900"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

interface Props {
  daily: DailySummary;
  trend: TrendSummary;
  alertCount: number;
}

export default function SummaryCards({ daily, trend, alertCount }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <MetricCard
        label="평균 혈당 (당일)"
        value={`${daily.avgGlucose} mg/dL`}
        sub={`7일 평균 ${trend.avgGlucose} mg/dL · ${trend.trend === "worsening" ? "악화" : trend.trend === "improving" ? "개선" : "안정"}`}
      />
      <MetricCard
        label="TIR (목표 범위)"
        value={`${daily.tir}%`}
        sub={`TAR ${daily.tar}% / TBR ${daily.tbr}%`}
        alert={daily.tir < 50}
      />
      <MetricCard
        label="CV (변동성)"
        value={`${daily.cv}%`}
        sub={daily.cv >= 36 ? "변동성 높음 (≥36%)" : "변동성 적정"}
        alert={daily.cv >= 36}
      />
      <MetricCard
        label="이상치 (최근 24h)"
        value={`${alertCount}회`}
        sub={`최저 ${daily.minGlucose} / 최고 ${daily.maxGlucose} mg/dL`}
        alert={alertCount > 0}
      />
    </div>
  );
}
