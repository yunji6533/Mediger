export function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_12px_30px_rgba(30,76,120,0.07)]">
      {children}
    </div>
  );
}