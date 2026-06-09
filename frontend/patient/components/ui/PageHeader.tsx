export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#285b8f] shadow-[0_8px_22px_rgba(30,76,120,0.08)] active:scale-[0.98]"
      >
        ←
      </button>
      <h1 className="flex-1 text-center text-xl font-black">{title}</h1>
      <div className="w-[48px]" />
    </div>
  );
}