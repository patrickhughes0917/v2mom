import { NextResponse } from "next/server";
import { getSigmaAccessToken } from "@/lib/sigma";

const SIGMA_BASE = process.env.SIGMA_API_BASE_URL || "https://api.sigmacomputing.com";

/**
 * List Sigma workbooks (dashboards)
 * GET /api/sigma/workbooks
 *
 * Returns workbooks the authenticated user can access.
 * Use workbook.id in the export endpoint.
 */
export async function GET() {
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
    const res = await fetch(`${SIGMA_BASE}/v2/workbooks`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Sigma workbooks ${res.status}`, details: errText.slice(0, 500) },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Sigma workbooks error:", e);
    return NextResponse.json(
      { error: "Failed to list Sigma workbooks", details: String(e) },
      { status: 500 }
    );
  }
}
