import { getDashboardSummary, getPatients } from "@/src/lib/api";
import StatCard from "@/src/components/ui/StatCard";
import FocusList from "@/src/components/dashboard/FocusList";

export default async function DashboardPage() {
  const [summary, patients] = await Promise.all([
    getDashboardSummary(),
    getPatients(),
  ]);

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          오늘 집중 관리가 필요한 환자를 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="전체 환자 수"
          value={summary.totalPatients}
          sub="명"
        />
        <StatCard
          title="위험 환자 수"
          value={summary.highRiskCount}
          sub="명"
          highlight={summary.highRiskCount > 0}
        />
        <StatCard
          title="이상치 발생 (24h)"
          value={summary.alertCount24h}
          sub="건"
          highlight={summary.alertCount24h > 10}
        />
        <StatCard
          title="요약 대기"
          value={summary.pendingSummaryCount}
          sub="건"
        />
      </div>

      <FocusList patients={patients} />
    </div>
  );
}
