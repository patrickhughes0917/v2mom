import { NextRequest, NextResponse } from "next/server";

/**
 * Agentic Solution Launches - JIRA API
 * Tracks: "Successfully launch one major Agentic Solution on the Nova platform per quarter throughout FY27"
 * Target: 1 launch per quarter = 4/4 quarters
 *
 * JQL: labels = "v2mom-agentic" AND issuetype = Story AND status = "Done"
 * Uses resolutiondate to count launches per FY27 quarter.
 */
const FY27_QUARTERS: { quarter: number; start: string; end: string }[] = [
  { quarter: 1, start: "2026-07-01", end: "2026-09-30" },
  { quarter: 2, start: "2026-10-01", end: "2026-12-31" },
  { quarter: 3, start: "2027-01-01", end: "2027-03-31" },
  { quarter: 4, start: "2027-04-01", end: "2027-06-30" },
];

interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    status?: { name: string };
    resolutiondate?: string;
    issuetype?: { name: string };
  };
}

async function fetchJiraIssues(
  baseUrl: string,
  credentials: string,
  jql: string
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | null = null;

  do {
    const payload: Record<string, unknown> = {
      jql,
      maxResults: 100,
      fields: ["key", "summary", "status", "resolutiondate", "issuetype"],
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
      throw new Error(`JIRA API ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const issues = data.issues || [];
    allIssues.push(...issues);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  return allIssues;
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

  const credentials = Buffer.from(`${email}:${token}`).toString("base64");
  const baseJql = 'labels = "v2mom-agentic" AND issuetype = Story AND status = "Done"';

  try {
    const quarterResults: { quarter: number; count: number; tickets: string[] }[] = [];

    for (const { quarter, start, end } of FY27_QUARTERS) {
      const jql = `${baseJql} AND resolutiondate >= "${start}" AND resolutiondate <= "${end}" ORDER BY resolutiondate DESC`;
      const issues = await fetchJiraIssues(baseUrl, credentials, jql);
      quarterResults.push({
        quarter,
        count: issues.length,
        tickets: issues.map((i) => i.key),
      });
    }

    const quartersMet = quarterResults.filter((q) => q.count >= 1).length;
    const totalQuarters = 4;
    const meetsTarget = quartersMet >= totalQuarters;

    const jiraUrl = `${baseUrl}/issues/?jql=${encodeURIComponent(baseJql + ' ORDER BY resolutiondate DESC')}`;

    return NextResponse.json({
      quartersMet,
      totalQuarters,
      meetsTarget,
      target: totalQuarters,
      quarterResults,
      jiraUrl,
    });
  } catch (e) {
    console.error("Agentic launches error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from JIRA", details: String(e) },
      { status: 500 }
    );
  }
}
