import type { RxHistory as RxHistoryType } from "@/src/types";
import { formatDateKo } from "@/src/lib/utils";

export default function RxHistory({
  rxHistory,
}: {
  rxHistory: RxHistoryType[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">처방 변경 이력</h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {rxHistory.map((rx, i) => (
          <li key={i} className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-gray-400">
                {formatDateKo(rx.changedAt)}
              </span>
              {i === 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                  현재
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {rx.prescriptions.map((p) => (
                <li key={p.id} className="text-sm text-gray-700">
                  {p.drug} {p.dose}{" "}
                  <span className="text-gray-400">({p.frequency})</span>
                </li>
              ))}
            </ul>
            {rx.note && (
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                {rx.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
