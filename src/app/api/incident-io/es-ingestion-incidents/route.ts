import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Incident.io ES/Ingestion-related Sev1/Sev2 Incidents
 * Tracks: "Reduce ES/ingestion‑related Sev1/Sev2 customer incidents by X% vs FY26 baseline"
 *
 * Content-based filter (for last year and older incidents that may lack custom fields):
 * - ES, ES8, ES5, Elasticsearch, elastic search
 * - Updates (journey, bulk, user updates, ingestion)
 * - Severity = SEV1 or SEV2
 */
const INCIDENT_IO_BASE = "https://api.incident.io";

const SEV1_ID = "01JDQ908N4QFT6F155V5VW59BF";
const SEV2_ID = "01JDQ908N48EZPEND6ZEP7ZCTT";

const ES_CONTENT_KEYWORDS = [
  "es8",
  "es5",
  " es ",      // ES = Elasticsearch
  "elasticsearch",
  "elastic search",
  "elasticsearch8",
  "es cluster",
  "ingestion",
  "bulk update",
  "journey update",
  "user update",
  "updates",
];

const FY26_START = "2025-02-01";
const FY26_END = "2026-01-31";
const FY27_START = "2026-02-01";

interface CustomFieldEntry {
  custom_field?: { id?: string; name?: string; field_type?: string };
  values?: Array<{
    value_option?: { value?: string };
    value_catalog_entry?: { name?: string };
    value_text?: string;
  }>;
}

interface Incident {
  id: string;
  severity?: { name?: string; id?: string };
  custom_field_entries?: CustomFieldEntry[];
  created_at?: string;
  declared_at?: string;
  [key: string]: unknown;
}

function getSearchableText(inc: Incident): string {
  const parts: string[] = [(inc.name ?? ""), (inc.summary ?? "")];
  for (const e of inc.custom_field_entries ?? []) {
    for (const v of e.values ?? []) {
      const t = v.value_catalog_entry?.name ?? v.value_option?.value ?? v.value_text ?? "";
      if (t) parts.push(t);
    }
  }
  return parts.join(" ").toLowerCase();
}

function isEsIngestionRelated(inc: Incident): boolean {
  const text = getSearchableText(inc);
  return ES_CONTENT_KEYWORDS.some((k) => text.includes(k));
}

function isSev1OrSev2(inc: Incident): boolean {
  const id = inc.severity?.id ?? "";
  const name = (inc.severity?.name ?? "").toLowerCase();
  if (id === SEV1_ID || id === SEV2_ID) return true;
  return ["sev1", "sev2", "critical", "major"].some((s) => name.includes(s));
}

function toDate(inc: Incident): Date {
  const s = inc.declared_at ?? inc.created_at ?? "";
  return s ? new Date(s) : new Date(0);
}

function buildListUrl(params: {
  createdGte?: string;
  createdLte?: string;
  pageSize?: number;
  after?: string;
}): string {
  const p = new URLSearchParams();
  p.set("page_size", String(params.pageSize ?? 100));
  if (params.createdGte) p.set("created_at[gte]", params.createdGte);
  if (params.createdLte) p.set("created_at[lte]", params.createdLte);
  if (params.after) p.set("after", params.after);
  return `${INCIDENT_IO_BASE}/v2/incidents?${p.toString()}`;
}

async function fetchIncidentsPage(
  url: string,
  headers: Record<string, string>
): Promise<{ incidents: Incident[]; after?: string }> {
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) throw new Error(`Incident.io API ${res.status}`);
  const json = (await res.json()) as {
    incidents?: Incident[];
    pagination_meta?: { after?: string };
  };
  return {
    incidents: json.incidents ?? [],
    after: json.pagination_meta?.after,
  };
}

export async function GET(request: NextRequest) {
  const token = process.env.INCIDENT_IO_API_KEY;

  if (!token) {
    return NextResponse.json(
      { error: "INCIDENT_IO_API_KEY not configured." },
      { status: 503 }
    );
  }

  const envBaseline = Number(process.env.ES_INGESTION_BASELINE) || 0;
  const targetReductionPercent = Number(process.env.ES_INGESTION_TARGET_REDUCTION) || 50;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    const fy26Start = new Date(FY26_START);
    const fy26End = new Date(FY26_END);
    const fy27Start = new Date(FY27_START);

    let fy26Count = 0;
    let fy27Count = 0;

    const urlsToTry = [
      buildListUrl({ createdGte: FY26_START }),
      buildListUrl({}),
    ];

    let allIncidents: Incident[] = [];
    for (const baseUrl of urlsToTry) {
      try {
        let url = baseUrl;
        for (let page = 0; page < 15; page++) {
          const { incidents, after } = await fetchIncidentsPage(url, headers);
          allIncidents = [...allIncidents, ...incidents];
          if (!after || incidents.length === 0) break;
          const u = new URL(baseUrl);
          u.searchParams.set("after", after);
          url = u.toString();
        }
        if (allIncidents.length > 0) break;
      } catch {
        allIncidents = [];
        continue;
      }
    }

    const matched = allIncidents.filter(
      (inc) => isSev1OrSev2(inc) && isEsIngestionRelated(inc)
    );

    for (const inc of matched) {
      const d = toDate(inc);
      if (d >= fy26Start && d <= fy26End) fy26Count++;
      else if (d >= fy27Start) fy27Count++;
    }

    const baseline = envBaseline > 0 ? envBaseline : fy26Count;
    const currentCount = fy27Count;
    const reductionPercent =
      baseline > 0
        ? Math.round(((baseline - currentCount) / baseline) * 100)
        : null;

    const incidentsUrl =
      process.env.INCIDENT_IO_INCIDENTS_URL || "https://app.incident.io/iterable/incidents";

    return NextResponse.json(
      {
        currentCount,
        baseline,
        targetReductionPercent: targetReductionPercent || null,
        reductionPercent,
        meetsTarget:
          targetReductionPercent > 0 && reductionPercent != null
            ? reductionPercent >= targetReductionPercent
            : null,
        source: "incident_io",
        filter: "ES/ES8/ES5/Elasticsearch + updates, SEV1/2",
        incidentsUrl,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("Incident.io ES/ingestion incidents error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Incident.io", details: String(e) },
      { status: 500 }
    );
  }
}
