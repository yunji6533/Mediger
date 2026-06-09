import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Screen } from '../../types';

export function PrivacyScreen({ goHome }: any) {
  const [doctorAccess, setDoctorAccess] = useState(true);
  const [researchAccess, setResearchAccess] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader title="개인정보 보호" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-6 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <h2 className="text-lg font-black text-[#07142f]">의료 데이터 보안</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Mediger는 환자분의 민감한 의료 데이터를 최우선으로 보호합니다. 모든 건강 기록, 혈당 수치 및 연결된 웨어러블 데이터는 안전하게 암호화되어 서버에 저장되며, 권한을 부여받은 담당 주치의 외에는 누구도 열람할 수 없습니다.
        </p>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <h2 className="text-lg font-black text-[#07142f]">접근 권한 관리</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">주치의 데이터 접근 권한</span>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-black transition-colors ${doctorAccess ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  {doctorAccess ? "허용됨" : "거부됨"}
                </span>
                <button
                  type="button"
                  onClick={() => setDoctorAccess(!doctorAccess)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${doctorAccess ? "bg-[#285b8f]" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${doctorAccess ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">익명 연구 데이터 제공</span>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-black transition-colors ${researchAccess ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  {researchAccess ? "허용됨" : "거부됨"}
                </span>
                <button
                  type="button"
                  onClick={() => setResearchAccess(!researchAccess)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${researchAccess ? "bg-[#285b8f]" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${researchAccess ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}