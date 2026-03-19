"use client";

import VisionCard from "@/components/VisionCard";
import ValuesGrid from "@/components/ValuesGrid";
import MethodCard from "@/components/MethodCard";
import SimpleChart from "@/components/SimpleChart";
import ActivityFeed from "@/components/ActivityFeed";
import Link from "next/link";

export interface V2MOMData {
  vision: { title: string; subtitle: string; statement: string };
  values: { name: string; description: string }[];
  methods: {
    id: number;
    name: string;
    owner: string;
    description: string;
    measures: (
      | string
      | { text: string; dataSource: "jira_gsrr" | "jira_agentic" | "static" | "jellyfish_ktlo"; percent?: number }
      | { text: string; dataSource: "cogs_savings"; monthlySavings: number; targetAnnual: number; landedDate: string }
    )[];
  }[];
  chartData: { name: string; value: number }[];
  recentActivity: { id: number; title: string; source: string; time: string }[];
}

interface DashboardClientProps {
  data: V2MOMData;
}

export default function DashboardClient({ data }: DashboardClientProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 bg-[var(--card)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[var(--accent)]">Engineering V2MOM Dashboard</h1>
          <nav className="flex gap-4">
            <Link
              href="/settings"
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Data Sources
            </Link>
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-[var(--accent)] font-mono text-sm uppercase tracking-wider">FY27</p>
          <h2 className="text-xl text-slate-300 mt-1">Engineering V2MOM: The Year of Nova</h2>
        </div>

        <section className="mb-10">
          <VisionCard
            title={data.vision.title}
            subtitle={data.vision.subtitle}
            statement={data.vision.statement}
          />
        </section>

        <section className="mb-10">
          <ValuesGrid values={data.values} />
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[var(--accent)] font-mono text-sm uppercase tracking-wider">
              Methods & Measures
            </p>
          </div>
          <div className="space-y-3">
            {data.methods.map((method) => (
              <MethodCard
                key={method.id}
                id={method.id}
                name={method.name}
                owner={method.owner}
                description={method.description}
                measures={method.measures}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-700/50">
          <div className="lg:col-span-2">
            <SimpleChart data={data.chartData} />
            <p className="text-slate-500 text-xs mt-2">
              Connect Jira, Jellyfish, or other data sources to show live metrics here.
            </p>
          </div>
          <div>
            <ActivityFeed items={data.recentActivity} />
          </div>
        </div>
      </main>
    </div>
  );
}
