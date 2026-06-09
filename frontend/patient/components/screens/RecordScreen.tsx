import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { RecordList } from '../ui/RecordList';
import { Screen, RecordItem } from '../../types';

export function RecordScreen({ records, setRecords, goHome, ...props }: any) {
  const [glucose, setGlucose] = useState("");
  const [time, setTime] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const addRecord = async () => {
    const value = Number(glucose);

    if (!value || !time) {
      alert("시간과 혈당 값을 입력해줘");
      return;
    }

    try {
      const newRecord = {
        time,
        glucose: value,
        memo: memo || "특이사항 없음",
        type: "manual" as const,
      };

      // Add new record and sort chronologically
      const newRecords = [...records, newRecord].sort((a, b) => {
        return a.time.localeCompare(b.time);
      });
      
      setRecords(newRecords);
      alert("기록 저장 완료");
      
      setGlucose("");
      setTime("");
      setMemo("");

      if (typeof goHome === 'function') {
        goHome();
      }

    } catch (err) {
      console.error(err);
      alert("기록 저장에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="수기 입력" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <p className="mb-4 text-sm leading-6 text-slate-500">
          누락된 혈당을 작성해주세요.
        </p>

        <div className="space-y-3">
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            type="time"
            className="input-style"
          />

          <input
            value={glucose}
            onChange={(e) => setGlucose(e.target.value)}
            type="number"
            placeholder="혈당 입력 mg/dL"
            className="input-style"
          />

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="환자가 수기 입력할 특이사항"
            className="h-28 input-style"
          />

          <button
            type="button"
            onClick={addRecord}
            className="w-full rounded-2xl bg-[#285b8f] py-4 font-black text-white shadow-[0_12px_28px_rgba(40,91,143,0.22)] active:scale-[0.98]"
          >
            기록 저장
          </button>
        </div>
      </div>

      <RecordList records={records} />
    </div>
  );
}