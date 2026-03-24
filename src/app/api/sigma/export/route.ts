import { NextRequest, NextResponse } from "next/server";
import { getSigmaAccessToken } from "@/lib/sigma";

const SIGMA_BASE = process.env.SIGMA_API_BASE_URL || "https://api.sigmacomputing.com";

/**
 * Export data from a Sigma workbook
 * GET /api/sigma/export?workbookId=xxx&format=json
 *
 * Returns exported data as JSON (or raw for other formats).
 * Supports format: json, csv
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workbookId = searchParams.get("workbookId");
  const format = searchParams.get("format") || "json";

  if (!workbookId) {
    return NextResponse.json(
      { error: "workbookId query param required. Get IDs from /api/sigma/workbooks" },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = await getSigmaAccessToken();
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e), hint: "Add SIGMA_CLIENT_ID and SIGMA_CLIENT_SECRET to .env.local" },
      { status: 503 }
    );
  }

  try {
    // 1. Initiate export
    const exportBody: Record<string, unknown> = {
      format: format === "csv" ? "csv" : "json",
      exportScope: "workbook",
    };

    const exportRes = await fetch(`${SIGMA_BASE}/v2/workbooks/${workbookId}/export`, {
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
      return NextResponse.json(
        { error: `Sigma export failed ${exportRes.status}`, details: errText.slice(0, 500) },
        { status: exportRes.status >= 500 ? 502 : exportRes.status }
      );
    }

    const exportData = (await exportRes.json()) as { queryId?: string };
    const queryId = exportData.queryId;
    if (!queryId) {
      return NextResponse.json(
        { error: "Sigma export did not return queryId", details: exportData },
        { status: 502 }
      );
    }

    // 2. Poll for download readiness (export can take a few seconds)
    const maxAttempts = 15;
    const pollIntervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const downloadRes = await fetch(`${SIGMA_BASE}/v2/query/${queryId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (downloadRes.ok) {
        const contentType = downloadRes.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await downloadRes.json();
          return NextResponse.json(data);
        }
        const text = await downloadRes.text();
        return NextResponse.json({ raw: text, format });
      }

      if (downloadRes.status === 202 || downloadRes.status === 404) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        continue;
      }

      const errText = await downloadRes.text();
      return NextResponse.json(
        { error: `Sigma download failed ${downloadRes.status}`, details: errText.slice(0, 500) },
        { status: downloadRes.status >= 500 ? 502 : downloadRes.status }
      );
    }

    return NextResponse.json(
      { error: "Sigma export timed out - data not ready after polling" },
      { status: 504 }
    );
  } catch (e) {
    console.error("Sigma export error:", e);
    return NextResponse.json(
      { error: "Failed to export from Sigma", details: String(e) },
      { status: 500 }
    );
  }
}
