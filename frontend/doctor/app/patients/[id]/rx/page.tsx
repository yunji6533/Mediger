import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getPatientDetail,
  getGlucoseMultidayData,
  getPatternLogs,
  getThresholdAlerts,
  getDiagnosisRecommendations,
  getPatternAnalysis,
  getAnomalyAnalysis,
} from "@/src/lib/api";
import { getAverageDayProfile } from "@/src/lib/mockData";
import DiagnosisReport from "@/src/components/patient/DiagnosisReport";

export default async function RxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detail, multidayData, patterns, thresholdEvents, recommendations, patternAnalysis, anomalyAnalysis] =
    await Promise.all([
      getPatientDetail(id),
      getGlucoseMultidayData(id),
      getPatternLogs(id),
      getThresholdAlerts(id),
      getDiagnosisRecommendations(id),
      getPatternAnalysis(id),
      getAnomalyAnalysis(id),
    ]);

  if (!detail) notFound();

  const avgDayProfile = getAverageDayProfile(multidayData);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/patients/${id}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
          환자 상세
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          {detail.patientInfo.name} — 진단 보조
        </h1>
        <span className="text-sm text-gray-400">#{id}</span>
      </div>

      <DiagnosisReport
        patientName={detail.patientInfo.name}
        avgDayProfile={avgDayProfile}
        multidayData={multidayData}
        thresholdEvents={thresholdEvents}
        patterns={patterns}
        recommendations={recommendations}
        patternAnalysis={patternAnalysis}
        anomalyAnalysis={anomalyAnalysis}
      />
    </div>
  );
}
