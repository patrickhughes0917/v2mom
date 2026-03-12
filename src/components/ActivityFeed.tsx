interface Activity {
  id: number;
  title: string;
  source: string;
  time: string;
}

interface ActivityFeedProps {
  items: Activity[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="bg-[var(--card)] rounded-xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">{item.title}</p>
              <p className="text-slate-400 text-sm">
                {item.source} · {item.time}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
