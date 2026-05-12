"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import clsx from "clsx";

type Feedback = "positive" | "negative" | null;

export default function DoctorFeedback() {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [memo, setMemo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!feedback) return;
    await new Promise((r) => setTimeout(r, 400));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          의사 피드백
        </h2>
        <p className="text-sm text-emerald-600">
          피드백이 저장되었습니다. 감사합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">의사 피드백</h2>
      <p className="text-xs text-gray-500 mb-3">
        AI 참고 의견이 임상적으로 유용했나요?
      </p>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFeedback("positive")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
            feedback === "positive"
              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          <ThumbsUp size={14} />
          유용했음
        </button>
        <button
          onClick={() => setFeedback("negative")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
            feedback === "negative"
              ? "bg-red-50 border-red-300 text-red-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          <ThumbsDown size={14} />
          도움 안됨
        </button>
      </div>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="추가 의견 (선택)"
        rows={2}
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />
      <button
        onClick={handleSubmit}
        disabled={!feedback}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        피드백 저장
      </button>
    </div>
  );
}
