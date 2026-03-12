interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  changeSuffix?: string; // e.g. "from last week" (default) or "" for raw change text
}

export default function MetricCard({ label, value, change, trend, changeSuffix = " from last week" }: MetricCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <p className="text-slate-400 text-xs font-medium">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      {change && (
        <p
          className={`text-xs mt-1 ${
            trend === "up" ? "text-[var(--success)]" : trend === "down" ? "text-red-400" : "text-slate-400"
          }`}
        >
          {trend === "up" && "↑"} {trend === "down" && "↓"} {change}{changeSuffix}
        </p>
      )}
    </div>
  );
}
