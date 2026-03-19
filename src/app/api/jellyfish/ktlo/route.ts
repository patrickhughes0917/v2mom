import { NextRequest, NextResponse } from "next/server";

/**
 * Jellyfish KTLO - from Delivery API (investment_classification)
 * Tracks: "Reduce Keep the Lights On (KTLO) work from 42% to 25%"
 * Uses delivery/work_category_contents (epics) - each deliverable has investment_classification
 * and cumulative_allocation_person_months. We aggregate by KTLO vs total.
 *
 * Jellyfish API: https://app.jellyfish.co/endpoints/export/v0/
 * Auth: Authorization: Token <JELLYFISH_API_TOKEN>
 */
const JELLYFISH_BASE = "https://app.jellyfish.co/endpoints/export/v0";

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

interface Deliverable {
  investment_classification?: string;
  cumulative_allocation_person_months?: number;
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
    const url = `${JELLYFISH_BASE}/delivery/work_category_contents?work_category_slug=epics&timeframe=${encodeURIComponent(timeframe)}&end=${encodeURIComponent(end)}`;

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

    const data = await res.json();
    let items: Deliverable[] = [];
    if (Array.isArray(data)) {
      for (const d of data) {
        const obj = d as { deliverables?: Deliverable[] } & Record<string, unknown>;
        if (obj.deliverables) {
          items = items.concat(obj.deliverables);
        } else if ("investment_classification" in obj) {
          items.push(d as Deliverable);
        }
      }
    } else {
      items = (data.deliverables ?? data.data ?? []) as Deliverable[];
    }

    let totalAlloc = 0;
    let ktloAlloc = 0;

    for (const item of items) {
      const alloc = Number(item.cumulative_allocation_person_months) || 0;
      const inv = (item.investment_classification ?? "").toUpperCase();
      totalAlloc += alloc;
      if (inv.includes("KTLO") || inv.includes("KEEP THE LIGHTS")) {
        ktloAlloc += alloc;
      }
    }

    const ktloPercent =
      totalAlloc > 0 ? Math.round((ktloAlloc / totalAlloc) * 100) : null;
    const targetPercent = 25;
    const startPercent = 42;
    const meetsTarget = ktloPercent !== null && ktloPercent <= targetPercent;

    return NextResponse.json({
      ktloPercent,
      targetPercent,
      startPercent,
      meetsTarget: ktloPercent !== null ? meetsTarget : null,
      timeframe,
      end,
    });
  } catch (e) {
    console.error("Jellyfish KTLO error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Jellyfish", details: String(e) },
      { status: 500 }
    );
  }
}
