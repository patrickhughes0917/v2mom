"use client";

import { useEffect, useState } from "react";

type DatePreset = { label: string; days?: number; startDate?: string; endDate?: string };

interface MeasureMetricProps {
  measureText: string;
  dataSource: "jira_gsrr" | "jira_agentic" | "static" | "jellyfish_ktlo" | "jellyfish_lead_time" | "jellyfish_ai_power_users" | "incident_io_retrospective" | "incident_io_es_ingestion" | "incident_io_es_negative_margin" | "sigma_es_negative_margin" | "cogs_savings" | "devex_survey" | "jira_smart_action_items" | "jira_support_tickets" | "static_progress" | "static_target" | "static_binary" | "attrition";
  /** For static_progress: current/target count */
  current?: number;
  target?: number;
  unit?: string;
  /** For static_target: value vs target, lowerIsBetter (e.g. attrition, time-to-hire) */
  value?: number;
  lowerIsBetter?: boolean;
  /** For static_binary: done or in progress */
  done?: boolean;
  surveyUrl?: string;
  topics?: { name: string; priority: number; score: number; trend: number }[];
  devexIndex?: { score: number; trend: number };
  datePresets?: DatePreset[];
  /** For static dataSource: completion percentage (0-100) */
  percent?: number;
  /** For static dataSource: show TBD instead of percentage */
  tbd?: boolean;
  /** For static dataSource: period label (e.g. "February", "1/1 months") */
  periodLabel?: string;
  /** For cogs_savings dataSource */
  monthlySavings?: number;
  targetAnnual?: number;
  landedDate?: string;
  /** For attrition dataSource: static fallback when not using API */
  departures?: number;
  headcount?: number;
  /** For jellyfish_ai_power_users: static fallback when API has no data */
  powerUserCount?: number;
  powerUserTotal?: number;
}

const GSRR_PRESETS: DatePreset[] = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This quarter", days: 90 },
];

type SupportPreset = { label: string; period?: string; days?: number };
const SUPPORT_MOM_PRESETS: SupportPreset[] = [
  { label: "This month", period: "month" },
  { label: "Last month", period: "month-prior" },
  { label: "Last 30 days", days: 30 },
];

const QUARTER_PRESETS: DatePreset[] = [
  { label: "Q1 FY27", startDate: "2026-02-01", endDate: "2026-04-30" },
  { label: "Q2 FY27", startDate: "2026-05-01", endDate: "2026-07-31" },
  { label: "Q3 FY27", startDate: "2026-08-01", endDate: "2026-10-31" },
  { label: "Q4 FY27", startDate: "2026-11-01", endDate: "2027-01-31" },
];

export default function MeasureMetric({
  measureText,
  dataSource,
  datePresets = GSRR_PRESETS,
  percent = 100,
  monthlySavings = 0,
  targetAnnual = 500000,
  landedDate = "",
  surveyUrl,
  topics,
  devexIndex,
  tbd = false,
  current,
  target,
  unit,
  value,
  lowerIsBetter,
  done,
  departures: departuresProp,
  headcount: headcountProp,
  powerUserCount: powerUserCountProp,
  powerUserTotal: powerUserTotalProp,
  periodLabel,
}: MeasureMetricProps) {
  const DEFAULTS = { departures: 6, headcount: 135 };
  const hasStaticAttrition =
    dataSource === "attrition" &&
    departuresProp != null &&
    headcountProp != null;
  const attritionDepartures = departuresProp ?? DEFAULTS.departures;
  const attritionHeadcount = headcountProp ?? DEFAULTS.headcount;
  const showAttritionFallback =
    dataSource === "attrition" && (hasStaticAttrition || error);
  const [filter, setFilter] = useState<{ days?: number; startDate?: string; endDate?: string; period?: string }>({
    period: "month",
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [data, setData] = useState<{
    complianceRate?: number;
    meetsTarget: boolean | null;
    total?: number;
    compliant?: number;
    highRate?: number;
    mediumRate?: number;
    quartersMet?: number;
    totalQuarters?: number;
    quarterResults?: { quarter: number; count: number; tickets: string[] }[];
    jiraUrl?: string;
    ktloPercent?: number | null;
    attritionPercent?: number;
    targetPercent?: number;
    departures?: number;
    headcount?: number;
    targetPercent?: number;
    startPercent?: number;
    issueLeadTimeMdn?: number | null;
    issueLeadTimeAvg?: number | null;
    issueCycleTimeMdn?: number | null;
    prCycleTimeMdn?: number | null;
    commitLeadTime?: number | null;
    startTargetHours?: number;
    endTargetHours?: number;
    completionRate?: number;
    completed?: number;
    powerUserPercent?: number | null;
    aiImpactUrl?: string;
    adoptionStatusUrls?: { cursor?: string; claude?: string };
    current?: number;
    baseline?: number;
    reductionPercent?: number;
    targetReductionPercent?: number;
    currentPeriodLabel?: string;
    baselinePeriodLabel?: string;
    meanDays?: number | null;
    targetDays?: number;
    startDays?: number;
    currentCount?: number;
    baseline?: number;
    reductionPercent?: number;
    targetReductionPercent?: number;
    message?: string;
    incidentsUrl?: string;
    workbookUrl?: string;
    dailyOverageSum?: number;
    baselineOverage?: number | null;
    overageReductionPercent?: number | null;
    asOfDays?: number;
    asOfDate?: string;
    baselineDate?: string;
  } | null>(null);
  const [loading, setLoading] = useState(
    dataSource !== "static" &&
    dataSource !== "cogs_savings" &&
    dataSource !== "devex_survey" &&
    dataSource !== "static_progress" &&
    dataSource !== "static_target" &&
    dataSource !== "static_binary" &&
    !hasStaticAttrition
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      dataSource === "static" ||
      dataSource === "cogs_savings" ||
      dataSource === "devex_survey" ||
      dataSource === "static_progress" ||
      dataSource === "static_target" ||
      dataSource === "static_binary" ||
      hasStaticAttrition ||
      (dataSource === "attrition" && error) // use fallback when API fails
    )
      return;
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
    if (dataSource === "jellyfish_lead_time") {
      setLoading(true);
      setError(null);
      fetch("/api/jellyfish/lead-time")
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
    } else if (dataSource === "attrition") {
      setLoading(true);
      setError(null);
      fetch("/api/attrition")
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "jira_smart_action_items") {
      const params = new URLSearchParams();
      if (filter.startDate) params.set("startDate", filter.startDate);
      if (filter.endDate) params.set("endDate", filter.endDate);
      setLoading(true);
      setError(null);
      fetch(`/api/jira/smart-action-items?${params}`)
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "incident_io_es_ingestion") {
      setLoading(true);
      setError(null);
      fetch(`/api/incident-io/es-ingestion-incidents?t=${Date.now()}`)
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "incident_io_es_negative_margin") {
      setLoading(true);
      setError(null);
      fetch("/api/incident-io/es-negative-margin")
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "sigma_es_negative_margin") {
      setLoading(true);
      setError(null);
      fetch(`/api/sigma/es-negative-margin?t=${Date.now()}`)
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "incident_io_retrospective") {
      setLoading(true);
      setError(null);
      fetch("/api/incident-io/retrospective")
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (dataSource === "jellyfish_ai_power_users") {
      setLoading(true);
      setError(null);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      fetch("/api/jellyfish/ai-power-users", { signal: ctrl.signal })
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => {
          clearTimeout(t);
          setLoading(false);
        });
    } else if (dataSource === "jira_support_tickets") {
      const params = new URLSearchParams();
      params.set("period", filter.period || "month");
      if (filter.days) params.set("days", String(filter.days));
      if (filter.startDate && filter.startDate !== "month" && filter.startDate !== "month-prior")
        params.set("startDate", filter.startDate);
      if (filter.endDate) params.set("endDate", filter.endDate);
      setLoading(true);
      setError(null);
      fetch(`/api/jira/support-tickets?${params}`)
        .then((res) => {
          if (!res.ok) return res.json().then((e) => { throw new Error(e.error || "Request failed"); });
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [dataSource, filter.days, filter.startDate, filter.endDate, filter.period, refreshTrigger]);

  return (
    <div className="mt-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <p className="text-slate-400 text-sm mb-3">{measureText}</p>

      {dataSource === "jira_support_tickets" && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUPPORT_MOM_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                setFilter(
                  preset.period
                    ? { period: preset.period }
                    : { period: "days", days: preset.days }
                )
              }
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                (preset.period && filter.period === preset.period) ||
                (preset.days && filter.period === "days" && filter.days === preset.days)
                  ? "bg-[var(--accent)] text-slate-900"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {dataSource === "jira_smart_action_items" && (
        <div className="flex flex-wrap gap-2 mb-3">
          {QUARTER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                setFilter({
                  startDate: preset.startDate,
                  endDate: preset.endDate,
                })
              }
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter.startDate === preset.startDate
                  ? "bg-[var(--accent)] text-slate-900"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
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

      {dataSource === "static_progress" && current != null && target != null && (
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              current >= target ? "text-[var(--success)]" : "text-slate-300"
            }`}
          >
            {current}/{target}
          </span>
          <span className="text-slate-400 text-sm">{unit ?? ""}</span>
        </div>
      )}
      {dataSource === "static_target" && value != null && target != null && (
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              lowerIsBetter
                ? value <= target
                  ? "text-[var(--success)]"
                  : "text-amber-400"
                : value >= target
                  ? "text-[var(--success)]"
                  : "text-amber-400"
            }`}
          >
            {value}
            {unit && <span className="text-lg font-normal text-slate-400"> {unit}</span>}
          </span>
          <span className="text-slate-500 text-sm">
            (target: {lowerIsBetter ? "<" : ">"} {target} {unit})
          </span>
        </div>
      )}
      {dataSource === "static_binary" && (
        <div className="flex items-baseline gap-2">
          {done ? (
            <>
              <span className="text-2xl font-bold text-[var(--success)]">✓</span>
              <span className="text-slate-400 text-sm">Done</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-slate-500">○</span>
              <span className="text-slate-500 text-sm">In progress</span>
            </>
          )}
        </div>
      )}
      {dataSource === "static" && (
        <div className="flex flex-wrap items-baseline gap-2">
          {tbd ? (
            <>
              <span className="text-xl font-bold text-slate-500">TBD</span>
              <span className="text-slate-500 text-sm">(metric coming soon)</span>
            </>
          ) : (
            <>
              <span
                className={`text-2xl font-bold ${
                  percent > 0 ? "text-[var(--success)]" : "text-slate-300"
                }`}
              >
                {percent}%
              </span>
              <span className="text-slate-400 text-sm">complete</span>
              {periodLabel && (
                <span className="text-slate-500 text-sm">({periodLabel})</span>
              )}
            </>
          )}
        </div>
      )}
      {dataSource === "devex_survey" && (
        <div className="space-y-3">
          {devexIndex && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--accent)]">{devexIndex.score}</span>
                <span className="text-slate-400 text-sm">DevEx Index</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={devexIndex.trend >= 0 ? "text-[var(--success)]" : "text-amber-400"}>
                  {devexIndex.trend >= 0 ? "+" : ""}{devexIndex.trend}
                </span>
                <span className="text-slate-500 text-sm">trend</span>
              </div>
            </div>
          )}
          {topics && topics.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/50">
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Topic</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium w-12">#</th>
                    <th className="text-right px-3 py-2 text-slate-400 font-medium w-14">Score</th>
                    <th className="text-right px-3 py-2 text-slate-400 font-medium w-14">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.name} className="border-b border-slate-700/30 last:border-0">
                      <td className="px-3 py-2 text-slate-300">{t.name}</td>
                      <td className="px-3 py-2 text-slate-500">#{t.priority}</td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={
                            t.score >= 60 ? "text-[var(--success)]" : t.score >= 45 ? "text-slate-400" : "text-amber-400"
                          }
                        >
                          {t.score}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={t.trend >= 0 ? "text-[var(--success)]" : "text-amber-400"}>
                          {t.trend >= 0 ? "+" : ""}{t.trend}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {surveyUrl && (
            <a
              href={surveyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 text-sm text-[var(--accent)] hover:underline"
            >
              View full insights in Jellyfish DevEx →
            </a>
          )}
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
      {loading && dataSource !== "static" && dataSource !== "jellyfish_ai_power_users" && dataSource !== "incident_io_retrospective" && dataSource !== "incident_io_es_ingestion" && dataSource !== "incident_io_es_negative_margin" && dataSource !== "sigma_es_negative_margin" && (
        <div className="text-slate-500 text-sm animate-pulse">Loading...</div>
      )}
      {error && !(dataSource === "attrition" && showAttritionFallback) && (
        <div className="text-amber-400 text-sm">
          {error}
          <span className="text-slate-500 ml-1">
            —           {            (dataSource === "jellyfish_ktlo" || dataSource === "jellyfish_lead_time" || dataSource === "jellyfish_ai_power_users")
                ? "Add JELLYFISH_API_TOKEN to env."
                : (dataSource === "incident_io_retrospective" || dataSource === "incident_io_es_ingestion" || dataSource === "incident_io_es_negative_margin")
                  ? "Add INCIDENT_IO_API_KEY to env."
                : dataSource === "sigma_es_negative_margin"
                  ? "Add SIGMA_CLIENT_ID and SIGMA_CLIENT_SECRET to env."
                : (dataSource === "jira_smart_action_items" || dataSource === "jira_gsrr" || dataSource === "jira_agentic" || dataSource === "jira_support_tickets")
                  ? "Add JIRA_EMAIL and JIRA_API_TOKEN to env."
                  : dataSource === "attrition"
                    ? "Add ATTRITION_DEPARTURES + ATTRITION_HEADCOUNT (or ATTRITION_PERCENT) to env."
                    : "Check configuration."}
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
      {data && !loading && dataSource === "jira_smart_action_items" && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                data.meetsTarget ? "text-[var(--success)]" : "text-amber-400"
              }`}
            >
              {data.completionRate}%
            </span>
            <span className="text-slate-400 text-sm">completed</span>
          </div>
          <div className="text-slate-400 text-sm">
            {data.completed}/{data.total} action items
            <span className="text-slate-500 ml-1">(target: {data.targetPercent}%)</span>
          </div>
          {data.jiraUrl && (
            <a
              href={data.jiraUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] text-sm hover:underline"
            >
              View in JIRA →
            </a>
          )}
        </div>
      )}
      {(data || loading) && dataSource === "jellyfish_ai_power_users" && (
        <div className="flex flex-wrap items-center gap-4">
          {(data?.powerUserPercent != null || (powerUserCountProp != null && powerUserTotalProp != null && powerUserTotalProp > 0)) ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`text-2xl font-bold ${
                    (data?.meetsTarget ?? (powerUserCountProp != null && powerUserTotalProp != null && (powerUserCountProp / powerUserTotalProp) * 100 >= 80))
                      ? "text-[var(--success)]"
                      : "text-amber-400"
                  }`}
                >
                  {powerUserCountProp != null && powerUserTotalProp != null
                    ? Math.round((powerUserCountProp / powerUserTotalProp) * 100)
                    : (data?.powerUserPercent ?? null)}%
                </span>
                <span className="text-slate-400 text-sm">AI Power Users</span>
                <span className="text-slate-500 text-sm">
                  (target: ≥{data?.targetPercent ?? 80}%)
                </span>
                {powerUserCountProp != null && powerUserTotalProp != null && (
                  <span className="text-slate-500 text-sm">
                    ({powerUserCountProp}/{powerUserTotalProp} engineers)
                  </span>
                )}
              </div>
              {(data as { source?: string })?.source && (
                <span className="text-slate-500 text-xs uppercase tracking-wider">
                  · {(data as { source?: string }).source}
                </span>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500 text-sm">
                {(data as { message?: string })?.message ?? "AI Impact data not yet available via API"}
              </span>
            </div>
          )}
          {(data?.aiImpactUrl || data?.adoptionStatusUrls || loading) && (
            <div className="flex flex-wrap items-center gap-3">
              {(data?.adoptionStatusUrls?.cursor || loading) && (
                <a
                  href={data?.adoptionStatusUrls?.cursor ?? "https://app.jellyfish.co/ai-impact/adoption-status?team=&tool=CURS"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] text-sm hover:underline"
                >
                  Cursor adoption status →
                </a>
              )}
              {(data?.adoptionStatusUrls?.claude || loading) && (
                <a
                  href={data?.adoptionStatusUrls?.claude ?? "https://app.jellyfish.co/ai-impact/adoption-status?team=&tool=CLD"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] text-sm hover:underline"
                >
                  Claude adoption status →
                </a>
              )}
              {!loading && !(data?.adoptionStatusUrls?.cursor || data?.adoptionStatusUrls?.claude) && data?.aiImpactUrl && (
                <a
                  href={data.aiImpactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] text-sm hover:underline"
                >
                  View in Jellyfish AI Impact →
                </a>
              )}
            </div>
          )}
        </div>
      )}
      {data && !loading && dataSource === "jira_support_tickets" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                data.meetsTarget ? "text-[var(--success)]" : "text-amber-400"
              }`}
            >
              {data.reductionPercent}%
            </span>
            <span className="text-slate-400 text-sm">reduction</span>
            <span className="text-slate-500 text-sm">
              (target: ≥{data.targetReductionPercent}%)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800/50 border border-slate-700/50">
              <span className="text-slate-500 font-medium">{data.baselinePeriodLabel}</span>
              <span className="text-slate-300">{data.baseline} tickets</span>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800/50 border border-slate-700/50">
              <span className="text-[var(--accent)] font-medium">{data.currentPeriodLabel}</span>
              <span className="text-slate-300">{data.current} tickets</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs">On Call Question</span>
            {data.jiraUrl && (
              <a
                href={data.jiraUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] text-sm hover:underline"
              >
                View in JIRA →
              </a>
            )}
          </div>
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
                {(data as { source?: string }).source && (
                  <span className="text-slate-500 text-xs uppercase tracking-wider">
                    · {(data as { source?: string }).source === "investments" ? "Investments" : (data as { source?: string }).source}
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-500 text-sm">
                KTLO % not found in response — check Jellyfish API structure
              </span>
            )}
          </div>
        </div>
      )}
      {(data || loading) && dataSource === "incident_io_retrospective" && (
        <div className="flex flex-wrap items-center gap-4">
          {data?.meanDays != null ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`text-2xl font-bold ${
                    data.meetsTarget === true ? "text-[var(--success)]" : "text-amber-400"
                  }`}
                >
                  {data.meanDays}
                </span>
                <span className="text-slate-400 text-sm">days</span>
                <span className="text-slate-500 text-sm">
                  time to draft ready (target: ≤{data.targetDays ?? 3} days, down from {data.startDays ?? 10})
                </span>
                {(data as { source?: string }).source && (
                  <span className="text-slate-500 text-xs uppercase tracking-wider">
                    · {(data as { source?: string }).source}
                  </span>
                )}
              </div>
              {data.startDays != null && data.targetDays != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      className="h-full bg-[var(--success)] rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((data.startDays - data.meanDays) / (data.startDays - data.targetDays)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-slate-400 text-sm">
                    Target: {data.targetDays} days (down from {data.startDays})
                  </span>
                </div>
              )}
            </>
          ) : (
            <span className="text-slate-500 text-sm">
              {(data as { message?: string })?.message ?? "No retrospective data in period. Configure Retrospective SLO in Incident.io (Documenting → Reviewing)."}
            </span>
          )}
        </div>
      )}
      {(data || loading) && dataSource === "incident_io_es_ingestion" && (
        <div className="space-y-3">
          {data?.currentCount != null ? (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-3xl font-bold tabular-nums ${
                      data.meetsTarget === true ? "text-[var(--success)]" : data.meetsTarget === false ? "text-amber-400" : "text-slate-300"
                    }`}
                  >
                    {data.currentCount}
                  </span>
                  <div>
                    <span className="text-slate-400 text-sm block">incidents (FY27)</span>
                    {data.baseline != null && data.baseline > 0 && (
                      <span className="text-slate-500 text-xs">baseline: {data.baseline} (FY26)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {data.reductionPercent != null && (
                    <span className="text-slate-300 text-sm font-medium">
                      {data.reductionPercent}% reduction
                      {data.targetReductionPercent != null && data.targetReductionPercent > 0 && (
                        <span className="text-slate-500 font-normal"> · target ≥{data.targetReductionPercent}%</span>
                      )}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setRefreshTrigger((t) => t + 1)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-300 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
                <span className="text-slate-500 text-xs">
                  Filter: ES/ES8/ES5/Elasticsearch + updates · SEV1/2
                </span>
                {data?.incidentsUrl && (
                  <a
                    href={data.incidentsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] text-xs hover:underline"
                  >
                    View in Incident.io →
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-sm">
                {data?.message ?? "ES/ES8/ES5/Elasticsearch + updates (journey, bulk, ingestion), SEV1/2"}
              </span>
              <button
                type="button"
                onClick={() => setRefreshTrigger((t) => t + 1)}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          )}
        </div>
      )}
      {(data || loading) && dataSource === "incident_io_es_negative_margin" && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setRefreshTrigger((t) => t + 1)}
            disabled={loading}
            className="text-xs px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-300 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {data?.currentCount != null ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={`text-2xl font-bold ${
                    data.meetsTarget === true ? "text-[var(--success)]" : data.meetsTarget === false ? "text-amber-400" : "text-slate-300"
                  }`}
                >
                  {data.currentCount}
                </span>
                <span className="text-slate-400 text-sm">ES negative‑margin incidents (FY27)</span>
                {data.baseline != null && data.baseline > 0 && (
                  <span className="text-slate-500 text-sm">
                    (FY26 baseline: {data.baseline})
                  </span>
                )}
              </div>
              {data.reductionPercent != null && (
                <span className="text-slate-500 text-sm">
                  {data.reductionPercent}% reduction
                  {data.targetReductionPercent != null && data.targetReductionPercent > 0 && ` (target: ≥${data.targetReductionPercent}%)`}
                </span>
              )}
              <span className="text-slate-500 text-xs">
                Root cause=Load · ES/user-update related (theme or content)
              </span>
            </>
          ) : (
            <span className="text-slate-500 text-sm">
              {data?.message ?? "Root cause=Load, ES/user-update related (journey, bulk, ES cluster, ingestion)"}
            </span>
          )}
        </div>
      )}
      {(data || loading) && dataSource === "sigma_es_negative_margin" && (
        <div className="space-y-3">
          {data?.currentCount != null ? (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-3xl font-bold tabular-nums ${
                      data.meetsTarget === true ? "text-[var(--success)]" : data.meetsTarget === false ? "text-amber-400" : "text-slate-300"
                    }`}
                  >
                    {data.currentCount}
                  </span>
                  <div>
                    <span className="text-slate-400 text-sm block">negative-margin orgs</span>
                    {data.baseline != null && data.baseline > 0 && (
                      <span className="text-slate-500 text-xs">
                        Baseline: {data.baseline} orgs · target: 50% reduction
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {data.reductionPercent != null && (() => {
                    const pct = data.reductionPercent;
                    const isGood = pct > 0;
                    return (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isGood
                          ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700/50"
                          : "bg-red-900/50 text-red-400 border border-red-700/50"
                      }`}>
                        {isGood ? "↓" : "↑"} {Math.abs(pct)}% vs baseline
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setRefreshTrigger((t) => t + 1)}
                    disabled={loading}
                    className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-300 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "…" : "Refresh"}
                  </button>
                </div>
              </div>
              {data.dailyOverageSum != null && data.dailyOverageSum > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1.5 px-3 rounded bg-slate-800/50 border border-slate-700/50">
                  <span className="text-slate-400 text-sm">Daily COGS overage:</span>
                  <span className="text-slate-200 font-semibold tabular-nums text-sm">
                    ${data.dailyOverageSum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
                  </span>
                  {data.baselineOverage != null && data.baselineOverage > 0 && (
                    <span className="text-slate-500 text-xs">
                      baseline: ${data.baselineOverage.toLocaleString("en-US", { maximumFractionDigits: 0 })}/day · target: −50%
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/50">
                <span className="text-slate-500 text-xs">
                  {data.asOfDate ? `As of ${data.asOfDate} · ` : data.asOfDays != null ? `As of ${data.asOfDays}d ago · ` : ""}
                  GM target 69%
                </span>
                {data?.workbookUrl && (
                  <a
                    href={data.workbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] text-xs hover:underline whitespace-nowrap"
                  >
                    View in Sigma →
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 text-sm">
                {data?.message ?? "User Updates to User Profiles - Per Org workbook"}
              </span>
              <button
                type="button"
                onClick={() => setRefreshTrigger((t) => t + 1)}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 disabled:opacity-50"
              >
                {loading ? "…" : "Refresh"}
              </button>
            </div>
          )}
        </div>
      )}
      {data && !loading && dataSource === "jellyfish_lead_time" && (
        <div className="space-y-3">
          <p className="text-slate-500 text-xs italic">
            <strong className="text-slate-400 not-italic">Change Lead Time</strong> = time from when a change request is initiated (e.g. issue created or code committed) to when that change is delivered to production. A DORA metric for delivery speed.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-2">
              {(data.issueLeadTimeMdn != null || data.issueLeadTimeAvg != null) ? (
                <>
                  <span
                    className={`text-2xl font-bold ${
                      data.meetsTarget === true ? "text-[var(--success)]" : "text-amber-400"
                    }`}
                  >
                    {data.issueLeadTimeMdn != null
                      ? `${(data.issueLeadTimeMdn / 24).toFixed(1)}`
                      : data.issueLeadTimeAvg != null
                        ? `${(data.issueLeadTimeAvg / 24).toFixed(1)}`
                        : "—"}
                  </span>
                  <span className="text-slate-400 text-sm">days</span>
                  <span className="text-slate-500 text-sm">
                    (Issue Lead Time {data.issueLeadTimeMdn != null ? "median" : "avg"})
                  </span>
                </>
              ) : (
                <span className="text-slate-500 text-sm">No lead time data in period</span>
              )}
            </div>
          </div>
          {(data.issueCycleTimeMdn != null || data.prCycleTimeMdn != null) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {data.issueCycleTimeMdn != null && (
                <div className="px-3 py-2 rounded bg-slate-700/50 border border-slate-700">
                  <span className="text-slate-400">Issue Cycle Time (median): </span>
                  <span className="text-[var(--accent)] font-medium">
                    {data.issueCycleTimeMdn < 24
                      ? `${data.issueCycleTimeMdn.toFixed(1)} hrs`
                      : `${(data.issueCycleTimeMdn / 24).toFixed(1)} days`}
                  </span>
                </div>
              )}
              {data.prCycleTimeMdn != null && (
                <div className="px-3 py-2 rounded bg-slate-700/50 border border-slate-700">
                  <span className="text-slate-400">PR Cycle Time (median): </span>
                  <span className="text-[var(--accent)] font-medium">
                    {data.prCycleTimeMdn < 24
                      ? `${data.prCycleTimeMdn.toFixed(1)} hrs`
                      : `${(data.prCycleTimeMdn / 24).toFixed(1)} days`}
                  </span>
                </div>
              )}
            </div>
          )}
          {data.startTargetHours != null && data.endTargetHours != null && (data.issueLeadTimeMdn != null || data.issueLeadTimeAvg != null) && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className="h-full bg-[var(--success)] rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((data.startTargetHours - (data.issueLeadTimeMdn ?? data.issueLeadTimeAvg ?? 0)) /
                          (data.startTargetHours - data.endTargetHours)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <span className="text-slate-400 text-sm">
                Target: {data.endTargetHours / 24} days (down from {data.startTargetHours / 24})
              </span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              DORA industry benchmarks
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="px-2 py-1.5 rounded bg-slate-800/50">
                <span className="text-[var(--success)]">Elite:</span> Lead time &lt; 1 day
              </div>
              <div className="px-2 py-1.5 rounded bg-slate-800/50">
                <span className="text-emerald-400">High:</span> Lead time 1–7 days
              </div>
              <div className="px-2 py-1.5 rounded bg-slate-800/50">
                <span className="text-slate-400">Medium:</span> Lead time 1–4 weeks
              </div>
              <div className="px-2 py-1.5 rounded bg-slate-800/50">
                <span className="text-slate-500">Low:</span> Lead time &gt; 1 month
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Cycle time benchmarks (median): Small teams 26 hrs · Medium 48 hrs · Large 72 hrs · Enterprise 120 hrs
            </p>
          </div>
        </div>
      )}
      {(data || showAttritionFallback) && !loading && dataSource === "attrition" && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                showAttritionFallback
                  ? (attritionDepartures / attritionHeadcount) * 100 <= 12
                    ? "text-[var(--success)]"
                    : "text-amber-400"
                  : data?.meetsTarget === true
                  ? "text-[var(--success)]"
                  : "text-amber-400"
              }`}
            >
              {showAttritionFallback
                ? `${Math.round((attritionDepartures / attritionHeadcount) * 1000) / 10}`
                : data!.attritionPercent}%
            </span>
            <span className="text-slate-400 text-sm">annualized</span>
            <span className="text-slate-500 text-sm">
              (target: &lt; 12%)
            </span>
          </div>
          <span className="text-slate-500 text-sm">
            {(showAttritionFallback ? attritionDepartures : data?.departures) ?? attritionDepartures} departures /{" "}
            {(showAttritionFallback ? attritionHeadcount : data?.headcount) ?? attritionHeadcount} headcount
          </span>
        </div>
      )}
    </div>
  );
}
