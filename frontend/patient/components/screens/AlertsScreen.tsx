import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { AlertBox } from '../ui/AlertBox';
import { Screen } from '../../types';

export function AlertsScreen({ latest, spikeCount, lowCount, goHome, targetRange, goRecord, alertsSettings }: any) {
  return (
    <div className="space-y-5">
      <PageHeader title="알림" onBack={goHome} />

      <div className="space-y-3">
        {alertsSettings?.high && latest >= targetRange.max && (
          <AlertBox
            title="기준치 초과 알림"
            text="현재 혈당이 목표 범위를 초과했습니다."
          />
        )}

        {alertsSettings?.low && latest <= targetRange.min && (
          <AlertBox
            title="저혈당 위험"
            text="현재 혈당이 낮습니다. 빠른 확인이 필요합니다."
          />
        )}

        {alertsSettings?.high && spikeCount > 0 && (
          <AlertBox
            title="급상승 감지"
            text="최근 기록 중 급상승 구간이 있습니다."
          />
        )}

        {alertsSettings?.low && lowCount > 0 && (
          <AlertBox
            title="저혈당 기록"
            text="오늘 저혈당 구간이 감지되었습니다."
          />
        )}

        {alertsSettings?.missing && (
          <AlertBox
            title="누락 입력 알림"
            text="측정되지 않은 시간대가 있으면 수기로 입력해주세요."
            onClick={goRecord}
          />
        )}
      </div>
    </div>
  );
}