export function ToggleRow({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4 last:border-b-0">
      <span className="font-black text-[#07142f]">{title}</span>
      <button
        type="button"
        onClick={onClick}
        className={`relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full transition-colors ${active ? "bg-[#285b8f]" : "bg-slate-300"
          }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-1"
            }`}
        />
      </button>
    </div>
  );
}