import { NextRequest, NextResponse } from "next/server";

/**
 * Support tickets - On Call Question issue type
 * Tracks: "30% reduction in Eng-dependent support tickets requiring engineering support"
 *
 * Queries Jira for issuetype = "On Call Question".
 * Month-over-month: current month vs previous month (default).
 *
 * Query params:
 * - period: "month" (default) - calendar month vs previous month
 * - period: "month-prior" - last complete month vs month before
 * - days: number - rolling days (e.g. 30) vs previous period
 * - startDate, endDate: YYYY-MM-DD - override current period
 */
const ISSUE_TYPE = "On Call Question";
const TARGET_REDUCTION_PERCENT = 30;

export async function GET(request: NextRequest) {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL || "https://iterable.atlassian.net";
  const projectFilter = process.env.JIRA_SUPPORT_PROJECT; // optional, e.g. "MOB" or "ENG"

  if (!email || !token) {
    return NextResponse.json(
      { error: "JIRA credentials not configured. Add JIRA_EMAIL and JIRA_API_TOKEN to environment variables." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";
  const daysParam = searchParams.get("days");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const periodDays = daysParam ? (parseInt(daysParam, 10) || 30) : 30;

  const credentials = Buffer.from(`${email}:${token}`).toString("base64");
  const headers = {
    Authorization: `Basic ${credentials}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  async function countIssues(
    createdStart: string,
    createdEnd: string
  ): Promise<{ count: number; jql: string }> {
    const projectClause = projectFilter ? ` AND project = ${projectFilter}` : "";
    const jql = `issuetype = "${ISSUE_TYPE}" AND created >= "${createdStart}" AND created <= "${createdEnd}"${projectClause} ORDER BY created DESC`;
    const allIssues: unknown[] = [];
    let nextPageToken: string | null = null;

    do {
      const payload: Record<string, unknown> = {
        jql,
        maxResults: 100,
        fields: ["key"],
      };
      if (nextPageToken) payload.nextPageToken = nextPageToken;

      const res = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`JIRA API ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = (await res.json()) as { issues?: unknown[]; nextPageToken?: string };
      allIssues.push(...(data.issues || []));
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    return { count: allIssues.length, jql };
  }

  try {
    let currentStart: string;
    let currentEnd: string;
    let baselineStart: string;
    let baselineEnd: string;
    const now = new Date();

    if (startDate && endDate) {
      currentStart = startDate;
      currentEnd = endDate;
      const currStart = new Date(startDate);
      const currEnd = new Date(endDate);
      const periodMs = currEnd.getTime() - currStart.getTime();
      baselineEnd = startDate;
      const baseEnd = new Date(startDate);
      const baseStart = new Date(baseEnd.getTime() - periodMs);
      baselineStart = baseStart.toISOString().slice(0, 10);
    } else if (period === "month" || period === "month-prior") {
      // Month-over-month: calendar month vs previous month
      let currMonthStart: Date;
      let currMonthEnd: Date;
      if (period === "month-prior") {
        currMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      } else {
        currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        if (currMonthEnd > now) currMonthEnd = now;
      }
      currentStart = currMonthStart.toISOString().slice(0, 10);
      currentEnd = currMonthEnd.toISOString().slice(0, 10);

      const baseMonthStart = new Date(currMonthStart.getFullYear(), currMonthStart.getMonth() - 1, 1);
      const baseMonthEnd = new Date(currMonthStart.getFullYear(), currMonthStart.getMonth(), 0);
      baselineStart = baseMonthStart.toISOString().slice(0, 10);
      baselineEnd = baseMonthEnd.toISOString().slice(0, 10);
    } else {
      // period=days: rolling period
      const end = new Date();
      const currentEndDate = new Date(end);
      const currentStartDate = new Date(end);
      currentStartDate.setDate(currentStartDate.getDate() - periodDays);
      currentStart = currentStartDate.toISOString().slice(0, 10);
      currentEnd = currentEndDate.toISOString().slice(0, 10);

      baselineEnd = currentStart;
      const baseEndDate = new Date(currentStart);
      const baseStartDate = new Date(baseEndDate);
      baseStartDate.setDate(baseStartDate.getDate() - periodDays);
      baselineStart = baseStartDate.toISOString().slice(0, 10);
    }

    const [currentResult, baselineResult] = await Promise.all([
      countIssues(currentStart, currentEnd),
      countIssues(baselineStart, baselineEnd),
    ]);

    const current = currentResult.count;
    const baseline = baselineResult.count;

    const reductionPercent =
      baseline > 0 ? Math.round(((baseline - current) / baseline) * 100) : 0;
    const meetsTarget = reductionPercent >= TARGET_REDUCTION_PERCENT;

    const jiraUrl = `${baseUrl}/issues/?jql=${encodeURIComponent(`issuetype = "${ISSUE_TYPE}"`)}`;

    const formatMonth = (d: string) => {
      const [y, m] = d.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[parseInt(m!, 10) - 1]} ${y}`;
    };

    return NextResponse.json({
      current,
      baseline,
      reductionPercent,
      targetReductionPercent: TARGET_REDUCTION_PERCENT,
      meetsTarget,
      currentPeriod: { start: currentStart, end: currentEnd },
      baselinePeriod: { start: baselineStart, end: baselineEnd },
      currentPeriodLabel: formatMonth(currentStart),
      baselinePeriodLabel: formatMonth(baselineStart),
      jiraUrl,
    });
  } catch (e) {
    console.error("Support tickets error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from JIRA", details: String(e) },
      { status: 500 }
    );
  }
}
