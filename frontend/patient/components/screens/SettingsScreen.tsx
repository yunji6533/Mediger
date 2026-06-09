import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { SettingGroup } from '../ui/SettingGroup';
import { SettingRow } from '../ui/SettingRow';
import { Screen } from '../../types';
import { calculateAge } from '../../utils';

export function SettingsScreen({ patient, goHome, goPatientEdit, goNotificationSettings, goTargetSettings, targetRange, goWearable, goSync, goPrivacy, goAppInfo, goReport }: any) {
  return (
    <div className="space-y-5">
      <PageHeader title="설정" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf6fb] text-2xl font-black text-[#285b8f]">
            {patient.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-lg font-black">{patient.name}</p>
            <p className="text-sm text-slate-500">
              {patient.gender} · {calculateAge(patient.birth)}세
            </p>
          </div>
        </div>
      </div>

      <SettingGroup>
        <SettingRow title="환자 정보 관리" text="이름, 성별, 생년월일 수정" onClick={goPatientEdit} />
        <SettingRow title="알림 설정" text="저혈당, 고혈당, 누락 입력 알림" onClick={goNotificationSettings} />
        <SettingRow title="목표 혈당 범위" text={`정상 범위 ${targetRange.min}~${targetRange.max}mg/dL`} onClick={goTargetSettings} />
      </SettingGroup>

      <SettingGroup>
        <SettingRow title="웨어러블 연동" text="CGM / 스마트워치 데이터 연결" onClick={goWearable} />
        <SettingRow title="데이터 동기화" text="최근 기록 자동 업데이트" onClick={goSync} />
        <SettingRow title="진료용 보고서" text="최근 혈당 기록 기반 리포트 생성" onClick={goReport} />
      </SettingGroup>

      <SettingGroup>
        <SettingRow title="개인정보 보호" text="의료 데이터 보안 및 접근 권한" onClick={goPrivacy} />
        <SettingRow title="앱 정보" text="Mediger Patient v1.0" onClick={goAppInfo} />
      </SettingGroup>
    </div>
  );
}