"use client";

import { useEffect, useState } from "react";
import V2MOMPillar from "@/components/V2MOMPillar";
import SimpleChart from "@/components/SimpleChart";
import ActivityFeed from "@/components/ActivityFeed";
import Link from "next/link";

interface PillarData {
  title: string;
  description: string;
  metrics: { label: string; value: string | number; change?: string; trend?: "up" | "down" }[];
  highlights: string[];
}

interface DashboardData {
  vision: PillarData;
  values: PillarData;
  methods: PillarData;
  obstacles: PillarData;
  measures: PillarData;
  chartData: { name: string; value: number }[];
  recentActivity: { id: number; title: string; source: string; time: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--accent)] text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "No data available"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-slate-900 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pillars = [data.vision, data.values, data.methods, data.obstacles, data.measures];

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
          <h2 className="text-xl text-slate-300">Engineering progress at a glance</h2>
          <p className="text-slate-500 text-sm mt-1">
            Centralized metrics across Vision, Values, Methods, Obstacles, and Measures.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {pillars.map((pillar, i) => (
            <V2MOMPillar
              key={i}
              title={pillar.title}
              description={pillar.description}
              metrics={pillar.metrics}
              highlights={pillar.highlights}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <SimpleChart data={data.chartData} />
          </div>
          <div>
            <ActivityFeed items={data.recentActivity} />
          </div>
        </div>
      </main>
    </div>
  );
}
