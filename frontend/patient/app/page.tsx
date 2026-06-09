"use client";

import { useMemo, useState, useEffect, useCallback } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ? "/api/proxy" : "";

import { Screen, ChartType, RecordItem, PatientInfo } from "../types";
import { PATIENT_ID, initialPatient, dayRecords, weeklyRecords } from "../constants";
import { calculateAge } from "../utils";
import { PageHeader } from "../components/ui/PageHeader";
import { TopTextButton } from "../components/ui/TopTextButton";
import { MiniStat } from "../components/ui/MiniStat";
import { StatusPill } from "../components/ui/StatusPill";
import { InputLabel } from "../components/ui/InputLabel";
import { AlertBox } from "../components/ui/AlertBox";
import { ToggleRow } from "../components/ui/ToggleRow";
import { SettingGroup } from "../components/ui/SettingGroup";
import { SettingRow } from "../components/ui/SettingRow";
import { WearableRow } from "../components/ui/WearableRow";
import { ChartTab } from "../components/ui/ChartTab";
import { DailyLineChart } from "../components/charts/DailyLineChart";
import { SimpleLineChart } from "../components/charts/SimpleLineChart";
import { OutlierTable } from "../components/ui/OutlierTable";
import { RecordList } from "../components/ui/RecordList";
import { HomeScreen } from "../components/screens/HomeScreen";
import { SettingsScreen } from "../components/screens/SettingsScreen";
import { PatientEditScreen } from "../components/screens/PatientEditScreen";
import { RecordScreen } from "../components/screens/RecordScreen";
import { MetricsScreen } from "../components/screens/MetricsScreen";
import { AlertsScreen } from "../components/screens/AlertsScreen";
import { NotificationSettingsScreen } from "../components/screens/NotificationSettingsScreen";
import { TargetSettingsScreen } from "../components/screens/TargetSettingsScreen";
import { WearableScreen } from "../components/screens/WearableScreen";
import { SyncScreen } from "../components/screens/SyncScreen";
import { PrivacyScreen } from "../components/screens/PrivacyScreen";
import { AppInfoScreen } from "../components/screens/AppInfoScreen";
import { ReportScreen } from "../components/screens/ReportScreen";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [editReturnTo, setEditReturnTo] = useState<Screen>("home");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [patient, setPatient] = useState<PatientInfo>(initialPatient);
  const [alertsSettings, setAlertsSettings] = useState({ low: true, high: true, missing: true });
  const [targetRange, setTargetRange] = useState({ min: 70, max: 180 });
  const [metricsFilter, setMetricsFilter] = useState<"all" | "high" | "low">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [metricsData, setMetricsData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // BASE_URL이 비어있으면 Mock 모드 (API 호출 건너뛰기)
      if (!BASE_URL) {
        setPatient(initialPatient);
        setRecords(dayRecords);
        setMetricsData({
          weekly: weeklyRecords,
          weekly_summaries: weeklyRecords.map(w => ({ avg_glucose: w.glucose })),
          tir: 62,
          tar: 28,
          tbr: 10,
          avg_glucose: 142
        });
        setIsLoading(false);
        return;
      }

      // 환자 API 엔드포인트에서 데이터 가져오기
      try {
        const [todayRes, metricsRes, patientsRes] = await Promise.all([
          fetch(`${BASE_URL}/api/patient/${PATIENT_ID}/today`),
          fetch(`${BASE_URL}/api/patient/${PATIENT_ID}/metrics`),
          fetch(`${BASE_URL}/api/doctor/patients`),
        ]);

        const failedEndpoints = [
          !todayRes.ok && `today(${todayRes.status})`,
          !metricsRes.ok && `metrics(${metricsRes.status})`,
        ].filter(Boolean);
        if (failedEndpoints.length > 0) throw new Error(`API 응답 실패: ${failedEndpoints.join(", ")}`);

        // 환자 기본 정보 (doctor 목록에서 필터링)
        if (patientsRes.ok) {
          const patientListData = await patientsRes.json();
          const list = Array.isArray(patientListData) ? patientListData : (patientListData.patients || []);
          const found = list.find((p: any) => String(p.patient_id) === String(PATIENT_ID));
          if (found) {
            setPatient({
              name: found.name || `환자 ${PATIENT_ID}`,
              gender: (found.gender === "M" || found.gender === "남") ? "남" : "여",
              birth: found.age ? `${2026 - Number(found.age)}년생` : "미정",
            });
          }
        }

        const todayData = await todayRes.json();
        const metricsApiData = await metricsRes.json();

        // 당일 시계열 처리
        if (todayData && Array.isArray(todayData.timeseries)) {
          // 시간대별로 그룹화 (15분 간격 → HH:MM 키로 마지막 값 유지)
          const hourlyMap: { [key: string]: { glucose: number; time: string } } = {};
          todayData.timeseries.forEach((t: any) => {
            const dateObj = new Date(t.time);
            const hh = String(dateObj.getHours()).padStart(2, '0');
            const mm = String(dateObj.getMinutes()).padStart(2, '0');
            const timeStr = `${hh}:${mm}`;
            hourlyMap[timeStr] = {
              glucose: Math.round(t.glucose || 0),
              time: timeStr
            };
          });

          // 시간 순 정렬
          const parsedRecords = Object.values(hourlyMap).sort((a, b) => {
            const [aH, aM] = a.time.split(':').map(Number);
            const [bH, bM] = b.time.split(':').map(Number);
            return (aH * 60 + aM) - (bH * 60 + bM);
          }).map(r => ({
            time: r.time,
            glucose: r.glucose,
            memo: ""
          }));

          setRecords(parsedRecords);
        }

        // weekly_summaries(날짜 DESC)를 차트용 { label, glucose }로 변환
        const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
        const weeklyForChart = (metricsApiData.weekly_summaries || [])
          .slice()
          .reverse()
          .map((s: any) => ({
            label: DAY_NAMES[new Date(s.date).getDay()],
            glucose: Math.round(s.avg_glucose || 0),
          }));

        setMetricsData({
          weekly: weeklyForChart.length > 0 ? weeklyForChart : weeklyRecords,
          weekly_summaries: metricsApiData.weekly_summaries || [],
          tir: metricsApiData.tir ?? 0,
          tar: metricsApiData.tar ?? 0,
          tbr: metricsApiData.tbr ?? 0,
          avg_glucose: metricsApiData.avg_glucose ?? 0,
        });
      } catch (apiErr) {
        console.error("AWS API 호출 실패:", apiErr);
        // 폴백: mock 데이터 사용
        setPatient(initialPatient);
        setRecords(dayRecords);
        setMetricsData({
          weekly: weeklyRecords,
          weekly_summaries: weeklyRecords.map(w => ({ avg_glucose: w.glucose })),
          tir: 62,
          tar: 28,
          tbr: 10,
          avg_glucose: 142
        });
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      // API 실패 시 기존 Mock 데이터로 폴백
      setPatient(initialPatient);
      setRecords(dayRecords);
      setMetricsData({
        weekly: weeklyRecords,
        weekly_summaries: weeklyRecords.map(w => ({ avg_glucose: w.glucose })),
        tir: 62,
        tar: 28,
        tbr: 10,
        avg_glucose: 142
      });
      alert(`데이터 로딩에 실패했습니다. 데모 데이터를 표시합니다.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const latest = records.length > 0 ? records[records.length - 1].glucose : 0;

  const todayAverage = useMemo(() => {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, cur) => acc + cur.glucose, 0);
    return Math.round(sum / records.length);
  }, [records]);

  const spikeCount = records.filter((r) => r.glucose >= targetRange.max).length;
  const lowCount = records.filter((r) => r.glucose <= targetRange.min).length;

  const commonProps = {
    records,
    setRecords,
    latest,
    todayAverage,
    spikeCount,
    lowCount,
    patient,
    setPatient,
    alertsSettings,
    setAlertsSettings,
    targetRange,
    setTargetRange,
    metricsFilter,
    setMetricsFilter,
    metricsData,
    reload: fetchData,
    goHome: () => { setScreen("home"); setMetricsFilter("all"); },
    goWearable: () => setScreen("wearable"),
    goSync: () => setScreen("sync"),
    goPrivacy: () => setScreen("privacy"),
    goAppInfo: () => setScreen("appInfo"),
    goReport: () => setScreen("report"),
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#edf5fb] to-[#f8fbff] text-slate-950">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#285b8f]" />
          <p className="mt-4 font-black text-slate-500">데이터를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#edf5fb] to-[#f8fbff] px-5 py-6 text-slate-950">
      <section className="mx-auto max-w-md space-y-5">
        {screen === "home" && (
          <HomeScreen
            {...commonProps}
            goAlerts={() => setScreen("alerts")}
            goMetrics={() => setScreen("metrics")}
            goRecord={() => setScreen("record")}
            goPatientEdit={() => { setEditReturnTo("home"); setScreen("patientEdit"); }}
            goSettings={() => setScreen("settings")}
          />
        )}

        {screen === "record" && <RecordScreen {...commonProps} />}
        {screen === "alerts" && <AlertsScreen {...commonProps} goRecord={() => setScreen("record")} alertsSettings={alertsSettings} />}
        {screen === "metrics" && <MetricsScreen {...commonProps} />}
        {screen === "patientEdit" && <PatientEditScreen {...commonProps} goHome={() => setScreen(editReturnTo)} />}
        {screen === "settings" && <SettingsScreen {...commonProps} goPatientEdit={() => { setEditReturnTo("settings"); setScreen("patientEdit"); }} goNotificationSettings={() => setScreen("notificationSettings")} goTargetSettings={() => setScreen("targetSettings")} goWearable={() => setScreen("wearable")} goSync={() => setScreen("sync")} goPrivacy={() => setScreen("privacy")} goAppInfo={() => setScreen("appInfo")} />}
        {screen === "notificationSettings" && <NotificationSettingsScreen {...commonProps} goHome={() => setScreen("settings")} />}
        {screen === "targetSettings" && <TargetSettingsScreen {...commonProps} goHome={() => setScreen("settings")} />}
        {screen === "wearable" && <WearableScreen {...commonProps} goHome={() => setScreen("settings")} />}
        {screen === "sync" && <SyncScreen {...commonProps} goHome={() => setScreen("settings")} />}
        {screen === "privacy" && <PrivacyScreen {...commonProps} goHome={() => setScreen("settings")} />}
        {screen === "appInfo" && <AppInfoScreen {...commonProps} goHome={() => setScreen("settings")} />}
        {screen === "report" && <ReportScreen {...commonProps} goHome={() => setScreen("settings")} />}
      </section>
    </main>
  );
}






















































