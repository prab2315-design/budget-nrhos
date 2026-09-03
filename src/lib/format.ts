/**
 * Utility functions for Thai financial data formatting.
 */

// Thai month names in order
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * Convert Gregorian year to Buddhist Era (พ.ศ.)
 * e.g., 2025 → 2568
 */
export function toBuddhistYear(ceYear: number): number {
  return ceYear + 543;
}

/**
 * Format year as Buddhist Era string
 * e.g., 2025 → "พ.ศ. 2568"
 */
export function formatBuddhistYear(ceYear: number): string {
  return `พ.ศ. ${toBuddhistYear(ceYear)}`;
}

/**
 * Get Thai month name by 1-based month number
 */
export function getThaiMonth(month: number): string {
  return THAI_MONTHS[month - 1] ?? "";
}

/**
 * Get short Thai month name by 1-based month number
 */
export function getThaiMonthShort(month: number): string {
  return THAI_MONTHS_SHORT[month - 1] ?? "";
}

/**
 * Parse a Thai month string to its 1-based month number
 */
export function parseThaiMonth(monthStr: string): number {
  const normalized = monthStr.trim();
  const idx = THAI_MONTHS.findIndex((m) => normalized.includes(m));
  if (idx >= 0) return idx + 1;
  // Try short forms
  const shortIdx = THAI_MONTHS_SHORT.findIndex((m) => normalized.includes(m));
  if (shortIdx >= 0) return shortIdx + 1;
  // Try numeric
  const num = parseInt(normalized, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  return 0;
}

/**
 * Parse a month string like "มกราคม 2568" or "มกราคม 2025" into { month, year }
 * Returns CE year
 */
export function parseThaiMonthYear(str: string): { month: number; year: number } {
  const parts = str.trim().split(/\s+/);
  const monthStr = parts[0] ?? "";
  let year = parseInt(parts[1] ?? "", 10);
  const month = parseThaiMonth(monthStr);

  // If year looks like BE (> 2000), convert to CE
  if (year > 2000 && year < 3000) {
    if (year > 2300) {
      // Likely Buddhist Era
      year = year - 543;
    }
  }

  return { month, year };
}

/**
 * Create a sortable key from month and year: "YYYY-MM"
 */
export function monthYearKey(year: number, month: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}

/**
 * Format a number with Thai abbreviation for large numbers.
 * If value >= 1,000,000: show in millions with 2 decimal places + "ล."
 * If value >= 1,000: show in thousands with 1 decimal + "พัน"
 * Otherwise show full number with 2 decimal places
 */
export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} ล.`;
  }
  if (abs >= 100_000) {
    return `${(value / 1_000).toFixed(1)} พัน`;
  }
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number as full currency with comma separators
 */
export function formatCurrencyFull(value: number): string {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Truncate text and add "..." if it exceeds maxLength
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Parse a number from various formats (handles commas, Thai formatting)
 */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
