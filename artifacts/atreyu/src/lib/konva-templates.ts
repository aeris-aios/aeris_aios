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

export function generateTemplate(params: TemplateParams): TemplateResult {
  const { text, canvasWidth: W, canvasHeight: H, brandName, styleProfile, backgroundImageUrl } =
    params;
  const pal = styleProfile?.colorPalette ?? DEFAULT_PALETTE;
  const { hook, supporting } = extractHook(text);
  const templateName = pickTemplate(styleProfile, !!backgroundImageUrl);

  let elements: AnyEditorElement[];
  let backgroundColor: string;

  switch (templateName) {
    case "cinematic": {
      const bgBase = isDarkColor(pal.primary) ? pal.primary : "#0B0B12";
      backgroundColor = bgBase;
      elements = cinematicTemplate(W, H, pal, hook, supporting, brandName);
      break;
    }
    case "editorial": {
      const bgColor =
        !isDarkColor(pal.primary) && luminance(pal.primary) > 0.75 ? pal.primary : "#FAF9F6";
      backgroundColor = bgColor;
      elements = editorialTemplate(W, H, pal, hook, supporting, brandName);
      break;
    }
    case "photo": {
      backgroundColor = "#000000";
      elements = photoTemplate(W, H, pal, hook, supporting, brandName);
      break;
    }
    case "modern":
    default: {
      const bgLight = isDarkColor(pal.primary) ? "#EEF0F6" : pal.primary;
      backgroundColor = bgLight;
      elements = modernTemplate(W, H, pal, hook, supporting, brandName);
      break;
    }
  }

  // Reset uid counter to avoid collisions in subsequent calls
  _uid = 0;

  return {
    elements,
    backgroundColor,
    backgroundImage: backgroundImageUrl ?? null,
    templateName,
  };
}
