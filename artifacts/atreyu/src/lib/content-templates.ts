/* ── Content Template Helpers ──
   Extracted from content.tsx — shared by both legacy canvas rendering
   and the new Konva-based interactive editor.
*/

import type { StyleProfile } from "@/types/content-editor";

/* ── Color helpers ── */
export function luminance(hex: string): number {
  const h = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isDarkColor(hex: string) {
  return luminance(hex) < 0.4;
}

export function contrastColor(hex: string) {
  return luminance(hex) > 0.55 ? "#1A1A1A" : "#FFFFFF";
}

export function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Strip markdown and symbols from AI output ── */
export function deepCleanText(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/\*(.*?)\*/gs, "$1")
    .replace(/_{1,2}(.*?)_{1,2}/gs, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[—–]/g, ",")
    .replace(/^[-•*+]\s+/gm, "")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s*/gm, "")
    .replace(/^={3,}|-{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── Extract hook sentence + supporting line for image text ── */
export function extractHook(text: string): { hook: string; supporting: string } {
  const paras = deepCleanText(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let hook = paras[0] ?? "";
  if (hook.length > 130) {
    const sentEnd = hook.search(/[.!?]/);
    hook = sentEnd > 20 ? hook.slice(0, sentEnd + 1) : hook.slice(0, 130).trim() + "\u2026";
  }

  let supporting = paras[1] ?? "";
  if (supporting.length > 90) {
    const sentEnd = supporting.search(/[.!?]/);
    supporting =
      sentEnd > 10 ? supporting.slice(0, sentEnd + 1) : supporting.slice(0, 90).trim() + "\u2026";
  }

  return { hook, supporting };
}

/* ── Determine which template to use ── */
export type TemplateName = "cinematic" | "editorial" | "modern" | "photo";

export function pickTemplate(
  styleProfile: StyleProfile | null | undefined,
  hasBackgroundImage: boolean,
): TemplateName {
  if (hasBackgroundImage) return "photo";
  const bg = styleProfile?.backgroundStyle ?? "gradient";
  const typ = styleProfile?.typographyStyle ?? "sans-serif";
  const pal = styleProfile?.colorPalette;
  const isDark = bg === "dark" || (pal ? isDarkColor(pal.primary) : false);
  const isEditorial =
    (typ === "serif" ||
      styleProfile?.layoutStyle === "editorial" ||
      styleProfile?.layoutStyle === "left-aligned") &&
    !isDark;

  if (isDark) return "cinematic";
  if (isEditorial) return "editorial";
  return "modern";
}

/* ── Default palette ── */
export const DEFAULT_PALETTE: StyleProfile["colorPalette"] = {
  primary: "#E8ECF4",
  secondary: "#D6DDF0",
  accent: "#6366f1",
  text: "#1A1A1A",
};

export const SYSTEM_FONT = "-apple-system,'Helvetica Neue',Arial,sans-serif";
export const SERIF_FONT = "Georgia,'Times New Roman',serif";
