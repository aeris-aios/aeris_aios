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
export interface StyleProfile {
  colorPalette: { primary: string; secondary: string; accent: string; text: string };
  mood: string;
  backgroundStyle: string;
  typographyStyle: string;
  layoutStyle: string;
  contentStyle: string;
  designNotes: string;
  copyTone?: string;
  backgroundImagePrompt?: string;
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
