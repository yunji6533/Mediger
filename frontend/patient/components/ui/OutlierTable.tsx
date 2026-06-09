import { useState, useMemo, useEffect } from 'react';
import { RecordItem } from '../types';

export function OutlierTable({ records, targetRange, filter = "all" }: { records: RecordItem[]; targetRange: { min: number; max: number }; filter?: "all" | "high" | "low" }) {
  let outliers = records.filter(
    (item) => item.glucose >= targetRange.max || item.glucose <= targetRange.min
  );

  if (filter === "high") {
    outliers = outliers.filter(item => item.glucose >= targetRange.max);
  } else if (filter === "low") {
    outliers = outliers.filter(item => item.glucose <= targetRange.min);
  }

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.07)]">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm font-black text-[#285b8f]">이상치 감지</p>
          <h2 className="mt-2 text-lg font-black">오늘 감지된 이상 기록</h2>
        </div>

        <div className="rounded-full bg-[#eef4fa] px-3 py-1 text-xs font-black text-slate-500">
          총 {outliers.length}건
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="grid grid-cols-3 bg-[#f7f9fc] px-4 py-3 text-xs font-black text-slate-500">
          <span>시간</span>
          <span className="text-center">혈당</span>
          <span className="text-right">상태</span>
        </div>

        {outliers.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-black text-slate-700">
              감지된 이상치가 없습니다.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              현재 기록은 정상 범위 안에 있습니다.
            </p>
          </div>
        ) : (
          outliers.map((item, index) => {
            const isHigh = item.glucose >= targetRange.max;
            const status = isHigh ? "고혈당" : "저혈당";

            return (
              <div
                key={`${item.time}-${index}`}
                className="grid grid-cols-3 items-center border-t border-slate-100 px-4 py-4 text-sm"
              >
                <span className="font-bold text-slate-600">{item.time}</span>

                <span className="text-center">
                  <span className="font-black text-slate-950">
                    {item.glucose}
                  </span>
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    mg/dL
                  </span>
                </span>

                <span className="text-right">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${isHigh
                      ? "bg-red-50 text-red-500"
                      : "bg-orange-50 text-orange-500"
                      }`}
                  >
                    {status}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}