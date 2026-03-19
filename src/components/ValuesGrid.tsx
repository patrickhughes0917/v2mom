interface Value {
  name: string;
  description: string;
}

interface ValuesGridProps {
  values: Value[];
}

export default function ValuesGrid({ values }: ValuesGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[var(--accent)] font-mono text-sm uppercase tracking-wider">Values</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {values.map((value, i) => (
          <div
            key={i}
            className="bg-[var(--card)] rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
          >
            <h3 className="font-semibold text-white mb-2">{value.name}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{value.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
