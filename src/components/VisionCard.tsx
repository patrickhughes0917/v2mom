interface VisionCardProps {
  title: string;
  subtitle: string;
  statement: string;
}

export default function VisionCard({ title, subtitle, statement }: VisionCardProps) {
  return (
    <div className="bg-gradient-to-br from-[var(--card)] to-slate-800/80 rounded-xl p-8 border border-slate-700/50">
      <p className="text-[var(--accent)] font-mono text-sm uppercase tracking-wider mb-2">Vision</p>
      <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
      <p className="text-slate-400 text-lg mb-6">{subtitle}</p>
      <p className="text-slate-300 leading-relaxed">{statement}</p>
    </div>
  );
}
