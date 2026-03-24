import { NextRequest, NextResponse } from "next/server";

/**
 * Health/status check for all data source integrations.
 * Returns which APIs are configured and responding.
 * Does not expose secrets.
 */
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

interface CheckResult {
  id: string;
  name: string;
  configured: boolean;
  status: "ok" | "error" | "not_configured";
  message?: string;
  source?: string; // e.g. "allocations" or "delivery" for KTLO
}

async function check(base: string, endpoint: string): Promise<{ ok: boolean; data?: unknown }> {
  try {
    const res = await fetch(`${base}${endpoint}`, {
      cache: "no-store",
    });
    const data = res.ok ? await res.json() : await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false };
  }
}

export async function GET(request: NextRequest) {
  const base = getBaseUrl(request);
  const results: CheckResult[] = [];

  // Jira - GSRR
  const hasJira = Boolean(
    process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN && process.env.JIRA_BASE_URL
  );
  if (hasJira) {
    const { ok, data } = await check(base, "/api/jira/gsrr-compliance?days=30");
    results.push({
      id: "jira_gsrr",
      name: "Jira GSRR",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok ? undefined : (data as { error?: string })?.error,
    });
  } else {
    results.push({
      id: "jira_gsrr",
      name: "Jira GSRR",
      configured: false,
      status: "not_configured",
    });
  }

  // Jira - Agentic
  if (hasJira) {
    const { ok, data } = await check(base, "/api/jira/agentic-launches");
    results.push({
      id: "jira_agentic",
      name: "Jira Agentic",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok ? undefined : (data as { error?: string })?.error,
    });
  }

  // Jira - Support tickets (On Call Question)
  if (hasJira) {
    const { ok, data } = await check(
      base,
      "/api/jira/support-tickets?period=month"
    );
    results.push({
      id: "jira_support",
      name: "Jira Support Tickets",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok ? undefined : (data as { error?: string })?.error,
    });
  }

  // Jira - SMART action items
  if (hasJira) {
    const { ok, data } = await check(
      base,
      "/api/jira/smart-action-items?startDate=2026-02-01&endDate=2026-04-30"
    );
    results.push({
      id: "jira_smart",
      name: "Jira SMART Items",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok ? undefined : (data as { error?: string })?.error,
    });
  }

  // Jellyfish - KTLO
  const hasJellyfish = Boolean(process.env.JELLYFISH_API_TOKEN);
  if (hasJellyfish) {
    const { ok, data } = await check(base, "/api/jellyfish/ktlo");
    const d = data as { error?: string; source?: string } | undefined;
    results.push({
      id: "jellyfish_ktlo",
      name: "Jellyfish KTLO",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok ? undefined : d?.error,
      source: ok && d?.source ? d.source : undefined,
    });
  } else {
    results.push({
      id: "jellyfish_ktlo",
      name: "Jellyfish KTLO",
      configured: false,
      status: "not_configured",
    });
  }

  // Jellyfish - AI Power Users
  if (hasJellyfish) {
    const { ok, data } = await check(base, "/api/jellyfish/ai-power-users");
    const d = data as { powerUserPercent?: number | null; error?: string } | undefined;
    results.push({
      id: "jellyfish_ai",
      name: "Jellyfish AI Power Users",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok && d?.powerUserPercent == null ? "No API data (use AI Impact dashboard)" : ok ? undefined : d?.error,
    });
  }

  // Jellyfish - Lead time
  if (hasJellyfish) {
    const { ok, data } = await check(base, "/api/jellyfish/lead-time");
    results.push({
      id: "jellyfish_lead_time",
      name: "Jellyfish Lead Time",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok ? undefined : (data as { error?: string })?.error,
    });
  }

  // Incident.io - Retrospective (time to draft ready)
  const hasIncidentIo = Boolean(process.env.INCIDENT_IO_API_KEY);
  if (hasIncidentIo) {
    const { ok, data } = await check(base, "/api/incident-io/retrospective");
    const d = data as { meanDays?: number | null; error?: string; retrospectiveCount?: number } | undefined;
    results.push({
      id: "incident_io_retrospective",
      name: "Incident.io Retrospective (time to draft ready)",
      configured: true,
      status: ok ? "ok" : "error",
      message: ok && d?.meanDays == null && (d?.retrospectiveCount ?? 0) === 0 ? "No retrospective incidents in period" : ok ? undefined : d?.error,
      source: ok && d?.meanDays != null ? "incident_io" : undefined,
    });
  }

  // Attrition
  const hasAttrition =
    process.env.ATTRITION_PERCENT ||
    (process.env.ATTRITION_DEPARTURES && process.env.ATTRITION_HEADCOUNT) ||
    (process.env.ATTRITION_SHEET_ID && process.env.ATTRITION_HEADCOUNT) ||
    (process.env.ATTRITION_SHEET_CSV_URL && process.env.ATTRITION_HEADCOUNT);
  const { ok: attritionOk, data: attritionData } = await check(base, "/api/attrition");
  const attritionConfigured =
    hasAttrition || (attritionOk && !(attritionData as { error?: string })?.error);
  results.push({
    id: "attrition",
    name: "Attrition",
    configured: Boolean(hasAttrition),
    status: attritionOk ? "ok" : attritionConfigured ? "error" : "not_configured",
    message: attritionOk ? undefined : (attritionData as { error?: string })?.error,
    source: attritionOk ? (attritionData as { source?: string })?.source : undefined,
  });

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    error: results.filter((r) => r.status === "error").length,
    notConfigured: results.filter((r) => r.status === "not_configured").length,
  };

  return NextResponse.json({
    results,
    summary,
    timestamp: new Date().toISOString(),
  });
}
