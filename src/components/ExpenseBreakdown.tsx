import { Fragment } from "react";
import { Receipt, CalendarDays } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";

export interface ExpenseBreakdownRow {
  หมวด: string;
  แผน: number;
  ผล: number;
}

interface ExpenseBreakdownProps {
  rows: ExpenseBreakdownRow[];
  label?: string;
}

interface ExpenseSubgroup {
  name: string;
  rows: ExpenseBreakdownRow[];
}

interface ExpenseSection {
  name: string;
  rows: ExpenseBreakdownRow[];
  subgroups?: ExpenseSubgroup[];
}

const SECTION_PERSONNEL = "รายจ่ายบุคลากร";
const SECTION_OPERATING = "รายจ่ายจากการดำเนินงาน";
const SECTION_CAPITAL = "รายจ่ายลงทุน";
const SECTION_OTHER = "รายจ่ายอื่น";

/** Expense หมวด are numbered in the sheet: 16–26 personnel, 27–36 operating,
 *  37–42 capital (37–39 equipment, 40–42 land & construction), 43+ other. */
function sectionNumber(หมวด: string): number {
  return parseInt(หมวด.trim().match(/^(\d+)/)?.[1] ?? "", 10);
}

function buildSections(rows: ExpenseBreakdownRow[]): ExpenseSection[] {
  const byNum = (a: ExpenseBreakdownRow, b: ExpenseBreakdownRow) =>
    sectionNumber(a.หมวด) - sectionNumber(b.หมวด);
  const inRange = (r: ExpenseBreakdownRow, min: number, max: number) => {
    const n = sectionNumber(r.หมวด);
    return !isNaN(n) && n >= min && n <= max;
  };

  const personnel = rows.filter((r) => inRange(r, 16, 26)).sort(byNum);
  const operating = rows.filter((r) => inRange(r, 27, 36)).sort(byNum);
  const equipment = rows.filter((r) => inRange(r, 37, 39)).sort(byNum);
  const construction = rows.filter((r) => inRange(r, 40, 42)).sort(byNum);

  const used = new Set([
    ...personnel,
    ...operating,
    ...equipment,
    ...construction,
  ]);
  const other = rows.filter((r) => !used.has(r)).sort(byNum);

  return [
    { name: `1. ${SECTION_PERSONNEL}`, rows: personnel },
    { name: `2. ${SECTION_OPERATING}`, rows: operating },
    {
      name: `3. ${SECTION_CAPITAL}`,
      rows: [],
      subgroups: [
        { name: "ค่าครุภัณฑ์", rows: equipment },
        { name: "ค่าที่ดินสิ่งก่อสร้าง", rows: construction },
      ],
    },
    { name: `4. ${SECTION_OTHER}`, rows: other },
  ].filter(
    (s) =>
      s.rows.length > 0 || (s.subgroups?.some((g) => g.rows.length > 0) ?? false)
  );
}

function Row({ r, indent = false }: { r: ExpenseBreakdownRow; indent?: boolean }) {
  const diff = Math.abs(r.แผน - r.ผล);
  return (
    <tr className="border-b border-black/5 transition-colors hover:bg-black/5">
      <td className={`break-words px-3 py-2 text-xs ${indent ? "pl-10" : ""}`}>
        {r.หมวด}
      </td>
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
}

export function ExpenseBreakdown({ rows, label }: ExpenseBreakdownProps) {
  const sections = buildSections(rows);

  const totalPlan = rows.reduce((sum, r) => sum + r.แผน, 0);
  const totalActual = rows.reduce((sum, r) => sum + r.ผล, 0);
  const totalDiff = Math.abs(totalPlan - totalActual);

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="section-num section-num--orange">2ข</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
          <Receipt className="size-4 text-orange-600" />
        </span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">แผนรายจ่าย</h2>
          <p className="text-xs text-muted-foreground">
            เปรียบเทียบแผนกับผลจริง จำแนกตามหมวดรายจ่าย
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
        <table className="w-full min-w-[560px] text-sm">
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
                <tr className="border-b border-black/10 bg-orange-500/5">
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-xs font-bold text-orange-800"
                  >
                    {section.name}
                  </td>
                </tr>
                {/* Nested subgroups (รายจ่ายลงทุน) */}
                {section.subgroups ? (
                  section.subgroups.map((group) => (
                    <Fragment key={group.name}>
                      <tr className="border-b border-black/10 bg-orange-500/[0.04]">
                        <td
                          colSpan={4}
                          className="px-3 py-1.5 pl-8 text-xs font-semibold text-orange-700"
                        >
                          {group.name}
                        </td>
                      </tr>
                      {group.rows.map((r) => (
                        <Row key={r.หมวด} r={r} indent />
                      ))}
                    </Fragment>
                  ))
                ) : (
                  section.rows.map((r) => <Row key={r.หมวด} r={r} />)
                )}
              </Fragment>
            ))}
            {/* Total */}
            <tr className="border-t-2 border-orange-600/30 bg-orange-500/10">
              <td className="px-3 py-2.5 text-xs font-bold text-orange-900">
                รวมรายจ่าย
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold tabular-nums text-orange-900">
                {formatCurrencyFull(totalPlan)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold tabular-nums text-orange-900">
                {formatCurrencyFull(totalActual)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold tabular-nums text-orange-900">
                {formatCurrencyFull(totalDiff)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}