import { NextResponse } from "next/server";
import { getSigmaAuth } from "@/lib/sigma";

/**
 * Sigma ES negative-margin organizations
 * Tracks: "Reduce ES‑driven negative‑margin organization by X% vs FY26"
 *
 * Fetches from the "User Updates to User Profiles - Per Org - V2MOM" table.
 * Table URL: https://app.sigmacomputing.com/iterable/workbook/Engineering-User-Updates-4HbnLZjgP0WGf0pkmPmBYW?:nodeId=INJ4aYREFO
 * Each row = one negative-margin org. Count = current orgs.
 */
const WORKBOOK_ID =
  process.env.SIGMA_ES_NEGATIVE_MARGIN_WORKBOOK_ID || "4HbnLZjgP0WGf0pkmPmBYW";

/** Node/element ID for the V2MOM table (from Sigma URL ?nodeId=) */
const ELEMENT_ID =
  process.env.SIGMA_ES_NEGATIVE_MARGIN_ELEMENT_ID || "INJ4aYREFO";

/**
 * The workbook date control (New-Control-9) is preset to "2 days ago" in Sigma.
 * We pass the matching date explicitly (MM/DD/YYYY) to bust Sigma's query cache —
 * the preset still drives the result date, but passing a parameter generates a
 * fresh query each day rather than returning a stale cached export.
 * Baseline count is set via ES_NEGATIVE_MARGIN_BASELINE env var since historical
 * data (01/31/2026) is no longer in the dataset.
 */
const AS_OF_DAYS = Number(process.env.SIGMA_ES_NEGATIVE_MARGIN_AS_OF_DAYS) || 2;
const DATE_CONTROL_ID = "New-Control-9";

function getAsOfDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

const OVERAGE_COL_NAMES = [
  "daily cogs overage",
  "daily_cogs_overage",
  "dailyCogsOverage",
  "cogs overage",
  "overage",
];

function parseExportData(data: unknown): { count: number; dailyOverageSum: number; asOfDate?: string } {
  let count = 0;
  let dailyOverageSum = 0;
  let asOfDate: string | undefined;

  function sumOverageFromRow(row: unknown): number {
    if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      for (const key of Object.keys(r)) {
        const k = key.toLowerCase().replace(/\s+/g, " ");
        if (OVERAGE_COL_NAMES.some((n) => k.includes(n))) {
          const v = r[key];
          if (typeof v === "number") return v;
          if (typeof v === "string") return parseFloat(v.replace(/[$,]/g, "")) || 0;
        }
      }
    }
    return 0;
  }

  function getDateFromRow(row: unknown): string | undefined {
    if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      for (const key of Object.keys(r)) {
        if (key.toLowerCase().includes("date")) {
          const v = r[key];
          if (typeof v === "string" && v) return v.split(" ")[0];
        }
      }
    }
    return undefined;
  }

  // Only count rows with positive Daily COGS Overage (negative-margin orgs, red in Sigma)
  function processRows(rows: unknown[]): void {
    for (const row of rows) {
      if (!asOfDate) asOfDate = getDateFromRow(row);
      const overage = sumOverageFromRow(row);
      if (overage > 0) {
        count++;
        dailyOverageSum += overage;
      }
    }
  }

  if (Array.isArray(data)) {
    processRows(data);
    return { count, dailyOverageSum, asOfDate };
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["rows", "data", "results"]) {
      const arr = obj[key];
      if (Array.isArray(arr)) {
        processRows(arr);
        return { count, dailyOverageSum, asOfDate };
      }
    }
    const elements = obj.elements;
    if (Array.isArray(elements)) {
      for (const el of elements) {
        const d = (el as Record<string, unknown>)?.data;
        if (Array.isArray(d)) processRows(d);
        else if (d && typeof d === "object") {
          const rows = (d as Record<string, unknown>).rows ?? (d as Record<string, unknown>).data;
          if (Array.isArray(rows)) processRows(rows);
        }
      }
    }
  }

  return { count, dailyOverageSum, asOfDate };
}

async function exportAndDownload(
  sigmaBase: string,
  token: string
): Promise<{ count: number; dailyOverageSum: number; asOfDate?: string }> {
  const exportBody = {
    elementId: ELEMENT_ID,
    format: { type: "json" as const },
    parameters: { [DATE_CONTROL_ID]: getAsOfDateString(AS_OF_DAYS) },
  };

  const exportRes = await fetch(`${sigmaBase}/v2/workbooks/${WORKBOOK_ID}/export`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(exportBody),
    cache: "no-store",
  });

  if (!exportRes.ok) {
    const errText = await exportRes.text();
    throw new Error(`Sigma export failed ${exportRes.status}: ${errText.slice(0, 300)}`);
  }

  const exportText = await exportRes.text();
  const exportData = exportText ? (JSON.parse(exportText) as { queryId?: string }) : {};
  const queryId = exportData.queryId;
  if (!queryId) {
    throw new Error("Sigma export did not return queryId");
  }

  const maxAttempts = 15;
  const pollIntervalMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const downloadRes = await fetch(`${sigmaBase}/v2/query/${queryId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (downloadRes.ok) {
      const raw = await downloadRes.text();
      if (!raw) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        continue;
      }
      const data = JSON.parse(raw) as unknown;
      return parseExportData(data);
    }

    if (downloadRes.status === 202 || downloadRes.status === 404) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }

    const errText = await downloadRes.text();
    throw new Error(`Sigma download failed ${downloadRes.status}: ${errText.slice(0, 200)}`);
  }

  throw new Error("Sigma export timed out");
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkOnly = searchParams.get("check") === "1";
  let token: string;
  let sigmaBase: string;
  try {
    const auth = await getSigmaAuth();
    token = auth.token;
    sigmaBase = auth.baseUrl;
  } catch (e) {
    return NextResponse.json(
      {
        error: String(e instanceof Error ? e.message : e),
        message: "Add SIGMA_CLIENT_ID and SIGMA_CLIENT_SECRET to .env.local",
      },
      { status: 503 }
    );
  }

  try {
    let current: { count: number; dailyOverageSum: number; asOfDate?: string };
    try {
      current = await exportAndDownload(sigmaBase, token);
    } catch (e) {
      return NextResponse.json(
        { error: "Sigma export failed", details: String(e instanceof Error ? e.message : e) },
        { status: 502 }
      );
    }

    const { count: currentCount, dailyOverageSum, asOfDate } = current;
    const baselineCount = Number(process.env.ES_NEGATIVE_MARGIN_BASELINE) || 0;
    const baselineOverage = Number(process.env.ES_NEGATIVE_MARGIN_BASELINE_OVERAGE) || 0;

    const targetReductionPercent = 50;
    const reductionPercent =
      baselineCount > 0
        ? Math.round(((baselineCount - currentCount) / baselineCount) * 100)
        : null;
    const overageReductionPercent =
      baselineOverage > 0 && dailyOverageSum >= 0
        ? Math.round(((baselineOverage - dailyOverageSum) / baselineOverage) * 100)
        : null;

    const workbookLink =
      process.env.SIGMA_ES_NEGATIVE_MARGIN_WORKBOOK_URL ||
      `https://app.sigmacomputing.com/iterable/workbook/Engineering-User-Updates-4HbnLZjgP0WGf0pkmPmBYW?:nodeId=MWNsxauaqI`;

    return NextResponse.json(
      {
        currentCount,
        baseline: baselineCount,
        dailyOverageSum: Math.round(dailyOverageSum * 100) / 100,
        baselineOverage: baselineOverage > 0 ? Math.round(baselineOverage * 100) / 100 : null,
        overageReductionPercent,
        targetReductionPercent,
        reductionPercent,
        meetsTarget:
          targetReductionPercent > 0 && reductionPercent != null
            ? reductionPercent >= targetReductionPercent
            : null,
        source: "sigma",
        workbookUrl: workbookLink,
        asOfDate,
        asOfDays: AS_OF_DAYS,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("Sigma ES negative-margin error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Sigma", details: String(e) },
      { status: 500 }
    );
  }
}
