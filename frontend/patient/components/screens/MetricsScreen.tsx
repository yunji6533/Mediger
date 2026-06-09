import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { ChartTab } from '../ui/ChartTab';
import { OutlierTable } from '../ui/OutlierTable';
import { DailyLineChart } from '../charts/DailyLineChart';
import { SimpleLineChart } from '../charts/SimpleLineChart';
import { Screen, ChartType } from '../../types';
import { PATIENT_ID, weeklyRecords } from '../../constants';

export function MetricsScreen({ records, goHome, targetRange, metricsFilter, metricsData }: any) {
  const [chartType, setChartType] = useState<ChartType>("day");
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
    if (metricsFilter === "all") {
      if (!BASE_URL) {
        setAiFeedback(
          "패턴 요약: 최근 14일간 야간(02:00~04:00) 저혈당 패턴이 반복되고 있으며, " +
          "아침 식후(08:00~10:00) 혈당 급상승이 관찰됩니다.\n\n" +
          "임상 의미: 저녁 인슐린 용량 과다 또는 야간 활동량 부족으로 인한 Somogyi 효과가 의심됩니다. " +
          "아침 기상 후 혈당 반등이 이에 해당합니다.\n\n" +
          "권고사항: 취침 전 혈당을 130 mg/dL 이상으로 유지하고, " +
          "야간 저혈당 발생 시 빠른 탄수화물(포도당 15g)을 즉시 섭취하세요."
        );
        setLoadingAi(false);
        return;
      }  // API 없으면 mock 텍스트 표시
      setLoadingAi(true);
      fetch(`${BASE_URL}/patients/${PATIENT_ID}/report/pattern`)
        .then(res => res.json())
        .then(data => {
          if (data && data.analysis) {
            setAiFeedback(data.analysis);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingAi(false));
    }
  }, [metricsFilter]);

  return (
    <div className="space-y-4">
      <PageHeader title="상세 지표" onBack={goHome} />

      {metricsFilter === "all" && (
        <>
          <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.07)]">
            <div className="grid grid-cols-2 rounded-2xl bg-[#eef4fa] p-1">
              <ChartTab
                label="하루"
                active={chartType === "day"}
                onClick={() => setChartType("day")}
              />
              <ChartTab
                label="주간"
                active={chartType === "week"}
                onClick={() => setChartType("week")}
              />
            </div>

            <div className="mt-5">
              {chartType === "day" && (
                <>
                  <h2 className="text-lg font-black">하루치 혈당 그래프</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    메인 페이지와 동일한 하루 혈당 흐름입니다.
                  </p>
                  <DailyLineChart records={records} compact targetRange={targetRange} />
                </>
              )}

              {chartType === "week" && (
                <>
                  <h2 className="text-lg font-black">주간 혈당 그래프</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    최근 7일 일별 평균 혈당 흐름입니다.
                  </p>
                  <SimpleLineChart data={metricsData?.weekly || []} targetRange={targetRange} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.07)]">
            <p className="text-sm font-black text-[#285b8f]">AI 피드백</p>
            {loadingAi ? (
              <div className="mt-4 flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#285b8f]" />
                <span className="ml-2 text-sm text-slate-500">AI가 패턴을 분석 중입니다...</span>
              </div>
            ) : (
              <div className="mt-3 text-[15px] leading-7 text-slate-700 whitespace-pre-wrap">
                {(() => {
                  if (!aiFeedback) return "AI 피드백을 불러올 수 없습니다.";
                  const match = aiFeedback.match(/(?:패턴\s*요약|요약|패턴)\s*:?\n?([\s\S]*?)(?=임상\s*의미|임상적\s*의미|권고\s*사항|제언|출처|$)/i);
                  return match ? match[1].trim() : aiFeedback;
                })()}
              </div>
            )}
          </div>
        </>
      )}

      <OutlierTable records={records} targetRange={targetRange} filter={metricsFilter} />
    </div>
  );
}