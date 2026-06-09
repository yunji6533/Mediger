import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { InputLabel } from '../ui/InputLabel';
import { Screen } from '../../types';

export function TargetSettingsScreen({ targetRange, setTargetRange, goHome }: any) {
  const [min, setMin] = useState(targetRange.min.toString());
  const [max, setMax] = useState(targetRange.max.toString());

  const saveTarget = () => {
    const minValue = Number(min);
    const maxValue = Number(max);
    if (!minValue || !maxValue || minValue >= maxValue) {
      alert("올바른 범위를 입력해주세요.");
      return;
    }
    setTargetRange({ min: minValue, max: maxValue });
    alert("목표 혈당 범위가 설정되었습니다.");
    goHome();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="목표 범위 설정" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <div className="mb-6 rounded-2xl bg-red-50 p-4">
          <p className="text-sm font-bold text-red-600">⚠️ 주의사항</p>
          <p className="mt-1.5 text-xs leading-5 text-red-500">
            목표 혈당 범위는 주치의와의 명확한 상담이나 지시 없이 임의로 변경하지 마세요. 잘못된 설정은 당뇨 관리에 심각한 위험을 초래할 수 있습니다.
          </p>
        </div>

        <div className="space-y-4">
          <InputLabel label="최소치 (mg/dL)">
            <input value={min} onChange={(e) => setMin(e.target.value)} type="number" className="input-style" />
          </InputLabel>
          <InputLabel label="최대치 (mg/dL)">
            <input value={max} onChange={(e) => setMax(e.target.value)} type="number" className="input-style" />
          </InputLabel>
          <button type="button" onClick={saveTarget} className="w-full rounded-2xl bg-[#285b8f] py-4 font-black text-white shadow-[0_12px_28px_rgba(40,91,143,0.22)] active:scale-[0.98]">
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}