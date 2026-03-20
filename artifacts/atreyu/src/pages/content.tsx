import { useState, useEffect, useRef } from "react";
import {
  PenTool, Wand2, ChevronRight, ChevronLeft, CheckCircle2, Loader2,
  Repeat2, TrendingUp, HeartHandshake, LayoutTemplate, Layers,
  Copy, Check, Download, Palette, Building2, Globe, Link,
  Instagram, Youtube, Twitter, Linkedin, Facebook, Share2, FileImage,
  Users, Eye, AlertCircle, Sparkles,
} from "lucide-react";
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
  w: number; h: number;
  canvasW: number; canvasH: number;
  platforms: string; contentType: string;
  isText?: boolean; isCarousel?: boolean;
};

interface StyleProfile {
  colorPalette: { primary: string; secondary: string; accent: string; text: string };
  mood: string;
  backgroundStyle: string;
  typographyStyle: string;
  layoutStyle: string;
  contentStyle: string;
  designNotes: string;
  copyTone?: string;
}

interface ProfilePost { imageUrl: string; caption: string; likes: number; }
interface ProfileData {
  platform: string; handle: string; username: string; fullName: string;
  bio: string; followers: number; postsCount: number;
  profilePicUrl: string; posts: ProfilePost[];
}

interface CarouselSlide { number?: number; heading: string; subtitle: string; takeaway: string; }
interface CarouselStructure {
  title: string; brandName: string; accentColor: string;
  slides: CarouselSlide[]; ctaText: string; ctaSubtitle: string;
}

/* ─────────────── Format constants ─────────────── */
const FORMATS: OutputFormat[] = [
  { id:"linkedin_post", label:"LinkedIn Post",  sublabel:"Text post",          w:4,  h:3,  canvasW:1200, canvasH:628,  platforms:"LinkedIn",                   contentType:"linkedin_post", isText:true    },
  { id:"carousel",      label:"Carousel",       sublabel:"Swipe post",         w:4,  h:5,  canvasW:1080, canvasH:1350, platforms:"LinkedIn · Instagram",        contentType:"linkedin_post", isCarousel:true},
  { id:"square",        label:"Square 1:1",     sublabel:"Feed image",         w:1,  h:1,  canvasW:1080, canvasH:1080, platforms:"Instagram · Facebook",        contentType:"social"          },
  { id:"portrait",      label:"Portrait 4:5",   sublabel:"Tall feed",          w:4,  h:5,  canvasW:1080, canvasH:1350, platforms:"Instagram · LinkedIn",        contentType:"social"          },
  { id:"vertical",      label:"Vertical 9:16",  sublabel:"Reels · TikTok",     w:9,  h:16, canvasW:1080, canvasH:1920, platforms:"Instagram · TikTok · YouTube",contentType:"social"          },
  { id:"story",         label:"Story 9:16",     sublabel:"IG · Facebook",      w:9,  h:16, canvasW:1080, canvasH:1920, platforms:"Instagram · Facebook",        contentType:"social"          },
  { id:"landscape",     label:"Landscape 16:9", sublabel:"YouTube · LinkedIn", w:16, h:9,  canvasW:1920, canvasH:1080, platforms:"YouTube · LinkedIn",          contentType:"social"          },
  { id:"youtube_short", label:"YT Short",       sublabel:"60s vertical",       w:9,  h:16, canvasW:1080, canvasH:1920, platforms:"YouTube",                    contentType:"social"          },
];

const METHODS = [
  { id:"standard",          label:"Standard",          icon:PenTool,        desc:"Compelling post from your brief"        },
  { id:"viral_replication", label:"Viral Replication", icon:Repeat2,        desc:"Clone structure of a proven viral post" },
  { id:"trend_surfing",     label:"Trend Surfing",     icon:TrendingUp,     desc:"Connect a trend to your expertise"      },
  { id:"pain_point",        label:"Pain Point",        icon:HeartHandshake, desc:"Pain → Insight → Solution"              },
] as const;

const PLATFORMS = [
  { id:"instagram" as Platform, label:"Instagram",   example:"instagram.com/username"   },
  { id:"facebook"  as Platform, label:"Facebook",    example:"facebook.com/pagename"    },
  { id:"linkedin"  as Platform, label:"LinkedIn",    example:"linkedin.com/in/username"  },
  { id:"twitter"   as Platform, label:"X / Twitter", example:"x.com/username"            },
  { id:"tiktok"    as Platform, label:"TikTok",      example:"tiktok.com/@username"      },
  { id:"youtube"   as Platform, label:"YouTube",     example:"youtube.com/@channel"      },
];

function detectPlatform(url: string): Platform | null {
  if (/instagram\.com/i.test(url))          return "instagram";
  if (/facebook\.com/i.test(url))           return "facebook";
  if (/linkedin\.com/i.test(url))           return "linkedin";
  if (/twitter\.com|x\.com/i.test(url))     return "twitter";
  if (/tiktok\.com/i.test(url))             return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url))  return "youtube";
  return null;
}

function fmtFollowers(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}

/* ──────────── Contrast colour ──────────── */
function contrastColor(hex: string): string {
  const h = hex.replace("#","");
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
  return luminance > 0.5 ? "#1A1A1A" : "#FFFFFF";
}

/* ─────────────── Canvas export ─────────────── */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, lineH: number, maxLines: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    const words = para.split(" "); let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    if (line) out.push(line);
    out.push("");
    if (out.length >= maxLines) break;
  }
  return out.slice(0, maxLines);
}

async function exportToImage(
  text: string, fmt: OutputFormat, brandName: string,
  variantNum: number, styleProfile?: StyleProfile,
): Promise<Blob> {
  const W = fmt.canvasW, H = fmt.canvasH;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  /* ── Colors from style profile or elegant defaults ── */
  const palette = styleProfile?.colorPalette ?? {
    primary: "#E8ECF4", secondary: "#D0D6E8", accent: "#6366f1", text: "#1A1A1A",
  };
  const bgStyle     = styleProfile?.backgroundStyle ?? "gradient";
  const typoStyle   = styleProfile?.typographyStyle ?? "serif";
  const layoutStyle = styleProfile?.layoutStyle     ?? "centered";

  /* ── Background ── */
  if (bgStyle === "dark" || palette.primary.match(/^#[0-3]/)) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, palette.primary);
    g.addColorStop(1, palette.secondary);
    ctx.fillStyle = g;
  } else if (bgStyle === "gradient") {
    const g = ctx.createLinearGradient(0, H * 0.3, W, H);
    g.addColorStop(0, palette.primary);
    g.addColorStop(1, palette.secondary || palette.primary + "cc");
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = palette.primary;
  }
  ctx.fillRect(0, 0, W, H);

  /* ── Design elements ── */
  const PAD = Math.round(W * 0.075);
  const isWide = W > H;

  /* Accent top bar */
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, W, Math.round(H * 0.012));

  /* Vertical accent stripe (editorial layouts) */
  if (layoutStyle === "editorial" || layoutStyle === "left-aligned") {
    ctx.fillStyle = palette.accent + "80";
    ctx.fillRect(PAD - 20, PAD * 1.5, 4, H - PAD * 3);
  }

  /* Geometric corner accent */
  ctx.fillStyle = palette.accent + "18";
  ctx.beginPath();
  const cSize = Math.round(W * 0.35);
  ctx.arc(W, 0, cSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.secondary + "30";
  ctx.beginPath();
  ctx.arc(0, H, cSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  /* ── Text setup ── */
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^[-•]\s/gm, "")
    .trim();

  const textColor = contrastColor(palette.primary);
  const isLight   = textColor === "#1A1A1A";

  /* Font family based on typography style */
  const fontFamily =
    typoStyle === "serif"      ? `Georgia, "Times New Roman", serif` :
    typoStyle === "script"     ? `"Palatino Linotype", Palatino, serif` :
    typoStyle === "bold"       ? `-apple-system, "Helvetica Neue", Arial, sans-serif` :
                                 `-apple-system, "Helvetica Neue", Arial, sans-serif`;

  const maxTextW = W - PAD * 2 - (layoutStyle === "editorial" ? 20 : 0);
  const textX    = PAD + (layoutStyle === "editorial" || layoutStyle === "left-aligned" ? 8 : 0);

  /* Dynamic font size */
  const baseFontSize = isWide ? Math.round(W * 0.026) : Math.round(W * 0.038);
  const dynamicSize  = clean.length > 500 ? Math.max(Math.round(baseFontSize * 0.8), 24) : baseFontSize;

  ctx.font      = `${typoStyle === "bold" ? 700 : 400} ${dynamicSize}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "top";

  const lineH   = Math.round(dynamicSize * 1.6);
  const maxLines = Math.floor((H - PAD * 2.5 - 100) / lineH);
  const lines   = wrapLines(ctx, clean, maxTextW, lineH, maxLines);

  /* First line styled differently (like a headline) */
  const [firstLine, ...restLines] = lines;
  const usableH = H - PAD * 2 - 100;
  const totalTextH = lines.length * lineH;

  let startY: number;
  if (layoutStyle === "centered") {
    startY = Math.max(PAD + 60, (H - totalTextH - 100) / 2);
  } else {
    startY = PAD + 60;
  }

  /* Draw text alignment */
  const textAlign = (layoutStyle === "centered") ? "center" : "left";
  ctx.textAlign = textAlign as CanvasTextAlign;
  const drawX = textAlign === "center" ? W / 2 : textX;

  /* First line / hook — larger + bolder */
  if (firstLine) {
    ctx.font      = `${typoStyle === "bold" ? 800 : 600} ${Math.round(dynamicSize * 1.1)}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.fillText(firstLine, drawX, startY);
    startY += lineH * 1.25;
  }

  /* Rest of lines — regular weight */
  ctx.font = `${typoStyle === "bold" ? 600 : 400} ${dynamicSize}px ${fontFamily}`;
  let y = startY;
  for (const line of restLines) {
    if (!line) { y += lineH * 0.4; continue; }
    ctx.fillStyle = isLight ? textColor + "dd" : textColor;
    ctx.fillText(line, drawX, y);
    y += lineH;
    if (y > H - 110) {
      ctx.fillText("…", drawX, y);
      break;
    }
  }

  /* ── Bottom brand strip ── */
  const stripH = Math.round(H * 0.075);
  const stripY = H - stripH;

  /* Frosted strip */
  ctx.fillStyle = isLight ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.10)";
  ctx.fillRect(0, stripY, W, stripH);

  /* Brand name */
  const brandFontSize = Math.round(stripH * 0.38);
  ctx.font        = `700 ${brandFontSize}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle   = isLight ? "#ffffff" : "#1A1A1A";
  ctx.textBaseline = "middle";
  ctx.textAlign    = "left";
  ctx.fillText(brandName.toUpperCase(), PAD * 0.8, stripY + stripH / 2);

  /* Accent dot before brand name */
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(PAD * 0.55, stripY + stripH / 2, brandFontSize * 0.22, 0, Math.PI * 2);
  ctx.fill();

  /* Variant tag (right side) */
  if (variantNum > 1) {
    ctx.font      = `500 ${brandFontSize * 0.85}px -apple-system, Arial, sans-serif`;
    ctx.fillStyle = isLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
    ctx.textAlign = "right";
    ctx.fillText(`V${variantNum}`, W - PAD * 0.8, stripY + stripH / 2);
  }

  /* Accent line above strip */
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, stripY - 3, W, 3);

  return new Promise(r => canvas.toBlob(b => r(b!), "image/png", 1.0));
}

async function downloadVariant(
  text: string, fmt: OutputFormat, brandName: string,
  variantNum: number, styleProfile: StyleProfile | null, toast: (t: any) => void,
) {
  try {
    const blob = await exportToImage(text, fmt, brandName, variantNum, styleProfile ?? undefined);
    const file = new File([blob], `atreyu-${fmt.id}-v${variantNum}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `ATREYU — ${fmt.label}` }); return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast({ title: "Downloaded", description: `${fmt.label} — Version ${variantNum} saved as PNG` });
  } catch (err: any) {
    if (err?.name !== "AbortError") toast({ title: "Download failed", variant: "destructive" });
  }
}

/* ─────────────── Step bar ─────────────── */
const STEPS = ["Source", "Brief", "Format"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => {
        const done = i < step, current = i === step;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done ? "bg-primary text-primary-foreground shadow-[inset_3px_3px_8px_rgba(0,0,0,0.25)]" :
                  current ? "neu-raised-sm text-primary ring-2 ring-primary/30" : "neu-raised-sm text-muted-foreground"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold tracking-wide ${current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-20 h-0.5 mb-6 mx-3 rounded-full transition-all ${done ? "bg-primary/60" : "bg-border/60"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NeuInput({ children }: { children: React.ReactNode }) {
  return <div className="neu-inset-sm rounded-xl p-[2px]">{children}</div>;
}

/* ─────────────── Profile analysis display ─────────────── */
function ProfileCard({ profile, styleProfile, loading, error }: {
  profile: ProfileData | null; styleProfile: StyleProfile | null;
  loading: boolean; error: string | null;
}) {
  if (loading) return (
    <div className="neu-inset-sm rounded-2xl p-5 flex items-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold">Analysing profile…</p>
        <p className="text-xs text-muted-foreground mt-0.5">Scraping posts and extracting visual style — this takes ~30 seconds</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="neu-inset-sm rounded-2xl p-4 flex items-center gap-3 border border-red-500/20">
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">Profile analysis failed</p>
        <p className="text-xs text-muted-foreground mt-0.5">{error} — content will still be generated without style matching.</p>
      </div>
    </div>
  );

  if (!profile) return null;

  const pal = styleProfile?.colorPalette;

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="neu-raised-sm rounded-2xl p-4 flex items-start gap-4">
        {profile.profilePicUrl ? (
          <img src={profile.profilePicUrl} alt={profile.username}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Instagram className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-foreground">@{profile.username}</p>
            {profile.fullName && <p className="text-sm text-muted-foreground">{profile.fullName}</p>}
          </div>
          {profile.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="font-semibold text-foreground">{fmtFollowers(profile.followers)}</span> followers
            </div>
            {profile.postsCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span className="font-semibold text-foreground">{fmtFollowers(profile.postsCount)}</span> posts
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold flex-shrink-0">
          <CheckCircle2 className="h-3 w-3" /> Analysed
        </div>
      </div>

      {/* Post thumbnails */}
      {profile.posts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {profile.posts.slice(0,9).map((p, i) => (
            <div key={i} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden neu-inset-sm">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted/40" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Extracted style palette */}
      {pal && (
        <div className="neu-inset-sm rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="hud-label">Extracted Visual Style</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label:"Primary",   color: pal.primary   },
              { label:"Secondary", color: pal.secondary },
              { label:"Accent",    color: pal.accent    },
              { label:"Text",      color: pal.text      },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-xl neu-raised-sm border border-white/20"
                  style={{ background: s.color }} title={s.color} />
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
            <div className="flex-1 space-y-1 ml-2">
              <p className="text-xs font-medium text-foreground">{styleProfile?.mood}</p>
              {styleProfile?.copyTone && <p className="text-xs text-muted-foreground">Copy: {styleProfile.copyTone}</p>}
              <p className="text-xs text-muted-foreground line-clamp-2">{styleProfile?.contentStyle}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Format card ─────────────── */
function FormatCard({ fmt, selected, onClick }: { fmt: OutputFormat; selected: boolean; onClick: () => void }) {
  const maxH = 68, maxW = 88, ratio = fmt.w / fmt.h;
  const dH = ratio < 1 ? maxH : Math.round(maxW / ratio);
  const dW = ratio < 1 ? Math.round(maxH * ratio) : maxW;
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all w-full focus:outline-none
        ${selected ? "neu-inset ring-2 ring-primary/25" : "neu-raised-sm hover:ring-1 hover:ring-primary/20"}`}>
      <div className="flex items-center justify-center" style={{ height: maxH + 6, width: maxW + 6 }}>
        <div className={`rounded-lg flex items-center justify-center neu-inset-sm ${selected ? "" : "opacity-60"}`}
          style={{ width: dW, height: dH }}>
          {fmt.isText && (
            <div className="flex flex-col gap-1 w-full px-2">
              {[100,80,90,60].map((w,i)=>(
                <div key={i} className={`h-1 rounded-full ${selected?"bg-primary/50":"bg-muted-foreground/25"}`}
                  style={{width:`${w}%`}} />
              ))}
            </div>
          )}
          {fmt.isCarousel && (
            <div className="flex gap-0.5 items-stretch h-full py-1 px-1">
              {[0,1,2].map(i=>(
                <div key={i} className={`flex-1 rounded-sm ${selected?"bg-primary/50":"bg-muted-foreground/25"}`}
                  style={{opacity:1-i*0.25}} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold leading-tight ${selected?"text-primary":"text-foreground"}`}>{fmt.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{fmt.sublabel}</p>
      </div>
      {selected && <div className="w-4 h-1 rounded-full bg-primary/60" />}
    </button>
  );
}

/* ─────────────── Skeleton card ─────────────── */
function SkeletonCard({ fmt, index, total }: { fmt: OutputFormat; index: number; total: number }) {
  const ratio = fmt.w / fmt.h, isWide = ratio > 1;
  const cardW = total === 1 ? (isWide ? 580 : 280) : isWide ? 400 : 210;
  const cardH = Math.round(cardW / ratio);
  return (
    <div className="flex flex-col items-center gap-3 flex-shrink-0" style={{ width: cardW }}>
      <div className="relative rounded-2xl overflow-hidden w-full neu-inset" style={{ height: cardH }}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        <div className="p-6 space-y-3">
          {Array.from({length: Math.min(9, Math.floor(cardH/38))}).map((_,i) => (
            <div key={i} className="h-2.5 rounded-full bg-muted-foreground/10 animate-pulse"
              style={{width:`${[100,82,93,68,88,74,95,58,78][i%9]}%`, animationDelay:`${i*0.08}s`}} />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-9 bg-muted-foreground/8 rounded-b-2xl" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Writing version {index+1}{total>1?` of ${total}`:""}…</span>
      </div>
    </div>
  );
}

/* ─────────────── Content card ─────────────── */
function ContentCard({ text, variantNum, totalVariants, fmt, brandName, streaming, styleProfile }: {
  text: string; variantNum: number; totalVariants: number; fmt: OutputFormat;
  brandName: string; streaming: boolean; styleProfile: StyleProfile | null;
}) {
  const [copied, setCopied]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview]         = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = navigator.maxTouchPoints > 0;

  /* Generate a small preview image */
  const generatePreview = async () => {
    if (!text || streaming) return;
    setPreviewLoading(true);
    try {
      const blob = await exportToImage(text, fmt, brandName, variantNum, styleProfile ?? undefined);
      setPreview(URL.createObjectURL(blob));
    } catch { /* silent */ }
    setPreviewLoading(false);
  };

  /* Auto-preview once text is done streaming */
  useEffect(() => {
    if (!streaming && text) generatePreview();
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [streaming]);

  const pal = styleProfile?.colorPalette;

  return (
    <div className="neu-card rounded-2xl overflow-hidden flex flex-col">
      {/* Style palette strip */}
      {pal && (
        <div className="flex h-1.5">
          {[pal.primary, pal.secondary, pal.accent, pal.text].map((c,i) => (
            <div key={i} className="flex-1" style={{background:c}} />
          ))}
        </div>
      )}

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          {streaming && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
          <span className="hud-label">{totalVariants>1?`Version ${variantNum}`:fmt.label}</span>
          {styleProfile && !streaming && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              style-matched
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);}}
            disabled={!text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium neu-raised-sm disabled:opacity-40">
            {copied?<><Check className="h-3 w-3 text-green-500"/>Copied</>:<><Copy className="h-3 w-3 text-muted-foreground"/>Copy</>}
          </button>
          <button
            onClick={async()=>{setDownloading(true);await downloadVariant(text,fmt,brandName,variantNum,styleProfile,toast);setDownloading(false);}}
            disabled={!text||streaming||downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-40 shadow-sm">
            {downloading?<Loader2 className="h-3 w-3 animate-spin"/>:
              isMobile?<><Share2 className="h-3 w-3"/>Save</>:
              <><Download className="h-3 w-3"/>Download PNG</>}
          </button>
        </div>
      </div>

      {/* Image preview (if generated) */}
      {preview && !streaming && (
        <div className="px-5 pt-4">
          <div className="rounded-xl overflow-hidden neu-inset-sm" style={{aspectRatio:`${fmt.w}/${fmt.h}`,maxHeight:240}}>
            <img src={preview} alt="Post preview" className="w-full h-full object-cover" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Preview · {fmt.canvasW}×{fmt.canvasH}px · Download for full resolution
          </p>
        </div>
      )}
      {previewLoading && (
        <div className="px-5 pt-4">
          <div className="rounded-xl neu-inset-sm flex items-center justify-center" style={{aspectRatio:`${fmt.w}/${fmt.h}`,maxHeight:240}}>
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        </div>
      )}

      {/* Text content */}
      <div className="p-5 flex-1 min-h-[120px]">
        {text ? (
          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{text}</ReactMarkdown>
            {streaming && variantNum===totalVariants && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse align-middle rounded-sm" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Generating…
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Carousel preview ─────────────── */
function CarouselPreview({ data, styleProfile }: { data: CarouselStructure; styleProfile: StyleProfile | null }) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const { toast } = useToast();
  const accent = styleProfile?.colorPalette?.accent ?? data.accentColor ?? "#6366f1";
  const carouselFmt = FORMATS.find(f => f.id === "carousel")!;
  const allSlides = [
    { heading: data.title, subtitle: "", takeaway: "", isCover: true },
    ...data.slides,
    { heading: data.ctaText, subtitle: data.ctaSubtitle, takeaway: "", isCta: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-3">
        {allSlides.map((slide, idx) => {
          const bg = styleProfile?.colorPalette?.primary ?? "#F5F3EE";
          const tc = styleProfile ? contrastColor(bg) : "#1A1A1A";
          const isCover = idx === 0, isCta = idx === allSlides.length - 1;
          return (
            <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <div className="rounded-xl overflow-hidden neu-raised-sm"
                style={{ width:120, aspectRatio:"4/5", background:bg, fontFamily:"Georgia,serif", position:"relative" }}>
                {/* Top accent bar */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent }} />
                <div style={{ position:"absolute",bottom:0,left:0,right:0,height:18,background:tc==="#FFFFFF"?"rgba(0,0,0,0.8)":"rgba(0,0,0,0.7)",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <span style={{ color:"#fff",fontSize:5.5,fontFamily:"sans-serif",fontWeight:700,letterSpacing:1 }}>
                    {data.brandName?.toUpperCase() ?? "BRAND"}
                  </span>
                </div>
                <div style={{ padding:"10px 8px 24px", height:"100%", display:"flex", flexDirection:"column", boxSizing:"border-box" }}>
                  {isCover ? (
                    <>
                      <div style={{ height:1.5,width:24,background:accent,margin:"4px auto 5px"}} />
                      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <p style={{ fontSize:7,fontWeight:700,color:tc,textAlign:"center",lineHeight:1.3 }}>{slide.heading}</p>
                      </div>
                      <p style={{ fontSize:5,color:tc+"99",textAlign:"center",fontFamily:"sans-serif" }}>swipe →</p>
                    </>
                  ) : isCta ? (
                    <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3 }}>
                      <div style={{ width:12,height:12,borderRadius:"50%",background:accent,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <span style={{ color:"#fff",fontSize:6 }}>✓</span>
                      </div>
                      <p style={{ fontSize:6,fontWeight:700,color:tc,textAlign:"center",lineHeight:1.3 }}>{slide.heading}</p>
                      <p style={{ fontSize:4.5,color:tc+"99",textAlign:"center",fontFamily:"sans-serif",lineHeight:1.4 }}>{slide.subtitle}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex",alignItems:"center",gap:3,marginBottom:3 }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <span style={{ fontSize:5.5,fontWeight:700,color:"#fff" }}>{(slide as any).number}</span>
                        </div>
                        <p style={{ fontSize:5.5,fontWeight:700,color:tc,lineHeight:1.2 }}>{slide.heading}</p>
                      </div>
                      <p style={{ fontSize:4.5,color:tc+"cc",lineHeight:1.4,fontFamily:"sans-serif" }}>{slide.subtitle}</p>
                      {slide.takeaway&&<p style={{ fontSize:4,fontStyle:"italic",color:tc+"99",textAlign:"center",marginTop:2 }}>"{slide.takeaway}"</p>}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={async()=>{
                  setDownloading(idx);
                  const t = [slide.heading, slide.subtitle, (slide as any).takeaway].filter(Boolean).join("\n\n");
                  await downloadVariant(t, carouselFmt, data.brandName??"BRAND", idx+1, styleProfile, toast);
                  setDownloading(null);
                }}
                className="text-muted-foreground hover:text-primary transition-colors">
                {downloading===idx?<Loader2 className="h-3 w-3 animate-spin"/>:<Download className="h-3 w-3"/>}
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={async()=>{
          for(let i=0;i<allSlides.length;i++){
            const s=allSlides[i];
            const t=[s.heading,s.subtitle,(s as any).takeaway].filter(Boolean).join("\n\n");
            await downloadVariant(t,carouselFmt,data.brandName??"BRAND",i+1,styleProfile,toast);
          }
        }}
        className="flex items-center gap-2 text-xs font-medium text-primary hover:underline">
        <FileImage className="h-3.5 w-3.5" /> Download all slides as PNG
      </button>
      <div className="space-y-2 border-t border-border/40 pt-4">
        <p className="hud-label mb-3">Slide Content</p>
        {data.slides.map((s,i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl neu-inset-sm">
            <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{background:accent+"22",color:accent}}>{s.number??i+1}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{s.heading}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</p>
              {s.takeaway&&<p className="text-xs italic text-muted-foreground/70 mt-1">"{s.takeaway}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ContentStudio() {
  const [, navigate] = useLocation();
  const { toast }   = useToast();
  const [brand, setBrand] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/brand/profile").then(r=>r.json()).then(p=>{ if(p?.name) setBrand({name:p.name}); }).catch(()=>{});
  }, []);

  /* ── Wizard state ── */
  const [step, setStep]           = useState(0);
  const [sourceMode, setSourceMode] = useState<SourceMode|null>(null);
  const [socialUrl, setSocialUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<Platform|null>(null);

  /* ── Profile analysis state (social_import only) ── */
  const [profileData, setProfileData]     = useState<ProfileData|null>(null);
  const [styleProfile, setStyleProfile]   = useState<StyleProfile|null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError]   = useState<string|null>(null);
  const analysisTriggered = useRef(false);

  /* ── Brief state ── */
  const [brief, setBrief]             = useState("");
  const [audience, setAudience]       = useState("");
  const [method, setMethod]           = useState<Method>("standard");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("adam_robinson");
  const [customStyle, setCustomStyle] = useState("");
  const [originalPost, setOriginalPost] = useState("");

  /* ── Format state ── */
  const [formatId, setFormatId]         = useState<string|null>(null);
  const [slideCount, setSlideCount]     = useState(7);
  const [versionCount, setVersionCount] = useState(1);

  /* ── Generation state ── */
  const { stream, data: rawText, isStreaming, setData } = useSSE();
  const [generated, setGenerated]       = useState(false);
  const [variants, setVariants]         = useState<string[]>([]);
  const [carouselData, setCarouselData] = useState<CarouselStructure|null>(null);
  const [carouselLoading, setCarouselLoading] = useState(false);

  const selectedFormat = FORMATS.find(f => f.id === formatId);
  const brandName      = brand?.name ?? "ATREYU";

  useEffect(() => { setDetectedPlatform(detectPlatform(socialUrl)); }, [socialUrl]);

  /* Auto-parse variants from raw stream */
  useEffect(() => {
    if (!rawText) return;
    if (versionCount <= 1) { setVariants([rawText]); return; }
    const parts = rawText.split(/\*{0,2}(?:version|variant)\s*\d+:?\*{0,2}/gi).map(s=>s.trim()).filter(Boolean);
    setVariants(parts.length > 0 ? parts : [rawText]);
  }, [rawText, versionCount]);

  /* ── Trigger profile scrape + style analysis when entering Step 2 ── */
  const runProfileAnalysis = async () => {
    if (sourceMode !== "social_import" || !socialUrl.trim() || analysisTriggered.current) return;
    analysisTriggered.current = true;
    setProfileLoading(true);
    setProfileError(null);

    try {
      /* 1. Scrape profile */
      const scrapeRes = await fetch("/api/content/scrape-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: socialUrl }),
      });

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json();
        throw new Error(err.error ?? "Failed to scrape profile");
      }

      const profile: ProfileData = await scrapeRes.json();
      setProfileData(profile);

      /* 2. Analyze style (only if we have post images) */
      if (profile.posts.length > 0) {
        const analyzeRes = await fetch("/api/content/analyze-style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            posts:    profile.posts,
            username: profile.username,
            platform: profile.platform,
          }),
        });

        if (analyzeRes.ok) {
          const { styleProfile: sp } = await analyzeRes.json();
          setStyleProfile(sp);
        }
      }
    } catch (err: any) {
      setProfileError(err.message ?? "Profile analysis failed");
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── Navigation ── */
  const canNext = (
    (step===0 && (sourceMode==="brand_kit" || (sourceMode==="social_import" && socialUrl.trim().length>5))) ||
    (step===1 && brief.trim().length>0) ||
    (step===2 && !!formatId)
  );

  const goNext = () => {
    if (step===0 && sourceMode==="social_import") runProfileAnalysis();
    setStep(s => s + 1);
  };

  /* ── Generate ── */
  const handleGenerate = async () => {
    if (!formatId) return;
    setData(""); setCarouselData(null); setVariants([]); setGenerated(true);
    const fmt = FORMATS.find(f=>f.id===formatId)!;
    await stream("/api/content/generate", {
      type:          fmt.contentType,
      platform:      fmt.platforms.split("·")[0].trim(),
      context:       brief, audience, model:"sonnet", method,
      writingStyle, customStyle,
      originalPost:  method==="viral_replication" ? originalPost : "",
      format:        fmt.isCarousel ? "text_carousel" : "text_only",
      variants:      versionCount,
      styleProfile:  styleProfile ?? undefined,
      socialProfileUrl: sourceMode==="social_import" ? socialUrl : "",
    });
  };

  const handleCarousel = async () => {
    setCarouselLoading(true);
    try {
      const res = await fetch("/api/content/carousel/structure", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ topic:brief, slideCount, audience, model:"sonnet", postText:rawText??""})
      });
      setCarouselData(await res.json());
      toast({ title:"Carousel built" });
    } catch { toast({ title:"Failed", variant:"destructive" }); }
    finally { setCarouselLoading(false); }
  };

  const startOver = () => {
    setStep(0); setSourceMode(null); setSocialUrl(""); setBrief(""); setAudience("");
    setMethod("standard"); setFormatId(null); setVersionCount(1);
    setGenerated(false); setVariants([]); setCarouselData(null); setData("");
    setProfileData(null); setStyleProfile(null); setProfileLoading(false); setProfileError(null);
    analysisTriggered.current = false;
  };

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <p className="hud-label">Content Studio</p>
        <h1 className="text-3xl font-bold tracking-tight">Create Content That Converts</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          AI-powered content in three steps. Any format, any platform.
        </p>
      </div>

      {generated && (
        <div className="flex justify-center">
          <button onClick={startOver}
            className="flex items-center gap-2 px-4 py-2 rounded-xl neu-raised-sm text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
            <ChevronLeft className="h-4 w-4" /> Start Over
          </button>
        </div>
      )}

      {/* ════ GENERATED OUTPUT ════ */}
      {generated ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {selectedFormat && <span className="px-3 py-1 rounded-full neu-raised-sm text-xs font-semibold text-primary">{selectedFormat.label}</span>}
            {styleProfile && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="h-3 w-3" /> Style-matched to @{profileData?.username}
              </span>
            )}
            {versionCount>1 && <span className="px-3 py-1 rounded-full neu-raised-sm text-xs text-muted-foreground">{versionCount} versions</span>}
          </div>

          {isStreaming && variants.length<versionCount ? (
            <div className={`flex gap-5 overflow-x-auto pb-2 ${versionCount===1?"justify-center":""}`}>
              {Array.from({length:versionCount}).map((_,i)=>(
                <div key={i} className="flex-shrink-0"
                  style={{width:versionCount===1?"100%":versionCount===2?"48%":"32%"}}>
                  <SkeletonCard fmt={selectedFormat!} index={i} total={versionCount} />
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-5 ${versionCount===1?"grid-cols-1":versionCount===2?"grid-cols-1 lg:grid-cols-2":"grid-cols-1 lg:grid-cols-3"}`}>
              {(variants.length>0?variants:[rawText??""]).map((text,i)=>(
                <ContentCard key={i} text={text} variantNum={i+1} totalVariants={versionCount}
                  fmt={selectedFormat!} brandName={brandName} streaming={isStreaming&&i===variants.length-1}
                  styleProfile={styleProfile} />
              ))}
              {isStreaming&&variants.length<versionCount&&Array.from({length:versionCount-variants.length}).map((_,i)=>(
                <SkeletonCard key={`sk-${i}`} fmt={selectedFormat!} index={variants.length+i} total={versionCount} />
              ))}
            </div>
          )}

          {selectedFormat?.isCarousel && !isStreaming && rawText && (
            <div className="neu-card rounded-2xl p-5">
              {!carouselData ? (
                <button onClick={handleCarousel} disabled={carouselLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl neu-raised-sm text-sm font-semibold text-primary disabled:opacity-50">
                  {carouselLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin"/>Building carousel…</>
                    : <><Layers className="h-4 w-4"/>Build Carousel Slides ({slideCount} slides)</>}
                </button>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="hud-label flex items-center gap-2"><Layers className="h-3.5 w-3.5"/>Carousel Preview</span>
                    <span className="text-xs text-muted-foreground">{carouselData.slides.length+2} slides · 1080×1350</span>
                  </div>
                  <CarouselPreview data={carouselData} styleProfile={styleProfile} />
                </>
              )}
            </div>
          )}
        </div>

      ) : (
        /* ════ WIZARD ════ */
        <div className="space-y-6">
          <StepBar step={step} />

          <div className="neu-card rounded-3xl p-8 space-y-8">

            {/* ── STEP 1: SOURCE ── */}
            {step===0 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <p className="hud-label">Step 1 of 3</p>
                  <h2 className="text-xl font-bold">Where should ATREYU pull your brand from?</h2>
                  <p className="text-sm text-muted-foreground">Your brand identity shapes every word of the output.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Brand Kit */}
                  <div role="button" tabIndex={0}
                    onClick={()=>setSourceMode("brand_kit")}
                    onKeyDown={e=>e.key==="Enter"&&setSourceMode("brand_kit")}
                    className={`relative p-6 rounded-2xl cursor-pointer select-none transition-all focus:outline-none
                      ${sourceMode==="brand_kit"?"neu-inset ring-2 ring-primary/25":"neu-raised-sm hover:ring-1 hover:ring-primary/20"}`}>
                    {sourceMode==="brand_kit"&&<div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary"/>}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl neu-raised-sm flex items-center justify-center">
                        <Building2 className={`h-5 w-5 ${sourceMode==="brand_kit"?"text-primary":"text-muted-foreground"}`}/>
                      </div>
                      <div>
                        <p className="font-semibold">Use My Brand Kit</p>
                        <p className="text-xs text-muted-foreground">Recommended</p>
                      </div>
                    </div>
                    {brand ? (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500"/>
                        <span className="text-green-600 dark:text-green-400 font-medium">{brand.name} configured</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-sm text-muted-foreground">Uses your saved brand identity, voice, colours, and style examples.</p>
                        <span onClick={e=>{e.stopPropagation();navigate("/brand");}}
                          className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                          <Palette className="h-3 w-3"/> Set up Brand Kit first →
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Social import */}
                  <button onClick={()=>setSourceMode("social_import")}
                    className={`relative text-left p-6 rounded-2xl transition-all focus:outline-none
                      ${sourceMode==="social_import"?"neu-inset ring-2 ring-primary/25":"neu-raised-sm hover:ring-1 hover:ring-primary/20"}`}>
                    {sourceMode==="social_import"&&<div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary"/>}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl neu-raised-sm flex items-center justify-center">
                        <Globe className={`h-5 w-5 ${sourceMode==="social_import"?"text-primary":"text-muted-foreground"}`}/>
                      </div>
                      <div>
                        <p className="font-semibold">Import Social Profile</p>
                        <p className="text-xs text-muted-foreground">Match a competitor's style</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Paste a competitor's Instagram/LinkedIn/TikTok URL — ATREYU scrapes their posts, extracts their visual style, and writes content that matches their aesthetic.
                    </p>
                    <div className="flex items-center gap-3">
                      {[{c:"#E1306C",I:Instagram},{c:"#1877F2",I:Facebook},{c:"#0A66C2",I:Linkedin},{c:"#000",I:Twitter},{c:"#FF0000",I:Youtube}]
                        .map(({c,I},i)=><I key={i} className="h-5 w-5" style={{color:c}}/>)}
                      <span className="text-xs text-muted-foreground">+ TikTok</span>
                    </div>
                  </button>
                </div>

                {sourceMode==="social_import" && (
                  <div className="neu-inset-sm rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-muted-foreground"/>
                      <label className="text-sm font-semibold">Competitor Profile URL</label>
                      {detectedPlatform && (
                        <span className="ml-auto text-xs neu-raised-sm px-2.5 py-0.5 rounded-full text-primary font-medium capitalize">
                          {detectedPlatform} detected
                        </span>
                      )}
                    </div>
                    <NeuInput>
                      <Input value={socialUrl} onChange={e=>setSocialUrl(e.target.value)}
                        placeholder="e.g. instagram.com/nike or linkedin.com/company/notion"
                        className="bg-transparent border-0 focus-visible:ring-0 shadow-none"/>
                    </NeuInput>
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.map(p=>(
                        <button key={p.id} onClick={()=>setSocialUrl(`https://${p.example}`)}
                          className="text-xs px-2.5 py-1 rounded-full neu-raised-sm text-muted-foreground hover:text-foreground transition-all">
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: BRIEF ── */}
            {step===1 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <p className="hud-label">Step 2 of 3</p>
                  <h2 className="text-xl font-bold">What do you want to say?</h2>
                  <p className="text-sm text-muted-foreground">Give ATREYU a clear brief — the more specific, the better the output.</p>
                </div>

                {/* Profile analysis (social_import only) */}
                {sourceMode==="social_import" && (
                  <ProfileCard profile={profileData} styleProfile={styleProfile} loading={profileLoading} error={profileError} />
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Your Message / Topic *</label>
                  <NeuInput>
                    <Textarea value={brief} onChange={e=>setBrief(e.target.value)}
                      placeholder="e.g. We just hit 10,000 customers in 18 months without paid ads. Share the exact 3-step content strategy, include specific numbers, and why most people get step 2 wrong."
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[110px] text-sm resize-none"/>
                  </NeuInput>
                  <p className="text-xs text-muted-foreground">Include specific numbers, stories, or angles you want covered.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Target Audience</label>
                  <NeuInput>
                    <Input value={audience} onChange={e=>setAudience(e.target.value)}
                      placeholder="e.g. SaaS founders, D2C marketing managers, freelancers scaling to agency…"
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none"/>
                  </NeuInput>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Content Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {METHODS.map(m=>{
                      const Icon=m.icon; const active=method===m.id;
                      return (
                        <button key={m.id} onClick={()=>setMethod(m.id as Method)}
                          className={`text-left p-4 rounded-2xl transition-all focus:outline-none
                            ${active?"neu-inset ring-2 ring-primary/25":"neu-raised-sm hover:ring-1 hover:ring-primary/20"}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className={`h-4 w-4 ${active?"text-primary":"text-muted-foreground"}`}/>
                            <span className={`text-sm font-semibold ${active?"text-primary":"text-foreground"}`}>{m.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">{m.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {method==="viral_replication" && (
                  <div className="neu-inset-sm rounded-2xl p-5 space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Repeat2 className="h-4 w-4 text-amber-500"/> Paste the Original Viral Post
                    </label>
                    <NeuInput>
                      <Textarea value={originalPost} onChange={e=>setOriginalPost(e.target.value)}
                        placeholder="Paste the viral post here. ATREYU keeps the hook structure and adapts it to your brand."
                        className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[90px] text-sm resize-none"/>
                    </NeuInput>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Writing Style</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {id:"adam_robinson", label:"Adam Robinson", desc:"Raw · conversational · real numbers"},
                      {id:"brand_voice",   label:"Brand Voice",   desc:"Your Brand Kit voice profile"},
                      {id:"custom",        label:"Custom",        desc:"Describe your own style"},
                    ].map(s=>(
                      <button key={s.id} onClick={()=>setWritingStyle(s.id as WritingStyle)}
                        className={`flex-1 min-w-[140px] text-left p-3 rounded-xl focus:outline-none transition-all
                          ${writingStyle===s.id?"neu-inset ring-2 ring-primary/25":"neu-raised-sm hover:ring-1 hover:ring-primary/20"}`}>
                        <p className={`text-sm font-semibold ${writingStyle===s.id?"text-primary":"text-foreground"}`}>{s.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                  {writingStyle==="custom" && (
                    <NeuInput>
                      <Textarea value={customStyle} onChange={e=>setCustomStyle(e.target.value)}
                        placeholder="Describe the writing style — tone, sentence length, words to avoid…"
                        className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[80px] text-sm resize-none"/>
                    </NeuInput>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: FORMAT ── */}
            {step===2 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <p className="hud-label">Step 3 of 3</p>
                  <h2 className="text-xl font-bold">Choose your output format</h2>
                  <p className="text-sm text-muted-foreground">Select where and how this content will be published.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FORMATS.map(fmt=>(
                    <FormatCard key={fmt.id} fmt={fmt} selected={formatId===fmt.id} onClick={()=>setFormatId(fmt.id)}/>
                  ))}
                </div>

                {formatId==="carousel" && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl neu-inset-sm">
                    <LayoutTemplate className="h-4 w-4 text-primary"/>
                    <span className="text-sm font-medium">Number of slides</span>
                    <div className="flex gap-1.5 ml-auto">
                      {[5,7,9,11].map(n=>(
                        <button key={n} onClick={()=>setSlideCount(n)}
                          className={`w-10 h-8 text-sm rounded-lg font-semibold transition-all focus:outline-none
                            ${n===slideCount?"bg-primary text-primary-foreground shadow-sm":"neu-raised-sm text-muted-foreground hover:text-foreground"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-center space-y-0.5">
                    <p className="text-sm font-semibold">How many versions do you want?</p>
                    <p className="text-xs text-muted-foreground">ATREYU writes multiple takes so you can pick the best one.</p>
                  </div>
                  <div className="flex gap-2">
                    {[1,2,3,4].map(n=>(
                      <button key={n} onClick={()=>setVersionCount(n)}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all focus:outline-none
                          ${n===versionCount?"neu-inset text-primary ring-2 ring-primary/25":"neu-raised-sm text-muted-foreground hover:text-foreground"}`}>
                        {n===1?"1 version":`${n} versions`}
                      </button>
                    ))}
                  </div>
                </div>

                {styleProfile && (
                  <div className="flex items-center gap-2 p-4 rounded-2xl neu-inset-sm">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0"/>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Style-matching active.</strong> Output images will use @{profileData?.username}'s colour palette: &nbsp;
                      {[styleProfile.colorPalette.primary, styleProfile.colorPalette.secondary, styleProfile.colorPalette.accent].map((c,i)=>(
                        <span key={i} className="inline-block w-3 h-3 rounded-full mr-0.5 align-middle border border-white/20" style={{background:c}}/>
                      ))}
                    </p>
                  </div>
                )}

                {selectedFormat && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground neu-inset-sm rounded-xl px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-primary"/>
                    <span>
                      <strong className="text-foreground">{selectedFormat.label}</strong> · {selectedFormat.platforms} · {versionCount} version{versionCount>1?"s":""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between px-1">
            <button onClick={()=>setStep(s=>s-1)} disabled={step===0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl neu-raised-sm text-sm font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 focus:outline-none">
              <ChevronLeft className="h-4 w-4"/> Back
            </button>
            {step<2 ? (
              <button onClick={goNext} disabled={!canNext}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all disabled:opacity-40 focus:outline-none">
                Continue <ChevronRight className="h-4 w-4"/>
              </button>
            ) : (
              <button onClick={handleGenerate} disabled={!canNext||isStreaming}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:bg-primary/90 transition-all disabled:opacity-40 focus:outline-none">
                <Wand2 className={`h-4 w-4 ${isStreaming?"animate-spin":""}`}/>
                Generate {versionCount>1?`${versionCount} Versions`:"Content"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
