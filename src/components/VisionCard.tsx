interface VisionCardProps {
  title: string;
  subtitle: string;
  statement: string;
}

export default function VisionCard({ title, subtitle, statement }: VisionCardProps) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-8 pt-7 pb-6 border-b border-slate-700/50">
        <p className="text-[var(--accent)] font-mono text-xs uppercase tracking-widest mb-3">Vision</p>
        <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-slate-400 mt-1">{subtitle}</p>
      </div>
      <div className="px-8 py-6 flex gap-5">
        <div className="w-0.5 bg-[var(--accent)]/30 rounded-full flex-shrink-0" />
        <p className="text-slate-300 leading-relaxed text-[0.95rem]">{statement}</p>
      </div>
    </div>
  );
}
