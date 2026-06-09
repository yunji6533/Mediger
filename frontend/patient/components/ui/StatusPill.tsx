export function StatusPill({ value, targetRange }: { value: number; targetRange: { min: number; max: number } }) {
  const isLow = value <= targetRange.min;
  const isHigh = value >= targetRange.max;
  const text = isLow ? "주의" : isHigh ? "위험" : "정상";

  return (
    <div
      className={`rounded-full px-5 py-2.5 text-sm font-black shadow-sm ${isHigh
        ? "bg-red-50 text-red-600"
        : isLow
          ? "bg-orange-50 text-orange-600"
          : "bg-emerald-50 text-emerald-600"
        }`}
    >
      {text}
    </div>
  );
}