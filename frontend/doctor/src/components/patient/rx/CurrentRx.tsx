import type { RxHistory } from "@/src/types";
import { formatDateKo } from "@/src/lib/utils";

export default function CurrentRx({
  rxHistory,
}: {
  rxHistory: RxHistory[];
}) {
  const current = rxHistory[0];
  if (!current) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">현재 처방</h2>
        <p className="text-sm text-gray-400">처방 이력 없음</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">현재 처방</h2>
        <span className="text-xs text-gray-400">
          최종 변경: {formatDateKo(current.changedAt)}
        </span>
      </div>
      <ul className="space-y-2.5">
        {current.prescriptions.map((rx) => (
          <li key={rx.id} className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-800">
                {rx.drug}
              </span>
              <span className="text-sm text-gray-600 ml-2">{rx.dose}</span>
              <span className="text-xs text-gray-400 ml-2">
                ({rx.frequency})
              </span>
              <span className="text-xs text-gray-400 ml-1">· {rx.route}</span>
            </div>
          </li>
        ))}
      </ul>
      {current.note && (
        <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-2.5 rounded-lg leading-relaxed">
          📝 {current.note}
        </p>
      )}
    </div>
  );
}
