import { NextRequest, NextResponse } from "next/server";

/**
 * API Proxy - Safely fetch data from external APIs
 * Usage: POST /api/proxy with body: { url: "https://api.example.com/data", headers?: {...} }
 * API keys should be stored in .env.local and passed in headers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, headers: customHeaders = {} } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' in request body" },
        { status: 400 }
      );
    }

    // Only allow HTTPS for security
    if (!url.startsWith("https://")) {
      return NextResponse.json(
        { error: "Only HTTPS URLs are allowed" },
        { status: 400 }
      );
    }

    const fetchOptions: RequestInit = {
      method: body.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...customHeaders,
      },
    };
    if (body.body) {
      fetchOptions.body = JSON.stringify(body.body);
    }

    const response = await fetch(url, fetchOptions);

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from external API" },
      { status: 500 }
    );
  }
}
