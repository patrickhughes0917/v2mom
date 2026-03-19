import { NextRequest, NextResponse } from "next/server";

/**
 * GSRR SLO Compliance - JIRA API
 * Tracks: 100% of high/medium security vulnerabilities remediated within enterprise SLA
 * - High Priority: 30 days SLO
 * - Medium Priority: 90 days SLO
 *
 * Query params:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - days: number (optional, e.g. 30 for last 30 days - used if no date range)
 */
const SLO_DAYS = { High: 30, Medium: 90 };

interface JiraIssue {
  key: string;
  fields: {
    priority?: { name: string };
    created?: string;
    resolutiondate?: string;
    summary?: string;
    status?: { name: string };
  };
}

function calculateSLOCompliance(issue: JiraIssue) {
  const priority = issue.fields?.priority?.name;
  const sloDays = priority ? SLO_DAYS[priority as keyof typeof SLO_DAYS] : null;
  if (!sloDays) return null;

  const createdStr = issue.fields?.created;
  if (!createdStr) return null;

  const createdDate = new Date(createdStr);
  const now = new Date();
  const resolutionStr = issue.fields?.resolutiondate;

  if (resolutionStr) {
    const resolutionDate = new Date(resolutionStr);
    const daysToResolution = Math.floor((resolutionDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return { meetsSLO: daysToResolution <= sloDays, sloDays, daysToResolution };
  } else {
    const daysOpen = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return { meetsSLO: daysOpen <= sloDays, sloDays, daysOpen };
  }
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
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const daysParam = searchParams.get("days");

  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = ` AND created >= "${startDate}" AND created <= "${endDate}"`;
  } else if (startDate) {
    dateFilter = ` AND created >= "${startDate}"`;
  } else if (daysParam) {
    const days = parseInt(daysParam, 10);
    if (!isNaN(days) && days > 0) {
      dateFilter = ` AND created >= -${days}d`;
    }
  } else {
    // Default: last 90 days (covers a quarter)
    dateFilter = " AND created >= -90d";
  }

  const jql = `project = GSRR AND priority in (High, Medium)${dateFilter} ORDER BY created DESC`;
  const credentials = Buffer.from(`${email}:${token}`).toString("base64");

  try {
    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | null = null;

    do {
      const payload: Record<string, unknown> = {
        jql,
        maxResults: 100,
        fields: ["key", "summary", "status", "priority", "created", "resolutiondate"],
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
          { error: `JIRA API error: ${res.status}`, details: err },
          { status: res.status >= 500 ? 502 : 400 }
        );
      }

      const data = await res.json();
      const issues = data.issues || [];
      allIssues.push(...issues);
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    let total = 0;
    let compliant = 0;
    let highTotal = 0;
    let highCompliant = 0;
    let mediumTotal = 0;
    let mediumCompliant = 0;

    for (const issue of allIssues) {
      const priority = issue.fields?.priority?.name;
      const sloData = calculateSLOCompliance(issue);

      if (!sloData) continue;

      total++;
      if (sloData.meetsSLO) compliant++;

      if (priority === "High") {
        highTotal++;
        if (sloData.meetsSLO) highCompliant++;
      } else if (priority === "Medium") {
        mediumTotal++;
        if (sloData.meetsSLO) mediumCompliant++;
      }
    }

    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 100;
    const highRate = highTotal > 0 ? Math.round((highCompliant / highTotal) * 100) : 100;
    const mediumRate = mediumTotal > 0 ? Math.round((mediumCompliant / mediumTotal) * 100) : 100;
    const meetsTarget = complianceRate >= 100;

    const jiraUrl = `${baseUrl}/issues/?jql=${encodeURIComponent(jql)}`;

    return NextResponse.json({
      complianceRate,
      meetsTarget,
      total,
      compliant,
      highTotal,
      highCompliant,
      highRate,
      mediumTotal,
      mediumCompliant,
      mediumRate,
      jql,
      jiraUrl,
      dateFilter: { startDate, endDate, days: daysParam },
    });
  } catch (e) {
    console.error("GSRR compliance error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from JIRA", details: String(e) },
      { status: 500 }
    );
  }
}
