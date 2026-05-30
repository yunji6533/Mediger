"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CalendarDays, Maximize2, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailySummary } from "@/src/types";
import type { GlucoseDayPoint, GlucoseWeekPoint } from "@/src/types";
import { ChartFrame, ChartRenderer } from "@/src/components/ui/ChartFrame";

type GlucoseView = "day" | "all";

interface Props {
  dailySummary: DailySummary;
  dayData: GlucoseDayPoint[];
  weekData: GlucoseWeekPoint[];
}

interface TirPoint extends GlucoseWeekPoint {
  tar: number;
  tbr: number;
}

const TBR_BAR_COLOR = "rgba(14, 165, 233, 0.9)";
const TIR_BAR_COLOR = "rgba(22, 163, 74, 0.9)";
const TAR_BAR_COLOR = "rgba(249, 115, 22, 0.9)";

function gmi(avg: number) {
  return Number((3.31 + 0.02392 * avg).toFixed(1));
}

function buildTirPoint(point: GlucoseWeekPoint): TirPoint {
  const tbr =
    point.min < 70 ? Math.min(18, Math.round((70 - point.min) / 3) + 4) : 4;
  const tar = Math.max(0, 100 - point.tir - tbr);
  return { ...point, tbr, tar };
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toShortDate(date: string) {
  if (/^\d{2}\/\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(
    parsed.getDate()
  ).padStart(2, "0")}`;
}

function chartCard(title: string, action: ReactNode, children: ReactNode) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-gray-800">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
      aria-label="차트 확대"
      title="차트 확대"
    >
      <Maximize2 size={15} />
    </button>
  );
}

function LineGuide({
  items,
}: {
  items: { color: string; dashed?: boolean; label: string }[];
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-gray-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-5"
            style={{
              borderTop: `2px ${item.dashed ? "dashed" : "solid"} ${
                item.color
              }`,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ChartModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ChartRenderer;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-6xl rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="닫기"
          >
            <X size={17} />
          </button>
        </div>
        <ChartFrame className="h-[520px] min-h-0 min-w-0">{children}</ChartFrame>
      </div>
    </div>
  );
}

function DetailStackedBar({ point }: { point: TirPoint }) {
  const segments = [
    { key: "tbr", label: "TBR", value: point.tbr, bg: TBR_BAR_COLOR },
    { key: "tir", label: "TIR", value: point.tir, bg: TIR_BAR_COLOR },
    { key: "tar", label: "TAR", value: point.tar, bg: TAR_BAR_COLOR },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[15px] font-semibold tracking-tight text-gray-800">
          {point.date} 상세
        </p>
        <p className="text-[11px] font-medium text-gray-500">TIR/TAR/TBR 구성</p>
      </div>
      <div className="flex h-10 overflow-hidden rounded-md bg-gray-100 shadow-inner">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="flex min-w-16 items-center justify-center px-2 text-[12px] font-semibold tracking-tight text-white"
            style={{
              width: `${segment.value}%`,
              backgroundColor: segment.bg,
            }}
            title={`${segment.label} ${segment.value}%`}
          >
            {segment.label} {segment.value}%
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatientAnalytics({
  dailySummary,
  dayData,
  weekData,
}: Props) {
  const maxDays = Math.min(14, Math.max(1, weekData.length));
  const rangeOptions = Array.from({ length: maxDays }, (_, index) => index + 1);
  const [rangeDays, setRangeDays] = useState(maxDays);
  const [glucoseView, setGlucoseView] = useState<GlucoseView>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modal, setModal] = useState<ChartRenderer | null>(null);
  const [modalTitle, setModalTitle] = useState("");

  const rangeData = useMemo(
    () => weekData.slice(Math.max(0, weekData.length - rangeDays)),
    [rangeDays, weekData]
  );
  const availableDates = useMemo(
    () => rangeData.map((point) => point.date),
    [rangeData]
  );
  const [dayDate, setDayDate] = useState(
    () => availableDates.at(-1) ?? toShortDate(dailySummary.date)
  );
  const activeDayDate =
    (availableDates.includes(dayDate) ? dayDate : availableDates.at(-1)) ??
    toShortDate(dailySummary.date);

  const tirData = useMemo(() => rangeData.map(buildTirPoint), [rangeData]);

  const trendData = useMemo(
    () =>
      rangeData.map((point) => ({
        date: point.date,
        cv: Number(
          (((point.max - point.min) / Math.max(point.avg, 1)) * 32).toFixed(1)
        ),
        mean: point.avg,
        gmi: gmi(point.avg),
      })),
    [rangeData]
  );

  const rocData = useMemo(
    () =>
      dayData.map((point, index) => {
        if (index === 0) return { time: point.time, roc: 0 };
        return {
          time: point.time,
          roc: Number(
            ((point.value - dayData[index - 1].value) / 60).toFixed(2)
          ),
        };
      }),
    [dayData]
  );

  const dailyFallbackTir = useMemo(
    () =>
      buildTirPoint({
        date: activeDayDate,
        avg: dailySummary.avgGlucose,
        min: dailySummary.minGlucose,
        max: dailySummary.maxGlucose,
        tir: dailySummary.tir,
      }),
    [dailySummary, activeDayDate]
  );

  const detailDate = selectedDate;
  const detailTir =
    detailDate != null
      ? tirData.find((point) => point.date === detailDate) ?? null
      : null;

  const averages = useMemo(() => {
    const tirPoints = tirData.length > 0 ? tirData : [dailyFallbackTir];

    return {
      tir: mean(tirPoints.map((point) => point.tir)).toFixed(1),
      tbr: mean(tirPoints.map((point) => point.tbr)).toFixed(1),
      tar: mean(tirPoints.map((point) => point.tar)).toFixed(1),
      cv: mean(trendData.map((point) => point.cv)).toFixed(1),
      meanGlucose: Math.round(mean(tirPoints.map((point) => point.avg))),
      gmi: gmi(mean(tirPoints.map((point) => point.avg))).toFixed(1),
    };
  }, [dailyFallbackTir, tirData, trendData]);

  function openModal(title: string, content: ChartRenderer) {
    setModalTitle(title);
    setModal(() => content);
  }

  function handleTirDateClick(data: unknown) {
    const state = data as { payload?: { date?: string } };
    const date = state.payload?.date ?? null;
    if (date) setSelectedDate(date);
  }

  function renderGlucoseChart(width: number, height: number): ReactNode {
    return glucoseView === "day" ? (
      <LineChart
        width={width}
        height={height}
        data={dayData}
        margin={{ top: 8, right: 24, bottom: 4, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis
          domain={[40, 360]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          width={42}
        />
        <Tooltip formatter={(value) => [`${value ?? "-"} mg/dL`, "혈당"]} />
        <ReferenceArea y1={70} y2={180} fill="#dcfce7" fillOpacity={0.35} />
        <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="4 4" />
        <ReferenceLine y={70} stroke="#2563eb" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    ) : (
      <LineChart
        width={width}
        height={height}
        data={rangeData}
        margin={{ top: 8, right: 24, bottom: 4, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis
          domain={[40, 360]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          width={42}
        />
        <Tooltip
          formatter={(value, name) => [
            `${value ?? "-"} mg/dL`,
            name === "avg" ? "평균" : name === "max" ? "최고" : "최저",
          ]}
        />
        <ReferenceArea y1={70} y2={180} fill="#dcfce7" fillOpacity={0.35} />
        <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="4 4" />
        <ReferenceLine y={70} stroke="#2563eb" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="max"
          stroke="#fb923c"
          strokeDasharray="3 3"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          name="max"
        />
        <Line
          type="monotone"
          dataKey="min"
          stroke="#38bdf8"
          strokeDasharray="3 3"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          name="min"
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#2563eb"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#2563eb", strokeWidth: 1.5 }}
          activeDot={{ r: 6 }}
          name="avg"
        />
      </LineChart>
    );
  }

  function renderTirChart(width: number, height: number): ReactNode {
    return (
      <BarChart
        width={width}
        height={height}
        data={tirData}
        margin={{ top: 10, right: 24, bottom: 4, left: 0 }}
        barCategoryGap="24%"
        maxBarSize={58}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          width={36}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          cursor={{ fill: "#f8fafc" }}
          formatter={(value, name) => [`${value}%`, name]}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="tbr"
          stackId="tir"
          fill={TBR_BAR_COLOR}
          name="TBR"
          onClick={handleTirDateClick}
          className="cursor-pointer"
        />
        <Bar
          dataKey="tir"
          stackId="tir"
          fill={TIR_BAR_COLOR}
          name="TIR"
          onClick={handleTirDateClick}
          className="cursor-pointer"
        />
        <Bar
          dataKey="tar"
          stackId="tir"
          fill={TAR_BAR_COLOR}
          name="TAR"
          radius={[6, 6, 0, 0]}
          onClick={handleTirDateClick}
          className="cursor-pointer"
        />
      </BarChart>
    );
  }

  function renderTrendChart(width: number, height: number): ReactNode {
    return (
      <LineChart
        width={width}
        height={height}
        data={trendData}
        margin={{ top: 8, right: 24, bottom: 4, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={42} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="cv"
          stroke="#7c3aed"
          strokeWidth={2}
          name="CV (%)"
        />
        <Line
          type="monotone"
          dataKey="mean"
          stroke="#2563eb"
          strokeWidth={2}
          name="Mean Glucose (mg/dL)"
        />
        <Line
          type="monotone"
          dataKey="gmi"
          stroke="#059669"
          strokeWidth={2}
          name="GMI (%)"
        />
      </LineChart>
    );
  }

  function renderRocChart(width: number, height: number): ReactNode {
    return (
      <LineChart
        width={width}
        height={height}
        data={rocData}
        margin={{ top: 8, right: 24, bottom: 4, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          interval={2}
        />
        <YAxis
          domain={[-4, 4]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          width={42}
        />
        <Tooltip formatter={(value) => [`${value} mg/dL/min`, "ROC"]} />
        <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="4 4" />
        <ReferenceLine y={-1} stroke="#2563eb" strokeDasharray="4 4" />
        <ReferenceLine y={0} stroke="#6b7280" />
        <Line
          type="monotone"
          dataKey="roc"
          stroke="#111827"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 rounded-lg border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-gray-500">분석 기간</p>
            <p className="text-sm font-medium text-gray-900">
              모든 분석 섹션에 동일하게 적용됩니다.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            기간
            <select
              value={rangeDays}
              onChange={(event) => setRangeDays(Number(event.target.value))}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm"
            >
              {rangeOptions.map((days) => (
                <option key={days} value={days}>
                  {days}일
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          전체 평균 요약
        </h2>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  지표
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  값
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {[
                ["평균 TIR", `${averages.tir}%`],
                ["평균 TBR", `${averages.tbr}%`],
                ["평균 TAR", `${averages.tar}%`],
                ["평균 CV", `${averages.cv}%`],
                ["평균 Mean Glucose", `${averages.meanGlucose} mg/dL`],
                ["평균 GMI", `${averages.gmi}%`],
              ].map(([label, value]) => (
                <tr key={label} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">
                    {label}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {chartCard(
        "혈당 시계열 그래프",
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-1">
            {(["day", "all"] as GlucoseView[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setGlucoseView(view)}
                className={clsx(
                  "h-8 rounded-md px-3 text-sm font-medium",
                  glucoseView === view
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                {view === "day" ? "일간" : "전체"}
              </button>
            ))}
          </div>
          {glucoseView === "day" && (
            <select
              value={activeDayDate}
              onChange={(event) => setDayDate(event.target.value)}
              className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700"
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          )}
          <ExpandButton
            onClick={() => openModal("혈당 시계열 그래프", renderGlucoseChart)}
          />
        </div>,
        <div>
          <ChartFrame className="h-72 min-h-0 min-w-0">
            {renderGlucoseChart}
          </ChartFrame>
          <LineGuide
            items={[
              {
                color: "#ef4444",
                dashed: true,
                label: "180 mg/dL: 고혈당 기준 / TAR 경계",
              },
              {
                color: "#2563eb",
                dashed: true,
                label: "70 mg/dL: 저혈당 기준 / TBR 경계",
              },
            ]}
          />
        </div>
      )}

      {chartCard(
        "TIR / TAR / TBR 분석",
        <ExpandButton
          onClick={() => openModal("TIR / TAR / TBR 분석", renderTirChart)}
        />,
        <div className="space-y-4">
          <ChartFrame className="h-80 min-h-0 min-w-0">
            {renderTirChart}
          </ChartFrame>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold tracking-tight text-gray-700">
                날짜별 상세
              </p>
              <p className="text-[11px] font-medium text-gray-500">
                {detailDate ? `${detailDate} 선택` : "선택 대기"}
              </p>
            </div>
            {detailTir ? (
              <DetailStackedBar point={detailTir} />
            ) : (
              <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm font-medium text-gray-500">
                <CalendarDays size={16} className="mr-2 text-gray-400" />
                TIR / TAR / TBR 막대에서 날짜를 클릭하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {chartCard(
        "CV · Mean Glucose · GMI 추이",
        <ExpandButton
          onClick={() =>
            openModal("CV · Mean Glucose · GMI 추이", renderTrendChart)
          }
        />,
        <ChartFrame className="h-72 min-h-0 min-w-0">
          {renderTrendChart}
        </ChartFrame>
      )}

      {chartCard(
        "ROC (Rate of Change) 추이",
        <ExpandButton
          onClick={() =>
            openModal("ROC (Rate of Change) 추이", renderRocChart)
          }
        />,
        <div>
          <ChartFrame className="h-72 min-h-0 min-w-0">
            {renderRocChart}
          </ChartFrame>
          <LineGuide
            items={[
              {
                color: "#ef4444",
                dashed: true,
                label: "+1.0 mg/dL/min: 급격한 상승 기준",
              },
              {
                color: "#2563eb",
                dashed: true,
                label: "-1.0 mg/dL/min: 급격한 하강 기준",
              },
              {
                color: "#6b7280",
                label: "0 mg/dL/min: 변화 없음",
              },
            ]}
          />
        </div>
      )}

      {modal && (
        <ChartModal title={modalTitle} onClose={() => setModal(null)}>
          {modal}
        </ChartModal>
      )}
    </div>
  );
}
