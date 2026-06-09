export function InputLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-slate-600">{label}</p>
      {children}
    </div>
  );
}