interface Props {
  summary?: string;
  medigerSummary?: string;
}

export default function AISummary({ summary, medigerSummary }: Props) {
  const text = medigerSummary || summary;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">AI 요약</h2>
        {medigerSummary && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
            MEDIGER 강화
          </span>
        )}
      </div>
      {text ? (
        <>
          <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-lg leading-relaxed">
            {text}
          </p>
          <p className="text-xs text-gray-400 italic mt-2">
            ⚠ 이 내용은 참고용이며 최종 판단은 담당 의사에게 있습니다.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400 bg-gray-50 p-4 rounded-lg">
          요약 생성 전입니다.
        </p>
      )}
    </div>
  );
}
