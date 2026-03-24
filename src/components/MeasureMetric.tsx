"use client";

import { useEffect, useState } from "react";

type DatePreset = { label: string; days?: number; startDate?: string; endDate?: string };

interface MeasureMetricProps {
  measureText: string;
  dataSource: "jira_gsrr" | "jira_agentic" | "static" | "jellyfish_ktlo" | "cogs_savings";
  datePresets?: DatePreset[];
  /** For static dataSource: completion percentage (0-100) */
  percent?: number;
  /** For cogs_savings dataSource */
  monthlySavings?: number;
  targetAnnual?: number;
  landedDate?: string;
}

const GSRR_PRESETS: DatePreset[] = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This quarter", days: 90 },
];

export default function MeasureMetric({
  measureText,
  dataSource,
  datePresets = GSRR_PRESETS,
  percent = 100,
  monthlySavings = 0,
  targetAnnual = 500000,
  landedDate = "",
}: MeasureMetricProps) {
  const [filter, setFilter] = useState<{ days?: number; startDate?: string; endDate?: string }>({
    days: 90,
  });
  const [data, setData] = useState<{
    complianceRate?: number;
    meetsTarget: boolean;
    total?: number;
    compliant?: number;
    highRate?: number;
    mediumRate?: number;
    quartersMet?: number;
    totalQuarters?: number;
    quarterResults?: { quarter: number; count: number; tickets: string[] }[];
    jiraUrl?: string;
    ktloPercent?: number | null;
    targetPercent?: number;
    startPercent?: number;
  } | null>(null);
  const [loading, setLoading] = useState(dataSource !== "static" && dataSource !== "cogs_savings");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataSource === "static" || dataSource === "cogs_savings") return;
    if (dataSource === "jellyfish_ktlo") {
      setLoading(true);
      setError(null);
      fetch("/api/jellyfish/ktlo")
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }
    if (dataSource === "jira_gsrr") {
      const params = new URLSearchParams();
      if (filter.days) params.set("days", String(filter.days));
      if (filter.startDate) params.set("startDate", filter.startDate);
      if (filter.endDate) params.set("endDate", filter.endDate);

      setLoading(true);
      setError(null);
      fetch(`/api/jira/gsrr-compliance?${params}`)
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "jira_agentic") {
      setLoading(true);
      setError(null);
      fetch("/api/jira/agentic-launches")
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [dataSource, filter.days, filter.startDate, filter.endDate]);

  return (
    <div className="mt-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <p className="text-slate-400 text-sm mb-3">{measureText}</p>

      {dataSource === "jira_gsrr" && (
        <div className="flex flex-wrap gap-2 mb-3">
          {datePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                setFilter(
                  preset.days ? { days: preset.days } : { startDate: preset.startDate, endDate: preset.endDate }
                )
              }
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                (filter.days === preset.days ||
                  (preset.startDate && filter.startDate === preset.startDate))
                  ? "bg-[var(--accent)] text-slate-900"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {dataSource === "static" && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--success)]">{percent}%</span>
          <span className="text-slate-400 text-sm">complete</span>
        </div>
      )}
      {dataSource === "cogs_savings" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--success)]">
              ${monthlySavings.toLocaleString()}/mo
            </span>
            <span className="text-slate-400 text-sm">savings</span>
            <span className="text-slate-500 text-sm">(landed {landedDate})</span>
          </div>
          <div className="text-slate-400 text-sm">
            ${(monthlySavings * 12).toLocaleString()} annualized
            <span className="text-slate-500 ml-1">• target ${targetAnnual.toLocaleString()}/yr</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
              <div
                className="h-full bg-[var(--success)] rounded-full"
                style={{ width: `${Math.min(100, (monthlySavings * 12 / targetAnnual) * 100)}%` }}
              />
            </div>
            <span className="text-slate-400 text-sm">
              {Math.round((monthlySavings * 12 / targetAnnual) * 100)}% of target
            </span>
          </div>
        </div>
      )}
      {loading && dataSource !== "static" && (
        <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
      )}
      {error && (
        <div className="text-amber-400 text-sm">
          {error}
          <span className="text-slate-500 ml-1">
            — {dataSource === "jellyfish_ktlo" ? "Add JELLYFISH_API_TOKEN to env." : "Add JIRA_EMAIL and JIRA_API_TOKEN to env."}
          </span>
        </div>
      )}
      {data && !loading && dataSource === "jira_gsrr" && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                data.meetsTarget ? "text-[var(--success)]" : "text-amber-400"
              }`}
            >
              {data.complianceRate}%
            </span>
            <span className="text-slate-400 text-sm">compliant</span>
          </div>
          <div className="text-slate-400 text-sm">
            {data.compliant}/{data.total} tickets
            <span className="text-slate-500 ml-1">
              (High {data.highRate}% / Medium {data.mediumRate}%)
            </span>
          </div>
          <a
            href={data.jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] text-sm hover:underline"
          >
            View in JIRA →
          </a>
        </div>
      )}
      {data && !loading && dataSource === "jira_agentic" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  data.meetsTarget ? "text-[var(--success)]" : "text-amber-400"
                }`}
              >
                {data.quartersMet}/{data.totalQuarters}
              </span>
              <span className="text-slate-400 text-sm">quarters with launch</span>
            </div>
            <a
              href={data.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] text-sm hover:underline"
            >
              View in JIRA →
            </a>
          </div>
          {data.quarterResults && data.quarterResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.quarterResults.map((q) => (
                <div
                  key={q.quarter}
                  className={`px-3 py-2 rounded ${
                    q.count >= 1 ? "bg-slate-700/50 text-[var(--success)]" : "bg-slate-700/30 text-slate-500"
                  }`}
                >
                  <span className="font-medium">Q{q.quarter} FY27:</span>{" "}
                  {q.count >= 1 ? `${q.count} launch${q.count > 1 ? "es" : ""} (${q.tickets.join(", ")})` : "0"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {data && !loading && dataSource === "jellyfish_ktlo" && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            {data.ktloPercent != null ? (
              <>
                <span
                  className={`text-2xl font-bold ${
                    data.meetsTarget === true ? "text-[var(--success)]" : "text-amber-400"
                  }`}
                >
                  {data.ktloPercent}%
                </span>
                <span className="text-slate-400 text-sm">
                  KTLO (target: {data.targetPercent}%, down from {data.startPercent}%)
                </span>
              </>
            ) : (
              <span className="text-slate-500 text-sm">
                KTLO % not found in response — check Jellyfish API structure
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
