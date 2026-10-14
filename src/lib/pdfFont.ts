/**
 * Thai font loader for jsPDF exports.
 *
 * jsPDF's built-in fonts (helvetica) cannot render Thai characters, so any PDF
 * containing Thai text must embed a Thai-capable TTF font. This module fetches
 * Sarabun (an open Thai font, SIL OFL) from the google/fonts GitHub CDN,
 * converts the bytes to base64, and registers them as jsPDF VFS fonts
 * ("Sarabun" normal + bold).
 *
 * Designed to fail soft: if the font cannot be fetched (offline, CDN hiccup),
 * `ensureThaiFont` resolves to `null` and the caller keeps using the latin
 * fallback so the export still produces a file instead of breaking.
 */

import type { jsPDF } from "jspdf";

const SARABUN_BASE =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun";

// Module-level cache: fetch each weight once per browser session.
const fontCache = new Map<string, Promise<string | null>>();

async function toBase64(bytes: Uint8Array): Promise<string> {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return await toBase64(new Uint8Array(buf));
  } catch {
    return null;
  }
}

function loadFont(url: string): Promise<string | null> {
  let cached = fontCache.get(url);
  if (!cached) {
    cached = fetchFontBase64(url);
    fontCache.set(url, cached);
  }
  return cached;
}

/**
 * Register the Sarabun regular + bold faces on the given jsPDF instance.
 * Returns "Sarabun" on success, or null if the font could not be fetched and
 * the caller should fall back to latin-only registration (Thai text will then
 * render as best-effort by jsPDF's built-in handling).
 */
export async function ensureThaiFont(doc: jsPDF): Promise<"Sarabun" | null> {
  const [regular, bold] = await Promise.all([
    loadFont(`${SARABUN_BASE}/Sarabun-Regular.ttf`),
    loadFont(`${SARABUN_BASE}/Sarabun-Bold.ttf`),
  ]);
  if (!regular) return null;

  doc.addFileToVFS("Sarabun-Regular.ttf", regular);
  doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
  if (bold) {
    doc.addFileToVFS("Sarabun-Bold.ttf", bold);
    doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
  } else {
    // Map bold to the regular face so setFont("Sarabun", "bold") still works.
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "bold");
  }
  return "Sarabun";
}
