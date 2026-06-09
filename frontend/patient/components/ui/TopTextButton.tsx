export function TopTextButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-2xl bg-white px-5 py-3.5 text-[15px] font-black text-[#285b8f] shadow-[0_8px_22px_rgba(30,76,120,0.10)] active:scale-[0.96]"
    >
      {label}
    </button>
  );
}