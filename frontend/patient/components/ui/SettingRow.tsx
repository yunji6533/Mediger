export function SettingRow({ title, text, onClick }: { title: string; text: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick ? onClick : () => alert(`${title} 기능은 추후 백엔드 연동 예정입니다.`)}
      className="flex w-full cursor-pointer items-center gap-4 border-b border-slate-100 px-5 py-4 text-left last:border-b-0 active:bg-slate-50"
    >
      <div className="h-10 w-1.5 rounded-full bg-[#8fb9dc]" />
      <div className="flex-1">
        <p className="font-black text-[#07142f]">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{text}</p>
      </div>
      <span className="text-2xl text-slate-300">›</span>
    </button>
  );
}