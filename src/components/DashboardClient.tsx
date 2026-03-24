"use client";

import VisionCard from "@/components/VisionCard";
import ValuesGrid from "@/components/ValuesGrid";
import MethodCard from "@/components/MethodCard";
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
      | { text: string; dataSource: "jira_gsrr" | "jira_agentic" | "jira_smart_action_items" | "static" | "jellyfish_ktlo" | "jellyfish_lead_time"; percent?: number; tbd?: boolean }
      | { text: string; dataSource: "static_progress"; current: number; target: number; unit?: string }
      | { text: string; dataSource: "static_target"; value: number; target: number; unit: string; lowerIsBetter?: boolean }
      | { text: string; dataSource: "static_binary"; done: boolean }
      | { text: string; dataSource: "devex_survey"; surveyUrl?: string; devexIndex?: { score: number; trend: number }; topics?: { name: string; priority: number; score: number; trend: number; priorityTopic?: boolean }[] }
      | { text: string; dataSource: "cogs_savings"; monthlySavings: number; targetAnnual: number; landedDate: string }
    )[];
  }[];
  chartData: { name: string; value: number }[];
  recentActivity: { id: number; title: string; source: string; time: string }[];
}

interface DashboardClientProps {
  data: V2MOMData;
}

function getCurrentFiscalPeriod() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  // FY starts Feb 1: FY = calendar year + 1 when month >= 2
  const fy = month >= 2 ? year + 1 : year;
  let q: number;
  let months: string;
  if (month >= 2 && month <= 4)       { q = 1; months = "Feb–Apr"; }
  else if (month >= 5 && month <= 7)  { q = 2; months = "May–Jul"; }
  else if (month >= 8 && month <= 10) { q = 3; months = "Aug–Oct"; }
  else                                { q = 4; months = "Nov–Jan"; }
  return { fy, q, months };
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const { fy, q, months } = getCurrentFiscalPeriod();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 bg-[var(--card)]/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">Iterable Engineering</span>
            <span className="text-slate-700">·</span>
            <span className="text-white font-semibold text-sm">V2MOM</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-xs font-mono">
              FY{fy} · Q{q}
              <span className="text-slate-600 ml-1.5">{months}</span>
            </span>
            <div className="w-px h-4 bg-slate-700" />
            <Link
              href="/settings"
              className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
            >
              Data Sources
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

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

        <section>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[var(--accent)] font-mono text-xs uppercase tracking-widest">Methods & Measures</p>
            <div className="flex-1 h-px bg-slate-700/50" />
            <span className="text-slate-600 text-xs font-mono">{data.methods.length} methods</span>
          </div>
          <div className="space-y-2.5">
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

      </main>
    </div>
  );
}
