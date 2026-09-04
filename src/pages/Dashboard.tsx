import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  FileDown,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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
  { key: "เดือน", label: "เดือน" },
  { key: "รหัสบัญชี", label: "รหัสบัญชี" },
  { key: "หมวด", label: "หมวด" },
  { key: "รายการบัญชี", label: "รายการบัญชี" },
  { key: "ประเภท", label: "ประเภท" },
] as const;

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

  // Table search, sorting & pagination
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
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

  // Unique options per filter column
  const filterOptions = useMemo(() => {
    if (!data) return {} as Record<string, string[]>;
    const opts: Record<string, string[]> = {};
    for (const col of FILTER_COLS) {
      const seen = new Set<string>();
      for (const r of data.trplan) {
        const v = String((r as unknown as Record<string, unknown>)[col.key] ?? "").trim();
        if (v && !seen.has(v)) {
          seen.add(v);
          opts[col.key] = [...(opts[col.key] ?? []), v];
        }
      }
    }
    return opts;
  }, [data]);

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

    // Plan per month: annual budget spread evenly over the months in view
    let totalPlanInc = 0;
    let totalPlanExp = 0;
    for (const r of data?.group ?? []) {
      totalPlanInc += r.แผนรายรับ;
      totalPlanExp += r.แผนรายจ่าย;
    }
    const nMonths = monthMap.size || 1;

    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split("-").map(Number);
        return {
          name: `${getThaiMonthShort(m)} ${String(toBuddhistYear(y)).slice(-2)}`,
          แผนรายรับ: Math.round(totalPlanInc / nMonths),
          แผนรายจ่าย: Math.round(totalPlanExp / nMonths),
          ผลรายรับจริง: v.inc,
          ผลรายจ่ายจริง: v.exp,
        };
      });
  }, [filteredData, data]);

  /* ─── table data ────────────────────────────────── */

  const tableData = useMemo(() => {
    let rows = filteredData.filter((r) => r.ยอดจริง !== 0);
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
      );
    }

    if (sortConfig) {
      const { key, dir } = sortConfig;
      const mult = dir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[key] ?? "";
        const bv = (b as unknown as Record<string, unknown>)[key] ?? "";
        if (key === "ยอดจริง") {
          return ((av as number) - (bv as number)) * mult;
        }
        return String(av).localeCompare(String(bv), "th") * mult;
      });
    }
    return rows;
  }, [filteredData, tableSearch, sortConfig]);

  const tableTotalPages = Math.max(1, Math.ceil(tableData.length / PAGE_SIZE));
  const safePage = Math.min(tablePage, tableTotalPages - 1);
  const pagedData = useMemo(
    () => tableData.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [tableData, safePage],
  );

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
        {/* ── Header ─────────────────────── */}
        <div className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={LOGO_URL}
              alt="Logo"
              className="size-12 rounded-lg object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                แผนรายรับ–รายจ่าย เงินบำรุงโรงพยาบาลนางรอง ปีงบประมาณ 2569
              </h1>
              <p className="text-xs text-muted-foreground">
                แดชบอร์ดวิเคราะห์งบประมาณ ณ ปัจจุบัน
              </p>
            </div>
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

        {/* ── Summary Cards ──────────────── */}
        <SummaryCards
          planIncome={planIncome}
          planExpense={planExpense}
          actualIncome={actualIncome}
          actualExpense={actualExpense}
        />

        {/* ── Comparison charts row (สะสม + รายเดือน) ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <PlanActualComparison
            planIncome={planIncome}
            planExpense={planExpense}
            actualIncome={actualIncome}
            actualExpense={actualExpense}
          />
          <BarChartVertical
            data={barChartData}
            title="แผน/ผล รายรับจริง – แผน/ผล รายจ่ายจริง จำแนกตามเดือน"
          />
        </div>

        {/* ── Revenue breakdown (แผนรายรับ) ── */}
        <RevenueBreakdown rows={revenueRows} label={periodLabel} />

        {/* ── Expense breakdown (แผนรายจ่าย) ── */}
        <ExpenseBreakdown rows={expenseRows} label={periodLabel} />

        {/* ── Filters ────────────────────── */}
        <div className="glass-card relative z-10 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">กรองข้อมูล</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {FILTER_COLS.map((col) => (
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
          </div>
        </div>

        {/* ── Data Table ─────────────────── */}
        <div className="glass-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              บันทึกรายการ ({tableData.length} รายการ)
            </h2>
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
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-black/5 backdrop-blur-sm">
                  {([
                    { key: "เดือน", label: "เดือน", width: "w-[15%]" },
                    { key: "รหัสบัญชี", label: "รหัสบัญชี", width: "w-[11%]" },
                    { key: "หมวด", label: "หมวด", width: "w-[22%]" },
                    { key: "รายการบัญชี", label: "รายการบัญชี", width: "w-[28%]" },
                    { key: "ยอดจริง", label: "ยอดจริง", width: "w-[14%]" },
                    { key: "ประเภท", label: "ประเภท", width: "w-[10%]" },
                  ]).map(({ key, label, width }) => {
                    const isActive = sortConfig?.key === key;
                    const dir = isActive ? sortConfig!.dir : null;
                    return (
                      <th
                        key={key}
                        onClick={() =>
                          setSortConfig((prev) => {
                            if (prev?.key === key) {
                              return prev.dir === "asc"
                                ? { key, dir: "desc" }
                                : null;
                            }
                            return { key, dir: "asc" };
                          })
                        }
                        className={cn(
                          "group overflow-hidden whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold select-none transition-colors",
                          width,
                          isActive ? "text-primary" : "text-muted-foreground cursor-pointer hover:text-foreground",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          <span className="inline-flex size-3.5 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                            {!isActive && <ArrowUpDown className="size-3" />}
                          </span>
                          {isActive && (
                            dir === "asc"
                              ? <ArrowUp className="size-3" />
                              : <ArrowDown className="size-3" />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pagedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      ไม่พบข้อมูลที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                )}
                {pagedData.map((r, i) => (
                  <tr
                    key={`${safePage}-${i}`}
                    className="border-b border-black/5 transition-colors hover:bg-black/5"
                  >
                    <td className="overflow-hidden whitespace-nowrap px-3 py-2 text-xs">
                      {r.เดือน}
                    </td>
                    <td className="overflow-hidden whitespace-nowrap px-3 py-2 text-xs">
                      {r.รหัสบัญชี}
                    </td>
                    <td className="break-words px-3 py-2 text-xs">
                      {r.หมวด}
                    </td>
                    <td className="break-words px-3 py-2 text-xs">
                      {r.รายการบัญชี}
                    </td>
                    <td className="overflow-hidden whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                      {formatCurrencyFull(r.ยอดจริง)}
                    </td>
                    <td className="overflow-hidden whitespace-nowrap px-3 py-2 text-xs">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          r.ประเภท === "รายรับ"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-orange-100 text-orange-700",
                        )}
                      >
                        {r.ประเภท}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {tableData.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                แสดง {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, tableData.length)} จาก {tableData.length} รายการ
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
        <div className="pb-4 text-center text-xs text-muted-foreground/60">
          อัปเดตครั้งสุดท้าย {data?.lastUpdated?.toLocaleString("th-TH") ?? "—"} · แผนรายรับ–รายจ่าย เงินบำรุงโรงพยาบาลนางรอง ปีงบประมาณ 2569
        </div>
      </div>
    </main>
  );
}
