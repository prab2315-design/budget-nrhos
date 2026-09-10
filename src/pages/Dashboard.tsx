import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, FileDown, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { fetchAllData, type SheetData, type TRPlanRow } from "@/data/sheets";
import {
  getThaiMonth,
  getThaiMonthShort,
  toBuddhistYear,
  monthYearKey,
  parseThaiMonth,
  formatCurrencyFull,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { QuarterFilter, QUARTER_RANGES } from "@/components/QuarterFilter";
import { SummaryCards } from "@/components/SummaryCards";
import { BarChartVertical } from "@/components/BarChartVertical";
import { PlanActualComparison } from "@/components/PlanActualComparison";
import { RevenueBreakdown, type RevenueBreakdownRow } from "@/components/RevenueBreakdown";
import { ExpenseBreakdown, type ExpenseBreakdownRow } from "@/components/ExpenseBreakdown";
import { MophEmblem } from "@/components/MophEmblem";

// Logo URL for PDF export header
const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1OiPZmllonp6nEyLamaes972FCi23Qbxz";

/* ─── helpers ──────────────────────────────────────────────── */

function parseMonthYear(str: string): { month: number; year: number } {
  const parts = str.trim().split(/\s+/);
  const month = parseThaiMonth(parts[0] ?? "");
  let year = parseInt(parts[1] ?? "", 10);
  if (!isNaN(year) && year > 2300) year -= 543;
  return { month, year };
}

function isInDateRange(
  row: TRPlanRow,
  sm: number,
  sy: number,
  em: number,
  ey: number,
): boolean {
  const { month, year } = parseMonthYear(row.เดือน);
  if (!month) return true;
  const key = monthYearKey(year, month);
  return key >= monthYearKey(sy, sm) && key <= monthYearKey(ey, em);
}

/* ─── filter column definitions ────────────────────────────── */

const FILTER_COLS = [
  { key: "ประเภท", label: "ประเภท" },
  { key: "เดือน", label: "รายเดือน" },
  { key: "หมวด", label: "หมวด" },
  { key: "รหัสบัญชี", label: "รหัสบัญชี" },
  { key: "รายการบัญชี", label: "รายการบัญชี" },
] as const;

// Columns whose filter options are scoped by the selected ประเภท (รายรับ/รายจ่าย)
const TYPE_SCOPED_COLS = ["หมวด", "รายการบัญชี"];
// รหัสบัญชี options are scoped by the selected หมวด (cascade: ประเภท → หมวด → รหัสบัญชี)

// Fiscal-year boundaries (ปีงบประมาณ 2569: ต.ค. 2568 – ก.ย. 2569), derived from quarter ranges
const FY_START = QUARTER_RANGES.Q1;
const FY_END = QUARTER_RANGES.Q4;
const MONTHS_PER_FY = 12;

/* ─── pivot table row (บันทึกรายการ shown as a month matrix) ── */

interface PivotRow {
  หมวด: string;
  รหัสบัญชี: string;
  รายการบัญชี: string;
  ประเภท: string;
  values: Map<string, number>; // monthYearKey -> sum of ยอดจริง
  total: number; // sum across all months
}

/* ─── component ────────────────────────────────────────────── */

export default function Dashboard() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filter state – each is multi-select
  const [filters, setFilters] = useState<Record<string, string[]>>({
    เดือน: [],
    รหัสบัญชี: [],
    หมวด: [],
    รายการบัญชี: [],
    ประเภท: [],
  });

  // Quarter filter (default: all quarters)
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  // Table search & pagination
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(0);
  const PAGE_SIZE = 20;

  /* ─── data fetching ─────────────────────────────── */

  const fetchData = useCallback(async () => {
    setSyncing(true);
    try {
      const d = await fetchAllData();
      setData(d);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setSyncing(false), 600);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── filtered data ─────────────────────────────── */

  const filteredData = useMemo(() => {
    if (!data) return [];
    let rows = data.trplan;
    if (selectedQuarter) {
      const q = QUARTER_RANGES[selectedQuarter];
      if (q) {
        rows = rows.filter((r) =>
          isInDateRange(
            r,
            q.startMonth,
            q.startYear,
            q.endMonth,
            q.endYear,
          ),
        );
      }
    }
    for (const col of FILTER_COLS) {
      const sel = filters[col.key];
      if (sel.length > 0) {
        rows = rows.filter((r) =>
          sel.includes(String(r[col.key] ?? "").trim()),
        );
      }
    }
    return rows;
  }, [data, filters, selectedQuarter]);

  // Unique options per filter column.
  // หมวด and รายการบัญชี options are scoped to the selected ประเภท (รายรับ/รายจ่าย),
  // and รหัสบัญชี options are scoped to the selected หมวด.
  const filterOptions = useMemo(() => {
    if (!data) return {} as Record<string, string[]>;
    const opts: Record<string, string[]> = {};
    const typeSel = filters["ประเภท"] ?? [];
    const catSel = filters["หมวด"] ?? [];
    for (const col of FILTER_COLS) {
      const seen = new Set<string>();
      for (const r of data.trplan) {
        if (TYPE_SCOPED_COLS.includes(col.key) && typeSel.length > 0) {
          const t = String(r.ประเภท ?? "").trim();
          if (!typeSel.includes(t)) continue;
        }
        if (col.key === "รหัสบัญชี" && catSel.length > 0) {
          const c = String(r.หมวด ?? "").trim();
          if (!catSel.includes(c)) continue;
        }
        const v = String((r as unknown as Record<string, unknown>)[col.key] ?? "").trim();
        if (v && !seen.has(v)) {
          seen.add(v);
          opts[col.key] = [...(opts[col.key] ?? []), v];
        }
      }
    }
    return opts;
  }, [data, filters]);

  // Drop selections that no longer match their parent scope:
  // หมวด / รายการบัญชี follow ประเภท, and รหัสบัญชี follows หมวด.
  useEffect(() => {
    if (!data) return;
    const typeSel = filters["ประเภท"] ?? [];
    const catSel = filters["หมวด"] ?? [];
    if (typeSel.length === 0 && catSel.length === 0) return;

    const validByCol: Record<string, Set<string>> = {};
    if (typeSel.length > 0) {
      const typeRows = data.trplan.filter((r) =>
        typeSel.includes(String(r.ประเภท ?? "").trim()),
      );
      validByCol["หมวด"] = new Set(typeRows.map((r) => String(r.หมวด ?? "").trim()));
      validByCol["รายการบัญชี"] = new Set(typeRows.map((r) => String(r.รายการบัญชี ?? "").trim()));
    }
    if (catSel.length > 0) {
      const catRows = data.trplan.filter((r) =>
        catSel.includes(String(r.หมวด ?? "").trim()),
      );
      validByCol["รหัสบัญชี"] = new Set(catRows.map((r) => String(r.รหัสบัญชี ?? "").trim()));
    }

    setFilters((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const col of [...TYPE_SCOPED_COLS, "รหัสบัญชี"]) {
        const valid = validByCol[col];
        if (!valid) continue;
        const cur = prev[col] ?? [];
        const pruned = cur.filter((v) => valid.has(v));
        if (pruned.length !== cur.length) {
          next[col] = pruned;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data, filters["ประเภท"], filters["หมวด"]]);

  /* ─── summary metrics ───────────────────────────── */

  const { planIncome, planExpense, actualIncome, actualExpense } = useMemo(() => {
    if (!data) return { planIncome: 0, planExpense: 0, actualIncome: 0, actualExpense: 0 };

    // Actuals from filtered data
    let aInc = 0;
    let aExp = 0;
    for (const r of filteredData) {
      if (r.ประเภท === "รายรับ") aInc += r.ยอดจริง;
      else aExp += r.ยอดจริง;
    }

    // Plan totals – sum every row in the group sheet (the sheet reuses the
    // same รหัสบัญชี across งบค่าเสื่อม/เงินบริจาค/เงินบำรุง rows, so deduping
    // by รหัสบัญชี would drop real plan amounts)
    let pInc = 0;
    let pExp = 0;
    for (const r of data.group) {
      pInc += r.แผนรายรับ;
      pExp += r.แผนรายจ่าย;
    }
    return { planIncome: pInc, planExpense: pExp, actualIncome: aInc, actualExpense: aExp };
  }, [data, filteredData]);

  /* ─── period label for breakdown cards ──────────── */

  const periodLabel = useMemo(() => {
    const months = filters.เดือน;
    if (months.length > 0) {
      const formatted = months
        .map((m) => {
          const { month, year } = parseMonthYear(m);
          if (!month || !year) return m;
          return `${getThaiMonthShort(month)} ${String(
            toBuddhistYear(year),
          ).slice(-2)}`;
        })
        .join(", ");
      return `ประจำเดือน ${formatted}`;
    }
    if (selectedQuarter) {
      const q = QUARTER_RANGES[selectedQuarter];
      if (q) {
        const fmt = (mo: number, yr: number) =>
          `${getThaiMonthShort(mo)} ${String(toBuddhistYear(yr)).slice(-2)}`;
        return `ไตรมาสที่ ${selectedQuarter.slice(1)} (${fmt(
          q.startMonth,
          q.startYear,
        )} - ${fmt(q.endMonth, q.endYear)})`;
      }
    }
    return "ทุกเดือน";
  }, [filters.เดือน, selectedQuarter]);

  /* ─── revenue breakdown (แผนรายรับ by หมวด) ───── */

  const revenueRows = useMemo<RevenueBreakdownRow[]>(() => {
    if (!data) return [];

    // Income categories: หมวด that appear with ประเภท = "รายรับ" in TRplan
    const incomeCats = new Set<string>();
    for (const r of data.trplan) {
      if (String(r.ประเภท ?? "").trim() === "รายรับ") {
        incomeCats.add(String(r.หมวด ?? "").trim());
      }
    }

    // Plan per หมวด from group sheet (annual budget, not filtered by time)
    const planMap = new Map<string, number>();
    for (const r of data.group) {
      const key = String(r.หมวด ?? "").trim();
      if (incomeCats.has(key) && r.แผนรายรับ !== 0) {
        planMap.set(key, (planMap.get(key) ?? 0) + r.แผนรายรับ);
      }
    }

    // Actual per หมวด from filtered rows (รายรับ only)
    const actualMap = new Map<string, number>();
    for (const r of filteredData) {
      if (String(r.ประเภท ?? "").trim() !== "รายรับ") continue;
      const key = String(r.หมวด ?? "").trim();
      if (!key) continue;
      actualMap.set(key, (actualMap.get(key) ?? 0) + r.ยอดจริง);
    }

    const keys = new Set([...planMap.keys(), ...actualMap.keys()]);
    return [...keys]
      .map((key) => ({
        หมวด: key,
        แผน: planMap.get(key) ?? 0,
        ผล: actualMap.get(key) ?? 0,
      }))
      .filter((r) => r.แผน !== 0 || r.ผล !== 0)
      .sort((a, b) => {
        const na = parseInt(a.หมวด.match(/^(\d+)/)?.[1] ?? "99", 10);
        const nb = parseInt(b.หมวด.match(/^(\d+)/)?.[1] ?? "99", 10);
        return na - nb;
      });
  }, [data, filteredData]);

  /* ─── expense breakdown (แผนรายจ่าย by หมวด) ───── */

  const expenseRows = useMemo<ExpenseBreakdownRow[]>(() => {
    if (!data) return [];

    // Expense categories: หมวด that appear with ประเภท = "รายจ่าย" in TRplan
    const expenseCats = new Set<string>();
    for (const r of data.trplan) {
      if (String(r.ประเภท ?? "").trim() === "รายจ่าย") {
        expenseCats.add(String(r.หมวด ?? "").trim());
      }
    }

    // Plan per หมวด from group sheet (annual budget, not filtered by time)
    const planMap = new Map<string, number>();
    for (const r of data.group) {
      const key = String(r.หมวด ?? "").trim();
      if (expenseCats.has(key) && r.แผนรายจ่าย !== 0) {
        planMap.set(key, (planMap.get(key) ?? 0) + r.แผนรายจ่าย);
      }
    }

    // Actual per หมวด from filtered rows (รายจ่าย only)
    const actualMap = new Map<string, number>();
    for (const r of filteredData) {
      if (String(r.ประเภท ?? "").trim() !== "รายจ่าย") continue;
      const key = String(r.หมวด ?? "").trim();
      if (!key) continue;
      actualMap.set(key, (actualMap.get(key) ?? 0) + r.ยอดจริง);
    }

    const keys = new Set([...planMap.keys(), ...actualMap.keys()]);
    return [...keys]
      .map((key) => ({
        หมวด: key,
        แผน: planMap.get(key) ?? 0,
        ผล: actualMap.get(key) ?? 0,
      }))
      .filter((r) => r.แผน !== 0 || r.ผล !== 0);
  }, [data, filteredData]);

  /* ─── chart data (aggregated) ───────────────────── */

  const barChartData = useMemo(() => {
    // Actuals per month from filtered rows
    const monthMap = new Map<string, { inc: number; exp: number }>();
    for (const r of filteredData) {
      const { month, year } = parseMonthYear(r.เดือน);
      if (!month) continue;
      const key = monthYearKey(year, month);
      const entry = monthMap.get(key) ?? { inc: 0, exp: 0 };
      if (r.ประเภท === "รายรับ") entry.inc += r.ยอดจริง;
      else entry.exp += r.ยอดจริง;
      monthMap.set(key, entry);
    }

    // Determine the full month range to display so every month shows,
    // including months without actual data
    const keys = new Set<string>();
    const addRange = (sm: number, sy: number, em: number, ey: number) => {
      let y = sy;
      let m = sm;
      while (y < ey || (y === ey && m <= em)) {
        keys.add(monthYearKey(y, m));
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    };
    if (selectedQuarter) {
      const q = QUARTER_RANGES[selectedQuarter];
      if (q) addRange(q.startMonth, q.startYear, q.endMonth, q.endYear);
    } else if (filters.เดือน.length > 0) {
      for (const m of filters.เดือน) {
        const p = parseMonthYear(m);
        if (p.month) keys.add(monthYearKey(p.year, p.month));
      }
    }
    if (keys.size === 0) {
      // No time filter (or unparseable): show the complete fiscal year
      addRange(FY_START.startMonth, FY_START.startYear, FY_END.endMonth, FY_END.endYear);
    }
    // Keep any data months outside the default range too
    for (const k of monthMap.keys()) keys.add(k);

    // Plan per month: annual budget spread evenly over the fiscal year (12 months)
    let totalPlanInc = 0;
    let totalPlanExp = 0;
    for (const r of data?.group ?? []) {
      totalPlanInc += r.แผนรายรับ;
      totalPlanExp += r.แผนรายจ่าย;
    }

    return [...keys]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const [y, m] = key.split("-").map(Number);
        const v = monthMap.get(key) ?? { inc: 0, exp: 0 };
        return {
          name: `${getThaiMonthShort(m)} ${String(toBuddhistYear(y)).slice(-2)}`,
          แผนรายรับ: Math.round(totalPlanInc / MONTHS_PER_FY),
          แผนรายจ่าย: Math.round(totalPlanExp / MONTHS_PER_FY),
          ผลรายรับจริง: v.inc,
          ผลรายจ่ายจริง: v.exp,
        };
      });
  }, [filteredData, data, selectedQuarter, filters.เดือน]);

  /* ─── pivot table (rows: หมวด×รหัสบัญชี, columns: เดือน) ── */

  const pivotMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: { key: string; label: string }[] = [];
    for (const r of filteredData) {
      const { month, year } = parseMonthYear(r.เดือน);
      if (!month) continue;
      const key = monthYearKey(year, month);
      if (!seen.has(key)) {
        seen.add(key);
        months.push({
          key,
          label: `${getThaiMonthShort(month)} ${String(toBuddhistYear(year)).slice(-2)}`,
        });
      }
    }
    return months.sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredData]);

  const pivotRows = useMemo<PivotRow[]>(() => {
    const rowMap = new Map<string, PivotRow>();
    for (const r of filteredData) {
      const cat = String(r.หมวด ?? "").trim();
      const code = String(r.รหัสบัญชี ?? "").trim();
      const item = String(r.รายการบัญชี ?? "").trim();
      if (!code && !item) continue;
      // One row per รหัสบัญชี + รายการบัญชี so all months land in the same row
      const key = `${code}||${item}`;
      let row = rowMap.get(key);
      if (!row) {
        row = {
          หมวด: cat,
          รหัสบัญชี: code,
          รายการบัญชี: item,
          ประเภท: String(r.ประเภท ?? "").trim(),
          values: new Map(),
          total: 0,
        };
        rowMap.set(key, row);
      }
      const { month, year } = parseMonthYear(r.เดือน);
      if (!month) continue;
      const mk = monthYearKey(year, month);
      row.values.set(mk, (row.values.get(mk) ?? 0) + r.ยอดจริง);
    }
    const rows = [...rowMap.values()];
    // Row total across every displayed month
    for (const row of rows) {
      let total = 0;
      for (const v of row.values.values()) total += v;
      row.total = total;
    }
    // Group order: numeric prefix of หมวด (1., 2., …), then first-appearance order
    const catOrder = new Map<string, number>();
    for (const row of rows) {
      if (!catOrder.has(row.หมวด)) catOrder.set(row.หมวด, catOrder.size);
    }
    return rows.sort((a, b) => {
      const na = parseInt(a.หมวด.match(/^(\d+)/)?.[1] ?? "999", 10);
      const nb = parseInt(b.หมวด.match(/^(\d+)/)?.[1] ?? "999", 10);
      if (na !== nb) return na - nb;
      return (catOrder.get(a.หมวด) ?? 0) - (catOrder.get(b.หมวด) ?? 0);
    });
  }, [filteredData]);

  const pivotView = useMemo(() => {
    if (!tableSearch.trim()) return pivotRows;
    const q = tableSearch.toLowerCase();
    return pivotRows.filter((r) =>
      [r.หมวด, r.รหัสบัญชี, r.รายการบัญชี].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [pivotRows, tableSearch]);

  const tableTotalPages = Math.max(1, Math.ceil(pivotView.length / PAGE_SIZE));
  const safePage = Math.min(tablePage, tableTotalPages - 1);
  const pagedPivotRows = useMemo(
    () =>
      pivotView.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [pivotView, safePage],
  );

  // Group the current page's rows by หมวด for a merged category cell
  const pageGroups = useMemo(() => {
    const groups: { cat: string; rows: PivotRow[] }[] = [];
    for (const r of pagedPivotRows) {
      const last = groups[groups.length - 1];
      if (last && last.cat === r.หมวด) last.rows.push(r);
      else groups.push({ cat: r.หมวด, rows: [r] });
    }
    return groups;
  }, [pagedPivotRows]);

  // Reset to first page when data or search changes
  useEffect(() => {
    setTablePage(0);
  }, [tableSearch, filteredData]);

  /* ─── exports ───────────────────────────────────── */

  const exportCSV = useCallback(() => {
    if (!filteredData.length) return;
    const headers = [
      "เดือน",
      "รหัสบัญชี",
      "หมวด",
      "รายการบัญชี",
      "ยอดจริง",
      "ประเภท",
    ];
    const rows = filteredData.map((r) => [
      r.เดือน,
      r.รหัสบัญชี,
      r.หมวด,
      r.รายการบัญชี,
      String(r.ยอดจริง),
      r.ประเภท,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget_data_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredData]);

  const exportPDF = useCallback(() => {
    if (!filteredData.length) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Logo
    try {
      doc.addImage(LOGO_URL, "PNG", 12, 10, 18, 18);
    } catch {
      // ignore if logo fails to load
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("แผนรายรับ รายจ่าย เงินบำรุงโรงพยาบาลนางรอง ปีงบประมาณ 2569", 34, 17);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")} | จำนวนรายการ: ${filteredData.length}`,
      34,
      24,
    );

    const head = [
      ["เดือน", "รหัสบัญชี", "หมวด", "รายการบัญชี", "ยอดจริง", "ประเภท"],
    ];
    const body = filteredData.map((r) => [
      r.เดือน,
      r.รหัสบัญชี,
      r.หมวด,
      r.รายการบัญชี,
      r.ยอดจริง.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
      r.ประเภท,
    ]);

    autoTable(doc, {
      startY: 30,
      head,
      body,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
        font: "helvetica",
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [240, 245, 255] },
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 30 },
        2: { cellWidth: 44 },
        3: { cellWidth: 85, halign: "left" },
        4: { cellWidth: 44, halign: "right" },
        5: { cellWidth: 24 },
      },
      margin: { left: 12, right: 12 },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(
          `หน้า ${doc.getCurrentPageInfo().pageNumber}`,
          doc.internal.pageSize.getWidth() - 20,
          doc.internal.pageSize.getHeight() - 8,
        );
      },
    });

    doc.save(`budget_data_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [filteredData]);

  /* ─── render ────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* ── Hero header ────────────────── */}
        <header className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-white/75 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          {/* Soft color washes */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 size-72 rounded-full bg-emerald-300/25 blur-3xl" />
            <div className="absolute -right-24 -top-20 size-72 rounded-full bg-amber-300/25 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
                แผนรายรับ–รายจ่าย เงินบำรุงโรงพยาบาลนางรอง ปีงบประมาณ 2569
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* LIVE indicator */}
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-600">LIVE</span>
              </div>
              {/* Sync button */}
              <button
                type="button"
                onClick={fetchData}
                disabled={syncing}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-black/10 bg-black/5 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-all",
                  "hover:bg-black/10 hover:shadow-md",
                  "disabled:opacity-50",
                )}
              >
                <RefreshCw
                  className={cn("size-4", syncing && "animate-spin")}
                />
                ซิงก์ใหม่
              </button>
            </div>
          </div>
        </header>

        {/* ── Summary Cards ──────────────── */}
        <SummaryCards
          planIncome={planIncome}
          planExpense={planExpense}
          actualIncome={actualIncome}
          actualExpense={actualExpense}
        />

        {/* ── Comparison charts row (สะสม + รายเดือน) ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <PlanActualComparison
              planIncome={planIncome}
              planExpense={planExpense}
              actualIncome={actualIncome}
              actualExpense={actualExpense}
            />
          </div>
          <div className="xl:col-span-3">
            <BarChartVertical
              data={barChartData}
              title="แผน/ผล รายรับจริง – แผน/ผล รายจ่ายจริง จำแนกตามเดือน"
            />
          </div>
        </div>

        {/* ── Revenue + Expense breakdowns side by side ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RevenueBreakdown rows={revenueRows} label={periodLabel} />
          <ExpenseBreakdown rows={expenseRows} label={periodLabel} />
        </div>

        {/* ── Filters ────────────────────── */}
        <div className="glass-card relative z-10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="section-num section-num--slate">4</span>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              กรองข้อมูล
            </h2>
          </div>
          {/* Order: ประเภท → รายไตรมาส → รายเดือน → หมวด → รหัสบัญชี → รายการบัญชี */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FILTER_COLS.slice(0, 1).map((col) => (
              <MultiSelectFilter
                key={col.key}
                label={col.label}
                options={filterOptions[col.key] ?? []}
                selected={filters[col.key] ?? []}
                onChange={(sel) =>
                  setFilters((prev) => ({ ...prev, [col.key]: sel }))
                }
              />
            ))}
            <QuarterFilter
              selected={selectedQuarter}
              onChange={setSelectedQuarter}
            />
            {FILTER_COLS.slice(1).map((col) => (
              <MultiSelectFilter
                key={col.key}
                label={col.label}
                options={filterOptions[col.key] ?? []}
                selected={filters[col.key] ?? []}
                onChange={(sel) =>
                  setFilters((prev) => ({ ...prev, [col.key]: sel }))
                }
              />
            ))}
          </div>
        </div>

        {/* ── Data Table ─────────────────── */}
        <div className="glass-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="section-num section-num--slate">5</span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                บันทึกรายการ ({pivotView.length} รายการ)
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Table search */}
              <div className="glass-input flex items-center gap-2 px-3 py-1.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="พิมพ์เพื่อค้นหา..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {/* Export buttons */}
              <button
                type="button"
                onClick={exportPDF}
                disabled={!filteredData.length}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-500/25 disabled:opacity-40"
              >
                <FileDown className="size-3.5" />
                PDF
              </button>
              <button
                type="button"
                onClick={exportCSV}
                disabled={!filteredData.length}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
              >
                <FileDown className="size-3.5" />
                CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-black/10">
            <table
              className="w-full table-fixed text-left text-sm"
              style={{ minWidth: 780 + pivotMonths.length * 92 }}
            >
              <colgroup>
                <col style={{ width: 240 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 300 }} />
                <col style={{ width: 120 }} />
                {pivotMonths.map((m) => (
                  <col key={m.key} style={{ width: 92 }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-black/10 bg-black/5 backdrop-blur-sm">
                  <th
                    rowSpan={2}
                    className="px-3 py-2.5 align-bottom text-xs font-semibold text-muted-foreground"
                  >
                    หมวด
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-2.5 align-bottom text-xs font-semibold text-muted-foreground"
                  >
                    รหัสบัญชี
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-black/10 px-3 py-2.5 align-bottom text-xs font-semibold text-muted-foreground"
                  >
                    รายการบัญชี
                  </th>
                  {pivotMonths.length > 0 && (
                    <th
                      rowSpan={2}
                      className="border-l border-black/10 bg-emerald-500/5 px-2 py-2.5 text-right align-bottom text-xs font-semibold text-emerald-700"
                    >
                      รวม
                    </th>
                  )}
                  {pivotMonths.length > 0 && (
                    <th
                      colSpan={pivotMonths.length}
                      className="border-b border-l border-black/10 px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground"
                    >
                      เดือน
                    </th>
                  )}
                </tr>
                {pivotMonths.length > 0 && (
                  <tr className="border-b border-black/10 bg-black/5 backdrop-blur-sm">
                    {pivotMonths.map((m) => (
                      <th
                        key={m.key}
                        className="border-l border-black/5 px-2 py-2 text-center text-xs font-medium whitespace-nowrap text-muted-foreground"
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {pagedPivotRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + pivotMonths.length}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      ไม่พบข้อมูลที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                )}
                {pageGroups.map((g, gi) =>
                  g.rows.map((r, ri) => (
                    <tr
                      key={`${safePage}-${gi}-${ri}`}
                      className="border-b border-black/5 transition-colors hover:bg-black/5"
                    >
                      {ri === 0 && (
                        <td
                          rowSpan={g.rows.length}
                          className="break-words px-3 py-2 text-xs align-top text-foreground"
                        >
                          {g.cat}
                        </td>
                      )}
                      <td className="overflow-hidden whitespace-nowrap px-3 py-2 text-xs text-foreground">
                        {r.รหัสบัญชี}
                      </td>
                      <td className="break-words border-r border-black/10 px-3 py-2 text-xs text-foreground">
                        {r.รายการบัญชี}
                      </td>
                      {pivotMonths.length > 0 && (
                        <td
                          className={cn(
                            "border-l border-black/10 bg-emerald-500/5 px-2 py-2 text-right text-xs whitespace-nowrap",
                            r.total === 0
                              ? "text-muted-foreground/60"
                              : r.ประเภท === "รายรับ"
                                ? "font-semibold text-emerald-700"
                                : "font-semibold text-orange-700",
                          )}
                        >
                          {r.total !== 0 ? formatCurrencyFull(r.total) : ""}
                        </td>
                      )}
                      {pivotMonths.map((m) => {
                        const v = r.values.get(m.key) ?? 0;
                        return (
                          <td
                            key={m.key}
                            className={cn(
                              "border-l border-black/5 px-2 py-2 text-right text-xs whitespace-nowrap",
                              v === 0
                                ? ""
                                : r.ประเภท === "รายรับ"
                                  ? "font-medium text-emerald-700"
                                  : "font-medium text-orange-700",
                            )}
                          >
                            {v !== 0 ? formatCurrencyFull(v) : ""}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pivotView.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                แสดง {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, pivotView.length)} จาก {pivotView.length} รายการ
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="glass-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-black/10 disabled:opacity-30"
                >
                  ก่อนหน้า
                </button>
                {Array.from({ length: tableTotalPages }, (_, i) => i)
                  .filter((i) => {
                    if (tableTotalPages <= 7) return true;
                    if (i === 0 || i === tableTotalPages - 1) return true;
                    if (Math.abs(i - safePage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | "ellipsis")[]>((acc, i, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === "number" && i - (arr[idx - 1] as number) > 1) {
                      acc.push("ellipsis");
                    }
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "ellipsis" ? (
                      <span key={`e${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTablePage(item)}
                        className={cn(
                          "min-w-[28px] rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                          item === safePage
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-black/5",
                        )}
                      >
                        {item + 1}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.min(tableTotalPages - 1, p + 1))}
                  disabled={safePage >= tableTotalPages - 1}
                  className="glass-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-black/10 disabled:opacity-30"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────── */}
        <footer className="pb-4">
          <div className="mb-3 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <MophEmblem className="size-5 shrink-0" />
            <span>
              อัปเดตครั้งสุดท้าย {data?.lastUpdated?.toLocaleString("th-TH") ?? "—"} · แผนรายรับ–รายจ่าย เงินบำรุงโรงพยาบาลนางรอง ปีงบประมาณ 2569
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
