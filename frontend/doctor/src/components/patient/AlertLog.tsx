import type { AlertLog as AlertLogType } from "@/src/types";
import { alertTypeLabel, severityLabel, formatTimestamp } from "@/src/lib/utils";
import clsx from "clsx";

const severityStyles: Record<string, string> = {
  severe: "text-red-700 bg-red-50 border border-red-200",
  moderate: "text-amber-700 bg-amber-50 border border-amber-200",
  mild: "text-gray-600 bg-gray-50 border border-gray-200",
};

export default function AlertLog({ alerts }: { alerts: AlertLogType[] }) {
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          이상치 로그
          {sorted.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {sorted.length}건
            </span>
          )}
        </h2>
      </div>
      {sorted.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">이상치 없음</p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {sorted.map((alert) => (
            <li key={alert.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-xs text-gray-400 font-mono w-28 shrink-0">
                {formatTimestamp(alert.timestamp)}
              </span>
              <span
                className={clsx(
                  "text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap",
                  severityStyles[alert.severity]
                )}
              >
                {alertTypeLabel(alert.type)}
              </span>
              {alert.value != null && (
                <span className="text-sm font-mono text-gray-800 shrink-0">
                  {alert.value} mg/dL
                </span>
              )}
              <span className="text-sm text-gray-600 truncate">
                {alert.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
