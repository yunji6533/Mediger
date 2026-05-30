"use client";

import { ReactNode, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { ChartFrame } from "@/src/components/ui/ChartFrame";
import type {
  AverageDayPoint,
  GlucoseMultidayData,
  ThresholdEvent,
  PatternLog,
  PatternType,
  Recommendation,
} from "@/src/types";

const HOUR_TICKS = ["00:00","03:00","06:00","09:00","12:00","15:00","18:00","21:00"];

// ─── Pattern zone definitions (fallback when backend omits detectedZones) ────

type PatternZone = {
  zones: { x1: string; x2: string }[];
  fill: string;
  shortLabel: string;
};

const PATTERN_ZONES: Partial<Record<PatternType, PatternZone>> = {
  nocturnal_hypo_pattern: {
    zones: [{ x1: "00:00", x2: "06:00" }],
    fill: "#93c5fd",
    shortLabel: "야간 저혈당",
  },
  evening_hyper_trend: {
    zones: [{ x1: "18:00", x2: "23:00" }],
    fill: "#fca5a5",
    shortLabel: "저녁 고혈당",
  },
  postprandial_spike_pattern: {
    zones: [
      { x1: "07:00", x2: "09:00" },
      { x1: "12:00", x2: "14:00" },
      { x1: "19:00", x2: "21:00" },
    ],
    fill: "#fdba74",
    shortLabel: "식후 스파이크",
  },
};

const PATTERN_LABELS: Record<PatternType, string> = {
  nocturnal_hypo_pattern:     "야간 시간대 저혈당 패턴 관찰",
  evening_hyper_trend:        "저녁 시간대 혈당 상승 경향",
  postprandial_spike_pattern: "식후 혈당 상승 패턴 관찰",
  rapid_glucose_change:       "급격한 혈당 변화 패턴 감지",
  post_hypo_glucose_rise:     "저혈당 이후 혈당 상승 패턴 관찰",
  high_glucose_variability:   "혈당 변동 폭 증가 경향",
};

// ─── Layout primitives ────────────────────────────────────────

function SectionContainer({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gray-200 border border-gray-400 rounded-md p-5 space-y-4">
      {children}
    </div>
  );
}

function ContentBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-700 rounded ${className ?? ""}`}>
      {children}
    </div>
  );
}

function BoxLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] font-semibold text-gray-600 pt-1">{children}</p>
  );
}

function AnalysisText({ text }: { text?: string }) {
  if (!text) {
    return (
      <ContentBox>
        <p className="text-[13px] text-gray-400 text-center py-5">
          (분석 텍스트를 불러오는 중...)
        </p>
      </ContentBox>
    );
  }
  return (
    <ContentBox className="px-5 py-4">
      {text.split("\n").map((line, i) =>
        line.trim() === "" ? (
          <div key={i} className="h-2" />
        ) : (
          <p key={i} className="text-[13px] text-gray-700 leading-relaxed">
            {line}
          </p>
        )
      )}
    </ContentBox>
  );
}

// ─── Section 1: AGP chart ─────────────────────────────────────

function PatternLegend({ activePatterns }: { activePatterns: Set<PatternType> }) {
  const detected = (Object.entries(PATTERN_LABELS) as [PatternType, string][])
    .filter(([key]) => activePatterns.has(key));

  if (detected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-1 pb-1">
      {detected.map(([key, label]) => {
        const zone = PATTERN_ZONES[key];
        if (zone) {
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium text-gray-700 bg-white"
              style={{ borderColor: zone.fill }}
            >
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: zone.fill }} />
              {zone.shortLabel}
            </span>
          );
        }
        return (
          <span
            key={key}
            className="inline-block rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function GlucoseBoundaryGuide() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 px-1 pb-1 text-[12px] font-medium text-gray-500">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-5"
          style={{ borderTop: "2px dashed #ef4444" }}
        />
        180 mg/dL: 고혈당 기준 / TAR 경계
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-5"
          style={{ borderTop: "2px dashed #2563eb" }}
        />
        70 mg/dL: 저혈당 기준 / TBR 경계
      </span>
    </div>
  );
}

function AverageDayChart({
  data,
  patterns,
}: {
  data: AverageDayPoint[];
  patterns: PatternLog[];
}) {
  // Use detectedZones from backend if available; fall back to PATTERN_ZONES static mapping
  const zoneAreas = patterns.flatMap((p) => {
    const fallback = PATTERN_ZONES[p.patternType];
    const zones = p.detectedZones
      ? p.detectedZones.map((z) => ({ x1: z.start, x2: z.end }))
      : fallback?.zones ?? [];
    const fill = fallback?.fill ?? "#e5e7eb";
    return zones.map(({ x1, x2 }, i) => (
      <ReferenceArea
        key={`${p.id}-${i}`}
        x1={x1}
        x2={x2}
        fill={fill}
        fillOpacity={0.18}
        strokeOpacity={0}
      />
    ));
  });

  return (
    <ContentBox>
      <ChartFrame className="h-72 px-3 pt-4 pb-1">
        {(width, height) => (
          <LineChart
            width={width}
            height={height}
            data={data}
            margin={{ top: 6, right: 32, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="time" ticks={HOUR_TICKS} tick={{ fontSize: 11, fill: "#6b7280" }} />
            <YAxis domain={[40, 360]} tick={{ fontSize: 11, fill: "#6b7280" }} width={42} />
            <Tooltip
              formatter={(v, name) => [
                `${v} mg/dL`,
                name === "avg" ? "평균" : name === "max" ? "최고" : "최저",
              ]}
              labelFormatter={(l) => `시각: ${l}`}
            />
            <ReferenceArea y1={70} y2={180} fill="#dcfce7" fillOpacity={0.4} />
            {zoneAreas}
            <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine y={70} stroke="#2563eb" strokeDasharray="4 4" strokeWidth={1} />
            <Line type="monotone" dataKey="max" stroke="#fca5a5" strokeWidth={1} strokeDasharray="3 3" dot={false} name="max" />
            <Line type="monotone" dataKey="min" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3" dot={false} name="min" />
            <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="avg" />
          </LineChart>
        )}
      </ChartFrame>
      <div className="flex gap-5 px-5 pb-4 text-[12px] text-gray-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5" style={{ borderTop: "2.5px solid #2563eb" }} />
          평균
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5" style={{ borderTop: "1.5px dashed #fca5a5" }} />
          최고
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5" style={{ borderTop: "1.5px dashed #93c5fd" }} />
          최저
        </span>
      </div>
    </ContentBox>
  );
}

// ─── Section 2: Raw outlier chart ────────────────────────────

function OutlierRawChart({ data }: { data: GlucoseMultidayData[] }) {
  const flat = useMemo(
    () =>
      data.flatMap((day) =>
        day.readings.map((r) => ({
          datetime: `${day.date.slice(5)} ${r.time}`,
          date: day.date,
          time: r.time,
          value: r.value,
        }))
      ),
    [data]
  );

  // X축에 날짜만 표시. 각 날짜 첫 포인트의 index를 tick으로 사용.
  const dayStartTicks = useMemo(() => {
    const seen = new Set<string>();
    return flat
      .filter((p) => {
        if (seen.has(p.date)) return false;
        seen.add(p.date);
        return true;
      })
      .map((p) => p.datetime);
  }, [flat]);

  return (
    <ContentBox>
      <ChartFrame className="h-64 px-3 pt-4 pb-1">
        {(width, height) => (
          <LineChart
            width={width}
            height={height}
            data={flat}
            margin={{ top: 6, right: 32, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis
              dataKey="datetime"
              ticks={dayStartTicks}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(v: string) => v.slice(0, 5)}
            />
            <YAxis domain={[40, 360]} tick={{ fontSize: 11, fill: "#6b7280" }} width={42} />
            <Tooltip
              formatter={(v) => [`${v} mg/dL`, "혈당"]}
              labelFormatter={(l) => `시각: ${l}`}
            />
            <ReferenceArea y1={70} y2={180} fill="#dcfce7" fillOpacity={0.4} />
            <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine y={70} stroke="#2563eb" strokeDasharray="4 4" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#94a3b8"
              strokeWidth={1}
              isAnimationActive={false}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (payload.value > 180)
                  return <circle key={index} cx={cx} cy={cy} r={3.5} fill="#ef4444" stroke="#fff" strokeWidth={1} />;
                if (payload.value < 70)
                  return <circle key={index} cx={cx} cy={cy} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1} />;
                return <circle key={index} cx={cx} cy={cy} r={0} fill="transparent" />;
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )}
      </ChartFrame>
      <div className="flex gap-5 px-5 pb-4 text-[12px] text-gray-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
          TAR &gt;180 mg/dL
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
          TBR &lt;70 mg/dL
        </span>
      </div>
    </ContentBox>
  );
}

// ─── Section 2: Outlier log modal ─────────────────────────────

function thresholdLabel(event: ThresholdEvent): string {
  if (event.type === "hypo") return event.value < 54 ? "심각한 저혈당" : "저혈당";
  if (event.value > 300) return "위험 수준 고혈당";
  if (event.value > 250) return "심각한 고혈당";
  return "고혈당";
}

function thresholdColor(label: string): string {
  switch (label) {
    case "위험 수준 고혈당": return "text-red-800 bg-red-100 border-red-300";
    case "심각한 고혈당":   return "text-red-700 bg-red-50 border-red-200";
    case "고혈당":          return "text-orange-700 bg-orange-50 border-orange-200";
    case "심각한 저혈당":   return "text-indigo-800 bg-indigo-100 border-indigo-300";
    case "저혈당":          return "text-blue-700 bg-blue-50 border-blue-200";
    default:                return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

function formatEventDate(date: string, time: string) {
  const [, mm, dd] = date.split("-");
  return `${mm}/${dd} ${time}`;
}

function OutlierLogModal({
  events,
  onClose,
}: {
  events: ThresholdEvent[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h4 className="text-[15px] font-bold text-gray-900">Outlier log table</h4>
            <p className="text-[12px] text-gray-400 mt-0.5">총 {events.length}건의 이상치 이벤트</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">이상치 기록 없음</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {["시각", "유형", "혈당 (mg/dL)"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {events.map((e, idx) => {
                  const label = thresholdLabel(e);
                  return (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="px-5 py-2.5 text-[13px] text-gray-600 tabular-nums whitespace-nowrap">
                        {formatEventDate(e.date, e.time)}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-block rounded border px-2 py-0.5 text-[12px] font-semibold ${thresholdColor(label)}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-[13px] tabular-nums text-gray-800 font-medium">
                        {e.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section 3: 진단 추천 ─────────────────────────────────────

function RecommendationGrid({ items }: { items: Recommendation[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(({ rank, source, page, link, description }) => {
        const isTop = rank === 1;
        return (
          <div
            key={rank}
            className={`rounded border p-4 space-y-3 ${
              isTop ? "bg-green-50 border-green-300" : "bg-white border-gray-200"
            }`}
          >
            <p className={`text-[13px] font-bold text-center ${isTop ? "text-green-700" : "text-gray-500"}`}>
              {rank}순위
            </p>
            <div className="bg-white border border-gray-300 rounded px-4 py-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      {source}
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-400">{source}</span>
                  )}
                  {page && (
                    <span className="text-[11px] text-gray-400">{page}</span>
                  )}
                </div>
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed">{description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────

interface Props {
  patientName: string;
  avgDayProfile: AverageDayPoint[];
  multidayData: GlucoseMultidayData[];
  thresholdEvents: ThresholdEvent[];
  patterns: PatternLog[];
  recommendations: Recommendation[];
  patternAnalysis?: string;
  anomalyAnalysis?: string;
}

export default function DiagnosisReport({
  patientName,
  avgDayProfile,
  multidayData,
  thresholdEvents,
  patterns,
  recommendations,
  patternAnalysis,
  anomalyAnalysis,
}: Props) {
  const activePatterns = new Set(patterns.map((p) => p.patternType));
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          MEDIGER REPORT
        </h2>
        <hr className="mt-3 mb-5 border-gray-300" />
        <p className="text-[15px] text-gray-700">
          {patientName}님의 진단 보조 분석 report 입니다.
        </p>
      </div>

      {/* Section 1 — 혈당 패턴 분석 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">1. 혈당 패턴 분석</h3>
        <SectionContainer>
          <BoxLabel>Glucose pattern analysis</BoxLabel>
          <AverageDayChart data={avgDayProfile} patterns={patterns} />
          <GlucoseBoundaryGuide />
          <BoxLabel>감지 패턴 유형</BoxLabel>
          <PatternLegend activePatterns={activePatterns} />
          <AnalysisText text={patternAnalysis} />
        </SectionContainer>
      </div>

      {/* Section 2 — 이상치 분석 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">2. 이상치 분석</h3>
        <SectionContainer>
          <BoxLabel>Outlier pattern graph</BoxLabel>
          <OutlierRawChart data={multidayData} />
          <AnalysisText text={anomalyAnalysis} />
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Outlier log table 살펴보기 →
          </button>
        </SectionContainer>
      </div>

      {/* Section 3 — 진단 추천 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">3. 진단 추천</h3>
        <SectionContainer>
          <RecommendationGrid items={recommendations} />
        </SectionContainer>
      </div>

      {modalOpen && (
        <OutlierLogModal
          events={thresholdEvents}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
