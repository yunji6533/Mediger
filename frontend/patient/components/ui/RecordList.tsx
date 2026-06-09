import { useState, useMemo, useEffect } from 'react';
import { RecordItem } from '../types';

export function RecordList({ records }: { records: RecordItem[] }) {
  const manualRecords = records.filter((item) => item.type === "manual").reverse();

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
      <h2 className="text-lg font-black">최근 기록</h2>

      <div className="mt-4 divide-y divide-slate-100">
        {manualRecords.length === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-slate-400">
            수기 입력한 기록이 없습니다.
          </div>
        ) : (
          manualRecords.map((item, i) => (
            <div key={i} className="py-4 text-sm">
              <div className="flex justify-between">
                <p>
                  <span className="text-2xl font-black">{item.glucose}</span>
                  <span className="ml-2 text-slate-500">mg/dL</span>
                </p>
                <p className="flex items-center">
                  <span className="text-base font-bold text-slate-700">
                    {item.time}
                  </span>
                </p>
              </div>
              <p className="mt-2 text-slate-500">메모: {item.memo}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}