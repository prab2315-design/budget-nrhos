/**
 * Google Sheets data fetching and parsing.
 * Sheet ID: 1v8ukcrICXPJMLoU2QFpPYwIEswq1k-7afWiiVTezypo
 *
 * TRplan sheet columns:
 *   A: ลำดับ, B: เดือน, C: รหัสบัญชี, D: หมวด, E: รายการบัญชี, F: ยอดจริง, G: ประเภท
 *
 * group sheet columns:
 *   A: ลำดับ, B: รหัสบัญชี, C: หมวด, D: รายการบัญชี, E: แผนรายรับ, F: แผนรายจ่าย
 */

const SHEET_ID = "1v8ukcrICXPJMLoU2QFpPYwIEswq1k-7afWiiVTezypo";

export interface TRPlanRow {
  ลำดับ: string;
  เดือน: string;
  รหัสบัญชี: string;
  หมวด: string;
  รายการบัญชี: string;
  ยอดจริง: number;
  ประเภท: string;
}

export interface GroupRow {
  ลำดับ: string;
  รหัสบัญชี: string;
  หมวด: string;
  รายการบัญชี: string;
  แผนรายรับ: number;
  แผนรายจ่าย: number;
}

export interface SheetData {
  trplan: TRPlanRow[];
  group: GroupRow[];
  lastUpdated: Date;
}

function buildCsvUrl(sheetName: string): string {
  const encoded = encodeURIComponent(sheetName);
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encoded}`;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return lines.map(parseCsvLine);
}

function parseNum(val: string): number {
  const cleaned = val.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function fetchSheet(sheetName: string): Promise<string[][]> {
  const url = buildCsvUrl(sheetName);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": ${res.status}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

function mapTRPlan(rows: string[][]): TRPlanRow[] {
  if (rows.length < 2) return [];
  // Skip header row
  return rows.slice(1).map((row) => ({
    ลำดับ: row[0] ?? "",
    เดือน: row[1] ?? "",
    รหัสบัญชี: row[2] ?? "",
    หมวด: row[3] ?? "",
    รายการบัญชี: row[4] ?? "",
    ยอดจริง: parseNum(row[5] ?? "0"),
    ประเภท: row[6] ?? "",
  }));
}

function mapGroup(rows: string[][]): GroupRow[] {
  if (rows.length < 2) return [];
  return rows.slice(1).map((row) => ({
    ลำดับ: row[0] ?? "",
    รหัสบัญชี: row[1] ?? "",
    หมวด: row[2] ?? "",
    รายการบัญชี: row[3] ?? "",
    แผนรายรับ: parseNum(row[4] ?? "0"),
    แผนรายจ่าย: parseNum(row[5] ?? "0"),
  }));
}

/**
 * Fetch all data from both sheets
 */
export async function fetchAllData(): Promise<SheetData> {
  const [trplanRaw, groupRaw] = await Promise.all([
    fetchSheet("TRplan"),
    fetchSheet("group"),
  ]);

  return {
    trplan: mapTRPlan(trplanRaw),
    group: mapGroup(groupRaw),
    lastUpdated: new Date(),
  };
}

/**
 * Get unique values for a given column in TRplan data
 */
export function getUniqueValues<T extends Record<string, unknown>>(
  data: T[],
  key: keyof T
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of data) {
    const val = String(row[key] ?? "").trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push(val);
    }
  }
  return result;
}
