export function ChartTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-xl py-3 text-sm font-black active:scale-[0.98] ${active
        ? "bg-white text-[#285b8f] shadow-sm"
        : "text-slate-500"
        }`}
    >
      {label}
    </button>
  );
}
