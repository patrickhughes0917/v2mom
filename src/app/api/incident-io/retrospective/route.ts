import { NextRequest, NextResponse } from "next/server";

/**
 * Incident.io Retrospective - "Time to Draft Ready"
 * Tracks: "Reduce retrospective mean completion time from 10 days to 3 days"
 *
 * Retrospective SLO (from Incident.io post-incident flow):
 * - Start: "Start of Retrospective Process" (first entering "Documenting")
 * - End: "Draft Ready" (first entering "Reviewing")
 *
 * Fetches incidents, extracts duration_metrics matching retrospective/draft ready,
 * computes mean completion time in days.
 *
 * Incident.io API: https://api.incident.io/
 * Auth: Authorization: Bearer <INCIDENT_IO_API_KEY>
 */
const INCIDENT_IO_BASE = "https://api.incident.io";
const START_DAYS = 10;
const TARGET_DAYS = 3;

const RETROSPECTIVE_METRIC_NAMES = [
  "retrospective slo",  // exact name in Incident.io Duration Metrics
  "time to draft ready",
  "draft ready",
  "documenting to reviewing",
];

interface DurationMetricWithValue {
  duration_metric: { id: string; name: string };
  value_seconds?: number;
}

interface Incident {
  id: string;
  duration_metrics?: DurationMetricWithValue[];
  [key: string]: unknown;
}

function getDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function matchesRetrospective(name: string): boolean {
  const n = name.toLowerCase();
  return RETROSPECTIVE_METRIC_NAMES.some((term) => n.includes(term));
}

export async function GET(request: NextRequest) {
  const token = process.env.INCIDENT_IO_API_KEY;

  if (!token) {
    return NextResponse.json(
      { error: "INCIDENT_IO_API_KEY not configured." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const { start, end } = getDateRange();
  const startParam = searchParams.get("start") || searchParams.get("start_date") || start;
  const endParam = searchParams.get("end") || searchParams.get("end_date") || end;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    let data: { incidents?: Incident[] } | null = null;
    let lastStatus = 0;
    let lastError = "";

    // Try date filter formats; fallback to no filter if 422 (format may vary)
    const dateRange = `${startParam}~${endParam}`;
    const urlsToTry = [
      `${INCIDENT_IO_BASE}/v2/incidents?created_at[date_range]=${encodeURIComponent(dateRange)}&page_size=50`,
      `${INCIDENT_IO_BASE}/v2/incidents?created_at[gte]=${encodeURIComponent(startParam)}&created_at[lte]=${encodeURIComponent(endParam)}&page_size=50`,
      `${INCIDENT_IO_BASE}/v2/incidents?page_size=50`,
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    for (const url of urlsToTry) {
      const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
      lastStatus = res.status;
      if (res.ok) {
        data = (await res.json()) as { incidents?: Incident[] };
        break;
      }
      lastError = await res.text();
      if (res.status === 422) continue;
      clearTimeout(timeout);
      return NextResponse.json(
        { error: `Incident.io API ${res.status}`, details: lastError.slice(0, 500) },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    clearTimeout(timeout);
    if (!data) {
      return NextResponse.json(
        { error: `Incident.io API ${lastStatus}`, details: lastError.slice(0, 500), message: "Date filter rejected. Check Incident.io API docs for created_at format." },
        { status: 502 }
      );
    }

    let incidents = data.incidents ?? [];

    const durations: number[] = [];
    const metricNamesSeen = new Set<string>();

    function extractFromIncidents(list: Incident[]) {
      for (const inc of list) {
        const metrics = inc.duration_metrics ?? [];
        for (const m of metrics) {
          const name = m.duration_metric?.name ?? "";
          if (name) metricNamesSeen.add(name);
          const secs = m.value_seconds;
          if (matchesRetrospective(name) && typeof secs === "number" && secs >= 0) {
            durations.push(secs / (24 * 3600));
          }
        }
      }
    }

    extractFromIncidents(incidents);

    // Fallback: list may omit duration_metrics; fetch incidents individually
    if (incidents.length > 0 && metricNamesSeen.size === 0 && durations.length === 0) {
      const toFetch = incidents.slice(0, 20).map((i) => i.id);
      for (const id of toFetch) {
        try {
          const ac = new AbortController();
          setTimeout(() => ac.abort(), 5000);
          const showRes = await fetch(`${INCIDENT_IO_BASE}/v2/incidents/${id}`, {
            method: "GET",
            headers,
            signal: ac.signal,
          });
          if (showRes.ok) {
            const incData = (await showRes.json()) as { incident?: Incident; data?: { incident?: Incident } };
            const inc = incData.incident ?? incData.data?.incident ?? incData;
            if (inc && typeof inc === "object") {
              extractFromIncidents([inc as Incident]);
            }
          }
        } catch {
          /* skip */
        }
      }
    }

    const meanDays =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null;

    const meanRounded = meanDays != null ? Math.round(meanDays * 10) / 10 : null;

    const metricNamesList = [...metricNamesSeen].sort();

    return NextResponse.json({
      meanDays: meanRounded,
      targetDays: TARGET_DAYS,
      startDays: START_DAYS,
      meetsTarget: meanRounded != null ? meanRounded <= TARGET_DAYS : null,
      source: "incident_io",
      incidentCount: incidents.length,
      retrospectiveCount: durations.length,
      timeframe: `${startParam}–${endParam}`,
      ...(metricNamesList.length > 0 && { metricNamesFound: metricNamesList }),
      ...(meanRounded == null && {
        message:
          durations.length === 0 && incidents.length > 0
            ? metricNamesList.length === 0
              ? "Incidents have no duration metrics. Ensure 'Retrospective SLO' is configured in Incident.io Settings > Lifecycle."
              : `Looking for 'Retrospective SLO'. Found: ${metricNamesList.join(", ")}.`
            : incidents.length === 0
              ? "No incidents in period. Retrospective data appears once incidents complete the post-incident flow (Documenting → Reviewing)."
              : "No retrospective duration data in period.",
      }),
    });
  } catch (e) {
    console.error("Incident.io retrospective error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Incident.io", details: String(e) },
      { status: 500 }
    );
  }
}
