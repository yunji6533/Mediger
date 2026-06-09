import { useState } from "react";
import { RecordItem } from "../../types";

export function DailyLineChart({
  records,
  compact = false,
  targetRange,
}: {
  records: RecordItem[];
  compact?: boolean;
  targetRange: { min: number; max: number };
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 320;
  const height = compact ? 145 : 180;
  const minValue = 50;
  const maxValue = 230;

  const timeToHours = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(":")) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h + (m || 0) / 60;
  };

  const points = records.map((item) => {
    const hours = timeToHours(item.time);
    const x = (hours / 24) * width;
    const y = height - ((item.glucose - minValue) / (maxValue - minValue)) * height;
    return { x, y: Math.max(0, Math.min(height, y)), value: item.glucose, isManual: item.type === "manual" };
  });

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x + 22} ${point.y}`
    )
    .join(" ");

  const targetTop =
    height - ((targetRange.max - minValue) / (maxValue - minValue)) * height;
  const targetBottom =
    height - ((targetRange.min - minValue) / (maxValue - minValue)) * height;

  return (
    <div className="mt-4 rounded-3xl bg-white">
      <svg
        viewBox={`0 0 ${width + 22} ${height}`}
        className={compact ? "h-36 w-full" : "h-48 w-full"}
        style={{ overflow: "visible" }}
      >
        <text x="0" y="18" className="fill-slate-500 text-xs">
          230
        </text>
        <text x="0" y={targetTop + 4} className="fill-slate-500 text-xs">
          {targetRange.max}
        </text>
        <text x="0" y={targetBottom + 4} className="fill-slate-500 text-xs">
          {targetRange.min}
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

        {/* X축 시간 라벨 직접 렌더링 (SVG 내에서 완벽한 정렬) */}
        {["00:00", "06:00", "12:00", "18:00", "23:59"].map((time, idx) => {
          const xPos = (timeToHours(time) / 24) * width + 22;
          return (
            <text key={`x-axis-${idx}`} x={xPos} y={height + 18} textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
              {time}
            </text>
          );
        })}

        {points.map((point, index) => {
          const isOutlier = point.value >= targetRange.max || point.value <= targetRange.min;
          return (
            <g
              key={index}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            >
              <circle
                cx={point.x + 22}
                cy={point.y}
                r={point.isManual ? (hoverIndex === index ? "6" : "5") : isOutlier ? (hoverIndex === index ? "6" : "4") : "0"}
                className={`${point.isManual ? "fill-orange-500" : isOutlier ? "fill-red-500" : "fill-[#285b8f]"} transition-all duration-200`}
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

        {/* 맨 마지막에 렌더링하여 툴팁이 그래프와 선 위에 보이도록 함 */}
        {hoverIndex !== null && (() => {
          const point = points[hoverIndex];
          const record = records[hoverIndex];

          const hasMemo = Boolean(record.memo && record.memo !== "특이사항 없음");
          const displayMemo = hasMemo ? (record.memo.length > 20 ? record.memo.slice(0, 20) + "..." : record.memo) : "";
          const tooltipWidth = hasMemo ? Math.max(90, displayMemo.length * 11 + 20) : 80;
          const tooltipHeight = hasMemo ? 44 : 26;

          const tooltipX = Math.max(tooltipWidth / 2, Math.min(width + 22 - tooltipWidth / 2, point.x + 22));
          // 항상 위에 툴팁 렌더링
          const tooltipY = point.y - tooltipHeight - 9;

          return (
            <g className="pointer-events-none">
              <line
                x1="22"
                y1={point.y}
                x2={point.x + 22}
                y2={point.y}
                className="stroke-slate-400"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <line
                x1={point.x + 22}
                y1={point.y}
                x2={point.x + 22}
                y2={height}
                className="stroke-slate-400"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <rect
                x={tooltipX - tooltipWidth / 2}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx={hasMemo ? "10" : "13"}
                className="fill-[#07142f]"
              />
              <text
                x={tooltipX}
                y={tooltipY + (hasMemo ? 17 : 17)}
                textAnchor="middle"
                className="fill-white text-[11px] font-bold"
              >
                {record.time} • {record.glucose}
              </text>
              {hasMemo && (
                <text
                  x={tooltipX}
                  y={tooltipY + 33}
                  textAnchor="middle"
                  className="fill-slate-300 text-[10px] font-medium"
                >
                  {displayMemo}
                </text>
              )}
            </g>
          );
        })()}
      </svg>

      <p className="mt-8 text-sm text-slate-500">
        연두색 영역은 정상 범위 {targetRange.min}~{targetRange.max}mg/dL입니다.
      </p>
    </div>
  );
}
