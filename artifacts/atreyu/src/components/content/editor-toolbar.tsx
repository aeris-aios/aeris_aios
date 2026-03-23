import { useState, useRef } from "react";
import {
  Type, ImagePlus, Image as ImageIcon, Download, Undo2, Redo2,
  Trash2, Loader2, Plus, Upload, Palette, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import type {
  AnyEditorElement,
  TextElement,
  ImageElement,
  StyleProfile,
  OutputFormat,
} from "@/types/content-editor";
import type { useEditorState } from "@/hooks/use-editor-state";
import { extractHook } from "@/lib/content-templates";
import { SYSTEM_FONT, SERIF_FONT } from "@/lib/content-templates";

type Editor = ReturnType<typeof useEditorState>;

interface EditorToolbarProps {
  editor: Editor;
  format: OutputFormat;
  styleProfile: StyleProfile | null;
  brandName: string;
  text: string;
  onExport: (format: "png" | "jpeg", quality: number) => void;
}

/* ── Collapsible panel wrapper ── */
function Panel({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="neu-card rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export function EditorToolbar({
  editor,
  format,
  styleProfile,
  brandName,
  text,
  onExport,
}: EditorToolbarProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportQuality, setExportQuality] = useState(0.92);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const sel = editor.selectedElement;
  const isTextSelected = sel?.type === "text";
  const textEl = isTextSelected ? (sel as TextElement) : null;

  /* ── Generate AI background ── */
  const generateAiBackground = async (customPrompt?: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { hook } = extractHook(text);
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook,
          contentStyle: styleProfile?.contentStyle,
          formatId: format.id,
          brandColors: styleProfile?.colorPalette
            ? [styleProfile.colorPalette.primary, styleProfile.colorPalette.accent]
            : undefined,
          brandName,
          userPrompt: customPrompt?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Image generation failed");
      }
      const { imageUrl } = await res.json();
      editor.setBackgroundImage(imageUrl);
      setAiPromptOpen(false);
    } catch (err: any) {
      setAiError(err?.message ?? "AI background generation failed");
    }
    setAiLoading(false);
  };

  /* ── Upload background image ── */
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.setBackgroundImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ── Upload logo (preserves natural aspect ratio) ── */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = Math.round(format.canvasW * 0.25);
        const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
        const w = Math.min(maxW, img.naturalWidth);
        const h = Math.round(w * ratio);
        const logoEl: ImageElement = {
          id: `logo-${Date.now()}`,
          type: "image",
          x: format.canvasW * 0.05,
          y: format.canvasH * 0.82,
          width: w,
          height: h,
          rotation: 0,
          draggable: true,
          visible: true,
          opacity: 1,
          zIndex: 50,
          locked: false,
          src,
          keepRatio: true,
          role: "logo",
        };
        editor.addElement(logoEl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ── Add new text element ── */
  const addTextElement = () => {
    const newText: TextElement = {
      id: `txt-custom-${Date.now()}`,
      type: "text",
      x: format.canvasW * 0.1,
      y: format.canvasH * 0.4,
      width: format.canvasW * 0.8,
      height: 60,
      rotation: 0,
      draggable: true,
      visible: true,
      opacity: 1,
      zIndex: 25,
      locked: false,
      text: "Your text here",
      fontSize: Math.round(format.canvasW * 0.04),
      fontFamily: SYSTEM_FONT,
      fontStyle: "",
      fill: editor.state.backgroundImage ? "#FFFFFF" : "#1A1A1A",
      align: "center",
      lineHeight: 1.3,
      letterSpacing: 0,
      textDecoration: "",
      shadowColor: editor.state.backgroundImage ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
      shadowBlur: editor.state.backgroundImage ? 12 : 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      role: "custom",
    };
    editor.addElement(newText);
    editor.select(newText.id);
  };

  return (
    <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
      {/* Undo / Redo */}
      <div className="flex gap-2">
        <button
          onClick={editor.undo}
          disabled={!editor.canUndo}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl neu-raised-sm text-xs font-medium disabled:opacity-30"
        >
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button
          onClick={editor.redo}
          disabled={!editor.canRedo}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl neu-raised-sm text-xs font-medium disabled:opacity-30"
        >
          <Redo2 className="h-3.5 w-3.5" /> Redo
        </button>
      </div>

      {/* ── TEXT PANEL ── */}
      <Panel title="Text" icon={Type}>
        <button
          onClick={addTextElement}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Text
        </button>

        {textEl && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              Selected: {textEl.role}
            </p>

            {/* Font size */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-10">Size</label>
              <input
                type="range"
                min={12}
                max={Math.round(format.canvasW * 0.12)}
                value={textEl.fontSize}
                onChange={(e) =>
                  editor.updateElement(textEl.id, { fontSize: Number(e.target.value) })
                }
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-mono w-8 text-right">{textEl.fontSize}</span>
            </div>

            {/* Font family */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-10">Font</label>
              <select
                value={textEl.fontFamily}
                onChange={(e) =>
                  editor.updateElement(textEl.id, { fontFamily: e.target.value })
                }
                className="flex-1 text-xs rounded-lg neu-inset-sm px-2 py-1.5 bg-transparent border-0"
              >
                <option value={SYSTEM_FONT}>System (Sans)</option>
                <option value={SERIF_FONT}>Georgia (Serif)</option>
                <option value="'Courier New',monospace">Courier (Mono)</option>
              </select>
            </div>

            {/* Bold / Italic / Alignment */}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const isBold = textEl.fontStyle.includes("bold");
                  const isItalic = textEl.fontStyle.includes("italic");
                  const newStyle = [!isBold ? "bold" : "", isItalic ? "italic" : ""]
                    .filter(Boolean)
                    .join(" ") as TextElement["fontStyle"];
                  editor.updateElement(textEl.id, { fontStyle: newStyle || "" });
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                  textEl.fontStyle.includes("bold")
                    ? "bg-primary text-primary-foreground"
                    : "neu-raised-sm"
                }`}
              >
                <Bold className="h-3.5 w-3.5 mx-auto" />
              </button>
              <button
                onClick={() => {
                  const isBold = textEl.fontStyle.includes("bold");
                  const isItalic = textEl.fontStyle.includes("italic");
                  const newStyle = [isBold ? "bold" : "", !isItalic ? "italic" : ""]
                    .filter(Boolean)
                    .join(" ") as TextElement["fontStyle"];
                  editor.updateElement(textEl.id, { fontStyle: newStyle || "" });
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs ${
                  textEl.fontStyle.includes("italic")
                    ? "bg-primary text-primary-foreground"
                    : "neu-raised-sm"
                }`}
              >
                <Italic className="h-3.5 w-3.5 mx-auto" />
              </button>
              <div className="w-px bg-border/40" />
              {(["left", "center", "right"] as const).map((align) => {
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                return (
                  <button
                    key={align}
                    onClick={() => editor.updateElement(textEl.id, { align })}
                    className={`flex-1 py-1.5 rounded-lg text-xs ${
                      textEl.align === align
                        ? "bg-primary text-primary-foreground"
                        : "neu-raised-sm"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 mx-auto" />
                  </button>
                );
              })}
            </div>

            {/* Color */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-10">Color</label>
              <input
                type="color"
                value={textEl.fill}
                onChange={(e) =>
                  editor.updateElement(textEl.id, { fill: e.target.value })
                }
                className="w-8 h-8 rounded-lg border-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-muted-foreground">{textEl.fill}</span>
            </div>

            {/* Delete */}
            <button
              onClick={() => editor.removeElement(textEl.id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-red-500 border border-red-500/20 hover:bg-red-500/5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove Text
            </button>
          </div>
        )}
      </Panel>

      {/* ── BACKGROUND PANEL ── */}
      <Panel title="Background" icon={ImageIcon}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBgUpload}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setAiPromptOpen(p => !p)}
            disabled={aiLoading}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl neu-raised-sm text-xs font-semibold hover:ring-1 hover:ring-primary/20 disabled:opacity-50 transition-all"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ImagePlus className="h-4 w-4 text-violet-500" />
            )}
            {aiLoading ? "Generating..." : "AI Generate"}
            {!aiLoading && (aiPromptOpen
              ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
              : <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl neu-raised-sm text-xs font-semibold hover:ring-1 hover:ring-primary/20 transition-all"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            Upload Image
          </button>
        </div>

        {/* AI prompt input — expands when "AI Generate" is toggled */}
        {aiPromptOpen && !aiLoading && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] text-muted-foreground">
              Describe what you want to see, or leave blank for an auto-generated scene.
            </p>
            <textarea
              value={userPrompt}
              onChange={e => setUserPrompt(e.target.value)}
              placeholder="e.g. Lush tropical rainforest at golden hour, no text…"
              rows={3}
              className="w-full text-xs rounded-lg neu-inset-sm px-3 py-2 bg-transparent border-0 resize-none placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <button
              onClick={() => generateAiBackground(userPrompt)}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {userPrompt.trim() ? "Generate with my prompt" : "Auto-generate"}
            </button>
          </div>
        )}

        {aiError && (
          <p className="text-[10px] text-red-400 text-center">{aiError}</p>
        )}

        {/* Background color (when no image) */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground flex-shrink-0">BG Color</label>
          <input
            type="color"
            value={editor.state.backgroundColor}
            onChange={(e) => editor.setBackgroundColor(e.target.value)}
            className="w-8 h-8 rounded-lg border-0 cursor-pointer"
          />
          {editor.state.backgroundImage && (
            <button
              onClick={() => editor.setBackgroundImage(null)}
              className="ml-auto text-[10px] text-red-400 hover:text-red-500"
            >
              Remove image
            </button>
          )}
        </div>

        {/* Style palette quick-picks */}
        {styleProfile && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              Style Palette
            </p>
            <div className="flex gap-1.5">
              {Object.entries(styleProfile.colorPalette).map(([key, color]) => (
                <button
                  key={key}
                  onClick={() => editor.setBackgroundColor(color)}
                  className="w-8 h-8 rounded-lg neu-raised-sm border border-white/20 transition-transform hover:scale-110"
                  style={{ background: color }}
                  title={`${key}: ${color}`}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* ── LOGO PANEL ── */}
      <Panel title="Logo" icon={Palette} defaultOpen={false}>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />

        <button
          onClick={() => logoInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-primary/30 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" /> Upload Logo
        </button>

        <p className="text-[10px] text-muted-foreground text-center">
          Upload a PNG with transparent background for best results.
          Drag and resize on the canvas.
        </p>

        {/* Show existing logo elements for quick removal */}
        {editor.state.elements
          .filter((el): el is ImageElement => el.type === "image" && el.role === "logo")
          .map((logo) => (
            <div
              key={logo.id}
              className="flex items-center justify-between p-2 rounded-lg neu-inset-sm"
            >
              <span className="text-xs text-muted-foreground">Logo</span>
              <button
                onClick={() => editor.removeElement(logo.id)}
                className="text-red-400 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
      </Panel>

      {/* ── EXPORT PANEL ── */}
      <Panel title="Export" icon={Download}>
        <div className="flex gap-2">
          {(["png", "jpeg"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                exportFormat === fmt
                  ? "bg-primary text-primary-foreground"
                  : "neu-raised-sm text-muted-foreground"
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>

        {exportFormat === "jpeg" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Quality</label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={exportQuality}
              onChange={(e) => setExportQuality(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-xs font-mono w-8">{Math.round(exportQuality * 100)}%</span>
          </div>
        )}

        <button
          onClick={() => onExport(exportFormat, exportQuality)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:bg-primary/90 transition-all"
        >
          <Download className="h-4 w-4" />
          Download {format.label} ({exportFormat.toUpperCase()})
        </button>

        <p className="text-[10px] text-muted-foreground text-center">
          Full resolution: {format.canvasW}&times;{format.canvasH}px
        </p>
      </Panel>
    </div>
  );
}
