import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { WearableRow } from '../ui/WearableRow';
import { Screen } from '../../types';

export function WearableScreen({ goHome }: any) {
  const [libreOn, setLibreOn] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="웨어러블 연동" onBack={goHome} />

      <div>
        <p className="mb-3 ml-2 text-[13px] font-black text-[#7192ad]">연속혈당측정기 (CGM)</p>
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_rgba(30,76,120,0.06)]">
          <WearableRow
            title="Freestyle Libre"
            subtext="Abbott 리브레 센서 연동"
            isActiveItem={true}
            toggled={libreOn}
            onToggle={() => setLibreOn(!libreOn)}
          />
          <WearableRow
            title="Dexcom G6 / G7"
            subtext="지원 예정"
            isActiveItem={false}
            isLast={true}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 ml-2 text-[13px] font-black text-[#7192ad]">스마트 헬스 앱</p>
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_30px_rgba(30,76,120,0.06)]">
          <WearableRow
            title="Apple Health"
            subtext="지원 예정"
            isActiveItem={false}
          />
          <WearableRow
            title="Samsung Health"
            subtext="지원 예정"
            isActiveItem={false}
            isLast={true}
          />
        </div>
      </div>
    </div>
  );
}