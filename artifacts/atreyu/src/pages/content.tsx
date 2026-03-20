import { useState, useEffect, useCallback } from "react";
import {
  PenTool, Wand2, ChevronRight, ChevronLeft, CheckCircle2, Loader2,
  Repeat2, TrendingUp, HeartHandshake, LayoutTemplate, Layers,
  Copy, Check, Download, Palette, Building2, Globe, Link,
  Instagram, Youtube, Twitter, Linkedin, Facebook, Share2, FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSSE } from "@/hooks/use-sse";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

/* ─────────────── Types ─────────────── */
type SourceMode   = "brand_kit" | "social_import";
type Platform     = "instagram" | "facebook" | "linkedin" | "twitter" | "tiktok" | "youtube";
type Method       = "standard" | "viral_replication" | "trend_surfing" | "pain_point";
type WritingStyle = "adam_robinson" | "brand_voice" | "custom";

type OutputFormat = {
  id: string; label: string; sublabel: string;
  w: number; h: number;           /* display ratio */
  canvasW: number; canvasH: number; /* actual export px */
  platforms: string; contentType: string;
  isText?: boolean; isCarousel?: boolean;
};

interface CarouselSlide { number?: number; heading: string; subtitle: string; takeaway: string; }
interface CarouselStructure {
  title: string; brandName: string; accentColor: string;
  slides: CarouselSlide[]; ctaText: string; ctaSubtitle: string;
}

/* ─────────────── Constants ─────────────── */
const FORMATS: OutputFormat[] = [
  { id:"linkedin_post", label:"LinkedIn Post",   sublabel:"Text-only post",          w:4,  h:3,  canvasW:1200, canvasH:628,  platforms:"LinkedIn",                   contentType:"linkedin_post", isText:true   },
  { id:"carousel",      label:"Carousel",        sublabel:"Multi-slide swipe post",  w:4,  h:5,  canvasW:1080, canvasH:1350, platforms:"LinkedIn · Instagram",        contentType:"linkedin_post", isCarousel:true },
  { id:"square",        label:"Square 1:1",      sublabel:"Feed image",              w:1,  h:1,  canvasW:1080, canvasH:1080, platforms:"Instagram · Facebook",        contentType:"social"          },
  { id:"portrait",      label:"Portrait 4:5",    sublabel:"Tall feed image",         w:4,  h:5,  canvasW:1080, canvasH:1350, platforms:"Instagram · LinkedIn",        contentType:"social"          },
  { id:"vertical",      label:"Vertical 9:16",   sublabel:"Reels / TikTok",          w:9,  h:16, canvasW:1080, canvasH:1920, platforms:"Instagram · TikTok · YouTube",contentType:"social"          },
  { id:"story",         label:"Story 9:16",      sublabel:"Instagram / Facebook",    w:9,  h:16, canvasW:1080, canvasH:1920, platforms:"Instagram · Facebook",        contentType:"social"          },
  { id:"landscape",     label:"Landscape 16:9",  sublabel:"YouTube / video",         w:16, h:9,  canvasW:1920, canvasH:1080, platforms:"YouTube · LinkedIn",          contentType:"social"          },
  { id:"youtube_short", label:"YouTube Short",   sublabel:"60s vertical",            w:9,  h:16, canvasW:1080, canvasH:1920, platforms:"YouTube",                    contentType:"social"          },
];

const METHODS = [
  { id:"standard",          label:"Standard",          icon:PenTool,        desc:"Compelling post from your brief"           },
  { id:"viral_replication", label:"Viral Replication", icon:Repeat2,        desc:"Clone structure of a proven viral post"    },
  { id:"trend_surfing",     label:"Trend Surfing",     icon:TrendingUp,     desc:"Connect a trend to your expertise"         },
  { id:"pain_point",        label:"Pain Point",        icon:HeartHandshake, desc:"Pain → Insight → Solution framework"       },
] as const;

const PLATFORMS = [
  { id:"instagram" as Platform, label:"Instagram",  example:"instagram.com/username"  },
  { id:"facebook"  as Platform, label:"Facebook",   example:"facebook.com/pagename"   },
  { id:"linkedin"  as Platform, label:"LinkedIn",   example:"linkedin.com/in/username" },
  { id:"twitter"   as Platform, label:"X / Twitter",example:"x.com/username"           },
  { id:"tiktok"    as Platform, label:"TikTok",     example:"tiktok.com/@username"     },
  { id:"youtube"   as Platform, label:"YouTube",    example:"youtube.com/@channel"     },
];

function detectPlatform(url: string): Platform | null {
  if (/instagram\.com/i.test(url))      return "instagram";
  if (/facebook\.com/i.test(url))       return "facebook";
  if (/linkedin\.com/i.test(url))       return "linkedin";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  if (/tiktok\.com/i.test(url))         return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  return null;
}

/* ─────────────── Canvas download ─────────────── */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    if (line) out.push(line);
    out.push(""); // paragraph gap
  }
  return out;
}

async function exportToImage(
  text: string, fmt: OutputFormat, brandName: string, variantNum: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width  = fmt.canvasW;
  canvas.height = fmt.canvasH;
  const ctx = canvas.getContext("2d")!;

  /* Background */
  ctx.fillStyle = "#F8F7F5";
  ctx.fillRect(0, 0, fmt.canvasW, fmt.canvasH);

  /* Subtle gradient overlay */
  const grad = ctx.createLinearGradient(0, 0, 0, fmt.canvasH);
  grad.addColorStop(0, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(240,238,235,0.8)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, fmt.canvasW, fmt.canvasH);

  /* Accent line */
  ctx.fillStyle = "#6366f1";
  ctx.fillRect(80, 80, 80, 4);

  const PAD  = 90;
  const maxW = fmt.canvasW - PAD * 2;

  /* Clean text (strip markdown) */
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .trim();

  /* Font size based on canvas width and text length */
  const baseFontSize = fmt.canvasW >= 1920 ? 44 : fmt.canvasW >= 1200 ? 38 : 34;
  const dynamicSize  = clean.length > 600 ? Math.max(26, baseFontSize - 8) : baseFontSize;
  ctx.font      = `${dynamicSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = "#1A1A1A";
  ctx.textBaseline = "top";

  const lines      = wrapLines(ctx, clean, maxW);
  const lineH      = dynamicSize * 1.55;
  const totalTextH = lines.length * lineH;
  const startY     = Math.max(PAD + 40, (fmt.canvasH - totalTextH - 120) / 2);

  let y = startY;
  for (const line of lines) {
    if (!line) { y += lineH * 0.45; continue; }
    ctx.fillText(line, PAD, y);
    y += lineH;
    if (y > fmt.canvasH - 140) { ctx.fillText("…", PAD, y); break; }
  }

  /* Bottom brand strip */
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(0, fmt.canvasH - 80, fmt.canvasW, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fmt.canvasW >= 1920 ? 24 : 20}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(brandName.toUpperCase(), PAD, fmt.canvasH - 40);

  if (variantNum > 1) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `${fmt.canvasW >= 1920 ? 18 : 15}px -apple-system, Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(`Version ${variantNum}`, fmt.canvasW - PAD, fmt.canvasH - 40);
    ctx.textAlign = "left";
  }

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), "image/png", 1.0));
}

async function downloadVariant(
  text: string, fmt: OutputFormat, brandName: string,
  variantNum: number, toast: (t: any) => void,
) {
  try {
    const blob = await exportToImage(text, fmt, brandName, variantNum);
    const file = new File([blob], `atreyu-${fmt.id}-v${variantNum}.png`, { type: "image/png" });

    /* Mobile: try Web Share API first (saves to camera roll) */
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `ATREYU — ${fmt.label}` });
      return;
    }

    /* Desktop: trigger download */
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast({ title: "Downloaded", description: `${fmt.label} — Version ${variantNum} saved as PNG` });
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      toast({ title: "Download failed", variant: "destructive" });
    }
  }
}

/* ─────────────── Step indicator ─────────────── */
const STEPS = ["Source", "Brief", "Format"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const done = i < step, current = i === step;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done    ? "bg-primary border-primary text-primary-foreground" :
                current ? "bg-primary/10 border-primary text-primary" :
                          "bg-muted/50 border-border text-muted-foreground"
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-20 h-0.5 mb-4 mx-2 rounded-full transition-colors ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Format visual card ─────────────── */
function FormatCard({ fmt, selected, onClick }: { fmt: OutputFormat; selected: boolean; onClick: () => void }) {
  const maxH = 72, maxW = 90;
  const ratio = fmt.w / fmt.h;
  const displayH = ratio < 1 ? maxH : Math.round(maxW / ratio);
  const displayW = ratio < 1 ? Math.round(maxH * ratio) : maxW;
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center w-full ${
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
      }`}>
      <div className="flex items-center justify-center" style={{ height: maxH + 4, width: maxW + 4 }}>
        <div className={`rounded-lg flex items-center justify-center transition-colors ${selected ? "bg-primary/20 border-2 border-primary/40" : "bg-muted/60 border-2 border-border"}`}
          style={{ width: displayW, height: displayH }}>
          {fmt.isText && (
            <div className="flex flex-col gap-1 p-1 w-full px-2">
              {[100, 80, 90, 60].map((w, i) => (
                <div key={i} className={`h-1 rounded-full ${selected ? "bg-primary/40" : "bg-muted-foreground/30"}`} style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
          {fmt.isCarousel && (
            <div className="flex gap-0.5 items-stretch h-full py-1 px-1">
              {[0,1,2].map(i => <div key={i} className={`flex-1 rounded-sm ${selected ? "bg-primary/40" : "bg-muted-foreground/30"}`} style={{ opacity: 1 - i * 0.25 }} />)}
            </div>
          )}
        </div>
      </div>
      <div>
        <p className={`text-sm font-semibold leading-tight ${selected ? "text-primary" : "text-foreground"}`}>{fmt.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{fmt.sublabel}</p>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-tight">{fmt.platforms}</p>
      </div>
      {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
    </button>
  );
}

/* ─────────────── Skeleton loading card ─────────────── */
function SkeletonCard({ fmt, index, total }: { fmt: OutputFormat; index: number; total: number }) {
  const ratio = fmt.w / fmt.h;
  const isWide = ratio > 1;
  const cardW = total === 1 ? (isWide ? 600 : 280) : (isWide ? 420 : 220);
  const cardH = Math.round(cardW / ratio);

  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0" style={{ width: cardW }}>
      <div className="relative rounded-2xl overflow-hidden border border-border w-full bg-muted/40" style={{ height: cardH }}>
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        {/* Skeleton lines */}
        <div className="p-6 space-y-3">
          {Array.from({ length: Math.min(8, Math.floor(cardH / 40)) }).map((_, i) => (
            <div key={i} className="h-3 rounded-full bg-muted-foreground/15 animate-pulse"
              style={{ width: `${[100, 85, 92, 70, 88, 75, 95, 60][i % 8]}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        {/* Bottom strip skeleton */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-muted-foreground/10" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Writing version {index + 1}{total > 1 ? ` of ${total}` : ""}…</span>
      </div>
    </div>
  );
}

/* ─────────────── Content output card ─────────────── */
function ContentCard({
  text, variantNum, totalVariants, fmt, brandName, streaming,
}: {
  text: string; variantNum: number; totalVariants: number; fmt: OutputFormat;
  brandName: string; streaming: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = async () => {
    setDownloading(true);
    await downloadVariant(text, fmt, brandName, variantNum, toast);
    setDownloading(false);
  };

  const isMobile = navigator.maxTouchPoints > 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationPlayState: streaming ? "running" : "paused", opacity: streaming ? 1 : 0 }} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {totalVariants > 1 ? `Version ${variantNum}` : fmt.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopy} disabled={!text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
            {copied ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
          <button onClick={handleDownload} disabled={!text || streaming || downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
            {downloading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : isMobile
                ? <><Share2 className="h-3 w-3" /> Save to Camera Roll</>
                : <><Download className="h-3 w-3" /> Download PNG</>}
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="p-6 flex-1 min-h-[160px]">
        {text ? (
          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{text}</ReactMarkdown>
            {streaming && variantNum === totalVariants && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle rounded-sm" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Generating…
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Carousel preview ─────────────── */
function CarouselPreview({ data }: { data: CarouselStructure }) {
  const [copied, setCopied] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const { toast } = useToast();
  const accent = data.accentColor ?? "#6366f1";
  const carouselFmt = FORMATS.find(f => f.id === "carousel")!;

  const allSlides = [
    { heading: data.title, subtitle: "", takeaway: "", isCover: true },
    ...data.slides,
    { heading: data.ctaText, subtitle: data.ctaSubtitle, takeaway: "", isCta: true },
  ];

  const copySlide = (slide: any, idx: number) => {
    navigator.clipboard.writeText([slide.heading, slide.subtitle, slide.takeaway ? `"${slide.takeaway}"` : ""].filter(Boolean).join("\n\n"));
    setCopied(idx); setTimeout(() => setCopied(null), 1800);
  };

  const downloadSlide = async (slide: any, idx: number) => {
    setDownloading(idx);
    const text = [slide.heading, slide.subtitle, slide.takeaway].filter(Boolean).join("\n\n");
    await downloadVariant(text, carouselFmt, data.brandName ?? "BRAND", idx + 1, toast);
    setDownloading(null);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-3">
        {allSlides.map((slide, idx) => {
          const isCover = idx === 0, isCta = idx === allSlides.length - 1;
          return (
            <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="rounded-xl overflow-hidden border border-border"
                style={{ width: 120, aspectRatio: "4/5", background: "#F5F3EE", fontFamily: "Georgia,serif", position: "relative" }}>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:20, background:"#1A1A1A",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#fff", fontSize:5.5, fontFamily:"sans-serif", fontWeight:700, letterSpacing:1 }}>
                    {data.brandName?.toUpperCase() ?? "BRAND"}
                  </span>
                </div>
                <div style={{ padding:"8px 8px 26px", height:"100%", display:"flex", flexDirection:"column", boxSizing:"border-box" }}>
                  {isCover ? (
                    <>
                      <div style={{ height:1.5, width:28, background:accent, margin:"3px auto 6px" }} />
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <p style={{ fontSize:7, fontWeight:700, color:"#1A1A1A", textAlign:"center", lineHeight:1.3 }}>{slide.heading}</p>
                      </div>
                      <p style={{ fontSize:5, color:"#999", textAlign:"center", fontFamily:"sans-serif" }}>swipe →</p>
                    </>
                  ) : isCta ? (
                    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3 }}>
                      <div style={{ width:12, height:12, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ color:"#fff", fontSize:6 }}>✓</span>
                      </div>
                      <p style={{ fontSize:6, fontWeight:700, color:"#1A1A1A", textAlign:"center", lineHeight:1.3 }}>{slide.heading}</p>
                      <p style={{ fontSize:4.5, color:"#888", textAlign:"center", fontFamily:"sans-serif", lineHeight:1.4 }}>{slide.subtitle}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:5.5, fontWeight:700, color:"#fff" }}>{(slide as any).number}</span>
                        </div>
                        <p style={{ fontSize:5.5, fontWeight:700, color:"#1A1A1A", lineHeight:1.2 }}>{slide.heading}</p>
                      </div>
                      <p style={{ fontSize:4.5, color:"#555", lineHeight:1.4, fontFamily:"sans-serif" }}>{slide.subtitle}</p>
                      {slide.takeaway && <p style={{ fontSize:4, fontStyle:"italic", color:"#333", textAlign:"center", marginTop:2 }}>"{slide.takeaway}"</p>}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => copySlide(slide, idx)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                  {copied === idx ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                </button>
                <button onClick={() => downloadSlide(slide, idx)}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                  {downloading === idx ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Download all */}
      <button
        onClick={async () => {
          for (let i = 0; i < allSlides.length; i++) {
            const s = allSlides[i];
            const t = [s.heading, s.subtitle, (s as any).takeaway].filter(Boolean).join("\n\n");
            await downloadVariant(t, carouselFmt, data.brandName ?? "BRAND", i + 1, toast);
          }
        }}
        className="flex items-center gap-2 text-xs text-primary hover:underline">
        <FileImage className="h-3.5 w-3.5" /> Download all slides as PNG
      </button>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slide Content</p>
        {data.slides.map((s, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: accent + "22", color: accent }}>{s.number ?? i + 1}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{s.heading}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</p>
              {s.takeaway && <p className="text-xs italic text-muted-foreground/70 mt-1">"{s.takeaway}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
export default function ContentStudio() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [brand, setBrand] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/brand/profile").then(r => r.json()).then(p => { if (p?.name) setBrand({ name: p.name }); }).catch(() => {});
  }, []);

  /* ── Wizard state ── */
  const [step, setStep] = useState(0);

  /* Step 1 */
  const [sourceMode, setSourceMode]   = useState<SourceMode | null>(null);
  const [socialUrl, setSocialUrl]     = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);

  /* Step 2 */
  const [brief, setBrief]             = useState("");
  const [audience, setAudience]       = useState("");
  const [method, setMethod]           = useState<Method>("standard");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("adam_robinson");
  const [customStyle, setCustomStyle] = useState("");
  const [originalPost, setOriginalPost] = useState("");

  /* Step 3 */
  const [formatId, setFormatId]       = useState<string | null>(null);
  const [slideCount, setSlideCount]   = useState(7);
  const [versionCount, setVersionCount] = useState(1);

  /* Generation */
  const { stream, data: rawText, isStreaming, setData } = useSSE();
  const [generated, setGenerated]     = useState(false);
  const [variants, setVariants]       = useState<string[]>([]);
  const [carouselData, setCarouselData]   = useState<CarouselStructure | null>(null);
  const [carouselLoading, setCarouselLoading] = useState(false);

  const selectedFormat = FORMATS.find(f => f.id === formatId);
  const brandName = brand?.name ?? "ATREYU";

  /* Detect platform from URL */
  useEffect(() => { setDetectedPlatform(detectPlatform(socialUrl)); }, [socialUrl]);

  /* Parse variants from raw stream text */
  useEffect(() => {
    if (!rawText) return;
    if (versionCount <= 1) {
      setVariants([rawText]);
      return;
    }
    /* Split by "Version X:" or "Variant X:" markers */
    const parts = rawText.split(/\*{0,2}(?:version|variant)\s*\d+:?\*{0,2}/gi).map(s => s.trim()).filter(Boolean);
    setVariants(parts.length > 0 ? parts : [rawText]);
  }, [rawText, versionCount]);

  /* Navigation guards */
  const canNext = (
    (step === 0 && (sourceMode === "brand_kit" || (sourceMode === "social_import" && socialUrl.trim().length > 5))) ||
    (step === 1 && brief.trim().length > 0) ||
    (step === 2 && !!formatId)
  );

  const goNext = () => { if (step < 2) setStep(s => s + 1); };
  const goBack = () => setStep(s => s - 1);

  /* Generate */
  const handleGenerate = async () => {
    if (!formatId) return;
    setData("");
    setCarouselData(null);
    setVariants([]);
    setGenerated(true);
    const fmt = FORMATS.find(f => f.id === formatId)!;
    await stream("/api/content/generate", {
      type: fmt.contentType, platform: fmt.platforms.split("·")[0].trim(),
      context: brief, audience, model: "sonnet", method, writingStyle, customStyle,
      originalPost: method === "viral_replication" ? originalPost : "",
      format: fmt.isCarousel ? "text_carousel" : "text_only",
      variants: versionCount,
      socialProfileUrl: sourceMode === "social_import" ? socialUrl : "",
    });
  };

  /* Build carousel */
  const handleCarousel = async () => {
    setCarouselLoading(true);
    try {
      const res = await fetch("/api/content/carousel/structure", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: brief, slideCount, audience, model: "sonnet", postText: rawText ?? "" }),
      });
      const data = await res.json();
      setCarouselData(data);
      toast({ title: "Carousel built", description: `${data.slides?.length ?? 0} slides ready.` });
    } catch { toast({ title: "Carousel generation failed", variant: "destructive" }); }
    finally { setCarouselLoading(false); }
  };

  const startOver = () => {
    setStep(0); setSourceMode(null); setSocialUrl(""); setBrief(""); setAudience("");
    setMethod("standard"); setFormatId(null); setVersionCount(1);
    setGenerated(false); setVariants([]); setCarouselData(null); setData("");
  };

  /* ═══ RENDER ═══ */
  return (
    <div className="max-w-5xl mx-auto space-y-2 animate-in fade-in duration-500 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <PenTool className="h-8 w-8 text-primary" /> Content Studio
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Create high-converting content in three steps.</p>
        </div>
        {generated && (
          <Button variant="outline" onClick={startOver} className="text-sm border-border">
            ← Start Over
          </Button>
        )}
      </div>

      {/* ── GENERATED OUTPUT ── */}
      {generated ? (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedFormat && <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{selectedFormat.label}</span>}
            <span className="text-xs text-muted-foreground">{selectedFormat?.platforms}</span>
            {versionCount > 1 && <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">{versionCount} versions</span>}
          </div>

          {/* Loading skeletons OR content cards */}
          {isStreaming && variants.length < versionCount ? (
            <div className={`flex gap-5 overflow-x-auto pb-2 ${versionCount === 1 ? "justify-center" : ""}`}>
              {Array.from({ length: versionCount }).map((_, i) => (
                <div key={i} className="flex-shrink-0" style={{ width: versionCount === 1 ? "100%" : versionCount === 2 ? "48%" : "32%" }}>
                  <SkeletonCard fmt={selectedFormat!} index={i} total={versionCount} />
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-5 ${versionCount === 1 ? "grid-cols-1" : versionCount === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"}`}>
              {(variants.length > 0 ? variants : [rawText ?? ""]).map((text, i) => (
                <ContentCard
                  key={i} text={text} variantNum={i + 1} totalVariants={versionCount}
                  fmt={selectedFormat!} brandName={brandName} streaming={isStreaming && i === variants.length - 1}
                />
              ))}
              {/* Show empty skeleton placeholders for versions not yet available */}
              {isStreaming && variants.length < versionCount && Array.from({ length: versionCount - variants.length }).map((_, i) => (
                <SkeletonCard key={`skel-${i}`} fmt={selectedFormat!} index={variants.length + i} total={versionCount} />
              ))}
            </div>
          )}

          {/* Carousel builder */}
          {selectedFormat?.isCarousel && !isStreaming && rawText && (
            <div>
              {!carouselData ? (
                <Button onClick={handleCarousel} disabled={carouselLoading} variant="outline"
                  className="w-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10">
                  {carouselLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Building carousel slides…</>
                    : <><Layers className="h-4 w-4 mr-2" />Build Carousel Slides ({slideCount} slides)</>}
                </Button>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" /> Carousel Preview
                    </span>
                    <span className="text-xs text-muted-foreground">{carouselData.slides.length + 2} slides · 1080×1350</span>
                  </div>
                  <CarouselPreview data={carouselData} />
                </div>
              )}
            </div>
          )}
        </div>

      ) : (
        /* ═══ WIZARD ═══ */
        <div>
          <StepBar step={step} />

          {/* STEP 1 — SOURCE */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">Where should ATREYU pull your brand from?</h2>
                <p className="text-sm text-muted-foreground mt-1">Your brand identity shapes every word of the output.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brand Kit */}
                <div role="button" tabIndex={0}
                  onClick={() => setSourceMode("brand_kit")}
                  onKeyDown={e => e.key === "Enter" && setSourceMode("brand_kit")}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    sourceMode === "brand_kit" ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                  }`}>
                  {sourceMode === "brand_kit" && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Use My Brand Kit</p>
                      <p className="text-xs text-muted-foreground">Recommended</p>
                    </div>
                  </div>
                  {brand ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">{brand.name} configured</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">Uses your saved brand identity, voice, colours, and style examples.</p>
                      <span onClick={e => { e.stopPropagation(); navigate("/brand"); }}
                        className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                        <Palette className="h-3 w-3" /> Set up Brand Kit first →
                      </span>
                    </div>
                  )}
                  {brand && <p className="text-sm text-muted-foreground mt-1">Uses your saved voice, colours, and style examples.</p>}
                </div>

                {/* Social import */}
                <button onClick={() => setSourceMode("social_import")}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                    sourceMode === "social_import" ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                  }`}>
                  {sourceMode === "social_import" && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Import Social Profile</p>
                      <p className="text-xs text-muted-foreground">Match a profile's style</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Paste a social profile link — ATREYU will analyse their style and replicate it.</p>
                  <div className="flex items-center gap-3 mt-3">
                    {[{ color:"#E1306C", I:Instagram }, { color:"#1877F2", I:Facebook }, { color:"#0A66C2", I:Linkedin }, { color:"#000", I:Twitter }, { color:"#FF0000", I:Youtube }]
                      .map(({ color, I }, i) => <I key={i} className="h-5 w-5" style={{ color }} />)}
                    <span className="text-xs text-muted-foreground">+ TikTok</span>
                  </div>
                </button>
              </div>

              {sourceMode === "social_import" && (
                <div className="space-y-3 p-5 rounded-2xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Profile URL</label>
                    {detectedPlatform && <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{detectedPlatform} detected</span>}
                  </div>
                  <Input value={socialUrl} onChange={e => setSocialUrl(e.target.value)}
                    placeholder="e.g. instagram.com/nike or linkedin.com/in/username" className="bg-card border-border" />
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => setSocialUrl(`https://${p.example}`)}
                        className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — BRIEF */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">What do you want to say?</h2>
                <p className="text-sm text-muted-foreground mt-1">Give ATREYU a clear brief — the more specific, the better the output.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Your Message / Topic *</label>
                <Textarea value={brief} onChange={e => setBrief(e.target.value)}
                  placeholder="e.g. We just hit 10,000 customers in 18 months without paid ads. Share the exact 3-step content strategy, specific numbers, and why most people get step 2 wrong."
                  className="bg-muted/60 border-border min-h-[120px] text-sm" />
                <p className="text-xs text-muted-foreground">Include specific numbers, stories, or angles you want covered.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Target Audience</label>
                <Input value={audience} onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. SaaS founders, D2C marketing managers, freelancers scaling to agency…" className="bg-muted/60 border-border" />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Content Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {METHODS.map(m => {
                    const Icon = m.icon; const active = method === m.id;
                    return (
                      <button key={m.id} onClick={() => setMethod(m.id as Method)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{m.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {method === "viral_replication" && (
                <div className="space-y-2 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Repeat2 className="h-4 w-4 text-amber-500" /> Paste the Original Viral Post
                  </label>
                  <Textarea value={originalPost} onChange={e => setOriginalPost(e.target.value)}
                    placeholder="Paste the viral post here. ATREYU keeps the hook structure and adapts the topic to your brand."
                    className="bg-card border-border min-h-[100px] text-sm" />
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-semibold">Writing Style</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id:"adam_robinson", label:"Adam Robinson", desc:"Raw · conversational · real numbers" },
                    { id:"brand_voice",   label:"Brand Voice",   desc:"Your Brand Kit voice profile"       },
                    { id:"custom",        label:"Custom",        desc:"Describe your own style"             },
                  ].map(s => (
                    <button key={s.id} onClick={() => setWritingStyle(s.id as WritingStyle)}
                      className={`flex-1 min-w-[140px] text-left p-3 rounded-xl border-2 transition-all ${writingStyle === s.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                      <p className={`text-sm font-semibold ${writingStyle === s.id ? "text-primary" : "text-foreground"}`}>{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
                {writingStyle === "custom" && (
                  <Textarea value={customStyle} onChange={e => setCustomStyle(e.target.value)}
                    placeholder="Describe the writing style — tone, sentence length, words to avoid…"
                    className="bg-muted/60 border-border min-h-[80px] text-sm" />
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — FORMAT */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold">Choose your output format</h2>
                <p className="text-sm text-muted-foreground mt-1">Select where and how this content will be published.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {FORMATS.map(fmt => (
                  <FormatCard key={fmt.id} fmt={fmt} selected={formatId === fmt.id} onClick={() => setFormatId(fmt.id)} />
                ))}
              </div>

              {/* Carousel slide count */}
              {formatId === "carousel" && (
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-muted/30">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Number of slides:</span>
                  <div className="flex gap-1.5">
                    {[5, 7, 9, 11].map(n => (
                      <button key={n} onClick={() => setSlideCount(n)}
                        className={`w-9 h-8 text-sm rounded-lg border transition-colors ${n === slideCount ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Version count */}
              <div className="p-5 rounded-2xl border border-border bg-muted/20 space-y-3">
                <div>
                  <p className="text-sm font-semibold">How many versions do you want?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ATREYU generates multiple takes so you can pick the best one.</p>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} onClick={() => setVersionCount(n)}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        n === versionCount ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}>
                      {n === 1 ? "1 version" : `${n} versions`}
                    </button>
                  ))}
                </div>
              </div>

              {selectedFormat && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Selected: <strong className="text-foreground">{selectedFormat.label}</strong> · {selectedFormat.platforms} · {versionCount} version{versionCount > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            <Button variant="outline" onClick={goBack} disabled={step === 0} className="border-border">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={goNext} disabled={!canNext} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6">
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!canNext || isStreaming}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 shadow-[0_0_20px_rgba(0,150,255,0.3)]">
                <Wand2 className={`h-4 w-4 mr-2 ${isStreaming ? "animate-spin" : ""}`} />
                Generate {versionCount > 1 ? `${versionCount} Versions` : "Content"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
