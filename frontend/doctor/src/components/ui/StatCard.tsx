import clsx from "clsx";

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}

export default function StatCard({
  title,
  value,
  sub,
  highlight,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-5 flex flex-col gap-1",
        highlight
          ? "border-red-200 bg-red-50"
          : "border-gray-200 bg-white"
      )}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p
        className={clsx(
          "text-3xl font-bold tabular-nums",
          highlight ? "text-red-700" : "text-gray-900"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
