interface Props {
  opinion: string;
  medigerOpinion?: string;
}

export default function RAGOpinion({ opinion, medigerOpinion }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">AI 참고 의견</h2>
      <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-lg leading-relaxed">
        {opinion}
      </p>
      {medigerOpinion && (
        <div className="mt-4 border-l-2 border-blue-400 pl-3">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">
            MEDIGER 분석 기반 추가 의견
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            {medigerOpinion}
          </p>
        </div>
      )}
      <p className="text-xs text-gray-400 italic mt-3">
        ⚠ 이 내용은 참고용이며 최종 처방 판단은 담당 의사에게 있습니다.
      </p>
    </div>
  );
}
