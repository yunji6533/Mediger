import { PatientInfo, RecordItem } from "../types";

export const PATIENT_ID = "2000";

export const initialPatient: PatientInfo = {
  name: "환자 2002",
  gender: "남",
  birth: "1969년생",
};

export const dayRecords: RecordItem[] = [
  { time: "00:00", glucose: 125, memo: "야간 수치" },
  { time: "01:00", glucose: 110, memo: "안정" },
  { time: "02:00", glucose: 94, memo: "하락 중" },
  { time: "03:00", glucose: 58, memo: "⚠️ 저혈당 경고" },
  { time: "04:00", glucose: 72, memo: "회복 중" },
  { time: "05:00", glucose: 88, memo: "안정" },
  { time: "06:00", glucose: 105, memo: "기상 전" },
  { time: "07:00", glucose: 138, memo: "기상 후" },
  { time: "08:00", glucose: 172, memo: "아침 식후 상승" },
  { time: "09:00", glucose: 185, memo: "⚠️ 고혈당" },
  { time: "10:00", glucose: 176, memo: "고혈당 지속" },
  { time: "11:00", glucose: 158, memo: "하락 중" },
  { time: "12:00", glucose: 143, memo: "점심 전" },
  { time: "13:00", glucose: 168, memo: "점심 식후" },
  { time: "14:00", glucose: 162, memo: "오후 중" },
  { time: "15:00", glucose: 145, memo: "회복 중" },
  { time: "16:00", glucose: 130, memo: "안정" },
  { time: "17:00", glucose: 128, memo: "저녁 전" },
  { time: "18:00", glucose: 148, memo: "저녁 준비" },
  { time: "19:00", glucose: 205, memo: "⚠️ 고혈당 급등" },
  { time: "20:00", glucose: 268, memo: "⚠️ 고혈당 심각" },
  { time: "21:00", glucose: 312, memo: "⚠️ 최고 수치" },
  { time: "22:00", glucose: 278, memo: "고혈당 지속" },
  { time: "23:00", glucose: 198, memo: "야간 진입" },
];

export const weeklyRecords = [
  { label: "일", glucose: 150 },
  { label: "월", glucose: 146 },
  { label: "화", glucose: 139 },
  { label: "수", glucose: 145 },
  { label: "목", glucose: 138 },
  { label: "금", glucose: 152 },
  { label: "토", glucose: 135 },
];
