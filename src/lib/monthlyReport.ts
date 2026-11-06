import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SheetData } from "@/data/sheets";
import { ensureThaiFont } from "@/lib/pdfFont";
import { getThaiMonth, parseThaiMonth } from "@/lib/format";

const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

function rowPeriod(value: string) {
  const [word, yearText] = norm(value).split(" ");
  const month = parseThaiMonth(word ?? "");
  const rawYear = Number(yearText);
  const year = rawYear > 2400 ? rawYear - 543 : rawYear;
  return month && Number.isFinite(year) ? year * 12 + month : -1;
}

export function fiscalMonths(fiscalYear: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((i + 9) % 12) + 1;
    const year = month >= 10 ? fiscalYear - 1 : fiscalYear;
    return { month, year, label: `${getThaiMonth(month)} ${year}` };
  });
}

export function hasMonthlyActuals(data: SheetData, fiscalYear: number, month: number) {
  const year = month >= 10 ? fiscalYear - 1 : fiscalYear;
  const period = (year - 543) * 12 + month;
  return data.trplan.some((r) => rowPeriod(r.เดือน) === period && r.ยอดจริง !== 0);
}

/** A4 landscape report based on the hospital's September 2569 four-page example. */
export async function downloadMonthlyReport(data: SheetData, fiscalYear: number, month: number) {
  const reportYear = month >= 10 ? fiscalYear - 1 : fiscalYear;
  const target = (reportYear - 543) * 12 + month;
  const valid = data.trplan.filter((r) => rowPeriod(r.เดือน) >= (fiscalYear - 1 - 543) * 12 + 10 && rowPeriod(r.เดือน) <= (fiscalYear - 543) * 12 + 9);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const font = await ensureThaiFont(doc);
  if (!font) throw new Error("ไม่สามารถโหลดฟอนต์ภาษาไทยสำหรับรายงานได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่");
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const title = `ประจำเดือน${getThaiMonth(month)} ${reportYear}`;
  const plans = new Map<string, number>();
  const order = new Map<string, number>();
  data.group.forEach((g, i) => {
    const key = `${norm(g.รหัสบัญชี)}|${norm(g.รายการบัญชี)}|${g.แผนรายรับ ? "รายรับ" : "รายจ่าย"}`;
    plans.set(key, (plans.get(key) ?? 0) + g.แผนรายรับ + g.แผนรายจ่าย);
    if (!order.has(key)) order.set(key, i);
  });
  type Detail = { type: string; category: string; item: string; plan: number; current: number; cumulative: number; order: number };
  const details = new Map<string, Detail>();
  for (const r of valid) {
    const type = norm(r.ประเภท);
    if (type !== "รายรับ" && type !== "รายจ่าย") continue;
    const key = `${norm(r.รหัสบัญชี)}|${norm(r.รายการบัญชี)}|${type}`;
    if (!details.has(key)) details.set(key, { type, category: norm(r.หมวด), item: norm(r.รายการบัญชี), plan: plans.get(key) ?? 0, current: 0, cumulative: 0, order: order.get(key) ?? 99999 });
    const item = details.get(key)!;
    if (rowPeriod(r.เดือน) <= target) item.cumulative += r.ยอดจริง;
    if (rowPeriod(r.เดือน) === target) item.current += r.ยอดจริง;
  }
  // Include budget lines with no actuals, so the report remains complete.
  for (const g of data.group) {
    const type = g.แผนรายรับ ? "รายรับ" : "รายจ่าย";
    const key = `${norm(g.รหัสบัญชี)}|${norm(g.รายการบัญชี)}|${type}`;
    if (!details.has(key)) details.set(key, { type, category: norm(g.หมวด), item: norm(g.รายการบัญชี), plan: plans.get(key) ?? 0, current: 0, cumulative: 0, order: order.get(key) ?? 99999 });
  }
  const records = [...details.values()].filter((r) => r.item).sort((a, b) => a.order - b.order);
  const sum = (kind: string, field: "plan" | "current" | "cumulative") => records.filter((r) => r.type === kind).reduce((s, r) => s + r[field], 0);
  const revenuePlan = sum("รายรับ", "plan");
  const expensePlan = sum("รายจ่าย", "plan");
  const revenueCurrent = sum("รายรับ", "current");
  const expenseCurrent = sum("รายจ่าย", "current");
  const revenueCum = sum("รายรับ", "cumulative");
  const expenseCum = sum("รายจ่าย", "cumulative");
  const pct = (actual: number, plan: number) => plan ? `${(actual / plan * 100).toFixed(2)}` : "-";

  const commonHeader = (detail = true) => {
    doc.setTextColor(32, 51, 68);
    doc.setFont(font, "bold");
    doc.setFontSize(11);
    doc.text("สำนักงานปลัดกระทรวงสาธารณสุข", W / 2, 11, { align: "center" });
    doc.text("ชื่อหน่วยงาน โรงพยาบาลนางรอง รหัสหน่วยงาน 10897", W / 2, 17, { align: "center" });
    doc.text(detail ? "รายงานเปรียบเทียบแผน/ผลรายรับ - รายจ่ายเงินบำรุง" : "กราฟแสดงข้อมูลแผน/ผลรายรับ - รายจ่ายเงินบำรุง", W / 2, 23, { align: "center" });
    doc.text(title, W / 2, 29, { align: "center" });
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.text("หน่วย : บาท", W - 12, 30, { align: "right" });
  };

  // Page 1: executive overview, annual plans, monthly results and fiscal-year trends.
  commonHeader(false);
  autoTable(doc, {
    startY: 34, margin: { left: 12, right: 12 }, theme: "grid",
    head: [["รายการ", "แผนเงินบำรุงทั้งปี", `ผลเดือน${getThaiMonth(month)}`, "ผลสะสมตั้งแต่ต้นปี", "ร้อยละตามแผน"]],
    body: [
      ["รายรับ", money(revenuePlan), money(revenueCurrent), money(revenueCum), pct(revenueCum, revenuePlan)],
      ["รายจ่าย", money(expensePlan), money(expenseCurrent), money(expenseCum), pct(expenseCum, expensePlan)],
      ["รายรับสูง (ต่ำ) กว่ารายจ่าย", money(revenuePlan - expensePlan), money(revenueCurrent - expenseCurrent), money(revenueCum - expenseCum), ""],
    ],
    styles: { font, fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [40, 97, 91], font },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
  doc.setFont(font, "bold"); doc.setFontSize(10); doc.text("เปรียบเทียบรายรับ–รายจ่ายรายเดือน", 12, 78);
  const monthly = fiscalMonths(fiscalYear).map(({ month: mo, year }) => {
    const key = (year - 543) * 12 + mo;
    const rows = valid.filter((r) => rowPeriod(r.เดือน) === key);
    return { label: `${getThaiMonth(mo).slice(0, 3)} ${String(year).slice(-2)}`, inc: rows.filter((r) => norm(r.ประเภท) === "รายรับ").reduce((s, r) => s + r.ยอดจริง, 0), exp: rows.filter((r) => norm(r.ประเภท) === "รายจ่าย").reduce((s, r) => s + r.ยอดจริง, 0) };
  });
  const max = Math.max(1, ...monthly.flatMap((m) => [m.inc, m.exp]));
  const baseY = 157, topY = 87, leftX = 19, groupWidth = 21;
  doc.setDrawColor(210); doc.line(12, baseY, W - 12, baseY);
  monthly.forEach((m, i) => {
    const x = leftX + i * groupWidth;
    const h1 = m.inc / max * (baseY - topY), h2 = m.exp / max * (baseY - topY);
    doc.setFillColor(28, 137, 112); doc.rect(x, baseY - h1, 7, h1, "F");
    doc.setFillColor(235, 150, 58); doc.rect(x + 8, baseY - h2, 7, h2, "F");
    doc.setFont(font, "normal"); doc.setFontSize(7); doc.setTextColor(70); doc.text(m.label, x + 7, baseY + 5, { align: "center" });
  });
  doc.setFontSize(8); doc.setTextColor(45);
  doc.setFillColor(28, 137, 112); doc.rect(110, 167, 4, 3, "F"); doc.text("รายรับ", 116, 170);
  doc.setFillColor(235, 150, 58); doc.rect(151, 167, 4, 3, "F"); doc.text("รายจ่าย", 157, 170);
  doc.setFont(font, "bold"); doc.setFontSize(9); doc.text("ประเด็นวิเคราะห์สำคัญ", 12, 180);
  doc.setFont(font, "normal"); doc.setFontSize(8.5);
  const difference = revenueCurrent - expenseCurrent;
  doc.text(`เดือน${getThaiMonth(month)} ${reportYear} มีรายรับ ${money(revenueCurrent)} บาท และรายจ่าย ${money(expenseCurrent)} บาท`, 12, 186);
  doc.text(`รายรับ${difference >= 0 ? "สูงกว่า" : "ต่ำกว่า"}รายจ่าย ${money(Math.abs(difference))} บาท (ตามข้อมูลที่บันทึกใน Google Sheets ณ วันที่พิมพ์)`, 12, 192);
  doc.setFontSize(7.5); doc.text("ที่มาข้อมูล: Google Sheets ของโรงพยาบาลนางรอง | ผู้รายงาน: กลุ่มงานยุทธศาสตร์และแผนงานโครงการ", 12, H - 7);

  // Detail pages: five columns as in the supplied comparison report.
  doc.addPage();
  const body: (string | { content: string; colSpan: number; styles: { fillColor: number[]; fontStyle: string } })[][] = [];
  for (const type of ["รายรับ", "รายจ่าย"]) {
    body.push([{ content: type, colSpan: 5, styles: { fillColor: [223, 237, 233], fontStyle: "bold" } }]);
    let last = "";
    for (const r of records.filter((v) => v.type === type)) {
      if (r.category !== last) {
        last = r.category;
        body.push([{ content: last || "ไม่ระบุหมวด", colSpan: 5, styles: { fillColor: [239, 243, 246], fontStyle: "bold" } }]);
      }
      body.push([r.item, money(r.plan), r.current ? money(r.current) : "-", money(r.cumulative), money(r.plan - r.cumulative), pct(r.cumulative, r.plan)]);
    }
    body.push([`รวม${type}`, money(sum(type, "plan")), money(sum(type, "current")), money(sum(type, "cumulative")), money(sum(type, "plan") - sum(type, "cumulative")), pct(sum(type, "cumulative"), sum(type, "plan"))]);
  }
  autoTable(doc, {
    startY: 35, margin: { left: 10, right: 10, top: 35, bottom: 15 },
    head: [["รายการ", "แผนเงินบำรุงทั้งปี", `ผลงานเดือน${getThaiMonth(month)}`, "จำนวนเงินตั้งแต่ต้นปี", "ส่วนต่างคงเหลือ", "ร้อยละตามแผน"]],
    body: body as never, theme: "grid", showHead: "everyPage",
    styles: { font, fontSize: 7.2, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { font, fillColor: [40, 97, 91], fontSize: 7.5, halign: "center" },
    columnStyles: { 0: { cellWidth: 106 }, 1: { cellWidth: 38, halign: "right" }, 2: { cellWidth: 35, halign: "right" }, 3: { cellWidth: 38, halign: "right" }, 4: { cellWidth: 38, halign: "right" }, 5: { cellWidth: 22, halign: "right" } },
    didDrawPage: () => commonHeader(),
  });
  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 160;
  if (lastY > H - 33) doc.addPage();
  const y = lastY > H - 33 ? 65 : lastY + 9;
  if (lastY > H - 33) commonHeader();
  doc.setFont(font, "bold"); doc.setFontSize(8);
  doc.text(`รายรับสูง (ต่ำ) กว่ารายจ่ายสุทธิ   ${money(revenueCurrent - expenseCurrent)} บาท  |  สะสม ${money(revenueCum - expenseCum)} บาท`, 15, y);
  doc.setFont(font, "normal"); doc.text("ลงชื่อ.......................................................... ผู้จัดทำรายงาน", 32, y + 16);
  doc.text("ลงชื่อ.......................................................... ผู้ตรวจสอบรายงาน", 168, y + 16);
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFont(font, "normal"); doc.setFontSize(7); doc.setTextColor(115);
    doc.text(`หน้า ${p} / ${pages}`, W - 12, H - 6, { align: "right" });
  }
  doc.save(`รายงานแผนผลรายรับรายจ่าย_${fiscalYear}_${String(month).padStart(2, "0")}.pdf`);
}
