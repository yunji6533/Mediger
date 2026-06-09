import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { InputLabel } from '../ui/InputLabel';
import { Screen } from '../../types';

export function PatientEditScreen({ patient, setPatient, goHome }: any) {
  const [name, setName] = useState(patient.name);
  const [gender, setGender] = useState(patient.gender);
  const [birth, setBirth] = useState(patient.birth);

  const savePatient = () => {
    if (!name || !gender || !birth) {
      alert("이름, 성별, 생년월일을 모두 입력해줘");
      return;
    }

    setPatient({ name, gender, birth });
    alert("환자 정보가 수정되었습니다.");
    goHome();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="환자 정보 수정" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)]">
        <div className="space-y-4">
          <InputLabel label="이름">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-style"
            />
          </InputLabel>

          <InputLabel label="성별">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="input-style"
            >
              <option>남</option>
              <option>여</option>
              <option>기타</option>
            </select>
          </InputLabel>

          <InputLabel label="생년월일">
            <input
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className="input-style"
            />
          </InputLabel>

          <button
            type="button"
            onClick={savePatient}
            className="w-full rounded-2xl bg-[#285b8f] py-4 font-black text-white shadow-[0_12px_28px_rgba(40,91,143,0.22)] active:scale-[0.98]"
          >
            수정 완료
          </button>
        </div>
      </div>
    </div>
  );
}