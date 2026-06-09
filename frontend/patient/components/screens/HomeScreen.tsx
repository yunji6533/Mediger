import { useState, useMemo, useEffect } from 'react';
import { TopTextButton } from '../ui/TopTextButton';
import { MiniStat } from '../ui/MiniStat';
import { StatusPill } from '../ui/StatusPill';
import { DailyLineChart } from '../charts/DailyLineChart';
import { Screen } from '../../types';
import { calculateAge } from '../../utils';

export function HomeScreen({
  records,
  latest,
  todayAverage,
  spikeCount,
  lowCount,
  patient,
  goAlerts,
  goMetrics,
  goRecord,
  goPatientEdit,
  goSettings,
  targetRange,
  setMetricsFilter,
}: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={goPatientEdit}
          className="cursor-pointer text-left active:scale-[0.98]"
        >
          <h1 className="mt-1 text-4xl font-black tracking-tight text-[#07142f]">
            {patient.name}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {patient.gender} · {calculateAge(patient.birth)}세
          </p>
        </button>

        <div className="flex gap-2">
          <TopTextButton label="알림" onClick={goAlerts} />
          <TopTextButton label="설정" onClick={goSettings} />
        </div>
      </div>

      <div className="rounded-[2.25rem] bg-white p-6 shadow-[0_20px_55px_rgba(30,76,120,0.12)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-black text-[#4b83b5]">현재 혈당</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-7xl font-black tracking-tight text-[#07142f] leading-none">
                {latest}
              </span>
              <span className="mb-2 text-lg font-black text-slate-700">
                mg/dL
              </span>
            </div>
          </div>
          <StatusPill value={latest} targetRange={targetRange} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="오늘 평균" value={`${todayAverage}`} />
          <MiniStat label="고혈당" value={`${spikeCount}건`} onClick={() => { setMetricsFilter("high"); goMetrics(); }} />
          <MiniStat label="저혈당" value={`${lowCount}건`} onClick={() => { setMetricsFilter("low"); goMetrics(); }} />
        </div>

        <p className="mt-6 mb-4 text-sm leading-6 text-slate-500">
          하루 혈당 그래프입니다.
          <br />
          00:00~23:59 기준으로 표시됩니다.
        </p>

        <DailyLineChart records={records} targetRange={targetRange} />

        <button
          type="button"
          onClick={goMetrics}
          className="mt-5 w-full cursor-pointer rounded-2xl bg-[#285b8f] py-4.5 text-[17px] font-black text-white shadow-[0_12px_28px_rgba(40,91,143,0.28)] active:scale-[0.98]"
        >
          상세 지표 보기
        </button>
      </div>

      <button
        type="button"
        onClick={goRecord}
        className="flex w-full cursor-pointer items-center justify-between rounded-[2rem] bg-[#285b8f] px-6 py-6 text-left text-white shadow-[0_16px_35px_rgba(40,91,143,0.25)] active:scale-[0.98]"
      >
        <div className="flex-1 pr-4">
          <p className="text-[22px] font-black leading-tight">수기 입력</p>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-blue-100/90">
            혈당과 시간을 직접 입력하여 기록에 반영하세요.
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
          <span className="relative left-0.5 text-3xl leading-none">›</span>
        </div>
      </button>
    </div>
  );
}