import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Konva from "konva";
import type {
  AnyEditorElement,
  TextElement,
  ImageElement,
  StyleProfile,
  OutputFormat,
} from "@/types/content-editor";
import { useEditorState } from "@/hooks/use-editor-state";
import { generateTemplate } from "@/lib/konva-templates";
import { EditorToolbar } from "./editor-toolbar";

/* ── Image proxy for CORS ── */
function proxyImg(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/api/content/image-proxy?url=${encodeURIComponent(url)}`;
}

/* ── Load image helper ── */
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface ContentEditorProps {
  text: string;
  format: OutputFormat;
  styleProfile: StyleProfile | null;
  brandName: string;
  aiImageUrl?: string | null;
  onBack: () => void;
}

export function ContentEditor({
  text,
  format,
  styleProfile,
  brandName,
  aiImageUrl,
  onBack,
}: ContentEditorProps) {
  const W = format.canvasW;
  const H = format.canvasH;

  const template = useMemo(
    () =>
      generateTemplate({
        text,
        canvasWidth: W,
        canvasHeight: H,
        brandName,
        styleProfile,
        backgroundImageUrl: aiImageUrl,
      }),
    [text, W, H, brandName, styleProfile, aiImageUrl],
  );

  const editor = useEditorState(
    W,
    H,
    template.elements,
    template.backgroundImage,
    template.backgroundColor,
  );

  /* Keep a stable ref to editor callbacks to avoid stale closures in Konva handlers */
  const editorRef = useRef(editor);
  useEffect(() => { editorRef.current = editor; }, [editor]);

  /* Container for width measurement */
  const containerRef = useRef<HTMLDivElement>(null);
  /* Dedicated div that Konva mounts its canvas into */
  const konvaContainerRef = useRef<HTMLDivElement>(null);

  /* Konva objects — created once, mutated on state changes */
  const stageRef    = useRef<Konva.Stage | null>(null);
  const bgLayerRef  = useRef<Konva.Layer | null>(null);
  const mainLayerRef = useRef<Konva.Layer | null>(null);
  const trRef       = useRef<Konva.Transformer | null>(null);

  const [containerWidth, setContainerWidth] = useState(600);

  /* Responsive scaling */
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const maxDisplayWidth = Math.min(containerWidth, 700);
  const scale   = maxDisplayWidth / W;
  const displayW = W * scale;
  const displayH = H * scale;

  /* ── Create Konva Stage once when container mounts ── */
  useEffect(() => {
    const container = konvaContainerRef.current;
    if (!container) return;

    const stage = new Konva.Stage({ container, width: displayW, height: displayH });

    const bgLayer   = new Konva.Layer({ listening: false });
    const mainLayer = new Konva.Layer();
    const tr = new Konva.Transformer({
      keepRatio: true,
      boundBoxFunc: (_, newBox) => ({
        ...newBox,
        width:  Math.max(20, newBox.width),
        height: Math.max(20, newBox.height),
      }),
    });
    mainLayer.add(tr);
    stage.add(bgLayer);
    stage.add(mainLayer);

    /* Deselect on empty stage click */
    stage.on("click tap", (e) => {
      if (e.target === stage) editorRef.current.select(null);
    });

    stageRef.current    = stage;
    bgLayerRef.current  = bgLayer;
    mainLayerRef.current = mainLayer;
    trRef.current       = tr;

    /* Apply initial styling */
    Object.assign(stage.container().style, {
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    });

    return () => {
      stage.destroy();
      stageRef.current     = null;
      bgLayerRef.current   = null;
      mainLayerRef.current = null;
      trRef.current        = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); /* intentionally empty — stage is created once */

  /* ── Resize stage when display dimensions change ── */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.width(displayW);
    stage.height(displayH);
    stage.scaleX(scale);
    stage.scaleY(scale);
    stage.batchDraw();
  }, [displayW, displayH, scale]);

  /* ── Re-render canvas whenever editor state changes ── */
  useEffect(() => {
    const stage     = stageRef.current;
    const bgLayer   = bgLayerRef.current;
    const mainLayer = mainLayerRef.current;
    const tr        = trRef.current;
    if (!stage || !bgLayer || !mainLayer || !tr) return;

    /* ── Background layer ── */
    bgLayer.destroyChildren();

    bgLayer.add(new Konva.Rect({
      x: 0, y: 0, width: W, height: H,
      fill: editor.state.backgroundColor,
      listening: false,
    }));

    if (editor.state.backgroundImage) {
      loadImg(proxyImg(editor.state.backgroundImage)).then((img) => {
        const imgAR = img.width / img.height;
        const canAR = W / H;
        let cropX = 0, cropY = 0, cropW = img.width, cropH = img.height;
        if (imgAR > canAR) {
          cropW = Math.round(img.height * canAR);
          cropX = Math.round((img.width - cropW) / 2);
        } else {
          cropH = Math.round(img.width / canAR);
          cropY = Math.round((img.height - cropH) / 2);
        }
        bgLayer.add(new Konva.Image({
          image: img, x: 0, y: 0, width: W, height: H,
          crop: { x: cropX, y: cropY, width: cropW, height: cropH },
          listening: false,
        }));
        bgLayer.batchDraw();
      }).catch(() => {});
    }
    bgLayer.batchDraw();

    /* ── Main layer — destroy all except Transformer ── */
    const toDestroy = mainLayer.children.filter((c) => c !== tr);
    toDestroy.forEach((c) => c.destroy());
    tr.nodes([]);

    /* Sort elements by zIndex */
    const sorted = [...editor.state.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
      if (!el.visible) continue;

      /* ── Rect element ── */
      if (el.type === "rect") {
        const node = new Konva.Rect({
          id: el.id,
          x: el.x, y: el.y, width: el.width, height: el.height,
          fill: el.fill, cornerRadius: el.cornerRadius,
          stroke: el.stroke || undefined, strokeWidth: el.strokeWidth,
          opacity: el.opacity, rotation: el.rotation,
          draggable: el.draggable && !el.locked,
          listening: !el.locked,
        });
        node.on("click tap", () => { if (!el.locked) editorRef.current.select(el.id); });
        node.on("dragend", () => editorRef.current.updateElement(el.id, { x: node.x(), y: node.y() }));
        node.on("transformend", () => {
          const sx = node.scaleX(), sy = node.scaleY();
          node.scaleX(1); node.scaleY(1);
          editorRef.current.updateElement(el.id, {
            x: node.x(), y: node.y(),
            width:  Math.max(20, node.width()  * sx),
            height: Math.max(20, node.height() * sy),
            rotation: node.rotation(),
          });
        });
        mainLayer.add(node);
        if (el.id === editor.state.selectedId) tr.nodes([node]);
      }

      /* ── Text element ── */
      if (el.type === "text") {
        const textEl = el as TextElement;
        const node = new Konva.Text({
          id: el.id,
          x: el.x, y: el.y, width: el.width,
          text: textEl.text, fontSize: textEl.fontSize,
          fontFamily: textEl.fontFamily,
          fontStyle: textEl.fontStyle || undefined,
          fill: textEl.fill, align: textEl.align,
          lineHeight: textEl.lineHeight, letterSpacing: textEl.letterSpacing,
          textDecoration: textEl.textDecoration || undefined,
          opacity: el.opacity, rotation: el.rotation,
          draggable: el.draggable && !el.locked,
          shadowColor: textEl.shadowColor, shadowBlur: textEl.shadowBlur,
          shadowOffsetX: textEl.shadowOffsetX, shadowOffsetY: textEl.shadowOffsetY,
        });

        node.on("click tap", () => { if (!el.locked) editorRef.current.select(el.id); });
        node.on("dragend", () => editorRef.current.updateElement(el.id, { x: node.x(), y: node.y() }));
        node.on("transformend", () => {
          const sx = node.scaleX();
          node.scaleX(1); node.scaleY(1);
          editorRef.current.updateElement(el.id, {
            x: node.x(), y: node.y(),
            width: Math.max(50, node.width() * sx),
            rotation: node.rotation(),
          });
        });

        /* Double-click: inline textarea edit */
        node.on("dblclick dbltap", () => {
          const container = stage.container();
          const pos = node.absolutePosition();
          const currentScale = stageRef.current?.scaleX() ?? 1;

          node.hide();
          tr.hide();
          mainLayer.batchDraw();

          const textarea = document.createElement("textarea");
          container.parentElement?.appendChild(textarea);
          textarea.value = textEl.text;

          Object.assign(textarea.style, {
            position: "absolute",
            top:  `${container.offsetTop  + pos.y * currentScale}px`,
            left: `${container.offsetLeft + pos.x * currentScale}px`,
            width:      `${textEl.width   * currentScale}px`,
            minHeight:  `${textEl.height  * currentScale}px`,
            fontSize:   `${textEl.fontSize * currentScale}px`,
            fontFamily: textEl.fontFamily,
            fontWeight: textEl.fontStyle?.includes("bold")   ? "bold"   : "normal",
            fontStyle:  textEl.fontStyle?.includes("italic") ? "italic" : "normal",
            textAlign:  textEl.align,
            color:      textEl.fill,
            background: "rgba(0,0,0,0.6)",
            border:     "2px solid #6366f1",
            borderRadius: "4px",
            padding: "4px", margin: "0",
            overflow: "hidden", resize: "none", outline: "none",
            lineHeight: String(textEl.lineHeight),
            zIndex: "1000",
          } as Partial<CSSStyleDeclaration>);

          textarea.focus();

          const finishEdit = () => {
            editorRef.current.updateElement(el.id, { text: textarea.value });
            textarea.remove();
            node.show();
            tr.show();
            mainLayer.batchDraw();
          };

          textarea.addEventListener("blur", finishEdit, { once: true });
          textarea.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { textarea.value = textEl.text; textarea.blur(); }
            if (e.key === "Enter" && !e.shiftKey) textarea.blur();
          });
        });

        mainLayer.add(node);

        if (el.id === editor.state.selectedId) {
          tr.nodes([node]);
          tr.enabledAnchors(["middle-left", "middle-right"]);
          tr.boundBoxFunc((_, nb) => ({ ...nb, width: Math.max(50, nb.width) }));
          tr.keepRatio(false);
        }
      }

      /* ── Image element ── */
      if (el.type === "image") {
        const imgEl = el as ImageElement;
        if (imgEl.role === "background") continue; /* handled in bg layer */
        const capturedId = el.id;
        loadImg(proxyImg(imgEl.src)).then((img) => {
          const node = new Konva.Image({
            id: capturedId,
            image: img,
            x: imgEl.x, y: imgEl.y, width: imgEl.width, height: imgEl.height,
            rotation: imgEl.rotation, opacity: imgEl.opacity,
            draggable: imgEl.draggable && !imgEl.locked,
          });
          node.on("click tap", () => { if (!imgEl.locked) editorRef.current.select(capturedId); });
          node.on("dragend", () => editorRef.current.updateElement(capturedId, { x: node.x(), y: node.y() }));
          node.on("transformend", () => {
            const sx = node.scaleX(), sy = node.scaleY();
            node.scaleX(1); node.scaleY(1);
            editorRef.current.updateElement(capturedId, {
              x: node.x(), y: node.y(),
              width:  Math.max(20, node.width()  * sx),
              height: Math.max(20, node.height() * sy),
              rotation: node.rotation(),
            });
          });
          mainLayer.add(node);
          if (capturedId === editorRef.current.state.selectedId) tr.nodes([node]);
          mainLayer.batchDraw();
        }).catch(() => {});
      }
    }

    mainLayer.batchDraw();
  }, [editor.state, W, H, scale]); /* re-render when editor state changes */

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      const ed = editorRef.current;
      if ((e.key === "Delete" || e.key === "Backspace") && ed.state.selectedId) {
        const sel = ed.selectedElement;
        if (sel && !sel.locked) ed.removeElement(ed.state.selectedId);
      }
      if (e.key === "Escape") ed.select(null);
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); ed.undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" &&  e.shiftKey) { e.preventDefault(); ed.redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── Export ── */
  const handleExport = useCallback(
    (fileFormat: "png" | "jpeg", quality: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const uri = stage.toDataURL({
        pixelRatio: W / displayW,
        mimeType: fileFormat === "jpeg" ? "image/jpeg" : "image/png",
        quality,
      });
      const a = document.createElement("a");
      a.download = `aeris-${format.id}.${fileFormat}`;
      a.href = uri;
      a.click();
    },
    [W, displayW, format.id],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto">
      {/* Canvas area */}
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full px-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl neu-raised-sm text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <span className="text-lg leading-none">&larr;</span> Back to results
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{W}&times;{H}px</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{format.label}</span>
          </div>
        </div>

        {/* Width measurement wrapper */}
        <div ref={containerRef} className="w-full flex justify-center" style={{ position: "relative" }}>
          {/* Konva mounts its canvas into this div */}
          <div ref={konvaContainerRef} />
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Click to select &middot; Double-click text to edit &middot; Drag to move &middot;
          Delete key to remove &middot; {"\u2318"}Z undo &middot; {"\u2318"}Shift+Z redo
        </p>
      </div>

      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        format={format}
        styleProfile={styleProfile}
        brandName={brandName}
        text={text}
        onExport={handleExport}
      />
    </div>
  );
}
