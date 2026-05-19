"use client";

import { useState } from "react";
import {
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { GlucoseDayPoint, GlucoseWeekPoint } from "@/src/types";
import { ChartFrame } from "@/src/components/ui/ChartFrame";

type Tab = "day" | "week";

interface Props {
  dayData: GlucoseDayPoint[];
  weekData: GlucoseWeekPoint[];
}

export default function GlucoseChart({ dayData, weekData }: Props) {
  const [tab, setTab] = useState<Tab>("week");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">혈당 그래프</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["day", "week"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "day" ? "일간" : "주간"}
            </button>
          ))}
        </div>
      </div>

      <ChartFrame className="h-60">
        {(width, height) =>
          tab === "day" ? (
            <LineChart
              width={width}
              height={height}
              data={dayData}
              margin={{ top: 5, right: 24, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                interval={3}
              />
              <YAxis
                domain={[40, 360]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v) => `${v}`}
                width={40}
              />
              <Tooltip
                formatter={(v) => [`${v ?? "-"} mg/dL`, "혈당"]}
                labelFormatter={(l) => `시각: ${l}`}
              />
              <ReferenceLine
                y={180}
                stroke="#f87171"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "TAR 180",
                  position: "right",
                  fontSize: 10,
                  fill: "#f87171",
                }}
              />
              <ReferenceLine
                y={70}
                stroke="#60a5fa"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "TBR 70",
                  position: "right",
                  fontSize: 10,
                  fill: "#60a5fa",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          ) : (
            <ComposedChart
              width={width}
              height={height}
              data={weekData}
              margin={{ top: 5, right: 24, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
              />
              <YAxis
                domain={[40, 360]}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                width={40}
              />
              <Tooltip
                formatter={(v, name) => [
                  `${v ?? "-"} mg/dL`,
                  name === "avg" ? "평균" : name === "max" ? "최고" : "최저",
                ]}
                labelFormatter={(l) => `날짜: ${l}`}
              />
              <ReferenceLine
                y={180}
                stroke="#f87171"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "TAR 180",
                  position: "right",
                  fontSize: 10,
                  fill: "#f87171",
                }}
              />
              <ReferenceLine
                y={70}
                stroke="#60a5fa"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "TBR 70",
                  position: "right",
                  fontSize: 10,
                  fill: "#60a5fa",
                }}
              />
              <Line
                type="monotone"
                dataKey="max"
                stroke="#fca5a5"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                name="max"
              />
              <Line
                type="monotone"
                dataKey="min"
                stroke="#93c5fd"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                name="min"
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
                activeDot={{ r: 5 }}
                name="avg"
              />
            </ComposedChart>
          )
        }
      </ChartFrame>

      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-0.5 bg-red-400"
            style={{ borderTop: "2px dashed #f87171" }}
          />
          TAR &gt;180 mg/dL
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-0.5 bg-blue-400"
            style={{ borderTop: "2px dashed #60a5fa" }}
          />
          TBR &lt;70 mg/dL
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-blue-600" />
          평균 혈당
        </span>
        {tab === "week" && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-gray-400" />
            최고/최저 범위
          </span>
        )}
      </div>
    </div>
  );
}
