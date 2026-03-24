/* ── Content Editor Types ── */

export interface EditorElement {
  id: string;
  type: "text" | "image" | "rect" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  draggable: boolean;
  visible: boolean;
  opacity: number;
  /** Rendering order — higher = on top */
  zIndex: number;
  /** Lock element from editing */
  locked: boolean;
}

export interface TextElement extends EditorElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "" | "bold" | "italic" | "bold italic";
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  textDecoration: "" | "underline" | "line-through";
  /** Shadow for readability on photo backgrounds */
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  /** Outline / stroke (for "outlined" text treatment) */
  stroke?: string;
  strokeWidth?: number;
  /** Role helps identify special elements */
  role: "hook" | "supporting" | "brand" | "custom";
}

export interface ImageElement extends EditorElement {
  type: "image";
  src: string;
  /** Keep aspect ratio when resizing */
  keepRatio: boolean;
  role: "logo" | "background" | "custom";
}

export interface RectElement extends EditorElement {
  type: "rect";
  fill: string;
  cornerRadius: number;
  stroke: string;
  strokeWidth: number;
  role: "decoration" | "card" | "overlay";
}

export interface CircleElement extends EditorElement {
  type: "circle";
  fill: string;
  radius: number;
  stroke: string;
  strokeWidth: number;
}

export interface LineElement extends EditorElement {
  type: "line";
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export type AnyEditorElement =
  | TextElement
  | ImageElement
  | RectElement
  | CircleElement
  | LineElement;

export interface EditorState {
  /** Canvas dimensions (full resolution) */
  canvasWidth: number;
  canvasHeight: number;
  /** Background image URL (AI-generated or user-uploaded) */
  backgroundImage: string | null;
  /** Background solid color (fallback when no image) */
  backgroundColor: string;
  /** All elements on the canvas */
  elements: AnyEditorElement[];
  /** Currently selected element ID */
  selectedId: string | null;
  /** Undo/redo stacks */
  history: AnyEditorElement[][];
  historyIndex: number;
}

export type EditorAction =
  | { type: "SET_ELEMENTS"; elements: AnyEditorElement[] }
  | { type: "ADD_ELEMENT"; element: AnyEditorElement }
  | { type: "UPDATE_ELEMENT"; id: string; props: Partial<AnyEditorElement> }
  | { type: "REMOVE_ELEMENT"; id: string }
  | { type: "SELECT"; id: string | null }
  | { type: "SET_BACKGROUND_IMAGE"; url: string | null }
  | { type: "SET_BACKGROUND_COLOR"; color: string }
  | { type: "REORDER"; id: string; direction: "up" | "down" | "top" | "bottom" }
  | { type: "UNDO" }
  | { type: "REDO" };

/* ── Style profile (shared with existing code) ── */
/* New format: Claude Vision returns numeric design parameters instead of enum labels.
   The template engine uses these values directly — no category-to-template lookup. */
export interface StyleTypography {
  fontWeight: number;       /* 100-900 */
  fontSizeRatio: number;    /* 0.7 = small, 1.0 = standard, 1.4+ = large */
  textTransform: string;    /* "uppercase" | "none" | "capitalize" */
  lineHeight: number;       /* 0.9 = tight, 1.2 = standard, 1.5+ = airy */
  letterSpacing: number;    /* -2 to 3 */
  fontCategory: string;     /* "sans-serif" | "serif" | "display" | "mono" */
  textAlign: string;        /* "left" | "center" | "right" */
}

export interface StyleLayout {
  textPositionY: number;    /* 0.0 = top, 0.5 = middle, 0.7 = bottom */
  textPositionX: number;    /* left padding ratio, typically 0.08 */
  textWidthRatio: number;   /* 0.5 = narrow, 0.84 = standard, 0.95 = edge-to-edge */
  hasBottomStrip: boolean;
  stripStartY: number;      /* where dark strip begins, 0.55-0.65 typical */
  stripOpacity: number;     /* 0.7-0.9 */
  hasTopAccentBar: boolean;
  hasLeftAccentBar: boolean;
  hasCardBackground: boolean;
  cardCornerRadius: number;
  overlayOpacity: number;   /* 0 = none, 0.2-0.4 = typical for photo posts */
}

/** Fine-grained visual DNA — decorative elements, text treatment, gradients */
export interface StyleDesign {
  /** Which recurring decorative marks appear on this account's graphics */
  decorativeElements: string[];
  /* "top-line" | "bottom-line" | "left-bar" | "horizontal-rule"
     | "circle-accent" | "corner-mark" | "frame-border" | "quote-marks" */

  /** How the accent lines are sized (fraction of canvas width: 0.003 = thin, 0.015 = thick) */
  accentLineThickness: number;

  /** Thin line separating headline from body text */
  hasDividerLine: boolean;

  /** How text is visually treated */
  textTreatment: "plain" | "heavy-shadow" | "outlined" | "pill-bg";

  /** Whether a thin border rectangle frames the entire graphic */
  hasFrameBorder: boolean;

  /** Frame border thickness as fraction of canvas width */
  frameBorderThickness: number;

  /** Background gradient type — "none" = solid/photo, no gradient */
  gradientDirection: "none" | "top-bottom" | "bottom-top" | "radial";
}

export interface StyleProfile {
  colorPalette: { primary: string; secondary: string; accent: string; text: string };
  /* New structured fields (returned by updated Claude Vision prompt) */
  typography?: StyleTypography;
  layout?: StyleLayout;
  design?: StyleDesign;
  /* Legacy enum fields (kept for backward compatibility with existing data) */
  mood: string;
  backgroundStyle: string;
  typographyStyle: string;
  layoutStyle: string;
  contentStyle: string;
  designNotes: string;
  copyTone?: string;
  backgroundImagePrompt?: string;
  highlightPhrase?: string;
}

export interface OutputFormat {
  id: string;
  label: string;
  sublabel: string;
  w: number;
  h: number;
  canvasW: number;
  canvasH: number;
  platforms: string;
  contentType: string;
  isText?: boolean;
  isCarousel?: boolean;
}
