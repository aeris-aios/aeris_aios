/* ── Konva Template Descriptors ──
   Each template function returns an array of AnyEditorElement[]
   that the Konva editor can render as interactive, draggable nodes.
*/

import type {
  AnyEditorElement,
  TextElement,
  RectElement,
  StyleProfile,
} from "@/types/content-editor";
import {
  isDarkColor,
  luminance,
  hexA,
  extractHook,
  pickTemplate,
  splitHeadline,
  DEFAULT_PALETTE,
  SYSTEM_FONT,
  SERIF_FONT,
} from "./content-templates";

let _uid = 0;
function uid(prefix = "el") {
  return `${prefix}-${++_uid}-${Date.now().toString(36)}`;
}

/* ── Shared text element factory ── */
function makeText(
  overrides: Partial<TextElement> & { text: string; role: TextElement["role"] },
): TextElement {
  return {
    id: uid("txt"),
    type: "text",
    x: 0,
    y: 0,
    width: 400,
    height: 60,
    rotation: 0,
    draggable: true,
    visible: true,
    opacity: 1,
    zIndex: 10,
    locked: false,
    fontSize: 32,
    fontFamily: SYSTEM_FONT,
    fontStyle: "",
    fill: "#FFFFFF",
    align: "center",
    lineHeight: 1.22,
    letterSpacing: 0,
    textDecoration: "",
    shadowColor: "rgba(0,0,0,0)",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    ...overrides,
  };
}

function makeRect(
  overrides: Partial<RectElement> & { role: RectElement["role"] },
): RectElement {
  return {
    id: uid("rect"),
    type: "rect",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    draggable: false,
    visible: true,
    opacity: 1,
    zIndex: 0,
    locked: true,
    fill: "transparent",
    cornerRadius: 0,
    stroke: "",
    strokeWidth: 0,
    ...overrides,
  };
}

/* ════════════════════════════════════════════
   CINEMATIC TEMPLATE (dark profiles)
════════════════════════════════════════════ */
function cinematicTemplate(
  W: number,
  H: number,
  pal: StyleProfile["colorPalette"],
  hook: string,
  supporting: string,
  brandName: string,
): AnyEditorElement[] {
  const PAD = Math.round(W * 0.08);
  const hookSize = Math.min(Math.round(W * 0.065), 90);
  const supSize = Math.round(hookSize * 0.33);
  const bfSize = Math.round(H * 0.10 * 0.33);

  const elements: AnyEditorElement[] = [];

  /* Top accent line */
  elements.push(
    makeRect({
      role: "decoration",
      x: 0,
      y: 0,
      width: W,
      height: 3,
      fill: pal.accent,
      zIndex: 5,
    }),
  );

  /* Hook text */
  elements.push(
    makeText({
      role: "hook",
      text: hook,
      x: PAD,
      y: H * 0.25,
      width: W - PAD * 2,
      height: hookSize * 3,
      fontSize: hookSize,
      fontStyle: "bold",
      fill: "#FFFFFF",
      align: "center",
      lineHeight: 1.22,
      zIndex: 20,
    }),
  );

  /* Supporting text */
  if (supporting) {
    elements.push(
      makeText({
        role: "supporting",
        text: supporting,
        x: PAD,
        y: H * 0.55,
        width: W - PAD * 2,
        height: supSize * 4,
        fontSize: supSize,
        fontStyle: "",
        fill: hexA("#FFFFFF", 0.52),
        align: "center",
        lineHeight: 1.5,
        zIndex: 15,
      }),
    );
  }

  /* Brand name footer */
  elements.push(
    makeText({
      role: "brand",
      text: brandName.toUpperCase(),
      x: PAD,
      y: H - H * 0.10,
      width: W - PAD * 2,
      height: bfSize * 2,
      fontSize: bfSize,
      fontStyle: "bold",
      fill: "#FFFFFF",
      align: "left",
      zIndex: 20,
    }),
  );

  return elements;
}

/* ════════════════════════════════════════════
   EDITORIAL TEMPLATE (serif / light profiles)
════════════════════════════════════════════ */
function editorialTemplate(
  W: number,
  H: number,
  pal: StyleProfile["colorPalette"],
  hook: string,
  supporting: string,
  brandName: string,
): AnyEditorElement[] {
  const PAD = Math.round(W * 0.08);
  const hookSize = Math.min(Math.round(W * 0.066), 86);
  const supSize = Math.round(hookSize * 0.33);
  const barX = Math.round(PAD * 0.55);
  const barW = Math.round(W * 0.007);
  const textLeft = barX + barW + Math.round(W * 0.045);

  const elements: AnyEditorElement[] = [];

  /* Left accent bar */
  elements.push(
    makeRect({
      role: "decoration",
      x: barX,
      y: H * 0.10,
      width: barW,
      height: H * 0.77,
      fill: pal.accent,
      zIndex: 5,
    }),
  );

  /* Hook text — serif */
  elements.push(
    makeText({
      role: "hook",
      text: hook,
      x: textLeft,
      y: H * 0.16,
      width: W - textLeft - PAD,
      height: hookSize * 3,
      fontSize: hookSize,
      fontFamily: SERIF_FONT,
      fontStyle: "bold",
      fill: "#1A1A1A",
      align: "left",
      lineHeight: 1.15,
      zIndex: 20,
    }),
  );

  /* Supporting text */
  if (supporting) {
    elements.push(
      makeText({
        role: "supporting",
        text: supporting,
        x: textLeft,
        y: H * 0.50,
        width: W - textLeft - PAD,
        height: supSize * 4,
        fontSize: supSize,
        fill: hexA("#1A1A1A", 0.55),
        align: "left",
        lineHeight: 1.65,
        zIndex: 15,
      }),
    );
  }

  /* Brand footer */
  elements.push(
    makeText({
      role: "brand",
      text: `\u2014 ${brandName.toUpperCase()}`,
      x: textLeft,
      y: H * 0.89,
      width: W - textLeft - PAD,
      height: Math.round(W * 0.022) * 2,
      fontSize: Math.round(W * 0.022),
      fontStyle: "bold",
      fill: hexA(pal.accent, 0.9),
      align: "right",
      zIndex: 20,
    }),
  );

  return elements;
}

/* ════════════════════════════════════════════
   MODERN CARD TEMPLATE (default)
════════════════════════════════════════════ */
function modernTemplate(
  W: number,
  H: number,
  pal: StyleProfile["colorPalette"],
  hook: string,
  supporting: string,
  brandName: string,
): AnyEditorElement[] {
  const hookSize = Math.min(Math.round(W * 0.058), 78);
  const supSize = Math.round(hookSize * 0.34);
  const cardX = Math.round(W * 0.075);
  const cardY = Math.round(H * 0.09);
  const cardW = W - cardX * 2;
  const cardH = Math.round(H * 0.76);
  const borderW = Math.round(W * 0.009);
  const CP = Math.round(cardW * 0.085);
  const CX = cardX + borderW + CP;
  const tagSize = Math.round(W * 0.020);

  const elements: AnyEditorElement[] = [];

  /* Card background */
  elements.push(
    makeRect({
      role: "card",
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      fill: "#FFFFFF",
      cornerRadius: Math.round(W * 0.028),
      zIndex: 3,
    }),
  );

  /* Left accent border */
  elements.push(
    makeRect({
      role: "decoration",
      x: cardX,
      y: cardY,
      width: borderW,
      height: cardH,
      fill: pal.accent,
      cornerRadius: Math.round(W * 0.028),
      zIndex: 4,
    }),
  );

  /* Brand tag */
  elements.push(
    makeText({
      role: "brand",
      text: brandName.toUpperCase(),
      x: CX,
      y: cardY + CP * 0.8,
      width: cardW - borderW - CP * 2,
      height: tagSize * 2,
      fontSize: tagSize,
      fontStyle: "bold",
      fill: pal.accent,
      align: "left",
      zIndex: 20,
    }),
  );

  /* Hook text */
  elements.push(
    makeText({
      role: "hook",
      text: hook,
      x: CX,
      y: cardY + CP * 0.8 + tagSize * 1.8,
      width: cardW - borderW - CP * 2,
      height: hookSize * 3,
      fontSize: hookSize,
      fontStyle: "bold",
      fill: "#111111",
      align: "left",
      lineHeight: 1.22,
      zIndex: 20,
    }),
  );

  /* Supporting text */
  if (supporting) {
    elements.push(
      makeText({
        role: "supporting",
        text: supporting,
        x: CX,
        y: cardY + CP * 0.8 + tagSize * 1.8 + hookSize * 3.5,
        width: cardW - borderW - CP * 2,
        height: supSize * 4,
        fontSize: supSize,
        fill: hexA("#1A1A1A", 0.50),
        align: "left",
        lineHeight: 1.65,
        zIndex: 15,
      }),
    );
  }

  /* Footer text */
  elements.push(
    makeText({
      role: "brand",
      text: "MADE WITH AERIS",
      x: 0,
      y: cardY + cardH + (H - cardY - cardH) * 0.3,
      width: W,
      height: Math.round(W * 0.018) * 2,
      fontSize: Math.round(W * 0.018),
      fill: hexA("#1A1A1A", 0.32),
      align: "center",
      zIndex: 10,
    }),
  );

  return elements;
}

/* ════════════════════════════════════════════
   PHOTO TEMPLATE (AI-generated background)
════════════════════════════════════════════ */
function photoTemplate(
  W: number,
  H: number,
  pal: StyleProfile["colorPalette"],
  hook: string,
  supporting: string,
  brandName: string,
): AnyEditorElement[] {
  const PAD = Math.round(W * 0.08);
  const hookSize = Math.min(Math.round(W * 0.065), 90);
  const supSize = Math.round(hookSize * 0.33);
  const bfSize = Math.round(H * 0.10 * 0.33);

  const elements: AnyEditorElement[] = [];

  /* Top accent bar */
  elements.push(
    makeRect({
      role: "decoration",
      x: 0,
      y: 0,
      width: W,
      height: 4,
      fill: pal.accent,
      zIndex: 30,
    }),
  );

  /* Dark overlay for readability */
  elements.push(
    makeRect({
      role: "overlay",
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: "rgba(0,0,0,0.35)",
      zIndex: 5,
      locked: true,
      draggable: false,
    }),
  );

  /* Hook text — white, shadowed */
  elements.push(
    makeText({
      role: "hook",
      text: hook,
      x: PAD,
      y: H * 0.25,
      width: W - PAD * 2,
      height: hookSize * 3,
      fontSize: hookSize,
      fontStyle: "bold",
      fill: "#FFFFFF",
      align: "center",
      lineHeight: 1.22,
      shadowColor: "rgba(0,0,0,0.85)",
      shadowBlur: 20,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      zIndex: 20,
    }),
  );

  /* Supporting text */
  if (supporting) {
    elements.push(
      makeText({
        role: "supporting",
        text: supporting,
        x: PAD,
        y: H * 0.55,
        width: W - PAD * 2,
        height: supSize * 4,
        fontSize: supSize,
        fill: "rgba(255,255,255,0.78)",
        align: "center",
        lineHeight: 1.5,
        shadowColor: "rgba(0,0,0,0.6)",
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        zIndex: 15,
      }),
    );
  }

  /* Brand name footer */
  elements.push(
    makeText({
      role: "brand",
      text: brandName.toUpperCase(),
      x: PAD,
      y: H - H * 0.10,
      width: W - PAD * 2,
      height: bfSize * 2,
      fontSize: bfSize,
      fontStyle: "bold",
      fill: "#FFFFFF",
      align: "left",
      shadowColor: "rgba(0,0,0,0.6)",
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      zIndex: 20,
    }),
  );

  return elements;
}

/* ════════════════════════════════════════════
   NEWS HEADLINE TEMPLATE (bold/photographic profiles)
   — Big bold all-caps text anchored to bottom strip
   — Two-tone: accent color for power phrase, white for body
════════════════════════════════════════════ */
function newsHeadlineTemplate(
  W: number,
  H: number,
  pal: StyleProfile["colorPalette"],
  accentLine: string,
  bodyLine: string,
  brandName: string,
): AnyEditorElement[] {
  const PAD = Math.round(W * 0.065);
  const STRIP_Y = Math.round(H * 0.58);
  const STRIP_H = H - STRIP_Y;
  const accentSize = Math.min(Math.round(W * 0.085), 116);
  const bodySize = Math.min(Math.round(W * 0.075), 100);
  const badgeSize = Math.round(W * 0.022);
  const textInset = Math.round(PAD * 0.9);

  const elements: AnyEditorElement[] = [];

  /* Full-canvas dark overlay (light scrim over photo) */
  elements.push(
    makeRect({
      role: "overlay",
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: "rgba(0,0,0,0.18)",
      zIndex: 5,
      locked: true,
      draggable: false,
    }),
  );

  /* Bottom dark strip */
  elements.push(
    makeRect({
      role: "overlay",
      x: 0,
      y: STRIP_Y,
      width: W,
      height: STRIP_H,
      fill: "rgba(0,0,0,0.82)",
      zIndex: 8,
      locked: true,
      draggable: false,
    }),
  );

  /* Accent-colored power phrase (top of strip) */
  if (accentLine) {
    elements.push(
      makeText({
        role: "hook",
        text: accentLine.toUpperCase(),
        x: textInset,
        y: STRIP_Y + Math.round(STRIP_H * 0.06),
        width: W - textInset * 2,
        height: accentSize * 2.2,
        fontSize: accentSize,
        fontStyle: "bold",
        fill: pal.accent,
        align: "left",
        lineHeight: 1.05,
        letterSpacing: -1,
        zIndex: 20,
      }),
    );
  }

  /* White body text below accent line */
  if (bodyLine) {
    const bodyY = accentLine
      ? STRIP_Y + Math.round(STRIP_H * 0.06) + accentSize * 2.0
      : STRIP_Y + Math.round(STRIP_H * 0.08);
    elements.push(
      makeText({
        role: "supporting",
        text: bodyLine.toUpperCase(),
        x: textInset,
        y: bodyY,
        width: W - textInset * 2,
        height: bodySize * 2.2,
        fontSize: bodySize,
        fontStyle: "bold",
        fill: "#FFFFFF",
        align: "left",
        lineHeight: 1.05,
        letterSpacing: -1,
        zIndex: 20,
      }),
    );
  }

  /* Brand badge — bottom-left of strip */
  elements.push(
    makeText({
      role: "brand",
      text: `@${brandName.toLowerCase()}`,
      x: textInset,
      y: H - badgeSize * 2.2,
      width: W - textInset * 2,
      height: badgeSize * 2,
      fontSize: badgeSize,
      fontStyle: "bold",
      fill: hexA("#FFFFFF", 0.55),
      align: "left",
      letterSpacing: 1,
      zIndex: 25,
    }),
  );

  return elements;
}

/* ═══════════════════════════════════════════
   PUBLIC — Generate elements for a given template
═══════════════════════════════════════════ */
export interface TemplateParams {
  text: string;
  canvasWidth: number;
  canvasHeight: number;
  brandName: string;
  styleProfile?: StyleProfile | null;
  backgroundImageUrl?: string | null;
}

export interface TemplateResult {
  elements: AnyEditorElement[];
  backgroundColor: string;
  backgroundImage: string | null;
  templateName: string;
}

/* ═══════════════════════════════════════════
   ADAPTIVE TEMPLATE — driven entirely by StyleProfile fields
   Replaces the rigid 5-template picker with a single function
   that adapts font size, position, alignment, colors, decorations,
   and layout based on ALL extracted style signals.
═══════════════════════════════════════════ */
export function generateTemplate(params: TemplateParams): TemplateResult {
  const { text, canvasWidth: W, canvasHeight: H, brandName, styleProfile, backgroundImageUrl } =
    params;
  const pal = styleProfile?.colorPalette ?? DEFAULT_PALETTE;
  const { hook, supporting } = extractHook(text);

  /* ── Extract style signals with sensible defaults ── */
  const typ    = styleProfile?.typographyStyle ?? "sans-serif";
  const layout = styleProfile?.layoutStyle ?? "centered";
  const bg     = styleProfile?.backgroundStyle ?? "gradient";
  const highlight = styleProfile?.highlightPhrase;

  const isBold       = typ === "bold";
  const isSerif      = typ === "serif";
  const isMinimal    = typ === "minimal";
  const isScript     = typ === "script";
  const isCentered   = layout === "centered";
  const isLeftAlign  = layout === "left-aligned" || layout === "editorial";
  const isFullbleed  = layout === "fullbleed" || layout === "split";
  const isDark       = bg === "dark" || isDarkColor(pal.primary);
  const isPhoto      = bg === "photographic" || !!backgroundImageUrl;
  const isLight      = bg === "light" || bg === "solid" || (!isDark && !isPhoto);
  const hasOverlay   = isPhoto || isBold;

  /* ── Adaptive font sizing — driven by typography style ── */
  const hookSizeBase = Math.min(Math.round(W * 0.065), 90);
  const hookSize = isBold
    ? Math.min(Math.round(hookSizeBase * 1.35), 120)  /* Bold: 35% larger */
    : isMinimal
    ? Math.round(hookSizeBase * 0.85)                  /* Minimal: 15% smaller */
    : isScript
    ? Math.round(hookSizeBase * 1.1)                   /* Script: 10% larger */
    : hookSizeBase;

  const supSize  = Math.round(hookSize * (isBold ? 0.65 : isMinimal ? 0.4 : 0.33));
  const brandSize = Math.round(W * (isBold ? 0.022 : 0.018));
  const PAD = Math.round(W * (isMinimal ? 0.12 : 0.08));

  /* ── Adaptive alignment — driven by layout style ── */
  const textAlign: "left" | "center" | "right" =
    isCentered ? "center" : isLeftAlign || isFullbleed ? "left" : "center";

  const textX     = textAlign === "center" ? PAD : PAD + (isLeftAlign ? W * 0.04 : 0);
  const textWidth = W - textX - PAD;

  /* ── Adaptive colors — use palette, not hardcoded ── */
  const textColor   = isPhoto || isDark ? "#FFFFFF" : (pal.text || "#1A1A1A");
  const subColor    = isPhoto || isDark ? hexA("#FFFFFF", 0.6) : hexA(pal.text || "#1A1A1A", 0.55);
  const accentColor = pal.accent || "#6366f1";

  /* ── Adaptive positioning — driven by layout + typography ── */
  const isBoldBottomAnchored = isBold && (isPhoto || isFullbleed);
  const hookY = isBoldBottomAnchored
    ? H * 0.58 + H * 0.42 * 0.06  /* Bottom strip — like advicefromceo */
    : isCentered
    ? H * 0.28
    : isLeftAlign
    ? H * 0.16
    : H * 0.25;

  /* ── Font family ── */
  const fontFamily = isSerif || isScript ? SERIF_FONT : SYSTEM_FONT;

  /* ── Shadows for photo backgrounds ── */
  const shadow = isPhoto
    ? { shadowColor: "rgba(0,0,0,0.85)", shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 0 }
    : { shadowColor: "rgba(0,0,0,0)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 };

  const elements: AnyEditorElement[] = [];

  /* ═══ DECORATIONS — adapted to style ═══ */

  /* Top accent bar — present for bold/editorial/cinematic styles */
  if (isBold || isDark || isLeftAlign) {
    elements.push(makeRect({
      role: "decoration",
      x: 0, y: 0, width: W,
      height: isBold ? 6 : 3,
      fill: accentColor,
      zIndex: 30,
    }));
  }

  /* Left accent bar — editorial/left-aligned only */
  if (isLeftAlign && !isBold) {
    const barX = Math.round(PAD * 0.55);
    elements.push(makeRect({
      role: "decoration",
      x: barX, y: H * 0.10, width: Math.round(W * 0.007), height: H * 0.77,
      fill: accentColor,
      zIndex: 5,
    }));
  }

  /* Photo overlays — dark scrim for text readability */
  if (isPhoto) {
    elements.push(makeRect({
      role: "overlay", x: 0, y: 0, width: W, height: H,
      fill: isBoldBottomAnchored ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.35)",
      zIndex: 5, locked: true, draggable: false,
    }));
  }

  /* Bold bottom-anchored strip (advicefromceo / news headline style) */
  if (isBoldBottomAnchored) {
    const stripY = Math.round(H * 0.58);
    elements.push(makeRect({
      role: "overlay", x: 0, y: stripY, width: W, height: H - stripY,
      fill: "rgba(0,0,0,0.82)",
      zIndex: 8, locked: true, draggable: false,
    }));
  }

  /* Card background — for modern/light/non-photo styles */
  if (isLight && !isPhoto && !isBold && !isLeftAlign) {
    const cardX = Math.round(W * 0.075);
    const cardY = Math.round(H * 0.09);
    const cardW = W - cardX * 2;
    const cardH = Math.round(H * 0.76);
    elements.push(makeRect({
      role: "card", x: cardX, y: cardY, width: cardW, height: cardH,
      fill: "#FFFFFF", cornerRadius: Math.round(W * 0.028), zIndex: 3,
    }));
    elements.push(makeRect({
      role: "decoration", x: cardX, y: cardY, width: Math.round(W * 0.009), height: cardH,
      fill: accentColor, cornerRadius: Math.round(W * 0.028), zIndex: 4,
    }));
  }

  /* ═══ TEXT ELEMENTS — all individually selectable/editable ═══ */

  /* Highlight phrase as separate accent-colored text node */
  if (isBoldBottomAnchored && highlight) {
    const { accentLine, bodyLine } = splitHeadline(hook, highlight);
    const stripY = Math.round(H * 0.58);
    const inset = Math.round(PAD * 0.9);

    if (accentLine) {
      elements.push(makeText({
        role: "hook",
        text: accentLine.toUpperCase(),
        x: inset, y: stripY + Math.round((H - stripY) * 0.06),
        width: W - inset * 2, height: hookSize * 2.2,
        fontSize: hookSize, fontFamily: SYSTEM_FONT, fontStyle: "bold",
        fill: accentColor, align: "left",
        lineHeight: 1.05, letterSpacing: -1,
        ...shadow, zIndex: 20,
      }));
    }

    if (bodyLine) {
      const bodyY = accentLine
        ? stripY + Math.round((H - stripY) * 0.06) + hookSize * 2.0
        : stripY + Math.round((H - stripY) * 0.08);
      elements.push(makeText({
        role: "supporting",
        text: bodyLine.toUpperCase(),
        x: inset, y: bodyY,
        width: W - inset * 2, height: supSize * 2.2,
        fontSize: Math.round(hookSize * 0.88), fontFamily: SYSTEM_FONT, fontStyle: "bold",
        fill: "#FFFFFF", align: "left",
        lineHeight: 1.05, letterSpacing: -1,
        ...shadow, zIndex: 20,
      }));
    }
  } else {
    /* Standard hook text — single element */
    elements.push(makeText({
      role: "hook",
      text: isBold ? hook.toUpperCase() : hook,
      x: textX, y: hookY,
      width: textWidth, height: hookSize * 3,
      fontSize: hookSize, fontFamily, fontStyle: isBold || !isMinimal ? "bold" : "",
      fill: textColor, align: textAlign,
      lineHeight: isBold ? 1.05 : isMinimal ? 1.4 : 1.22,
      letterSpacing: isBold ? -1 : 0,
      ...shadow, zIndex: 20,
    }));

    /* Supporting text */
    if (supporting) {
      const supY = hookY + hookSize * 3 + (isBold ? 10 : isMinimal ? 40 : 20);
      elements.push(makeText({
        role: "supporting",
        text: supporting,
        x: textX, y: supY,
        width: textWidth, height: supSize * 4,
        fontSize: supSize, fontFamily,
        fill: subColor, align: textAlign,
        lineHeight: isMinimal ? 1.8 : 1.5,
        ...shadow, zIndex: 15,
      }));
    }
  }

  /* Brand badge */
  elements.push(makeText({
    role: "brand",
    text: isBold || isFullbleed ? `@${brandName.toLowerCase()}` : brandName.toUpperCase(),
    x: PAD, y: H - H * 0.08,
    width: W - PAD * 2, height: brandSize * 2,
    fontSize: brandSize, fontStyle: "bold",
    fill: isPhoto || isDark
      ? hexA("#FFFFFF", isBoldBottomAnchored ? 0.55 : 0.7)
      : hexA(accentColor, 0.8),
    align: isCentered && !isBoldBottomAnchored ? "center" : "left",
    letterSpacing: isBold ? 1 : 0,
    ...shadow, zIndex: 25,
  }));

  /* ═══ BACKGROUND COLOR ═══ */
  let backgroundColor: string;
  if (isPhoto || isBoldBottomAnchored) {
    backgroundColor = "#0A0A0A";
  } else if (isDark) {
    backgroundColor = isDarkColor(pal.primary) ? pal.primary : "#0B0B12";
  } else if (isMinimal) {
    backgroundColor = "#FFFFFF";
  } else if (isSerif && luminance(pal.primary) > 0.75) {
    backgroundColor = pal.primary;
  } else if (isLight) {
    backgroundColor = isDarkColor(pal.primary) ? "#EEF0F6" : pal.primary;
  } else {
    backgroundColor = pal.primary;
  }

  _uid = 0;

  return {
    elements,
    backgroundColor,
    backgroundImage: backgroundImageUrl ?? null,
    templateName: "adaptive",
  };
}
