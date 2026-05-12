"use client";

import { useMemo, useState } from "react";

type Screen = "home" | "record" | "alerts" | "metrics" | "patientEdit" | "settings";
type ChartType = "day" | "week" | "month";

type RecordItem = {
  glucose: number;
  time: string;
  memo: string;
};

type PatientInfo = {
  name: string;
  gender: string;
  birth: string;
};

const initialPatient: PatientInfo = {
  name: "조국남",
  gender: "남성",
  birth: "1968.05.08",
};

const dayRecords: RecordItem[] = [
  { time: "00:00", glucose: 112, memo: "취침 중" },
  { time: "01:00", glucose: 118, memo: "안정" },
  { time: "02:00", glucose: 126, memo: "약간 상승" },
  { time: "03:00", glucose: 154, memo: "상승 구간" },
  { time: "04:00", glucose: 92, memo: "하락" },
  { time: "05:00", glucose: 108, memo: "안정" },
  { time: "06:00", glucose: 135, memo: "기상 후 상승" },
  { time: "07:00", glucose: 165, memo: "아침 식후 상승" },
  { time: "08:00", glucose: 188, memo: "목표 범위 초과" },
  { time: "09:00", glucose: 142, memo: "회복 중" },
  { time: "10:00", glucose: 120, memo: "안정" },
  { time: "11:00", glucose: 132, memo: "점심 전" },
  { time: "12:00", glucose: 176, memo: "점심 식후 상승" },
  { time: "13:00", glucose: 196, memo: "고혈당 감지" },
  { time: "14:00", glucose: 148, memo: "하락 중" },
  { time: "15:00", glucose: 118, memo: "안정" },
  { time: "16:00", glucose: 102, memo: "안정" },
  { time: "17:00", glucose: 132, memo: "저녁 전" },
  { time: "18:00", glucose: 174, memo: "저녁 식후 상승" },
  { time: "19:00", glucose: 205, memo: "고혈당 감지" },
  { time: "20:00", glucose: 158, memo: "회복 중" },
  { time: "21:00", glucose: 122, memo: "안정" },
  { time: "22:00", glucose: 88, memo: "하락" },
  { time: "23:00", glucose: 66, memo: "저혈당 주의" },
];

const weeklyRecords = [
  { label: "월", glucose: 98 },
  { label: "화", glucose: 126 },
  { label: "수", glucose: 112 },
  { label: "목", glucose: 176 },
  { label: "금", glucose: 152 },
  { label: "토", glucose: 124 },
  { label: "일", glucose: 96 },
];

const monthlyRecords = [
  { label: "1주", glucose: 92 },
  { label: "2주", glucose: 124 },
  { label: "3주", glucose: 151 },
  { label: "4주", glucose: 149 },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [records, setRecords] = useState<RecordItem[]>(dayRecords);
  const [patient, setPatient] = useState<PatientInfo>(initialPatient);

  const latest = records[records.length - 1]?.glucose ?? 0;

  const todayAverage = useMemo(() => {
    const sum = records.reduce((acc, cur) => acc + cur.glucose, 0);
    return Math.round(sum / records.length);
  }, [records]);

  const spikeCount = records.filter((r) => r.glucose >= 180).length;
  const lowCount = records.filter((r) => r.glucose <= 70).length;

  const commonProps = {
    records,
    setRecords,
    latest,
    todayAverage,
    spikeCount,
    lowCount,
    patient,
    setPatient,
    goHome: () => setScreen("home"),
  };

  return (
    <main className="min-h-screen bg-[#f2f4f8] px-5 py-6 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        {screen === "home" && (
          <HomeScreen
            {...commonProps}
            goAlerts={() => setScreen("alerts")}
            goMetrics={() => setScreen("metrics")}
            goRecord={() => setScreen("record")}
            goPatientEdit={() => setScreen("patientEdit")}
            goSettings={() => setScreen("settings")}
          />
        )}

        {screen === "record" && <RecordScreen {...commonProps} />}
        {screen === "alerts" && <AlertsScreen {...commonProps} />}
        {screen === "metrics" && <MetricsScreen {...commonProps} />}
        {screen === "patientEdit" && <PatientEditScreen {...commonProps} />}
        {screen === "settings" && <SettingsScreen {...commonProps} />}
      </section>
    </main>
  );
}

function HomeScreen({
  records,
  latest,
  patient,
  goAlerts,
  goMetrics,
  goRecord,
  goPatientEdit,
  goSettings,
}: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={goPatientEdit} className="text-left active:scale-[0.98]">
          <p className="text-sm font-semibold text-slate-400">오늘의 환자</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight">{patient.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {patient.gender} · {patient.birth}
          </p>
        </button>

        <div className="flex gap-2">
          <IconButton label="알림" icon="⌂" onClick={goAlerts} />
          <IconButton label="설정" icon="⚙" onClick={goSettings} />
        </div>
      </div>

      <div className="rounded-[2.25rem] bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-bold text-slate-400">현재 혈당</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-7xl font-black tracking-tight">{latest}</span>
              <span className="mb-3 text-lg font-bold text-slate-700">mg/dL</span>
            </div>
          </div>
          <StatusPill value={latest} />
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          하루 혈당 그래프입니다.
          <br />
          00:00~23:00 기준으로 표시됩니다.
        </p>

        <DailyLineChart records={records} />

        <button
          type="button"
          onClick={goMetrics}
          className="mt-5 w-full rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white active:scale-[0.98]"
        >
          상세 지표 보기
        </button>
      </div>

      <button
        type="button"
        onClick={goRecord}
        className="flex w-full items-center justify-between rounded-[2rem] bg-[#3f63f4] px-5 py-5 text-left text-white shadow-[0_12px_30px_rgba(63,99,244,0.25)] active:scale-[0.98]"
      >
        <div>
          <p className="text-2xl font-black">수기 입력</p>
          <p className="mt-1 text-sm text-blue-100">
            혈당과 시간을 직접 입력하여 기록에 반영하세요.
          </p>
        </div>
        <span className="text-4xl leading-none">›</span>
      </button>
    </div>
  );
}

function IconButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm active:scale-[0.96]"
      aria-label={label}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="mt-1 text-[10px] font-bold text-slate-500">{label}</span>
    </button>
  );
}

function StatusPill({ value }: { value: number }) {
  const text = value <= 70 ? "주의" : value >= 180 ? "위험" : "정상";

  return (
    <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700">
      {text}
    </div>
  );
}

function SettingsScreen({ patient, goHome, setPatient }: any) {
  return (
    <div className="space-y-5">
      <PageHeader title="설정" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-black">
            {patient.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-lg font-black">{patient.name}</p>
            <p className="text-sm text-slate-500">
              {patient.gender} · {patient.birth}
            </p>
          </div>
        </div>
      </div>

      <SettingGroup>
        <SettingRow title="환자 정보 관리" text="이름, 성별, 생년월일 수정" icon="○" />
        <SettingRow title="알림 설정" text="저혈당, 고혈당, 누락 입력 알림" icon="◇" />
        <SettingRow title="목표 혈당 범위" text="정상 범위 70~180mg/dL" icon="□" />
      </SettingGroup>

      <SettingGroup>
        <SettingRow title="웨어러블 연동" text="CGM / 스마트워치 데이터 연결" icon="⌁" />
        <SettingRow title="데이터 동기화" text="최근 기록 자동 업데이트" icon="↻" />
        <SettingRow title="의사용 보고서" text="1~2개월 혈당 리포트 생성" icon="▤" />
      </SettingGroup>

      <SettingGroup>
        <SettingRow title="개인정보 보호" text="의료 데이터 보안 및 접근 권한" icon="⌾" />
        <SettingRow title="앱 정보" text="Mediger Patient v1.0" icon="i" />
      </SettingGroup>
    </div>
  );
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">{children}</div>;
}

function SettingRow({ title, text, icon }: { title: string; text: string; icon: string }) {
  return (
    <button
      type="button"
      onClick={() => alert(`${title} 기능은 추후 백엔드 연동 예정입니다.`)}
      className="flex w-full items-center gap-4 border-b border-slate-100 px-5 py-4 text-left last:border-b-0 active:bg-slate-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{text}</p>
      </div>
      <span className="text-2xl text-slate-300">›</span>
    </button>
  );
}

function PatientEditScreen({ patient, setPatient, goHome }: any) {
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

      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <InputLabel label="이름">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-style" />
          </InputLabel>

          <InputLabel label="성별">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-style">
              <option>남성</option>
              <option>여성</option>
              <option>기타</option>
            </select>
          </InputLabel>

          <InputLabel label="생년월일">
            <input value={birth} onChange={(e) => setBirth(e.target.value)} className="input-style" />
          </InputLabel>

          <button
            type="button"
            onClick={savePatient}
            className="w-full rounded-2xl bg-[#3f63f4] py-4 font-bold text-white shadow-sm active:scale-[0.98]"
          >
            수정 완료
          </button>
        </div>
      </div>
    </div>
  );
}

function InputLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-600">{label}</p>
      {children}
    </div>
  );
}

function RecordScreen({ records, setRecords, goHome }: any) {
  const [glucose, setGlucose] = useState("");
  const [time, setTime] = useState("");
  const [memo, setMemo] = useState("");

  const addRecord = () => {
    const value = Number(glucose);

    if (!value || !time) {
      alert("시간과 혈당 값을 입력해줘");
      return;
    }

    const newRecord: RecordItem = {
      glucose: value,
      time,
      memo: memo || "특이사항 없음",
    };

    const sorted = [...records, newRecord].sort((a, b) => a.time.localeCompare(b.time));

    setRecords(sorted);
    setGlucose("");
    setTime("");
    setMemo("");

    alert("기록 저장 완료");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="수기 입력" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm leading-6 text-slate-500">누락된 혈당을 작성해주세요.</p>

        <div className="space-y-3">
          <input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="input-style" />
          <input value={glucose} onChange={(e) => setGlucose(e.target.value)} type="number" placeholder="혈당 입력 mg/dL" className="input-style" />
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="환자가 수기 입력할 특이사항" className="h-28 input-style" />

          <button
            type="button"
            onClick={addRecord}
            className="w-full rounded-2xl bg-[#3f63f4] py-4 font-bold text-white shadow-sm active:scale-[0.98]"
          >
            기록 저장
          </button>
        </div>
      </div>

      <RecordList records={records} />
    </div>
  );
}

function MetricsScreen({ records, goHome }: any) {
  const [chartType, setChartType] = useState<ChartType>("day");

  return (
    <div className="space-y-4">
      <PageHeader title="상세 지표" onBack={goHome} />

      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
          <ChartTab label="하루" active={chartType === "day"} onClick={() => setChartType("day")} />
          <ChartTab label="주간" active={chartType === "week"} onClick={() => setChartType("week")} />
          <ChartTab label="월간" active={chartType === "month"} onClick={() => setChartType("month")} />
        </div>

        <div className="mt-5">
          {chartType === "day" && (
            <>
              <h2 className="text-lg font-black">하루치 혈당 그래프</h2>
              <p className="mt-1 text-sm text-slate-500">메인 페이지와 동일한 하루 혈당 흐름입니다.</p>
              <DailyLineChart records={records} compact />
            </>
          )}

          {chartType === "week" && (
            <>
              <h2 className="text-lg font-black">주간 혈당 그래프</h2>
              <p className="mt-1 text-sm text-slate-500">최근 7일 평균 혈당 흐름입니다.</p>
              <SimpleLineChart data={weeklyRecords} />
            </>
          )}

          {chartType === "month" && (
            <>
              <h2 className="text-lg font-black">월간 혈당 그래프</h2>
              <p className="mt-1 text-sm text-slate-500">최근 4주 평균 혈당 흐름입니다.</p>
              <SimpleLineChart data={monthlyRecords} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-[#3f63f4]">AI 피드백</p>
        <h2 className="mt-2 text-lg font-black">식사 이후 혈당이 급상승하는 패턴이 보여요!</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          식후 구간에서 혈당이 목표 범위보다 빠르게 상승하는 시간이 반복적으로 보입니다.
          다음 식사 때 탄수화물 섭취량과 식후 활동 여부를 같이 기록하면 원인 분석에 도움이 됩니다.
        </p>
      </div>
    </div>
  );
}

function AlertsScreen({ latest, spikeCount, lowCount, goHome }: any) {
  return (
    <div className="space-y-5">
      <PageHeader title="알림" onBack={goHome} />

      <div className="space-y-3">
        {latest >= 180 && <AlertBox title="기준치 초과 알림" text="현재 혈당이 목표 범위를 초과했습니다." />}
        {latest <= 70 && <AlertBox title="저혈당 위험" text="현재 혈당이 낮습니다. 빠른 확인이 필요합니다." />}
        {spikeCount > 0 && <AlertBox title="급상승 감지" text="최근 기록 중 급상승 구간이 있습니다." />}
        {lowCount > 0 && <AlertBox title="저혈당 기록" text="오늘 저혈당 구간이 감지되었습니다." />}
        <AlertBox title="누락 입력 알림" text="측정되지 않은 시간대가 있으면 수기로 입력해주세요." />
      </div>
    </div>
  );
}

function ChartTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-3 text-sm font-black active:scale-[0.98] ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
      }`}
    >
      {label}
    </button>
  );
}

function DailyLineChart({ records, compact = false }: { records: RecordItem[]; compact?: boolean }) {
  const width = 320;
  const height = compact ? 145 : 180;
  const minValue = 50;
  const maxValue = 230;

  const points = records.map((item, index) => {
    const x = records.length === 1 ? width / 2 : (index / (records.length - 1)) * width;
    const y = height - ((item.glucose - minValue) / (maxValue - minValue)) * height;
    return { x, y: Math.max(0, Math.min(height, y)), value: item.glucose };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x + 22} ${point.y}`).join(" ");

  const targetTop = height - ((180 - minValue) / (maxValue - minValue)) * height;
  const targetBottom = height - ((70 - minValue) / (maxValue - minValue)) * height;

  return (
    <div className="mt-4 rounded-3xl bg-white">
      <svg viewBox={`0 0 ${width + 22} ${height}`} className={compact ? "h-36 w-full" : "h-48 w-full"}>
        <text x="0" y="18" className="fill-slate-500 text-xs">230</text>
        <text x="0" y={targetTop + 4} className="fill-slate-500 text-xs">180</text>
        <text x="0" y={targetBottom + 4} className="fill-slate-500 text-xs">70</text>
        <text x="0" y={height - 2} className="fill-slate-500 text-xs">50</text>

        <rect x="22" y={targetTop} width={width} height={targetBottom - targetTop} className="fill-emerald-100" />
        <line x1="22" y1={targetTop} x2={width + 22} y2={targetTop} className="stroke-red-300" strokeWidth="1.5" strokeDasharray="5 5" />
        <line x1="22" y1={targetBottom} x2={width + 22} y2={targetBottom} className="stroke-red-300" strokeWidth="1.5" strokeDasharray="5 5" />

        <path d={path} fill="none" className="stroke-[#3f63f4]" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((point, index) => {
          const isOutlier = point.value >= 180 || point.value <= 70;
          return (
            <circle key={index} cx={point.x + 22} cy={point.y} r={isOutlier ? "4" : "3"} className={isOutlier ? "fill-red-500" : "fill-[#3f63f4]"} />
          );
        })}
      </svg>

      <div className="ml-7 mt-1 flex justify-between text-xs text-slate-500">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>

      <p className="mt-4 text-sm text-slate-500">연두색 영역은 정상 범위 70~180mg/dL입니다.</p>
    </div>
  );
}

function SimpleLineChart({ data }: { data: { label: string; glucose: number }[] }) {
  const width = 320;
  const height = 120;
  const minValue = 50;
  const maxValue = 230;

  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - ((item.glucose - minValue) / (maxValue - minValue)) * height;
    return { x, y: Math.max(0, Math.min(height, y)), value: item.glucose, label: item.label };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x + 22} ${point.y}`).join(" ");
  const targetTop = height - ((180 - minValue) / (maxValue - minValue)) * height;
  const targetBottom = height - ((70 - minValue) / (maxValue - minValue)) * height;

  return (
    <div className="mt-3 rounded-3xl bg-white">
      <svg viewBox={`0 0 ${width + 22} ${height}`} className="h-28 w-full">
        <rect x="22" y={targetTop} width={width} height={targetBottom - targetTop} className="fill-emerald-100" />
        <path d={path} fill="none" className="stroke-[#3f63f4]" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x + 22} cy={point.y} r="3.5" className="fill-[#3f63f4]" />
        ))}
      </svg>

      <div className="ml-7 mt-1 flex justify-between text-xs text-slate-500">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function RecordList({ records }: { records: RecordItem[] }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">최근 기록</h2>

      <div className="mt-4 divide-y divide-slate-100">
        {records.slice().reverse().slice(0, 3).map((item, i) => (
          <div key={i} className="py-4 text-sm">
            <div className="flex justify-between">
              <p>
                <span className="text-2xl font-black">{item.glucose}</span>
                <span className="ml-2 text-slate-500">mg/dL</span>
              </p>
              <p className="text-base text-slate-700">{item.time}</p>
            </div>
            <p className="mt-2 text-slate-500">메모: {item.memo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onBack} className="rounded-2xl bg-white px-4 py-2 text-sm font-black shadow-sm active:scale-[0.98]">
        ←
      </button>
      <h1 className="flex-1 text-center text-xl font-black">{title}</h1>
      <div className="w-[48px]" />
    </div>
  );
}

function AlertBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 rounded-full bg-slate-800" />
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  );
}