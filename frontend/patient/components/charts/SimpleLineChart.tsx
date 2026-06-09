import { useState } from "react";

export function SimpleLineChart({
  data,
  targetRange,
}: {
  data: { label: string; glucose: number }[];
  targetRange?: { min: number; max: number };
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 320;
  const height = 180;
  const minValue = 50;
  const maxValue = 230;

  const safeTargetRange = targetRange || { min: 70, max: 180 };

  const points = data.map((item, index) => {
    const x =
      data.length <= 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y =
      height - ((item.glucose - minValue) / (maxValue - minValue)) * height;
    return {
      x,
      y: Math.max(0, Math.min(height, y)),
      value: item.glucose,
      label: item.label,
    };
  });

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x + 22} ${point.y}`
    )
    .join(" ");

  const targetTop =
    height - ((safeTargetRange.max - minValue) / (maxValue - minValue)) * height;
  const targetBottom =
    height - ((safeTargetRange.min - minValue) / (maxValue - minValue)) * height;

  return (
    <div className="mt-4 rounded-3xl bg-white">
      <svg
        viewBox={`0 0 ${width + 22} ${height}`}
        className="h-48 w-full"
        style={{ overflow: "visible" }}
      >
        <text x="0" y="18" className="fill-slate-500 text-xs">
          230
        </text>
        <text x="0" y={targetTop + 4} className="fill-slate-500 text-xs">
          {safeTargetRange.max}
        </text>
        <text x="0" y={targetBottom + 4} className="fill-slate-500 text-xs">
          {safeTargetRange.min}
        </text>
        <text x="0" y={height - 2} className="fill-slate-500 text-xs">
          50
        </text>

        {/* X, Y Axis */}
        <line x1="22" y1="0" x2="22" y2={height} className="stroke-slate-800" strokeWidth="2" />
        <line x1="22" y1={height} x2={width + 22} y2={height} className="stroke-slate-800" strokeWidth="2" />

        <rect
          x="22"
          y={targetTop}
          width={width}
          height={targetBottom - targetTop}
          className="fill-emerald-100"
          opacity="0.5"
        />

        <line
          x1="22"
          y1={targetTop}
          x2={width + 22}
          y2={targetTop}
          className="stroke-red-300"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        <line
          x1="22"
          y1={targetBottom}
          x2={width + 22}
          y2={targetBottom}
          className="stroke-red-300"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        <path
          d={path}
          fill="none"
          className="stroke-[#285b8f]"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X축 시간 라벨 직접 렌더링 */}
        {points.map((point, idx) => {
          return (
            <text key={`x-axis-${idx}`} x={point.x + 22} y={height + 18} textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
              {point.label}
            </text>
          );
        })}

        {points.map((point, index) => {
          const isOutlier = point.value >= safeTargetRange.max || point.value <= safeTargetRange.min;
          return (
            <g
              key={index}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            >
              {/* 항상 수치 보여주기 */}
              <text x={point.x + 22} y={point.y - 12} textAnchor="middle" className="fill-[#07142f] text-[11px] font-bold">
                {Math.round(point.value)}
              </text>

              <circle
                cx={point.x + 22}
                cy={point.y}
                r={hoverIndex === index ? "6" : "4"}
                className={`${isOutlier ? "fill-red-500" : "fill-[#285b8f]"} transition-all duration-200`}
              />
              <circle
                cx={point.x + 22}
                cy={point.y}
                r="15"
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>

      <p className="mt-8 text-sm text-slate-500">
        연두색 영역은 정상 범위 {safeTargetRange.min}~{safeTargetRange.max}mg/dL입니다.
      </p>
    </div>
  );
}
