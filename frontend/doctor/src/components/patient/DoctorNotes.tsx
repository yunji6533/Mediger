"use client";

import { useState } from "react";
import type { DoctorNote } from "@/src/types";
import { formatDateKo } from "@/src/lib/utils";

export default function DoctorNotes({
  notes: initialNotes,
  patientId,
}: {
  notes: DoctorNote[];
  patientId: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const newNote: DoctorNote = {
      id: `local-${Date.now()}`,
      patientId,
      doctorId: "dr-001",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setText("");
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">의사 메모</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메모를 입력하세요..."
            rows={2}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) handleSave();
            }}
          />
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="px-4 self-end py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors whitespace-nowrap h-fit"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
        {notes.length > 0 && (
          <ul className="space-y-2 max-h-52 overflow-y-auto">
            {notes.map((note) => (
              <li key={note.id} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">
                  {formatDateKo(note.createdAt)}
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {note.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
