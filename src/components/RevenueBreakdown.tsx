import { Fragment } from "react";
import { Banknote, CalendarDays } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";

export interface RevenueBreakdownRow {
  หมวด: string;
  แผน: number;
  ผล: number;
}

interface RevenueBreakdownProps {
  rows: RevenueBreakdownRow[];
  label?: string;
}

const SECTION_OPERATIONS = "รายรับจากการดำเนินงาน";
const SECTION_OTHER = "รายรับอื่น ๆ";

/** Income หมวด are numbered in the sheet: 1–10 are operations, 11+ are other income. */
function sectionOf(หมวด: string): string {
  const n = parseInt(หมวด.trim().match(/^(\d+)/)?.[1] ?? "", 10);
  if (!isNaN(n) && n >= 1 && n <= 10) return SECTION_OPERATIONS;
  return SECTION_OTHER;
}

export function RevenueBreakdown({ rows, label }: RevenueBreakdownProps) {
  const sections = [
    { name: `1. ${SECTION_OPERATIONS}`, rows: rows.filter((r) => sectionOf(r.หมวด) === SECTION_OPERATIONS) },
    { name: `2. ${SECTION_OTHER}`, rows: rows.filter((r) => sectionOf(r.หมวด) === SECTION_OTHER) },
  ].filter((s) => s.rows.length > 0);

  const totalPlan = rows.reduce((sum, r) => sum + r.แผน, 0);
  const totalActual = rows.reduce((sum, r) => sum + r.ผล, 0);
  const totalDiff = Math.abs(totalPlan - totalActual);

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
          <Banknote className="size-4 text-emerald-600" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">แผนรายรับ</h2>
          <p className="text-[11px] text-muted-foreground">
            เปรียบเทียบแผนกับผลจริง จำแนกตามหมวดรายรับ
          </p>
        </div>
        {label && (
          <span className="ml-auto inline-flex max-w-[50%] items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/5">
              <th
                rowSpan={2}
                className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
              >
                รายการ
              </th>
              <th
                colSpan={3}
                className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground"
              >
                จำนวนเงิน (บาท)
              </th>
            </tr>
            <tr className="border-b border-black/10 bg-black/5">
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                แผนปีงบประมาณ พ.ศ.2569
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                ผลปีงบประมาณ พ.ศ.2569
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                ส่วนต่าง
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.name}>
                {/* Sub-heading */}
                <tr className="border-b border-black/10 bg-emerald-500/5">
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-xs font-bold text-emerald-800"
                  >
                    {section.name}
                  </td>
                </tr>
                {/* Rows */}
                {section.rows.map((r) => {
                  const diff = Math.abs(r.แผน - r.ผล);
                  return (
                    <tr
                      key={r.หมวด}
                      className="border-b border-black/5 transition-colors hover:bg-black/5"
                    >
                      <td className="break-words px-3 py-2 text-xs">{r.หมวด}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums">
                        {formatCurrencyFull(r.แผน)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums">
                        {formatCurrencyFull(r.ผล)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                        {formatCurrencyFull(diff)}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {/* Total */}
            <tr className="border-t-2 border-emerald-600/30 bg-emerald-500/10">
              <td className="px-3 py-2.5 text-xs font-bold text-emerald-900">
                รวมรายรับ
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold tabular-nums text-emerald-900">
                {formatCurrencyFull(totalPlan)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold tabular-nums text-emerald-900">
                {formatCurrencyFull(totalActual)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold tabular-nums text-emerald-900">
                {formatCurrencyFull(totalDiff)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}