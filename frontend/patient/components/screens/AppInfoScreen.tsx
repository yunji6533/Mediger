import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Screen } from '../../types';

export function AppInfoScreen({ goHome }: any) {
  return (
    <div className="space-y-5">
      <PageHeader title="앱 정보" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-6 text-center shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#285b8f] text-white shadow-lg">
          <span className="text-3xl font-black">M</span>
        </div>
        <h2 className="mt-4 text-xl font-black text-[#07142f]">Mediger Patient</h2>
        <p className="mt-1 text-sm text-slate-500">버전 1.0.0 (최신 버전)</p>

        <p className="mt-8 text-xs text-slate-400">
          © 2026 Mediger. All rights reserved.
        </p>
      </div>
    </div>
  );
}