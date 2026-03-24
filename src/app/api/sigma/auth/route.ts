import { NextResponse } from "next/server";
import { getSigmaAccessToken } from "@/lib/sigma";

/**
 * Sigma OAuth token - for debugging/health check.
 * GET /api/sigma/auth
 */
export async function GET() {
  try {
    const token = await getSigmaAccessToken();
    return NextResponse.json({ ok: true, tokenPreview: token.slice(0, 20) + "..." });
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 503 }
    );
  }
}
