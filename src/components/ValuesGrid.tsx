interface Value {
  name: string;
  description: string;
}

interface ValuesGridProps {
  values: Value[];
}

export default function ValuesGrid({ values }: ValuesGridProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[var(--accent)] font-mono text-xs uppercase tracking-widest">Values</p>
        <div className="flex-1 h-px bg-slate-700/50" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {values.map((value, i) => (
          <div
            key={i}
            className="bg-[var(--card)] rounded-xl px-5 py-4 border border-slate-700/50 hover:border-slate-600 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="text-[var(--accent)]/40 font-mono text-xs mt-0.5 flex-shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-semibold text-white text-sm">{value.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mt-1">{value.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
