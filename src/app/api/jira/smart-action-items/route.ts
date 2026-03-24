import { NextRequest, NextResponse } from "next/server";

/**
 * SMART Action Items from SEV1/SEV2 - JIRA API
 * Tracks: "90% of SMART Action Items from SEV1/SEV2s are completed QoQ to ensure systemic reliability."
 *
 * JQL: labels = incident_action_item, Action Item Type = SMART,
 * Incident Severity (SEV1 or SEV2), Incident Type ~ Default
 *
 * Query params:
 * - startDate: YYYY-MM-DD (quarter start, default: current quarter)
 * - endDate: YYYY-MM-DD (optional)
 */
const DONE_STATUSES = ["Done", "Resolved", "Closed", "Complete"];

function getCurrentQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

interface JiraIssue {
  key: string;
  fields: {
    status?: { name: string };
    created?: string;
    resolutiondate?: string;
    summary?: string;
  };
}

export async function GET(request: NextRequest) {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL || "https://iterable.atlassian.net";

  if (!email || !token) {
    return NextResponse.json(
      { error: "JIRA credentials not configured. Add JIRA_EMAIL and JIRA_API_TOKEN to environment variables." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || getCurrentQuarter().startDate;
  const endDate = searchParams.get("endDate") || getCurrentQuarter().endDate;

  const jql = [
    'labels = incident_action_item',
    'created >= "' + startDate + '"',
    'created <= "' + endDate + '"',
    '"Action Item Type[Dropdown]" = SMART',
    '("Incident Severity - Incident.io[Short text]" ~ "SEV1" OR "Incident Severity - Incident.io[Short text]" ~ "SEV2")',
    '"Incident Type - Incident.io[Short text]" ~ "Default"',
  ].join(' AND ');

  const credentials = Buffer.from(`${email}:${token}`).toString("base64");

  try {
    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | null = null;

    do {
      const payload: Record<string, unknown> = {
        jql,
        maxResults: 100,
        fields: ["key", "summary", "status", "created", "resolutiondate"],
      };
      if (nextPageToken) payload.nextPageToken = nextPageToken;

      const res = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `JIRA API error: ${res.status}`, details: err.slice(0, 500) },
          { status: res.status >= 500 ? 502 : 400 }
        );
      }

      const data = await res.json();
      const issues = data.issues || [];
      allIssues.push(...issues);
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    const total = allIssues.length;
    const completed = allIssues.filter((i) =>
      DONE_STATUSES.includes(i.fields?.status?.name ?? "")
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    const targetPercent = 90;
    const meetsTarget = total > 0 && completionRate >= targetPercent;

    const jiraUrl = `${baseUrl}/issues/?jql=${encodeURIComponent(jql)}`;

    return NextResponse.json({
      total,
      completed,
      completionRate,
      targetPercent,
      meetsTarget,
      jiraUrl,
      startDate,
      endDate,
      jql,
    });
  } catch (e) {
    console.error("SMART action items error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from JIRA", details: String(e) },
      { status: 500 }
    );
  }
}
