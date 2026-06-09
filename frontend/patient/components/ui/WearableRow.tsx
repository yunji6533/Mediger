export function WearableRow({
  title,
  subtext,
  isActiveItem,
  toggled,
  onToggle,
  isLast = false
}: {
  title: string;
  subtext: string;
  isActiveItem: boolean;
  toggled?: boolean;
  onToggle?: () => void;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-5 px-5 ${isLast ? "" : "border-b border-slate-100"}`}>
      <div className="flex items-center gap-4">
        <div className={`h-10 w-1.5 rounded-full ${isActiveItem ? "bg-[#8fb9dc]" : "bg-slate-200"}`} />
        <div>
          <p className={`text-[17px] font-black ${isActiveItem ? "text-[#07142f]" : "text-slate-400"}`}>{title}</p>
          <p className={`mt-0.5 text-sm ${isActiveItem ? "text-[#7192ad]" : "text-slate-300"}`}>{subtext}</p>
        </div>
      </div>
      {isActiveItem && (
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${toggled ? "bg-[#285b8f]" : "bg-slate-300"
            }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${toggled ? "translate-x-6" : "translate-x-1"
              }`}
          />
        </button>
      )}
    </div>
  );
}