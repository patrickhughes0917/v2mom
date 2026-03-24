import { NextRequest, NextResponse } from "next/server";

/**
 * AI Power Users - from Jellyfish AI Impact
 * Tracks: "80% of engineers become AI Power Users, using AI-assisted coding 4-5 times a week"
 *
 * Sources (in order):
 * 1. /ai_impact/* endpoints - if Jellyfish exposes AI Impact via API
 * 2. company_metrics - scan for AI-related slugs (aiPowerUserPercent, aiAdoptionPercent, etc.)
 * 3. Fallback: TBD with link to Jellyfish AI Impact dashboard
 *
 * Jellyfish API: https://app.jellyfish.co/endpoints/export/v0/
 * Auth: Authorization: Token <JELLYFISH_API_TOKEN>
 */
const JELLYFISH_BASE = "https://app.jellyfish.co/endpoints/export/v0";
const TARGET_PERCENT = 80;
const AI_IMPACT_URL = "https://app.jellyfish.co/ai-impact";
const ADOPTION_STATUS_CURSOR = "https://app.jellyfish.co/ai-impact/adoption-status?team=&tool=CURS";
const ADOPTION_STATUS_CLAUDE = "https://app.jellyfish.co/ai-impact/adoption-status?team=&tool=CLD";

interface CompanyMetric {
  name: string;
  slug: string;
  unit: string | null;
  value: number | null;
}

function getTimeframeParams() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setMonth(start.getMonth() - 1);
  return {
    timeframe: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    end: end.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  };
}

const AI_POWER_USER_SLUGS = [
  "aiPowerUserPercent",
  "ai_power_user_percent",
  "powerUserPercent",
  "aiAdoptionPercent",
  "ai_adoption_percent",
  "aiAdoptionRate",
  "engineersUsingAiPercent",
  "aiUsagePercent",
];

export async function GET(request: NextRequest) {
  const token = process.env.JELLYFISH_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "JELLYFISH_API_TOKEN not configured." },
      { status: 503 }
    );
  }

  const headers = {
    Authorization: `Token ${token}`,
    Accept: "application/json",
  };

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || getTimeframeParams().timeframe;
  const end = searchParams.get("end") || getTimeframeParams().end;

  try {
    // 1. company_metrics - look for AI power user / adoption metrics
    const metricsUrl = `${JELLYFISH_BASE}/metrics/company_metrics?timeframe=${encodeURIComponent(timeframe)}&end=${encodeURIComponent(end)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const metricsRes = await fetch(metricsUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (metricsRes.ok) {
      const raw = await metricsRes.json();
      const items = Array.isArray(raw) ? raw : [raw];
      const first = items[0] as { metrics?: CompanyMetric[] } | undefined;
      const metrics = first?.metrics ?? [];

      for (const slug of AI_POWER_USER_SLUGS) {
        const m = metrics.find((x) => x.slug === slug || x.slug?.toLowerCase().includes("power") || x.slug?.toLowerCase().includes("ai"));
        if (m?.value != null) {
          const percent = Math.round(Number(m.value));
          return NextResponse.json({
            powerUserPercent: percent,
            targetPercent: TARGET_PERCENT,
            meetsTarget: percent >= TARGET_PERCENT,
            source: "company_metrics",
            metricSlug: m.slug,
            aiImpactUrl: AI_IMPACT_URL,
            adoptionStatusUrls: { cursor: ADOPTION_STATUS_CURSOR, claude: ADOPTION_STATUS_CLAUDE },
          });
      }
    }

      // Scan for any metric with "ai" or "power" in slug/name
      const aiMetric = metrics.find(
        (m) =>
          (m.slug?.toLowerCase().includes("ai") || m.slug?.toLowerCase().includes("power")) &&
          m.value != null
      );
      if (aiMetric) {
        const percent = Math.round(Number(aiMetric.value));
        return NextResponse.json({
          powerUserPercent: percent,
          targetPercent: TARGET_PERCENT,
          meetsTarget: percent >= TARGET_PERCENT,
          source: "company_metrics",
          metricSlug: aiMetric.slug,
          aiImpactUrl: AI_IMPACT_URL,
          adoptionStatusUrls: { cursor: ADOPTION_STATUS_CURSOR, claude: ADOPTION_STATUS_CLAUDE },
        });
      }
    }

    // 2. No data - return TBD with links to adoption status (Cursor, Claude)
    return NextResponse.json({
      powerUserPercent: null,
      targetPercent: TARGET_PERCENT,
      meetsTarget: null,
      source: null,
      aiImpactUrl: AI_IMPACT_URL,
      adoptionStatusUrls: {
        cursor: ADOPTION_STATUS_CURSOR,
        claude: ADOPTION_STATUS_CLAUDE,
      },
      message: "AI Impact data not yet available via API. View adoption status in Jellyfish.",
    });
  } catch (e) {
    console.error("AI Power Users error:", e);
    return NextResponse.json(
      { error: "Failed to fetch AI Impact data", details: String(e) },
      { status: 500 }
    );
  }
}
