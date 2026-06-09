import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { ToggleRow } from '../ui/ToggleRow';
import { Screen } from '../../types';

export function NotificationSettingsScreen({ alertsSettings, setAlertsSettings, goHome }: any) {
  const toggle = (key: "low" | "high" | "missing") => {
    setAlertsSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="알림 설정" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)] space-y-2">
        <ToggleRow title="저혈당 알림" active={alertsSettings.low} onClick={() => toggle("low")} />
        <ToggleRow title="고혈당 알림" active={alertsSettings.high} onClick={() => toggle("high")} />
        <ToggleRow title="누락 입력 알림" active={alertsSettings.missing} onClick={() => toggle("missing")} />
      </div>
    </div>
  );
}