import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * Attrition % - "Engineering Attrition below 12% annualized"
 * Sources (in order):
 * 1. ATTRITION_PERCENT - manual override (e.g. 8.5)
 * 2. ATTRITION_SHEET_ID + service account - private Google Sheet via API
 * 3. ATTRITION_SHEET_CSV_URL + ATTRITION_HEADCOUNT - public published CSV (legacy)
 *
 * For private Sheets: create a service account, share the sheet with its email,
 * and set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.
 */
const TARGET_PERCENT = 12;

function getAuthClient() {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credsB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;

  if (credsPath) {
    return new google.auth.GoogleAuth({
      keyFile: credsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  }

  let credentials: object;
  if (credsB64) {
    try {
      credentials = JSON.parse(
        Buffer.from(credsB64, "base64").toString("utf8")
      );
    } catch {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON_B64");
    }
  } else if (credsJson) {
    try {
      credentials = JSON.parse(credsJson);
    } catch {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
    }
  } else {
    throw new Error(
      "Set GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_SERVICE_ACCOUNT_JSON_B64"
    );
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function fetchFromPrivateSheet(
  spreadsheetId: string,
  range: string
): Promise<{ departures: number }> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const rows = res.data.values ?? [];
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim()));
  return { departures: dataRows.length };
}

async function fetchFromPublicCsv(
  url: string
): Promise<{ departures: number }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "V2MOM-Dashboard/1.0" },
  });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  const departures = Math.max(0, lines.length - 1);
  return { departures };
}

export async function GET() {
  const manualPercent = process.env.ATTRITION_PERCENT;
  const sheetId = process.env.ATTRITION_SHEET_ID;
  const sheetUrl = process.env.ATTRITION_SHEET_CSV_URL;
  const headcountStr = process.env.ATTRITION_HEADCOUNT;
  const monthsStr = process.env.ATTRITION_MONTHS ?? "12";

  // 1. Manual override (percent or departures/headcount)
  if (manualPercent != null && manualPercent !== "") {
    const percent = parseFloat(manualPercent);
    if (!Number.isNaN(percent)) {
      return NextResponse.json({
        attritionPercent: percent,
        targetPercent: TARGET_PERCENT,
        meetsTarget: percent <= TARGET_PERCENT,
        source: "env",
      });
    }
  }

  const departuresStr = process.env.ATTRITION_DEPARTURES;
  if (departuresStr && headcountStr) {
    const departures = parseInt(departuresStr, 10);
    const headcount = parseInt(headcountStr, 10);
    const months = parseInt(monthsStr, 10) || 12;
    if (departures >= 0 && headcount > 0) {
      const rawPercent = (departures / headcount) * 100;
      const annualizedPercent =
        months > 0
          ? Math.round(rawPercent * (12 / months) * 10) / 10
          : Math.round(rawPercent * 10) / 10;
      return NextResponse.json({
        attritionPercent: annualizedPercent,
        targetPercent: TARGET_PERCENT,
        meetsTarget: annualizedPercent <= TARGET_PERCENT,
        source: "env",
        departures,
        headcount,
        months,
      });
    }
  }

  // 2. Private Google Sheet (service account)
  if (sheetId && headcountStr) {
    const headcount = parseInt(headcountStr, 10);
    const months = parseInt(monthsStr, 10) || 12;
    const range = process.env.ATTRITION_SHEET_RANGE ?? "Sheet1!A:Z";

    if (headcount <= 0) {
      return NextResponse.json(
        { error: "ATTRITION_HEADCOUNT must be a positive number" },
        { status: 503 }
      );
    }

    try {
      const { departures } = await fetchFromPrivateSheet(sheetId, range);
      const rawPercent = (departures / headcount) * 100;
      const annualizedPercent =
        months > 0
          ? Math.round(rawPercent * (12 / months) * 10) / 10
          : rawPercent;

      return NextResponse.json({
        attritionPercent: annualizedPercent,
        targetPercent: TARGET_PERCENT,
        meetsTarget: annualizedPercent <= TARGET_PERCENT,
        source: "sheet",
        departures,
        headcount,
        months,
      });
    } catch (e) {
      console.error("Attrition sheet fetch error:", e);
      return NextResponse.json(
        {
          error: "Failed to fetch attrition from sheet",
          details: String(e),
        },
        { status: 502 }
      );
    }
  }

  // 3. Public CSV (legacy)
  if (sheetUrl && headcountStr) {
    const headcount = parseInt(headcountStr, 10);
    const months = parseInt(monthsStr, 10) || 12;

    if (headcount <= 0) {
      return NextResponse.json(
        { error: "ATTRITION_HEADCOUNT must be a positive number" },
        { status: 503 }
      );
    }

    try {
      const { departures } = await fetchFromPublicCsv(sheetUrl);
      const rawPercent = (departures / headcount) * 100;
      const annualizedPercent =
        months > 0
          ? Math.round(rawPercent * (12 / months) * 10) / 10
          : rawPercent;

      return NextResponse.json({
        attritionPercent: annualizedPercent,
        targetPercent: TARGET_PERCENT,
        meetsTarget: annualizedPercent <= TARGET_PERCENT,
        source: "sheet",
        departures,
        headcount,
        months,
      });
    } catch (e) {
      console.error("Attrition sheet fetch error:", e);
      return NextResponse.json(
        { error: "Failed to fetch attrition from sheet", details: String(e) },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "Configure ATTRITION_DEPARTURES + ATTRITION_HEADCOUNT, ATTRITION_PERCENT, or ATTRITION_SHEET_ID + Google service account",
    },
    { status: 503 }
  );
}
