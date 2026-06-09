export function AlertBox({ title, text, onClick }: { title: string; text: string; onClick?: () => void }) {
  return (
    <div 
      className={`rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(30,76,120,0.08)] ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 rounded-full bg-[#285b8f]" />
        <div>
          <p className="font-black text-[#07142f]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
        </div>
      </div>
    </div>
  );
}