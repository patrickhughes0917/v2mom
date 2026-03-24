import { NextRequest, NextResponse } from "next/server";

/**
 * Jellyfish KTLO - from Investments (investment classification)
 * Tracks: "Reduce Keep the Lights On (KTLO) work from 42% to 25%"
 *
 * Uses Jellyfish Investments / Allocations data (investment_classification).
 * Sources tried in order:
 * 1. allocations/summary_filtered/by_investment_category - Investments (FTE by category)
 * 2. allocations/details/investment_category - Investments details
 * 3. delivery/work_category_contents (epics) - fallback from Deliverables
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
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

interface InvestmentCategoryRow {
  investment_classification?: string;
  investment_category?: string;
  [key: string]: unknown;
}

interface Deliverable {
  investment_classification?: string;
  cumulative_allocation_person_months?: number;
}

function isKtlo(name: string): boolean {
  const u = (name ?? "").toUpperCase();
  return u.includes("KTLO") || u.includes("KEEP THE LIGHTS");
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
  const { startDate, endDate } = getTimeframeParams();
  const start = searchParams.get("start_date") || searchParams.get("startDate") || startDate;
  const end = searchParams.get("end_date") || searchParams.get("endDate") || endDate;
  const headers = {
    Authorization: `Token ${token}`,
    Accept: "application/json",
  };

  const targetPercent = 25;
  const startPercent = 42;

  try {
    // 1. Investments API - from Jellyfish MCP api.js
    const allocPaths = [
      "/allocations/summary_filtered/by_investment_category",
      "/allocations/details/investment_category",
    ];
    for (const path of allocPaths) {
      const allocUrl = `${JELLYFISH_BASE}${path}?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&max_n_allocation_card_keys=0`;
      const allocRes = await fetch(allocUrl, { method: "GET", headers });
      if (!allocRes.ok) continue;

      const allocData = await allocRes.json();
      let rows = Array.isArray(allocData) ? allocData : allocData.data ?? allocData.results ?? [];
      if (rows.length === 0 && typeof allocData === "object") {
        const entries = allocData.entries ?? allocData.investment_categories ?? allocData.by_investment_category;
        if (Array.isArray(entries)) rows = entries;
        else if (entries && typeof entries === "object") rows = Object.entries(entries).map(([k, v]) => ({ investment_classification: k, ...(typeof v === "object" ? v : { value: v }) }));
      }
      let totalAlloc = 0;
      let ktloAlloc = 0;

      for (const row of rows as InvestmentCategoryRow[]) {
        const name = (row.investment_classification ?? row.name ?? row.category ?? row.investment_category ?? "").toString();
        const alloc =
          Number(
            row.person_months ?? row.allocation ?? row.value ?? row.cumulative_allocation_person_months ??
            row.fte ?? row.total_fte ?? row.total
          ) || 0;
        totalAlloc += alloc;
        if (isKtlo(name)) ktloAlloc += alloc;
      }

      if (totalAlloc > 0) {
        const ktloPercent = Math.round((ktloAlloc / totalAlloc) * 100);
        return NextResponse.json({
          ktloPercent,
          targetPercent,
          startPercent,
          meetsTarget: ktloPercent <= targetPercent,
          source: "investments",
          timeframe: `${start}–${end}`,
          end,
        });
      }
    }

    // 2. Fallback: delivery/work_category_contents (epics - start_date/end_date)
    const url = `${JELLYFISH_BASE}/delivery/work_category_contents?work_category_slug=epics&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
    const res = await fetch(url, { method: "GET", headers });

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
      if (isKtlo(inv)) ktloAlloc += alloc;
    }

    const ktloPercent =
      totalAlloc > 0 ? Math.round((ktloAlloc / totalAlloc) * 100) : null;
    const meetsTarget = ktloPercent !== null && ktloPercent <= targetPercent;

    return NextResponse.json({
      ktloPercent,
      targetPercent,
      startPercent,
      meetsTarget: ktloPercent !== null ? meetsTarget : null,
      source: "delivery",
      timeframe: `${start}–${end}`,
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
