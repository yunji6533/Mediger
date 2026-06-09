import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { ToggleRow } from '../ui/ToggleRow';
import { Screen } from '../../types';

export function SyncScreen({ goHome }: any) {
  const [autoSync, setAutoSync] = useState(true);

  return (
    <div className="space-y-5">
      <PageHeader title="데이터 동기화" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <ToggleRow title="자동 동기화" active={autoSync} onClick={() => setAutoSync(!autoSync)} />
        <p className="mt-3 text-[13px] leading-5 text-slate-500">
          앱을 실행할 때마다 웨어러블 기기와 건강 앱의 최신 데이터를 자동으로 불러옵니다.
        </p>
      </div>
    </div>
  );
}