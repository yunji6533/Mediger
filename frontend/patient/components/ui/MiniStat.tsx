export function MiniStat({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="cursor-pointer rounded-2xl bg-[#f3f7fb] px-2 py-4 text-center w-full active:scale-[0.98] transition-transform">
        <p className="text-[13px] font-black text-[#7192ad]">{label}</p>
        <p className="mt-1.5 text-xl font-black tracking-tight text-[#07142f]">{value}</p>
      </button>
    );
  }
  return (
    <div className="rounded-2xl bg-[#f3f7fb] px-2 py-4 text-center">
      <p className="text-[13px] font-black text-[#7192ad]">{label}</p>
      <p className="mt-1.5 text-xl font-black tracking-tight text-[#07142f]">{value}</p>
    </div>
  );
}