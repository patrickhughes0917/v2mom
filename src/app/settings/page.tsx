"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DATA_SOURCES = [
  {
    id: "jira",
    name: "Jira",
    description: "GSRR SLO compliance, sprint velocity, issues, cycle time",
    envVars: ["JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_BASE_URL"],
    docsUrl: "https://developer.atlassian.com/cloud/jira/platform/rest/v3/",
  },
  {
    id: "jellyfish",
    name: "Jellyfish",
    description: "KTLO, lead time, company metrics",
    envVars: ["JELLYFISH_API_TOKEN"],
    docsUrl: "https://help.jellyfish.co/hc/en-us/articles/29135614810893-Jellyfish-API-Beta",
  },
  {
    id: "jellyfish-devex",
    name: "Jellyfish DevEx",
    description: "Developer survey, SPACE categories (API not yet public)",
    envVars: ["DEVEX_API_TOKEN"],
    docsUrl: "https://jellyfish.co/platform/devex",
  },
  {
    id: "github",
    name: "GitHub",
    description: "PRs, deployments, code review metrics",
    envVars: ["GITHUB_TOKEN"],
    docsUrl: "https://docs.github.com/en/rest",
  },
  {
    id: "incident-io",
    name: "Incident.io",
    description: "Incidents, MTTR, reliability metrics",
    envVars: ["INCIDENT_IO_API_KEY"],
    docsUrl: "https://api-docs.incident.io/",
  },
  {
    id: "sigma",
    name: "Sigma",
    description: "Dashboard data, workbook exports",
    envVars: ["SIGMA_CLIENT_ID", "SIGMA_CLIENT_SECRET"],
    docsUrl: "https://help.sigmacomputing.com/docs/get-started-with-sigmas-api",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Activity, channel metrics",
    envVars: ["SLACK_BOT_TOKEN"],
    docsUrl: "https://api.slack.com/",
  },
  {
    id: "custom",
    name: "Custom API",
    description: "Any REST API with HTTPS",
    envVars: ["CUSTOM_API_URL", "CUSTOM_API_KEY"],
    docsUrl: null,
  },
];

interface StatusResult {
  id: string;
  name: string;
  configured: boolean;
  status: "ok" | "error" | "not_configured";
  message?: string;
  source?: string;
}

export default function SettingsPage() {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    results: StatusResult[];
    summary: { total: number; ok: number; error: number; notConfigured: number };
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!statusLoading) return;
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setStatusLoading(false));
  }, [statusLoading]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 bg-[var(--card)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[var(--accent)]">Engineering V2MOM Dashboard</h1>
          <nav className="flex gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="text-[var(--accent)] hover:underline text-sm mb-4 inline-block">
            ← Back to dashboard
          </Link>
          <h2 className="text-2xl font-semibold text-white">Data Sources</h2>
          <p className="text-slate-400 mt-1">
            Connect APIs to power your dashboard. API keys are stored securely and never exposed to the browser.
          </p>
        </div>

        <div className="mb-8 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <h3 className="font-semibold text-white mb-2">Connection status</h3>
          <p className="text-slate-400 text-sm mb-4">
            Check which integrations are configured and responding.
          </p>
          <button
            onClick={() => setStatusLoading(true)}
            disabled={statusLoading}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-slate-900 font-medium hover:opacity-90 disabled:opacity-70 transition-opacity"
          >
            {statusLoading ? "Checking…" : "Check status"}
          </button>
          {status && !statusLoading && (
            <div className="mt-4 space-y-2">
              {status.results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-slate-700/30 last:border-0"
                >
                  <span className="text-slate-300 font-medium">{r.name}</span>
                  <span className="flex items-center gap-2">
                    {r.source && (
                      <span className="text-slate-500 text-xs">({r.source})</span>
                    )}
                    {r.status === "ok" && (
                      <span className="text-[var(--success)] font-medium">✓ Live</span>
                    )}
                    {r.status === "error" && (
                      <span className="text-amber-400 text-sm">
                        ✗ {r.message?.slice(0, 50) ?? "Error"}
                      </span>
                    )}
                    {r.status === "not_configured" && (
                      <span className="text-slate-500 text-sm">Not configured</span>
                    )}
                  </span>
                </div>
              ))}
              <div className="pt-2 text-slate-500 text-sm">
                {status.summary.ok} live · {status.summary.error} error · {status.summary.notConfigured} not configured
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {DATA_SOURCES.map((source) => (
            <div
              key={source.id}
              className="bg-[var(--card)] rounded-xl border border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-white">{source.name}</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{source.description}</p>
                </div>
                <span className="text-slate-500 text-2xl">
                  {expandedSource === source.id ? "−" : "+"}
                </span>
              </button>
              {expandedSource === source.id && (
                <div className="px-6 pb-6 pt-0 border-t border-slate-700/50">
                  <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Environment variables needed</h4>
                    <p className="text-slate-400 text-sm mb-3">
                      Add these to <code className="bg-slate-700 px-1 rounded">.env.local</code> for local
                      development, and to your server&apos;s environment variables for production.
                    </p>
                    <ul className="space-y-1">
                      {source.envVars.map((v) => (
                        <li key={v} className="text-[var(--accent)] font-mono text-sm">
                          {v}
                        </li>
                      ))}
                    </ul>
                    {source.docsUrl && (
                      <a
                        href={source.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-sm text-[var(--accent)] hover:underline"
                      >
                        View API docs →
                      </a>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm mt-3">
                    Once configured, create an API route in <code className="bg-slate-700 px-1 rounded">src/app/api/</code> to
                    fetch data and return it to the dashboard.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <h3 className="font-semibold text-white mb-2">Need help?</h3>
          <p className="text-slate-400 text-sm">
            Each integration requires an API route that fetches from the external service. Use the{" "}
            <code className="bg-slate-700 px-1 rounded">/api/proxy</code> route or fetch directly in your API
            routes—your keys stay on the server.
          </p>
        </div>
      </main>
    </div>
  );
}
