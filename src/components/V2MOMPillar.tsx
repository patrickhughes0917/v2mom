import MetricCard from "./MetricCard";

interface PillarMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  changeSuffix?: string;
}

interface V2MOMPillarProps {
  title: string;
  description: string;
  metrics: PillarMetric[];
  highlights: string[];
}

export default function V2MOMPillar({ title, description, metrics, highlights }: V2MOMPillarProps) {
  return (
    <section className="bg-[var(--card)] rounded-xl p-6 border border-slate-700/50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--accent)]">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {metrics.map((metric, i) => (
          <MetricCard
            key={i}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            changeSuffix={metric.changeSuffix ?? " from last week"}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {highlights.map((h, i) => (
          <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            {h}
          </li>
        ))}
      </ul>
    </section>
  );
}
