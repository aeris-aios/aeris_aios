import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type {
  AnyEditorElement,
  TextElement,
  ImageElement,
  RectElement,
  StyleProfile,
  OutputFormat,
} from "@/types/content-editor";
import { useEditorState } from "@/hooks/use-editor-state";
import { generateTemplate } from "@/lib/konva-templates";
import { extractHook } from "@/lib/content-templates";
import { EditorToolbar } from "./editor-toolbar";

/* ── Image proxy for CORS ── */
function proxyImg(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/api/content/image-proxy?url=${encodeURIComponent(url)}`;
}

/* ── Background image component ── */
function BackgroundImage({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) {
  const [image] = useImage(proxyImg(src), "anonymous");
  if (!image) return null;

  /* Cover-fill the canvas */
  const imgAR = image.width / image.height;
  const canAR = width / height;
  let cropX = 0,
    cropY = 0,
    cropW = image.width,
    cropH = image.height;
  if (imgAR > canAR) {
    cropW = Math.round(image.height * canAR);
    cropX = Math.round((image.width - cropW) / 2);
  } else {
    cropH = Math.round(image.width / canAR);
    cropY = Math.round((image.height - cropH) / 2);
  }

  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      crop={{ x: cropX, y: cropY, width: cropW, height: cropH }}
      listening={false}
    />
  );
}

/* ── Logo image element ── */
function LogoElement({
  el,
  isSelected,
  onSelect,
  onChange,
}: {
  el: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (props: Partial<ImageElement>) => void;
}) {
  const [image] = useImage(proxyImg(el.src), "anonymous");
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        draggable={el.draggable && !el.locked}
        opacity={el.opacity}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio={el.keepRatio}
          boundBoxFunc={(_, newBox) => ({
            ...newBox,
            width: Math.max(20, newBox.width),
            height: Math.max(20, newBox.height),
          })}
        />
      )}
    </>
  );
}

/* ── Editable text element ── */
function EditableText({
  el,
  isSelected,
  onSelect,
  onChange,
  stageRef,
  scale,
}: {
  el: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (props: Partial<TextElement>) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  scale: number;
}) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  /* Double-click opens a textarea overlay for editing */
  const handleDblClick = useCallback(() => {
    const textNode = shapeRef.current;
    const stage = stageRef.current;
    if (!textNode || !stage) return;

    /* Hide Konva text while editing */
    textNode.hide();
    trRef.current?.hide();
    textNode.getLayer()?.batchDraw();

    const container = stage.container();
    const textPos = textNode.absolutePosition();
    const areaPos = {
      x: container.offsetLeft + textPos.x * scale,
      y: container.offsetTop + textPos.y * scale,
    };

    const textarea = document.createElement("textarea");
    container.parentElement?.appendChild(textarea);
    textarea.value = el.text;

    Object.assign(textarea.style, {
      position: "absolute",
      top: `${areaPos.y}px`,
      left: `${areaPos.x}px`,
      width: `${el.width * scale}px`,
      minHeight: `${el.height * scale}px`,
      fontSize: `${el.fontSize * scale}px`,
      fontFamily: el.fontFamily,
      fontWeight: el.fontStyle.includes("bold") ? "bold" : "normal",
      fontStyle: el.fontStyle.includes("italic") ? "italic" : "normal",
      textAlign: el.align,
      color: el.fill,
      background: "rgba(0,0,0,0.6)",
      border: "2px solid #6366f1",
      borderRadius: "4px",
      padding: "4px",
      margin: "0",
      overflow: "hidden",
      resize: "none",
      outline: "none",
      lineHeight: String(el.lineHeight),
      zIndex: "1000",
    } satisfies Partial<CSSStyleDeclaration>);

    textarea.focus();

    const finishEdit = () => {
      onChange({ text: textarea.value });
      textarea.remove();
      textNode.show();
      trRef.current?.show();
      textNode.getLayer()?.batchDraw();
    };

    textarea.addEventListener("blur", finishEdit, { once: true });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        textarea.value = el.text; // revert
        textarea.blur();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        textarea.blur();
      }
    });
  }, [el, scale, stageRef, onChange]);

  return (
    <>
      <Text
        ref={shapeRef}
        x={el.x}
        y={el.y}
        width={el.width}
        height={undefined} /* let text auto-wrap height */
        text={el.text}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily}
        fontStyle={el.fontStyle || undefined}
        fill={el.fill}
        align={el.align}
        lineHeight={el.lineHeight}
        letterSpacing={el.letterSpacing}
        textDecoration={el.textDecoration || undefined}
        opacity={el.opacity}
        rotation={el.rotation}
        draggable={el.draggable && !el.locked}
        shadowColor={el.shadowColor}
        shadowBlur={el.shadowBlur}
        shadowOffsetX={el.shadowOffsetX}
        shadowOffsetY={el.shadowOffsetY}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * scaleX),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={["middle-left", "middle-right"]}
          boundBoxFunc={(_, newBox) => ({
            ...newBox,
            width: Math.max(50, newBox.width),
          })}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   MAIN CONTENT EDITOR
═══════════════════════════════════════════ */
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

  /* Generate initial template elements */
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

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  /* Responsive scaling */
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const maxDisplayWidth = Math.min(containerWidth, 700);
  const scale = maxDisplayWidth / W;
  const displayW = W * scale;
  const displayH = H * scale;

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "INPUT") return;

      if ((e.key === "Delete" || e.key === "Backspace") && editor.state.selectedId) {
        const sel = editor.selectedElement;
        if (sel && !sel.locked) {
          editor.removeElement(editor.state.selectedId);
        }
      }
      if (e.key === "Escape") {
        editor.select(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        editor.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

  /* Deselect on stage click */
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      editor.select(null);
    }
  };

  /* Sort elements by zIndex for rendering order */
  const sortedElements = useMemo(
    () => [...editor.state.elements].sort((a, b) => a.zIndex - b.zIndex),
    [editor.state.elements],
  );

  /* Export high-res */
  const handleExport = useCallback(
    (fileFormat: "png" | "jpeg", quality: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const uri = stage.toDataURL({
        pixelRatio: W / displayW,
        mimeType: fileFormat === "jpeg" ? "image/jpeg" : "image/png",
        quality,
      });
      const link = document.createElement("a");
      link.download = `aeris-${format.id}.${fileFormat}`;
      link.href = uri;
      link.click();
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

        <div
          ref={containerRef}
          className="w-full flex justify-center"
          style={{ position: "relative" }}
        >
          <Stage
            ref={stageRef}
            width={displayW}
            height={displayH}
            scaleX={scale}
            scaleY={scale}
            onClick={handleStageClick}
            onTap={handleStageClick}
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            {/* Background layer */}
            <Layer listening={false}>
              <Rect x={0} y={0} width={W} height={H} fill={editor.state.backgroundColor} />
              {editor.state.backgroundImage && (
                <BackgroundImage src={editor.state.backgroundImage} width={W} height={H} />
              )}
            </Layer>

            {/* Content layer — interactive elements */}
            <Layer>
              {sortedElements.map((el) => {
                if (!el.visible) return null;
                const isSelected = el.id === editor.state.selectedId;

                switch (el.type) {
                  case "text":
                    return (
                      <EditableText
                        key={el.id}
                        el={el}
                        isSelected={isSelected}
                        onSelect={() => !el.locked && editor.select(el.id)}
                        onChange={(props) => editor.updateElement(el.id, props)}
                        stageRef={stageRef}
                        scale={scale}
                      />
                    );

                  case "image":
                    if (el.role === "background") return null; /* handled in bg layer */
                    return (
                      <LogoElement
                        key={el.id}
                        el={el}
                        isSelected={isSelected}
                        onSelect={() => !el.locked && editor.select(el.id)}
                        onChange={(props) => editor.updateElement(el.id, props)}
                      />
                    );

                  case "rect":
                    return (
                      <Rect
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        fill={el.fill}
                        cornerRadius={el.cornerRadius}
                        stroke={el.stroke || undefined}
                        strokeWidth={el.strokeWidth}
                        opacity={el.opacity}
                        rotation={el.rotation}
                        draggable={el.draggable && !el.locked}
                        listening={!el.locked}
                        onClick={() => !el.locked && editor.select(el.id)}
                        onTap={() => !el.locked && editor.select(el.id)}
                        onDragEnd={(e) => {
                          editor.updateElement(el.id, {
                            x: e.target.x(),
                            y: e.target.y(),
                          });
                        }}
                      />
                    );

                  default:
                    return null;
                }
              })}
            </Layer>
          </Stage>
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
