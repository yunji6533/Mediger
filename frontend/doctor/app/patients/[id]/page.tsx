import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getPatientDetail,
  getGlucoseDayData,
  getGlucoseWeekData,
  getGlucoseMultidayData,
  getPatients,
} from "@/src/lib/api";
import RiskBadge from "@/src/components/ui/RiskBadge";
import PatientAnalytics from "@/src/components/patient/PatientAnalytics";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, dayData, weekData, multidayData, patients] = await Promise.all([
    getPatientDetail(id),
    getGlucoseDayData(id),
    getGlucoseWeekData(id),
    getGlucoseMultidayData(id),
    getPatients(),
  ]);

  if (!detail) notFound();

  const { patientInfo, dailySummary } = detail;
  const patientSummary = patients.find((p) => p.patientId === id);
  const riskLevel = patientSummary?.riskLevel ?? "low";

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/patients"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={16} />
            목록
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">
            {patientInfo.name}
          </h1>
          <span className="text-sm text-gray-400">#{id}</span>
          <span className="text-sm text-gray-400">
            · {patientInfo.age}세 · {patientInfo.gender === "M" ? "남" : "여"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge level={riskLevel as "high" | "medium" | "low"} />
          <Link
            href={`/patients/${id}/rx`}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            진단 보조 →
          </Link>
        </div>
      </div>

      <PatientAnalytics
        dailySummary={dailySummary}
        dayData={dayData}
        weekData={weekData}
        multidayData={multidayData}
      />
    </div>
  );
}
