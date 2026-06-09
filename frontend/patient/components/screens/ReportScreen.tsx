import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Screen } from '../../types';
import { PATIENT_ID } from '../../constants';

export function ReportScreen({ patient, goHome, metricsData }: any) {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toISOString().split("T")[0];

  const weeklyAverage = useMemo(() => {
    if (!metricsData || !metricsData.weekly_summaries || metricsData.weekly_summaries.length === 0) return 0;
    const summaries = metricsData.weekly_summaries;
    const sum = summaries.reduce((acc: number, cur: any) => acc + (cur.avg_glucose || 0), 0);
    return Math.round(sum / summaries.length);
  }, [metricsData]);

  const [patternReport, setPatternReport] = useState<string | null>(null);
  const [anomalyReport, setAnomalyReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
    if (!BASE_URL) {
      setPatternReport(
        "패턴 요약:\n" +
        "최근 측정 데이터에서 아침 식후(08:00~10:00) 고혈당과 야간(02:00~04:00) 저혈당의 반복 패턴이 관찰됩니다. " +
        "평균 혈당이 목표 범위(70~180 mg/dL)를 초과하는 경향이 있습니다.\n\n" +
        "임상 의미:\n" +
        "식후 혈당 급상승은 탄수화물 섭취량 과다 또는 식전 인슐린 투여 타이밍 문제를 시사합니다. " +
        "야간 저혈당은 Somogyi 효과로 인한 새벽 고혈당 반등과 연관될 수 있습니다. " +
        "(ADA Standards of Care 2024, Section 6)\n\n" +
        "권고사항:\n" +
        "규칙적인 혈당 모니터링과 담당 의사와의 상담을 권장드립니다.\n\n" +
        "출처: ADA Standards of Care 2024 | 대한당뇨병학회 진료지침 2023"
      );
      setLoading(false);
      return;
    }  // API 없으면 mock 텍스트 표시

    const fetchReports = async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch(`${BASE_URL}/patients/${PATIENT_ID}/report/pattern`),
          fetch(`${BASE_URL}/patients/${PATIENT_ID}/report/anomaly`)
        ]);
        if (pRes.ok) {
          const pData = await pRes.json();
          setPatternReport(pData.analysis);
        }
        if (aRes.ok) {
          const aData = await aRes.json();
          const hypo = aData.hypo?.analysis || "";
          const hyper = aData.hyper?.analysis || "";
          const combined = [hypo, hyper].filter(Boolean).join("\n\n");
          setAnomalyReport(combined || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // 고혈당/저혈당 이상치 분석 생성 (API 실패 시 폴백)
  const generateAnomalyAnalysis = useMemo(() => {
    if (!metricsData) return null;
    
    const tar = metricsData.tar || 0;
    const tbr = metricsData.tbr || 0;
    const avgGlucose = metricsData.avg_glucose || 0;

    if (tar === 0 && tbr === 0) {
      return null;
    }

    let analysis = "";
    
    if (tbr > 0) {
      analysis += `저혈당(70 mg/dL 미만) 발생 확률: ${tbr}%\n`;
      analysis += "- 저혈당 에피소드가 있습니다.\n";
      analysis += "- 특히 야간 저혈당 위험을 평가해야 합니다.\n";
      analysis += "- 인슐린 투여량 감소 또는 당분 간식 추가를 고려하세요.\n\n";
    }
    
    if (tar > 0) {
      analysis += `고혈당(180 mg/dL 초과) 발생 확률: ${tar}%\n`;
      analysis += "- 지속적인 고혈당이 관찰됩니다.\n";
      analysis += `- 평균 혈당 ${avgGlucose} mg/dL이 목표 범위(100-130 mg/dL)보다 높습니다.\n`;
      analysis += "- 인슐린 투여량 증가 또는 식이 조절을 고려하세요.\n";
      analysis += "- 스트레스 관리와 운동 증가도 도움이 될 수 있습니다.\n";
    }

    return analysis.trim();
  }, [metricsData]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <PageHeader title="진료용 보고서" onBack={goHome} />
        <button type="button" onClick={handlePrint} className="bg-[#285b8f] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_12px_rgba(40,91,143,0.2)] active:scale-95">
          PDF 저장 / 인쇄
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-[0_12px_30px_rgba(30,76,120,0.08)] overflow-hidden">
        <div className="p-6 border-b-4 border-[#285b8f]">
          <h1 className="text-3xl font-black text-[#285b8f]">Mediger <span className="text-[#4b83b5]">건강 리포트</span></h1>
          <p className="mt-1 text-sm text-slate-500">환자 제출용 종합 혈당 보고서</p>
        </div>

        <div className="p-6 space-y-8">
          <div className="bg-[#f8f9fa] rounded-2xl p-5 grid grid-cols-2 gap-y-6">
            <div>
              <p className="text-xs font-bold text-[#7192ad] mb-1">환자 성명</p>
              <p className="text-lg font-black text-[#07142f]">{patient.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#7192ad] mb-1">생년월일</p>
              <p className="text-lg font-black text-[#07142f]">{patient.birth}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#7192ad] mb-1">최근 1주일 평균 혈당</p>
              <p className="text-lg font-black text-[#2b5bf4]">{weeklyAverage} mg/dL</p>
            </div>
            <div>
              <p className="text-xs font-bold text-[#7192ad] mb-1">작성 일자</p>
              <p className="text-lg font-black text-[#07142f]">{today}</p>
            </div>
          </div>

          <div>
            <h2 className="text-[19px] font-black text-[#07142f] border-b border-slate-900 pb-2 mb-4">AI 패턴 분석 요약</h2>
            <div className="bg-[#f8f9fa] rounded-2xl p-5 min-h-[100px]">
              {loading ? (
                <div className="flex justify-center items-center h-full text-sm text-slate-500">AI 분석 중...</div>
              ) : (
                <p className="text-[15px] leading-7 text-[#07142f] whitespace-pre-wrap">
                  {patternReport || "분석 실패"}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-300 pt-6 mt-8 text-center">
            <p className="text-xs leading-5 text-slate-400">
              본 보고서는 Mediger AI 시스템에 의해 자동으로 생성되었습니다.<br />
              의학적 진단을 대신할 수 없으며, 참고용으로만 사용하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}