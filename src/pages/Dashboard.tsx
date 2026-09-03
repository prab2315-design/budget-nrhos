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
  truncateText,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { DatePickerRange } from "@/components/DatePickerRange";
import { SummaryCards } from "@/components/SummaryCards";
import { LineChartComparison } from "@/components/LineChartComparison";
import { BarChartVertical } from "@/components/BarChartVertical";

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
  { key: "ลำดับ", label: "ลำดับ" },
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
    ลำดับ: [],
    เดือน: [],
    รหัสบัญชี: [],
    หมวด: [],
    รายการบัญชี: [],
    ประเภท: [],
  });

  // Date range (default: all data)
  const [dateRange, setDateRange] = useState({
    startMonth: 1,
    startYear: 2024,
    endMonth: 12,
    endYear: 2025,
  });

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

      // Auto-set date range from data
      if (d.trplan.length > 0) {
        const parsed = d.trplan
          .map((r) => parseMonthYear(r.เดือน))
          .filter((p) => p.month > 0);
        if (parsed.length > 0) {
          const years = parsed.map((p) => p.year);
          const months = parsed.map((p) => p.month);
          setDateRange({
            startMonth: Math.min(...months),
            startYear: Math.min(...years),
            endMonth: Math.max(...months),
            endYear: Math.max(...years),
          });
        }
      }
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
    let rows = data.trplan.filter((r) =>
      isInDateRange(
        r,
        dateRange.startMonth,
        dateRange.startYear,
        dateRange.endMonth,
        dateRange.endYear,
      ),
    );
    for (const col of FILTER_COLS) {
      const sel = filters[col.key];
      if (sel.length > 0) {
        rows = rows.filter((r) => sel.includes(String(r[col.key] as unknown)));
      }
    }
    return rows;
  }, [data, filters, dateRange]);

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

    // Plan totals – deduplicate by รหัสบัญชี
    const summaryDeduped = new Map<string, { แผนรายรับ: number; แผนรายจ่าย: number }>();
    for (const r of data.group) {
      if (!summaryDeduped.has(r.รหัสบัญชี)) summaryDeduped.set(r.รหัสบัญชี, r);
    }
    let pInc = 0;
    let pExp = 0;
    for (const r of summaryDeduped.values()) {
      pInc += r.แผนรายรับ;
      pExp += r.แผนรายจ่าย;
    }
    return { planIncome: pInc, planExpense: pExp, actualIncome: aInc, actualExpense: aExp };
  }, [data, filteredData]);

  /* ─── chart data (aggregated) ───────────────────── */

  const lineChartData = useMemo(() => {
    const monthMap = new Map<
      string,
      { inc: number; exp: number }
    >();
    for (const r of filteredData) {
      const { month, year } = parseMonthYear(r.เดือน);
      if (!month) continue;
      const key = monthYearKey(year, month);
      const entry = monthMap.get(key) ?? { inc: 0, exp: 0 };
      if (r.ประเภท === "รายรับ") entry.inc += r.ยอดจริง;
      else entry.exp += r.ยอดจริง;
      monthMap.set(key, entry);
    }

    // Plan totals
    const planDeduped = new Map<string, { แผนรายรับ: number; แผนรายจ่าย: number }>();
    for (const r of data?.group ?? []) {
      if (!planDeduped.has(r.รหัสบัญชี)) planDeduped.set(r.รหัสบัญชี, r);
    }
    let totalPlanInc = 0;
    let totalPlanExp = 0;
    for (const r of planDeduped.values()) {
      totalPlanInc += r.แผนรายรับ;
      totalPlanExp += r.แผนรายจ่าย;
    }
    const nMonths = monthMap.size || 1;

    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split("-").map(Number);
        return {
          month: `${getThaiMonthShort(m)} ${toBuddhistYear(y)}`,
          แผนรายรับ: Math.round(totalPlanInc / nMonths),
          แผนรายจ่าย: Math.round(totalPlanExp / nMonths),
          รายรับจริง: v.inc,
          รายจ่ายจริง: v.exp,
        };
      });
  }, [filteredData, data]);

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
    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split("-").map(Number);
        return {
          name: `${getThaiMonthShort(m)} ${toBuddhistYear(y)}`,
          รายรับ: v.inc,
          รายจ่าย: v.exp,
        };
      });
  }, [filteredData]);

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
      "ลำดับ",
      "เดือน",
      "รหัสบัญชี",
      "หมวด",
      "รายการบัญชี",
      "ยอดจริง",
      "ประเภท",
    ];
    const rows = filteredData.map((r) => [
      r.ลำดับ,
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
    doc.text("แผนรายรับ รายจ่าย เงินบำรุงโรงพยาบาลนางรอง", 34, 17);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")} | จำนวนรายการ: ${filteredData.length}`,
      34,
      24,
    );

    const head = [
      ["ลำดับ", "เดือน", "รหัสบัญชี", "หมวด", "รายการบัญชี", "ยอดจริง", "ประเภท"],
    ];
    const body = filteredData.map((r) => [
      r.ลำดับ,
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
        0: { cellWidth: 12 },
        1: { cellWidth: 38 },
        2: { cellWidth: 28 },
        3: { cellWidth: 38 },
        4: { cellWidth: 80, halign: "left" },
        5: { cellWidth: 38, halign: "right" },
        6: { cellWidth: 22 },
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
                แผนรายรับ–รายจ่าย เงินบำรุงโรงพยาบาลนางรอง
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
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium text-emerald-400">LIVE</span>
            </div>
            {/* Sync button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={syncing}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-all",
                "hover:bg-white/15 hover:shadow-md",
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

        {/* ── Charts ─────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <LineChartComparison
            data={lineChartData}
            title="เปรียบเทียบแผนกับยอดจริง จำแนกตามเดือน"
          />
          <BarChartVertical
            data={barChartData}
            title="รายรับ–รายจ่ายจริง จำแนกตามเดือน"
          />
        </div>

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
            <DatePickerRange
              startMonth={dateRange.startMonth}
              startYear={dateRange.startYear}
              endMonth={dateRange.endMonth}
              endYear={dateRange.endYear}
              onChange={setDateRange}
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
                className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/25 disabled:opacity-40"
              >
                <FileDown className="size-3.5" />
                PDF
              </button>
              <button
                type="button"
                onClick={exportCSV}
                disabled={!filteredData.length}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
              >
                <FileDown className="size-3.5" />
                CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
                  {([
                    { key: "ลำดับ", label: "ลำดับ" },
                    { key: "เดือน", label: "เดือน" },
                    { key: "รหัสบัญชี", label: "รหัสบัญชี" },
                    { key: "หมวด", label: "หมวด" },
                    { key: "รายการบัญชี", label: "รายการบัญชี" },
                    { key: "ยอดจริง", label: "ยอดจริง" },
                    { key: "ประเภท", label: "ประเภท" },
                  ]).map(({ key, label }) => {
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
                          "group whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold select-none transition-colors",
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
                      colSpan={7}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      ไม่พบข้อมูลที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                )}
                {pagedData.map((r, i) => (
                  <tr
                    key={`${safePage}-${i}`}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {r.ลำดับ}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {r.เดือน}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {r.รหัสบัญชี}
                    </td>
                    <td
                      className="max-w-[160px] truncate px-3 py-2 text-xs"
                      title={r.หมวด}
                    >
                      {truncateText(r.หมวด, 20)}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-3 py-2 text-xs"
                      title={r.รายการบัญชี}
                    >
                      {truncateText(r.รายการบัญชี, 28)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-medium">
                      {formatCurrencyFull(r.ยอดจริง)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          r.ประเภท === "รายรับ"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700",
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
                  className="glass-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/10 disabled:opacity-30"
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
                            : "text-muted-foreground hover:bg-white/5",
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
                  className="glass-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/10 disabled:opacity-30"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────── */}
        <div className="pb-4 text-center text-xs text-muted-foreground/60">
          อัปเดตครั้งสุดท้าย {data?.lastUpdated?.toLocaleString("th-TH") ?? "—"} · แผนรายรับ–รายจ่าย เงินบำรุงโรงพยาบาลนางรอง
        </div>
      </div>
    </main>
  );
}
