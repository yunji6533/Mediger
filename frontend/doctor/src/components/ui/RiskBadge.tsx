import clsx from "clsx";
import type { RiskLevel } from "@/src/types";

const config: Record<RiskLevel, { label: string; className: string }> = {
  high: {
    label: "🔴 높음",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  medium: {
    label: "🟡 보통",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  low: {
    label: "🟢 낮음",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

export default function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, className } = config[level];
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        className
      )}
    >
      {label}
    </span>
  );
}
