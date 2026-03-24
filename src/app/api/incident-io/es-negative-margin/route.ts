import { NextRequest, NextResponse } from "next/server";

/**
 * Incident.io ES‑driven negative‑margin organization incidents
 * Tracks: "Reduce ES‑driven negative‑margin organization by X% vs FY26"
 *
 * Filters (from Incident.io MCP analysis):
 * - Root cause = "Load"
 * - ES / user-update related: via "Which theme" OR content matching
 *   (Theme field added Sept 2025; FY26 incidents before that need name/summary/custom-field inspection)
 *
 * ES-relevant themes: Excessive Journey Updates, Excessive Bulk Updates, Excessive Campaign labels,
 * Inefficient Journeys, Campaign Aggregations, Mapping explosion, Export and Analytical API Usage,
 * Web Count and Analytical Query Usage
 *
 * Content keywords for older incidents: elasticsearch (ES), cluster, c10, c5, shard, ingestion,
 * bulk, journey, campaign, list, query, aggregation
 */
const INCIDENT_IO_BASE = "https://api.incident.io";

const ROOT_CAUSE_VALUES = ["load"];

const THEME_ES_RELATED = [
  "excessive journey updates",
  "excessive bulk updates",
  "excessive campaign labels",
  "inefficient journeys",
  "campaign aggregations",
  "mapping explosion",
  "export and analytical api usage",
  "web count and analytical query usage",
  "expensive dynamic lists",
  "experiments api usage",
];

const CONTENT_ES_KEYWORDS = [
  "elasticsearch",
  "elastic search",
  " es ",  // ES = Elasticsearch abbreviation
  "es8",   // Elasticsearch 8
  "es cluster",
  " c10",
  " c5",
  "c102",
  "c101",
  "shard",
  "shards",
  "ingestion",
  "bulk update",
  "journey update",
  "journey updates",
  "campaign label",
  "list query",
  "list queries",
  "aggregation",
  "mapping explosion",
  "catalog",
  "pulsar",
  "realtime",
  "api export",
];

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
  name?: string;
  summary?: string;
  severity?: { name?: string };
  custom_field_entries?: CustomFieldEntry[];
  [key: string]: unknown;
}

function getFieldValues(entry: CustomFieldEntry): string[] {
  const vals: string[] = [];
  for (const v of entry.values ?? []) {
    const t = v.value_option?.value ?? v.value_catalog_entry?.name ?? v.value_text ?? "";
    if (t) vals.push(t.toLowerCase());
  }
  return vals;
}

function hasRootCauseLoad(inc: Incident): boolean {
  for (const e of inc.custom_field_entries ?? []) {
    const fname = (e.custom_field?.name ?? "").toLowerCase();
    if (!fname.includes("root") || !fname.includes("cause")) continue;
    const vals = getFieldValues(e);
    if (vals.some((v) => ROOT_CAUSE_VALUES.some((r) => v.includes(r)))) return true;
  }
  return false;
}

function hasEsRelatedTheme(inc: Incident): boolean {
  for (const e of inc.custom_field_entries ?? []) {
    const fname = (e.custom_field?.name ?? "").toLowerCase();
    if (!fname.includes("theme")) continue;
    const vals = getFieldValues(e);
    if (vals.some((v) => THEME_ES_RELATED.some((t) => v.includes(t)))) return true;
  }
  return false;
}

function hasImpactedSystemElasticsearch(inc: Incident): boolean {
  for (const e of inc.custom_field_entries ?? []) {
    const fname = (e.custom_field?.name ?? "").toLowerCase();
    if (!fname.includes("impacted system")) continue;
    const vals = getFieldValues(e);
    if (vals.some((v) => v.includes("elasticsearch") || v.includes("elastic"))) return true;
  }
  return false;
}

function matchesEsContent(inc: Incident): boolean {
  const text = [(inc.name ?? ""), (inc.summary ?? "")].join(" ").toLowerCase();
  return CONTENT_ES_KEYWORDS.some((k) => text.includes(k));
}

function isEsNegativeMarginRelated(inc: Incident): boolean {
  if (!hasRootCauseLoad(inc)) return false;
  return hasEsRelatedTheme(inc) || hasImpactedSystemElasticsearch(inc) || matchesEsContent(inc);
}


export async function GET(request: NextRequest) {
  const token = process.env.INCIDENT_IO_API_KEY;

  if (!token) {
    return NextResponse.json(
      { error: "INCIDENT_IO_API_KEY not configured." },
      { status: 503 }
    );
  }

  const baseline = Number(process.env.ES_NEGATIVE_MARGIN_BASELINE) || 0;
  const targetReductionPercent = Number(process.env.ES_NEGATIVE_MARGIN_TARGET_REDUCTION) || 0;

  // FY26: Feb 1 2025 - Jan 31 2026
  const fy26Start = "2025-02-01";
  const fy26End = "2026-01-31";
  // FY27 current: Feb 1 2026 onward
  const fy27Start = "2026-02-01";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    const allIncidents: Incident[] = [];
    const urlsToTry = [
      `${INCIDENT_IO_BASE}/v2/incidents?page_size=100&created_at[gte]=2025-02-01`,
      `${INCIDENT_IO_BASE}/v2/incidents?page_size=100`,
    ];

    let data: { incidents?: Incident[]; pagination_meta?: { after?: string } } | null = null;
    for (const url of urlsToTry) {
      const res = await fetch(url, { method: "GET", headers });
      if (res.ok) {
        data = (await res.json()) as typeof data;
        allIncidents.push(...(data?.incidents ?? []));
        break;
      }
      if (res.status === 422) continue;
      const errText = await res.text();
      return NextResponse.json(
        { error: `Incident.io API ${res.status}`, details: errText.slice(0, 500) },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Incident.io API returned no data", message: "Check API key and request format." },
        { status: 502 }
      );
    }

    // Paginate to get more (up to ~500 for reasonable coverage)
    let after = data.pagination_meta?.after;
    for (let p = 0; p < 5 && after; p++) {
      const nextRes = await fetch(`${INCIDENT_IO_BASE}/v2/incidents?page_size=100&after=${after}`, {
        method: "GET",
        headers,
      });
      if (!nextRes.ok) break;
      const next = (await nextRes.json()) as { incidents?: Incident[]; pagination_meta?: { after?: string } };
      allIncidents.push(...(next.incidents ?? []));
      after = next.pagination_meta?.after;
      if (!after) break;
    }

    function toDate(inc: Incident): Date {
      const created = (inc as { created_at?: string }).created_at;
      const declared = (inc as { declared_at?: string }).declared_at;
      const s = declared ?? created ?? "";
      return s ? new Date(s) : new Date(0);
    }

    const fy26StartDate = new Date(fy26Start);
    const fy26EndDate = new Date(fy26End);
    const fy27StartDate = new Date(fy27Start);

    const inFy26 = (inc: Incident) => {
      const d = toDate(inc);
      return d >= fy26StartDate && d <= fy26EndDate;
    };
    const inFy27 = (inc: Incident) => toDate(inc) >= fy27StartDate;

    const fy26Incidents = allIncidents.filter(inFy26);
    const fy27Incidents = allIncidents.filter(inFy27);

    const fy26Matched = fy26Incidents.filter(hasRootCauseLoad).filter(isEsNegativeMarginRelated);
    const fy27Matched = fy27Incidents.filter(hasRootCauseLoad).filter(isEsNegativeMarginRelated);

    const baselineCount = baseline > 0 ? baseline : fy26Matched.length;
    const currentCount = fy27Matched.length;
    const reductionPercent =
      baselineCount > 0 ? Math.round(((baselineCount - currentCount) / baselineCount) * 100) : null;

    return NextResponse.json({
      currentCount,
      baseline: baselineCount,
      targetReductionPercent: targetReductionPercent || null,
      reductionPercent,
      meetsTarget:
        targetReductionPercent > 0 && reductionPercent != null
          ? reductionPercent >= targetReductionPercent
          : null,
      source: "incident_io",
      filter:
        "Root cause=Load · ES/user-update related (theme or content: journey, bulk, ES cluster, ingestion)",
    });
  } catch (e) {
    console.error("Incident.io ES negative-margin error:", e);
    return NextResponse.json(
      { error: "Failed to fetch from Incident.io", details: String(e) },
      { status: 500 }
    );
  }
}
