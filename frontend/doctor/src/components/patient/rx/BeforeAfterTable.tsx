interface Comparison {
  label: string;
  before: string;
  after: string;
  direction: "up" | "down" | "neutral";
  isWorse: boolean;
}

const comparisons: Comparison[] = [
  {
    label: "평균 혈당",
    before: "138 mg/dL",
    after: "142 mg/dL",
    direction: "up",
    isWorse: true,
  },
  {
    label: "TIR",
    before: "68%",
    after: "62%",
    direction: "down",
    isWorse: true,
  },
  {
    label: "저혈당 횟수",
    before: "2회",
    after: "8회",
    direction: "up",
    isWorse: true,
  },
  {
    label: "고혈당 횟수",
    before: "5회",
    after: "9회",
    direction: "up",
    isWorse: true,
  },
  {
    label: "CV (변동성)",
    before: "31%",
    after: "38%",
    direction: "up",
    isWorse: true,
  },
];

const SYMBOL = { up: "↑", down: "↓", neutral: "–" };

export default function BeforeAfterTable() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">처방 전후 비교</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          변경 전 7일 vs 변경 후 12일 (2024-02-15 기준)
        </p>
      </div>
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">
              지표
            </th>
            <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500">
              변경 전
            </th>
            <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500">
              변경 후
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {comparisons.map((c) => (
            <tr key={c.label}>
              <td className="px-5 py-3 text-sm text-gray-700">{c.label}</td>
              <td className="px-5 py-3 text-sm text-right tabular-nums text-gray-500">
                {c.before}
              </td>
              <td className="px-5 py-3 text-sm text-right tabular-nums">
                <span className={c.isWorse ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                  {c.after} {SYMBOL[c.direction]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
