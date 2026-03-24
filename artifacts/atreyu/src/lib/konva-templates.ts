/* ── Konva Template Descriptors ──
   Each template function returns an array of AnyEditorElement[]
   that the Konva editor can render as interactive, draggable nodes.
*/

import type {
  AnyEditorElement,
  TextElement,
  RectElement,
  StyleProfile,
  StyleDesign,
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
  DISPLAY_FONT,
  CONDENSED_FONT,
  MONO_FONT,
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
  /** Background gradient (applied by renderer over the backgroundColor fill) */
  gradientDirection?: "none" | "top-bottom" | "bottom-top" | "radial";
  gradientColors?: [string, string];  /* [startColor, endColor] */
}

/* ═══════════════════════════════════════════
   ADAPTIVE TEMPLATE — driven by numeric design parameters from Claude Vision.
   No enum-to-template lookup. Every value from the style profile directly
   controls the corresponding visual property on the Konva canvas.
═══════════════════════════════════════════ */
export function generateTemplate(params: TemplateParams): TemplateResult {
  const { text, canvasWidth: W, canvasHeight: H, brandName, styleProfile, backgroundImageUrl } =
    params;
  const pal = styleProfile?.colorPalette ?? DEFAULT_PALETTE;
  const { hook, supporting } = extractHook(text);
  const highlight = styleProfile?.highlightPhrase;

  /* ── Read numeric design params (new format) with fallback to old enums ── */
  const typo = styleProfile?.typography;
  const lay  = styleProfile?.layout;

  /* Typography — use numeric values when available, derive from enums otherwise */
  const fontWeight   = typo?.fontWeight ?? (styleProfile?.typographyStyle === "bold" ? 800 : 400);
  const fontSizeR    = typo?.fontSizeRatio ?? (fontWeight >= 700 ? 1.3 : styleProfile?.typographyStyle === "minimal" ? 0.85 : 1.0);
  const textTransform = typo?.textTransform ?? (fontWeight >= 700 ? "uppercase" : "none");
  const lineHt       = typo?.lineHeight ?? (fontWeight >= 700 ? 1.05 : 1.22);
  const letterSp     = typo?.letterSpacing ?? (fontWeight >= 700 ? -1 : 0);
  const fontCat      = typo?.fontCategory ?? (styleProfile?.typographyStyle === "serif" ? "serif" : "sans-serif");
  const textAlignRaw = typo?.textAlign ?? (styleProfile?.layoutStyle === "centered" ? "center" : styleProfile?.layoutStyle === "left-aligned" || styleProfile?.layoutStyle === "editorial" ? "left" : "center");

  /* Layout — use numeric values when available, derive from enums otherwise */
  const hasBottomStrip  = lay?.hasBottomStrip ?? (fontWeight >= 700 && (styleProfile?.backgroundStyle === "photographic" || styleProfile?.layoutStyle === "fullbleed"));
  const stripStartY     = lay?.stripStartY ?? 0.58;
  const stripOpacity    = lay?.stripOpacity ?? 0.82;
  const hasTopBar       = lay?.hasTopAccentBar ?? (fontWeight >= 600 || styleProfile?.layoutStyle === "editorial");
  const hasLeftBar      = lay?.hasLeftAccentBar ?? (styleProfile?.layoutStyle === "editorial" || styleProfile?.layoutStyle === "left-aligned");
  const hasCard         = lay?.hasCardBackground ?? (styleProfile?.backgroundStyle === "light" || styleProfile?.backgroundStyle === "solid" || styleProfile?.backgroundStyle === "gradient");
  const overlayOpacity  = lay?.overlayOpacity ?? (!!backgroundImageUrl ? 0.35 : 0);
  const textPosY        = lay?.textPositionY ?? (hasBottomStrip ? stripStartY + 0.02 : 0.25);
  const textPosX        = lay?.textPositionX ?? 0.08;
  const textWidthR      = lay?.textWidthRatio ?? 0.84;

  /* Design — fine-grained visual DNA from the new design block */
  const des            = styleProfile?.design;
  const decElems       = des?.decorativeElements ?? [] as string[];
  const lineThickPx    = Math.max(2, Math.round(W * (des?.accentLineThickness ?? 0.005)));
  const hasDivider     = des?.hasDividerLine ?? false;
  const textTreatment  = des?.textTreatment ?? "plain";
  const hasFrameEl     = (des?.hasFrameBorder ?? false) || decElems.includes("frame-border");
  const frameBorderPx  = Math.max(2, Math.round(W * (des?.frameBorderThickness ?? 0.006)));
  const gradientDir    = (des?.gradientDirection ?? "none") as "none"|"top-bottom"|"bottom-top"|"radial";

  /* Map decorative element flags from both old layout fields and new design.decorativeElements */
  const hasTopLine     = hasTopBar || decElems.includes("top-line");
  const hasBottomLine  = decElems.includes("bottom-line");
  const hasHRule       = hasDivider || decElems.includes("horizontal-rule");
  const hasQuotes      = decElems.includes("quote-marks");
  const hasCircle      = decElems.includes("circle-accent");
  const hasCornerMark  = decElems.includes("corner-mark");

  /* ── Derived values ── */
  const isPhoto   = !!backgroundImageUrl || overlayOpacity > 0;
  const isDark    = isDarkColor(pal.primary) || styleProfile?.backgroundStyle === "dark";
  const hookSizeBase = Math.min(Math.round(W * 0.065), 90);
  const hookSize  = Math.min(Math.round(hookSizeBase * fontSizeR), 140);
  const supSize   = Math.round(hookSize * (fontWeight >= 700 ? 0.65 : 0.33));
  const brandSize = Math.round(W * 0.02);
  const PAD       = Math.round(W * textPosX);
  const textAlign = textAlignRaw as "left" | "center" | "right";
  const textX     = PAD;
  const textWidth = Math.round(W * textWidthR);
  /* Pick typeface to match the competitor's fontCategory + weight signal */
  let fontFamily: string;
  if (fontCat === "serif") {
    fontFamily = SERIF_FONT;
  } else if (fontCat === "mono") {
    fontFamily = MONO_FONT;
  } else if (fontCat === "display" || (fontWeight >= 800 && textTransform === "uppercase")) {
    fontFamily = DISPLAY_FONT;
  } else if (fontWeight >= 600) {
    fontFamily = CONDENSED_FONT;
  } else {
    fontFamily = SYSTEM_FONT;
  }
  const fontStyle  = fontWeight >= 600 ? "bold" : "";

  /* ── Colors from palette ── */
  const textColor   = isPhoto || isDark ? "#FFFFFF" : (pal.text || "#1A1A1A");
  const subColor    = isPhoto || isDark ? hexA("#FFFFFF", 0.6) : hexA(pal.text || "#1A1A1A", 0.55);
  const accentColor = pal.accent || "#6366f1";

  /* ── Shadows & stroke for text — driven by textTreatment ── */
  const heavyShadow = isPhoto || textTreatment === "heavy-shadow";
  const shadow = heavyShadow
    ? { shadowColor: "rgba(0,0,0,0.92)", shadowBlur: 32, shadowOffsetX: 0, shadowOffsetY: 3 }
    : { shadowColor: "rgba(0,0,0,0)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 };
  const strokeProps = textTreatment === "outlined"
    ? { stroke: isDark || isPhoto ? "#000000" : "#FFFFFF", strokeWidth: Math.max(2, Math.round(fontWeight / 200)) }
    : {} as Record<string, unknown>;

  const elements: AnyEditorElement[] = [];

  /* ═══ DECORATIONS — driven by layout + design params ═══ */

  /* ── Top accent line (replaces old top bar logic) ── */
  if (hasTopLine) {
    elements.push(makeRect({
      role: "decoration",
      x: 0, y: 0, width: W, height: lineThickPx,
      fill: accentColor, zIndex: 30,
    }));
  }

  /* ── Bottom accent line ── */
  if (hasBottomLine) {
    elements.push(makeRect({
      role: "decoration",
      x: 0, y: H - lineThickPx, width: W, height: lineThickPx,
      fill: accentColor, zIndex: 30,
    }));
  }

  /* ── Left accent bar ── */
  if ((hasLeftBar || decElems.includes("left-bar")) && !hasBottomStrip) {
    const barX = Math.round(PAD * 0.55);
    elements.push(makeRect({
      role: "decoration",
      x: barX, y: Math.round(H * 0.10), width: lineThickPx, height: Math.round(H * 0.77),
      fill: accentColor, zIndex: 5,
    }));
  }

  /* Full-image dark overlay (for photo backgrounds) */
  if (overlayOpacity > 0) {
    elements.push(makeRect({
      role: "overlay", x: 0, y: 0, width: W, height: H,
      fill: `rgba(0,0,0,${hasBottomStrip ? Math.min(overlayOpacity, 0.2) : overlayOpacity})`,
      zIndex: 5, locked: true, draggable: false,
    }));
  }

  /* Bottom dark strip */
  if (hasBottomStrip) {
    const sy = Math.round(H * stripStartY);
    elements.push(makeRect({
      role: "overlay", x: 0, y: sy, width: W, height: H - sy,
      fill: `rgba(0,0,0,${stripOpacity})`,
      zIndex: 8, locked: true, draggable: false,
    }));
  }

  /* Card background */
  if (hasCard && !isPhoto && !hasBottomStrip) {
    const cr = lay?.cardCornerRadius ?? Math.round(W * 0.028);
    const cardX = Math.round(W * 0.075);
    const cardY = Math.round(H * 0.09);
    const cardW = W - cardX * 2;
    const cardH = Math.round(H * 0.76);
    elements.push(makeRect({
      role: "card", x: cardX, y: cardY, width: cardW, height: cardH,
      fill: "#FFFFFF", cornerRadius: cr, zIndex: 3,
    }));
    elements.push(makeRect({
      role: "decoration", x: cardX, y: cardY, width: Math.round(W * 0.009), height: cardH,
      fill: accentColor, cornerRadius: cr, zIndex: 4,
    }));
  }

  /* ── Decorative quote marks (behind headline text) ── */
  if (hasQuotes && hook) {
    const qSize = Math.min(Math.round(hookSize * 3.5), 300);
    elements.push(makeText({
      role: "custom",
      text: "\u201C",
      x: Math.round(PAD * 0.5), y: Math.round(H * textPosY) - Math.round(qSize * 0.45),
      width: qSize, height: qSize,
      fontSize: qSize, fontFamily, fontStyle: "",
      fill: hexA(accentColor, 0.12),
      align: "left", lineHeight: 1, letterSpacing: 0,
      shadowColor: "rgba(0,0,0,0)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      zIndex: 6, draggable: false, locked: true,
    }));
  }

  /* ── Circle accent mark ── */
  if (hasCircle) {
    const circleR = Math.round(W * 0.045);
    const circleX = hasBottomStrip
      ? W - PAD - circleR * 2
      : PAD * 0.4;
    const circleY = hasBottomStrip
      ? Math.round(H * (stripStartY - 0.06))
      : Math.round(H * 0.05);
    elements.push(makeRect({
      role: "decoration",
      x: circleX, y: circleY,
      width: circleR * 2, height: circleR * 2,
      fill: hexA(accentColor, 0.85),
      cornerRadius: circleR,
      zIndex: 18,
    }));
  }

  /* ── Corner mark (small geometric accent at top-right or bottom-right) ── */
  if (hasCornerMark) {
    const cmSize = Math.round(W * 0.05);
    const cmThick = lineThickPx;
    /* Vertical part */
    elements.push(makeRect({
      role: "decoration",
      x: W - PAD * 0.8 - cmThick, y: Math.round(H * 0.04),
      width: cmThick, height: cmSize,
      fill: accentColor, zIndex: 27,
    }));
    /* Horizontal part */
    elements.push(makeRect({
      role: "decoration",
      x: W - PAD * 0.8 - cmSize, y: Math.round(H * 0.04),
      width: cmSize, height: cmThick,
      fill: accentColor, zIndex: 27,
    }));
  }

  /* ── Frame border (thin stroke rect around entire canvas) ── */
  if (hasFrameEl) {
    const fp = frameBorderPx;
    elements.push(makeRect({
      role: "decoration",
      x: fp, y: fp, width: W - fp * 2, height: H - fp * 2,
      fill: "transparent",
      stroke: accentColor, strokeWidth: fp,
      zIndex: 50,
    }));
  }

  /* ═══ TEXT ELEMENTS — all individually selectable/editable ═══ */

  const applyTransform = (t: string) => textTransform === "uppercase" ? t.toUpperCase() : t;
  const hookY = Math.round(H * textPosY);

  /* Highlight phrase as separate accent-colored text node (bottom strip style) */
  if (hasBottomStrip && highlight) {
    const { accentLine, bodyLine } = splitHeadline(hook, highlight);
    const sy = Math.round(H * stripStartY);
    const inset = Math.round(PAD * 0.9);

    if (accentLine) {
      elements.push(makeText({
        role: "hook",
        text: applyTransform(accentLine),
        x: inset, y: sy + Math.round((H - sy) * 0.06),
        width: W - inset * 2, height: hookSize * 2.2,
        fontSize: hookSize, fontFamily, fontStyle,
        fill: accentColor, align: textAlign,
        lineHeight: lineHt, letterSpacing: letterSp,
        ...shadow, zIndex: 20,
      }));
    }

    if (bodyLine) {
      const bodyY = accentLine
        ? sy + Math.round((H - sy) * 0.06) + hookSize * 2.0
        : sy + Math.round((H - sy) * 0.08);
      elements.push(makeText({
        role: "supporting",
        text: applyTransform(bodyLine),
        x: inset, y: bodyY,
        width: W - inset * 2, height: supSize * 2.2,
        fontSize: Math.round(hookSize * 0.88), fontFamily, fontStyle,
        fill: "#FFFFFF", align: textAlign,
        lineHeight: lineHt, letterSpacing: letterSp,
        ...shadow, zIndex: 20,
      }));
    }
  } else {
    /* Pill background behind hook text when textTreatment === "pill-bg" */
    if (textTreatment === "pill-bg") {
      const pillPadX = Math.round(hookSize * 0.4);
      const pillPadY = Math.round(hookSize * 0.18);
      elements.push(makeRect({
        role: "card",
        x: textX - pillPadX, y: hookY - pillPadY,
        width: textWidth + pillPadX * 2, height: hookSize * 3 + pillPadY * 2,
        fill: hexA(isDark || isPhoto ? "#000000" : pal.secondary, 0.62),
        cornerRadius: Math.round(hookSize * 0.22),
        zIndex: 19, locked: true, draggable: false,
      }));
    }

    /* Standard hook text */
    elements.push(makeText({
      role: "hook",
      text: applyTransform(hook),
      x: textX, y: hookY,
      width: textWidth, height: hookSize * 3,
      fontSize: hookSize, fontFamily, fontStyle,
      fill: textColor, align: textAlign,
      lineHeight: lineHt, letterSpacing: letterSp,
      ...shadow, ...strokeProps, zIndex: 20,
    }));

    /* Horizontal divider rule between hook and supporting text */
    if (hasHRule && supporting) {
      const ruleY = hookY + hookSize * 3 + Math.round(hookSize * 0.12);
      const ruleW = textAlign === "center"
        ? Math.round(textWidth * 0.35)
        : Math.round(textWidth * 0.22);
      const ruleX = textAlign === "center"
        ? textX + Math.round((textWidth - ruleW) / 2)
        : textX;
      elements.push(makeRect({
        role: "decoration",
        x: ruleX, y: ruleY,
        width: ruleW, height: lineThickPx,
        fill: accentColor, zIndex: 17,
      }));
    }

    /* Supporting text */
    if (supporting) {
      const supY = hookY + hookSize * 3
        + (hasHRule ? Math.round(hookSize * 0.55) : Math.round(hookSize * 0.3));
      elements.push(makeText({
        role: "supporting",
        text: supporting,
        x: textX, y: supY,
        width: textWidth, height: supSize * 4,
        fontSize: supSize, fontFamily,
        fill: subColor, align: textAlign,
        lineHeight: Math.max(lineHt, 1.3),
        ...shadow, zIndex: 15,
      }));
    }
  }

  /* Brand badge */
  elements.push(makeText({
    role: "brand",
    text: fontWeight >= 700 ? `@${brandName.toLowerCase()}` : brandName.toUpperCase(),
    x: PAD, y: H - H * 0.08,
    width: W - PAD * 2, height: brandSize * 2,
    fontSize: brandSize, fontStyle: "bold",
    fill: isPhoto || isDark
      ? hexA("#FFFFFF", hasBottomStrip ? 0.55 : 0.7)
      : hexA(accentColor, 0.8),
    align: textAlign === "center" && !hasBottomStrip ? "center" : "left",
    letterSpacing: fontWeight >= 700 ? 1 : 0,
    ...shadow, zIndex: 25,
  }));

  /* ═══ BACKGROUND COLOR ═══ */
  let backgroundColor: string;
  if (isPhoto || hasBottomStrip) {
    backgroundColor = "#0A0A0A";
  } else if (isDark) {
    backgroundColor = isDarkColor(pal.primary) ? pal.primary : "#0B0B12";
  } else if (hasCard) {
    backgroundColor = isDarkColor(pal.primary) ? "#EEF0F6" : pal.primary;
  } else {
    backgroundColor = pal.primary;
  }

  _uid = 0;

  /* Gradient colors derived from palette */
  const gradientColors: [string, string] = gradientDir === "bottom-top"
    ? [hexA(pal.secondary, 0.9), pal.primary]
    : [pal.primary, hexA(isDark ? "#000000" : pal.secondary, 0.85)];

  return {
    elements,
    backgroundColor,
    backgroundImage: backgroundImageUrl ?? null,
    templateName: "adaptive",
    gradientDirection: !isPhoto && gradientDir !== "none" ? gradientDir : "none",
    gradientColors,
  };
}
