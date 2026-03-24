import { NextRequest, NextResponse } from "next/server";

/**
 * Jellyfish Lead Time - from Metrics API (company_metrics)
 * Tracks: Issue Lead Time, Commit Lead Time, Cycle Time (DORA metrics)
 *
 * Jellyfish API: https://app.jellyfish.co/endpoints/export/v0/
 * Auth: Authorization: Token <JELLYFISH_API_TOKEN>
 */
const JELLYFISH_BASE = "https://app.jellyfish.co/endpoints/export/v0";

function getTimeframeParams() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setMonth(start.getMonth() - 2); // ~90 days / quarter
  return {
    timeframe: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    end: end.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  };
}

interface CompanyMetric {
  name: string;
  slug: string;
  unit: string | null;
  value: number | null;
}

interface CompanyMetricsResponse {
  timeframe: { start: string; end: string };
  contributor_count: number;
  metrics: CompanyMetric[];
}

function findMetric(metrics: CompanyMetric[], slug: string): number | null {
  const m = metrics.find((x) => x.slug === slug);
  return m?.value != null ? m.value : null;
}

export async function GET(request: NextRequest) {
  const token = process.env.JELLYFISH_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "JELLYFISH_API_TOKEN not configured. Add it to environment variables." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || getTimeframeParams().timeframe;
  const end = searchParams.get("end") || getTimeframeParams().end;

  try {
    const url = `${JELLYFISH_BASE}/metrics/company_metrics?timeframe=${encodeURIComponent(timeframe)}&end=${encodeURIComponent(end)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Jellyfish API ${res.status}`, details: errText.slice(0, 500) },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const raw = await res.json();
    const items = Array.isArray(raw) ? raw : [raw];
    const first = items[0] as CompanyMetricsResponse | undefined;
    const metrics = first?.metrics ?? [];

    const issueLeadTimeMdn = findMetric(metrics, "resolvedIssueLeadTimeMdn"); // hours, median
    const issueLeadTimeAvg = findMetric(metrics, "resolvedIssueLeadTimeAvg");
    const commitLeadTime = findMetric(metrics, "teamCommitLeadTime");
    const issueCycleTimeMdn = findMetric(metrics, "resolvedIssueCycleTimeMdn");
    const prCycleTimeMdn = findMetric(metrics, "mergedPrCycleTimeMdn");

    // Target: less than 7 days. Baseline 10 days for progress tracking.
    const startTargetHours = 240; // 10 days
    const endTargetHours = 168;   // 7 days
    const currentHours = issueLeadTimeMdn ?? issueLeadTimeAvg ?? issueCycleTimeMdn;
    const meetsTarget =
      currentHours != null ? currentHours <= endTargetHours : null;

    return NextResponse.json({
      issueLeadTimeMdn,
      issueLeadTimeAvg,
      commitLeadTime,
      issueCycleTimeMdn,
      prCycleTimeMdn,
      startTargetHours,
      endTargetHours,
      meetsTarget,
      timeframe: first?.timeframe,
      contributorCount: first?.contributor_count,
    });
  } catch (e) {
    console.error("Jellyfish lead time error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Jellyfish", details: String(e) },
      { status: 500 }
    );
  }
}
