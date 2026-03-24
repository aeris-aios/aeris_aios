import { useState, useEffect, useRef } from "react";
import {
  PenTool, Wand2, ChevronRight, ChevronLeft, CheckCircle2, Loader2,
  Repeat2, TrendingUp, HeartHandshake, LayoutTemplate, Layers,
  Copy, Check, Download, Palette, Building2, Globe, Link,
  Instagram, Youtube, Twitter, Linkedin, Facebook, Share2, FileImage,
  Users, Eye, AlertCircle, Sparkles, ImagePlus, Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSSE } from "@/hooks/use-sse";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ContentEditor } from "@/components/content/content-editor";

/* ─────────────── Image proxy ────────────────────────────────────────
   Instagram / social CDN URLs are CORS-blocked in the browser.
   Route them through the server-side proxy so they load correctly.
──────────────────────────────────────────────────────────────────── */
function proxyImg(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return `/api/content/image-proxy?url=${encodeURIComponent(url)}`;
}

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
  backgroundImagePrompt?: string;
  highlightPhrase?: string;
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

/* ══════════════════════════════════════════════
   CANVAS UTILITIES & PROFESSIONAL TEMPLATE SYSTEM
══════════════════════════════════════════════ */

/* ── Color helpers ── */
function luminance(hex: string): number {
  const h = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255;
}
function isDarkColor(hex: string)   { return luminance(hex) < 0.4; }
function contrastColor(hex: string) { return luminance(hex) > 0.55 ? "#1A1A1A" : "#FFFFFF"; }

/* ── Aggressively strip ALL markdown and symbols from output text ── */
function deepCleanText(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/gs, "$1")         // **bold**
    .replace(/\*(.*?)\*/gs, "$1")              // *italic*
    .replace(/_{1,2}(.*?)_{1,2}/gs, "$1")      // _under_
    .replace(/^#{1,6}\s+/gm, "")               // ## Headers
    .replace(/[—–]/g, ",")                    // em/en dash → comma
    .replace(/^[-•*+]\s+/gm, "")               // Bullet hyphens
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")      // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // [link](url)
    .replace(/^>\s*/gm, "")                    // > blockquote
    .replace(/^={3,}|-{3,}\s*$/gm, "")         // --- rules
    .replace(/\n{3,}/g, "\n\n")                // ≥3 newlines → 2
    .trim();
}

/* ── Extract hook sentence + optional supporting line for the image ── */
function extractHook(text: string): { hook: string; supporting: string } {
  const paras = deepCleanText(text).split(/\n+/).map(l => l.trim()).filter(Boolean);

  /* Hook = first paragraph, trimmed to first sentence if very long */
  let hook = paras[0] ?? "";
  if (hook.length > 130) {
    const sentEnd = hook.search(/[.!?]/);
    hook = sentEnd > 20 ? hook.slice(0, sentEnd + 1) : hook.slice(0, 130).trim() + "…";
  }

  /* Supporting = second paragraph, shortened */
  let supporting = paras[1] ?? "";
  if (supporting.length > 90) {
    const sentEnd = supporting.search(/[.!?]/);
    supporting = sentEnd > 10 ? supporting.slice(0, sentEnd + 1) : supporting.slice(0, 90).trim() + "…";
  }

  return { hook, supporting };
}

/* ── Canvas text wrapping ── */
function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ── Rounded rectangle path ── */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x+w, y,   x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h,   x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y,     x+r, y);
  ctx.closePath();
}

/* ── Hex to rgba helper ── */
function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#","").padEnd(6,"0");
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ════════════════════════════════════════════
   TEMPLATE 1: CINEMATIC  (dark profiles)
   Deep dark, centered, glowing accent
════════════════════════════════════════════ */
function renderCinematic(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, PAD: number,
  pal: StyleProfile["colorPalette"],
  hook: string, supporting: string,
  brandName: string, variantNum: number,
) {
  const SF = "-apple-system,'Helvetica Neue',Arial,sans-serif";

  /* BG: deep dark solid */
  const bgBase = isDarkColor(pal.primary) ? pal.primary : "#0B0B12";
  ctx.fillStyle = bgBase; ctx.fillRect(0,0,W,H);

  /* Radial glow — accent at centre */
  const glow = ctx.createRadialGradient(W/2, H*0.44, 0, W/2, H*0.44, W*0.78);
  glow.addColorStop(0,   hexA(pal.accent, 0.14));
  glow.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);

  /* Subtle vignette */
  const vig = ctx.createRadialGradient(W/2,H/2,W*0.25, W/2,H/2,W*0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);

  /* Arc decoration — bottom-left */
  ctx.strokeStyle = hexA(pal.accent, 0.18);
  ctx.lineWidth   = Math.round(W * 0.038);
  ctx.beginPath(); ctx.arc(-W*0.05, H*1.06, W*0.45, 0, Math.PI*2); ctx.stroke();

  /* Arc decoration — top-right smaller */
  ctx.strokeStyle = hexA(pal.accent, 0.10);
  ctx.lineWidth   = Math.round(W * 0.018);
  ctx.beginPath(); ctx.arc(W*1.05, -H*0.04, W*0.30, 0, Math.PI*2); ctx.stroke();

  /* Thin top accent bar */
  const topGrd = ctx.createLinearGradient(0,0,W,0);
  topGrd.addColorStop(0,   "rgba(0,0,0,0)");
  topGrd.addColorStop(0.3, pal.accent);
  topGrd.addColorStop(0.7, pal.accent);
  topGrd.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = topGrd; ctx.fillRect(0, 0, W, 3);

  /* ── Hook text ── */
  const hookSize = Math.min(Math.round(W * 0.065), 90);
  const maxHookW = W - PAD * 2.4;
  ctx.textBaseline = "top"; ctx.textAlign = "center";

  /* Measure hook lines */
  ctx.font = `700 ${hookSize}px ${SF}`;
  const hookLines = wrapCanvasText(ctx, hook, maxHookW);

  /* Vertical centering of text block */
  const hookLineH = hookSize * 1.22;
  const supSize   = Math.round(hookSize * 0.33);
  const sepGap    = hookSize * 0.55;
  const supLineH  = supSize * 1.5;
  const supLines  = supporting ? wrapCanvasText(ctx, supporting, maxHookW) : [];
  const totalH    = hookLines.length * hookLineH + (supporting ? sepGap + supLines.length * supLineH : 0);
  let y = (H * 0.88 - totalH) / 2;  /* top of text block, excluding footer */
  y = Math.max(H * 0.12, y);

  /* Hook lines — bold white */
  ctx.font = `700 ${hookSize}px ${SF}`;
  hookLines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? "#FFFFFF" : hexA("#FFFFFF", 0.88);
    ctx.fillText(line, W/2, y);
    y += hookLineH;
  });

  /* Separator pill */
  if (supporting) {
    y += hookSize * 0.18;
    const pillW = Math.round(W * 0.09), pillH = 3;
    rrect(ctx, W/2 - pillW/2, y, pillW, pillH, pillH/2);
    ctx.fillStyle = pal.accent; ctx.fill();
    y += hookSize * 0.32;

    /* Supporting text */
    ctx.font = `300 ${supSize}px ${SF}`;
    supLines.slice(0,2).forEach(line => {
      ctx.fillStyle = hexA("#FFFFFF", 0.52);
      ctx.fillText(line, W/2, y);
      y += supLineH;
    });
  }

  /* ── Footer ── */
  const footH = Math.round(H * 0.10);
  const footY = H - footH;

  /* Gradient overlay for readability */
  const footGrd = ctx.createLinearGradient(0, footY - footH*0.4, 0, H);
  footGrd.addColorStop(0, "rgba(0,0,0,0)");
  footGrd.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = footGrd; ctx.fillRect(0, footY - footH*0.4, W, footH*1.4);

  /* Brand name */
  const bfSize = Math.round(footH * 0.33);
  ctx.font = `600 ${bfSize}px ${SF}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(brandName.toUpperCase(), PAD, footY + footH/2);

  /* Accent dot */
  ctx.fillStyle = pal.accent;
  ctx.beginPath(); ctx.arc(PAD * 0.55, footY + footH/2, bfSize * 0.2, 0, Math.PI*2); ctx.fill();

  /* Variant tag */
  if (variantNum > 1) {
    ctx.font = `400 ${bfSize * 0.82}px ${SF}`;
    ctx.fillStyle = hexA("#FFFFFF", 0.45);
    ctx.textAlign = "right";
    ctx.fillText(`V${variantNum}`, W - PAD, footY + footH/2);
  }
}

/* ════════════════════════════════════════════
   TEMPLATE 2: EDITORIAL  (serif / light profiles)
   Cream background, left-aligned, thick accent bar
════════════════════════════════════════════ */
function renderEditorial(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, PAD: number,
  pal: StyleProfile["colorPalette"],
  hook: string, supporting: string,
  brandName: string, variantNum: number,
) {
  const SANS = "-apple-system,'Helvetica Neue',Arial,sans-serif";
  const SERIF = "Georgia,'Times New Roman',serif";

  /* BG: clean off-white/cream */
  const bgColor = (!isDarkColor(pal.primary) && luminance(pal.primary) > 0.75)
    ? pal.primary : "#FAF9F6";
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,W,H);

  /* Fine dot grid */
  ctx.fillStyle = hexA("#000000", 0.035);
  const dotSpacing = Math.round(W * 0.028);
  for (let gx = dotSpacing; gx < W; gx += dotSpacing) {
    for (let gy = dotSpacing; gy < H; gy += dotSpacing) {
      ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill();
    }
  }

  /* Left accent bar */
  const barX = Math.round(PAD * 0.55);
  const barW = Math.round(W * 0.007);
  const barY1 = H * 0.10, barY2 = H * 0.87;
  ctx.fillStyle = pal.accent;
  ctx.fillRect(barX, barY1, barW, barY2 - barY1);

  /* Small accent top-left square */
  const sqSize = Math.round(W * 0.025);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(barX, barY1 - sqSize, sqSize, sqSize);

  /* ── Hook text ── */
  const hookSize = Math.min(Math.round(W * 0.066), 86);
  const textLeft = barX + barW + Math.round(W * 0.045);
  const maxW     = W - textLeft - PAD;

  ctx.font = `800 ${hookSize}px ${SERIF}`;
  const hookLines = wrapCanvasText(ctx, hook, maxW);
  const hookLineH = hookSize * 1.15;

  /* Position hook vertically — start at ~16% from top */
  let y = Math.round(H * 0.16);

  ctx.textAlign    = "left";
  ctx.textBaseline = "top";
  hookLines.forEach(line => {
    ctx.font = `800 ${hookSize}px ${SERIF}`;
    ctx.fillStyle = "#1A1A1A";
    ctx.fillText(line, textLeft, y);
    y += hookLineH;
  });

  /* Hairline rule after hook */
  y += hookSize * 0.40;
  ctx.fillStyle = hexA(pal.accent, 0.45);
  ctx.fillRect(textLeft, y, W - textLeft - PAD, 1);
  y += hookSize * 0.45;

  /* Supporting */
  if (supporting) {
    const supSize = Math.round(hookSize * 0.33);
    ctx.font = `400 ${supSize}px ${SANS}`;
    const supLines = wrapCanvasText(ctx, supporting, maxW);
    supLines.slice(0, 3).forEach(line => {
      ctx.fillStyle = hexA("#1A1A1A", 0.55);
      ctx.fillText(line, textLeft, y);
      y += supSize * 1.65;
    });
  }

  /* ── Footer ── */
  const footY = H * 0.89;
  ctx.fillStyle = hexA(pal.accent, 0.35);
  ctx.fillRect(textLeft, footY, W - textLeft - PAD, 1);

  const bfSize = Math.round(W * 0.022);
  ctx.font = `600 ${bfSize}px ${SANS}`;
  ctx.fillStyle = hexA(pal.accent, 0.9);
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText(
    variantNum > 1 ? `— ${brandName.toUpperCase()}  ·  V${variantNum}` : `— ${brandName.toUpperCase()}`,
    W - PAD,
    footY + bfSize * 0.6,
  );
}

/* ════════════════════════════════════════════
   TEMPLATE 3: MODERN CARD  (default)
   Pastel gradient BG, floating white card, clean hierarchy
════════════════════════════════════════════ */
function renderModern(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, PAD: number,
  pal: StyleProfile["colorPalette"],
  hook: string, supporting: string,
  brandName: string, variantNum: number,
  isGradient: boolean,
) {
  const SF = "-apple-system,'Helvetica Neue',Arial,sans-serif";

  /* BG: very light gradient */
  const bgLight = isDarkColor(pal.primary) ? "#EEF0F6" : pal.primary;
  const bgSecond = isDarkColor(pal.secondary) ? "#E0E4F0" : (pal.secondary || "#E8ECF4");
  const bgGrd = ctx.createLinearGradient(0, 0, W, H);
  bgGrd.addColorStop(0, bgLight);
  bgGrd.addColorStop(1, bgSecond);
  ctx.fillStyle = bgGrd; ctx.fillRect(0,0,W,H);

  /* Large decorative circle — bottom-right */
  ctx.fillStyle = hexA(pal.accent, 0.07);
  ctx.beginPath(); ctx.arc(W*0.92, H*0.88, W*0.55, 0, Math.PI*2); ctx.fill();

  /* Small circle — top-left */
  ctx.fillStyle = hexA(pal.accent, 0.05);
  ctx.beginPath(); ctx.arc(W*0.06, H*0.08, W*0.18, 0, Math.PI*2); ctx.fill();

  /* ── White card ── */
  const cardX  = Math.round(W * 0.075);
  const cardY  = Math.round(H * 0.09);
  const cardW  = W - cardX * 2;
  const cardH  = Math.round(H * 0.76);
  const radius = Math.round(W * 0.028);

  /* Shadow layers */
  [
    {o:0.06, dx:0, dy:W*0.008},
    {o:0.04, dx:0, dy:W*0.016},
    {o:0.02, dx:0, dy:W*0.030},
  ].forEach(s => {
    ctx.fillStyle = `rgba(0,0,0,${s.o})`;
    rrect(ctx, cardX+s.dx, cardY+s.dy, cardW, cardH, radius); ctx.fill();
  });

  /* Card fill */
  ctx.fillStyle = "#FFFFFF";
  rrect(ctx, cardX, cardY, cardW, cardH, radius); ctx.fill();

  /* Left accent border */
  const borderW = Math.round(W * 0.009);
  ctx.fillStyle = pal.accent;
  rrect(ctx, cardX, cardY, borderW, cardH, radius); ctx.fill();

  /* Card inner padding */
  const CP  = Math.round(cardW * 0.085);
  const CX  = cardX + borderW + CP;
  const CW  = cardW - borderW - CP * 2;

  /* Brand tag */
  const tagSize = Math.round(W * 0.020);
  ctx.font = `700 ${tagSize}px ${SF}`;
  ctx.fillStyle = pal.accent;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(brandName.toUpperCase(), CX, cardY + CP * 0.8);

  /* Hook text */
  const hookSize = Math.min(Math.round(W * 0.058), 78);
  ctx.font = `700 ${hookSize}px ${SF}`;
  const maxHW = CW;
  const hookLines = wrapCanvasText(ctx, hook, maxHW);
  const hookLineH = hookSize * 1.22;

  let y = cardY + CP * 0.8 + tagSize * 1.8;
  hookLines.forEach(line => {
    ctx.font = `700 ${hookSize}px ${SF}`;
    ctx.fillStyle = "#111111";
    ctx.fillText(line, CX, y);
    y += hookLineH;
  });

  /* Supporting */
  if (supporting) {
    y += hookSize * 0.30;
    const supSize = Math.round(hookSize * 0.34);
    ctx.font = `400 ${supSize}px ${SF}`;
    const supLines = wrapCanvasText(ctx, supporting, CW);
    supLines.slice(0,2).forEach(line => {
      ctx.fillStyle = hexA("#1A1A1A", 0.50);
      ctx.fillText(line, CX, y);
      y += supSize * 1.65;
    });
  }

  /* Bottom rule inside card */
  const ruleY = cardY + cardH - Math.round(cardH * 0.10);
  ctx.fillStyle = hexA(pal.accent, 0.18);
  ctx.fillRect(cardX + borderW, ruleY, cardW - borderW, 1);

  /* Bottom label inside card */
  const blSize = Math.round(W * 0.018);
  ctx.font = `500 ${blSize}px ${SF}`;
  ctx.fillStyle = hexA(pal.accent, 0.85);
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(variantNum > 1 ? `V${variantNum}` : "", cardX + borderW + CP, ruleY + Math.round(cardH*0.05));

  /* Footer below card */
  const ftSize = Math.round(W * 0.018);
  ctx.font = `400 ${ftSize}px ${SF}`;
  ctx.fillStyle = hexA("#1A1A1A", 0.32);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`MADE WITH AERIS`, W/2, cardY + cardH + (H - cardY - cardH) * 0.5);
}

/* ════════════════════════════════════════════
   TEMPLATE 4: PHOTO  (AI-generated background already drawn on canvas)
   Adds cinematic overlays + white text on top of whatever is on the canvas.
════════════════════════════════════════════ */
function renderPhotoTemplate(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, PAD: number,
  pal: StyleProfile["colorPalette"],
  hook: string, supporting: string,
  brandName: string, variantNum: number,
) {
  const SF = "-apple-system,'Helvetica Neue',Arial,sans-serif";

  /* Cinematic radial vignette */
  const vig = ctx.createRadialGradient(W/2, H/2, W*0.2, W/2, H/2, W*0.9);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.58)");
  ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);

  /* Bottom gradient for footer readability */
  const footGrd = ctx.createLinearGradient(0, H * 0.72, 0, H);
  footGrd.addColorStop(0, "rgba(0,0,0,0)");
  footGrd.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = footGrd; ctx.fillRect(0, H * 0.72, W, H * 0.28);

  /* Top gradient for top readability */
  const topGrd = ctx.createLinearGradient(0, 0, 0, H * 0.18);
  topGrd.addColorStop(0, "rgba(0,0,0,0.38)");
  topGrd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrd; ctx.fillRect(0, 0, W, H * 0.18);

  /* Thin top accent bar */
  ctx.fillStyle = pal.accent; ctx.fillRect(0, 0, W, 4);

  /* Hook text — centred, white, shadowed */
  const hookSize  = Math.min(Math.round(W * 0.065), 90);
  const maxHookW  = W - PAD * 2.4;
  ctx.textBaseline = "top"; ctx.textAlign = "center";
  ctx.font = `700 ${hookSize}px ${SF}`;
  const hookLines = wrapCanvasText(ctx, hook, maxHookW);
  const hookLineH = hookSize * 1.22;
  const supSize   = Math.round(hookSize * 0.33);
  const sepGap    = hookSize * 0.55;
  const supLineH  = supSize * 1.5;
  const supLines  = supporting ? wrapCanvasText(ctx, supporting, maxHookW) : [];
  const totalTH   = hookLines.length * hookLineH + (supporting ? sepGap + supLines.length * supLineH : 0);
  let y = (H * 0.86 - totalTH) / 2;
  y = Math.max(H * 0.12, y);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur  = 20;
  ctx.font = `700 ${hookSize}px ${SF}`;
  hookLines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.9)";
    ctx.fillText(line, W/2, y);
    y += hookLineH;
  });

  if (supporting) {
    y += hookSize * 0.18;
    const pillW = Math.round(W * 0.09), pillH = 3;
    rrect(ctx, W/2 - pillW/2, y, pillW, pillH, pillH/2);
    ctx.fillStyle = pal.accent; ctx.fill();
    y += hookSize * 0.32;
    ctx.shadowBlur = 14;
    ctx.font = `300 ${supSize}px ${SF}`;
    supLines.slice(0, 2).forEach(line => {
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillText(line, W/2, y);
      y += supLineH;
    });
  }
  ctx.restore();

  /* Footer */
  const footH  = Math.round(H * 0.10);
  const footY  = H - footH;
  const bfSize = Math.round(footH * 0.33);
  ctx.font = `600 ${bfSize}px ${SF}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(brandName.toUpperCase(), PAD, footY + footH / 2);

  ctx.fillStyle = pal.accent;
  ctx.beginPath(); ctx.arc(PAD * 0.55, footY + footH / 2, bfSize * 0.2, 0, Math.PI*2); ctx.fill();

  if (variantNum > 1) {
    ctx.font = `400 ${bfSize * 0.82}px ${SF}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "right";
    ctx.fillText(`V${variantNum}`, W - PAD, footY + footH / 2);
  }
}

/* ════════════════════════════════════════════
   MAIN EXPORT — picks template, renders, returns PNG Blob
════════════════════════════════════════════ */
async function exportToImage(
  text: string, fmt: OutputFormat, brandName: string,
  variantNum: number, styleProfile?: StyleProfile,
  bgImageUrl?: string,
): Promise<Blob> {
  const W = fmt.canvasW, H = fmt.canvasH;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const pal: StyleProfile["colorPalette"] = styleProfile?.colorPalette ?? {
    primary: "#E8ECF4", secondary: "#D6DDF0", accent: "#6366f1", text: "#1A1A1A",
  };

  const { hook, supporting } = extractHook(text);
  const PAD = Math.round(W * 0.08);

  if (bgImageUrl) {
    /* Draw AI photo as cover-fill background */
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const imgAR = img.width / img.height;
        const canAR = W / H;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (imgAR > canAR) {
          sw = Math.round(img.height * canAR);
          sx = Math.round((img.width - sw) / 2);
        } else {
          sh = Math.round(img.width / canAR);
          sy = Math.round((img.height - sh) / 2);
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `/api/content/image-proxy?url=${encodeURIComponent(bgImageUrl)}`;
    });
    renderPhotoTemplate(ctx, W, H, PAD, pal, hook, supporting, brandName, variantNum);
  } else {
    /* Original typographic templates */
    const bg  = styleProfile?.backgroundStyle ?? "gradient";
    const typ = styleProfile?.typographyStyle ?? "sans-serif";
    const isDark      = bg === "dark" || isDarkColor(pal.primary);
    const isEditorial = (typ === "serif" || styleProfile?.layoutStyle === "editorial" || styleProfile?.layoutStyle === "left-aligned") && !isDark;
    const isGradient  = bg === "gradient" && !isDark;
    if (isDark) {
      renderCinematic(ctx, W, H, PAD, pal, hook, supporting, brandName, variantNum);
    } else if (isEditorial) {
      renderEditorial(ctx, W, H, PAD, pal, hook, supporting, brandName, variantNum);
    } else {
      renderModern(ctx, W, H, PAD, pal, hook, supporting, brandName, variantNum, isGradient);
    }
  }

  return new Promise(r => canvas.toBlob(b => r(b!), "image/png", 1.0));
}

/* Legacy alias kept for wrapLines calls inside CarouselPreview */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, _lineH: number, maxLines: number): string[] {
  return wrapCanvasText(ctx, text, maxW).slice(0, maxLines);
}

async function downloadVariant(
  text: string, fmt: OutputFormat, brandName: string,
  variantNum: number, styleProfile: StyleProfile | null, toast: (t: any) => void,
  bgImageUrl?: string,
) {
  try {
    const blob = await exportToImage(text, fmt, brandName, variantNum, styleProfile ?? undefined, bgImageUrl);
    const file = new File([blob], `atreyu-${fmt.id}-v${variantNum}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `AERIS — ${fmt.label}` }); return;
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
        <p className="text-sm font-semibold">Analyzing profile…</p>
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
          <img src={proxyImg(profile.profilePicUrl)} alt={profile.username}
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
          <CheckCircle2 className="h-3 w-3" /> Analyzed
        </div>
      </div>

      {/* Post thumbnails */}
      {profile.posts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {profile.posts.slice(0,9).map((p, i) => (
            <div key={i} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden neu-inset-sm">
              {p.imageUrl ? (
                <img src={proxyImg(p.imageUrl)} alt="" className="w-full h-full object-cover" />
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
function ContentCard({ text, variantNum, totalVariants, fmt, brandName, streaming, styleProfile, referenceImageUrl, savedImage, onEditGraphic }: {
  text: string; variantNum: number; totalVariants: number; fmt: OutputFormat;
  brandName: string; streaming: boolean; styleProfile: StyleProfile | null;
  referenceImageUrl?: string;
  savedImage?: string | null;
  onEditGraphic?: (text: string, aiImageUrl: string | null, variantIdx: number) => void;
}) {
  const [copied, setCopied]                 = useState(false);
  const [downloading, setDownloading]       = useState(false);
  const [preview, setPreview]               = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiImageUrl, setAiImageUrl]         = useState<string | null>(null);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiImageError, setAiImageError]     = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const { toast } = useToast();
  const isMobile = navigator.maxTouchPoints > 0;

  /* Render canvas preview (uses AI background if available) */
  const generatePreview = async (bgUrl?: string | null) => {
    if (!text || streaming) return;
    setPreviewLoading(true);
    try {
      const blob = await exportToImage(
        text, fmt, brandName, variantNum,
        styleProfile ?? undefined,
        bgUrl ?? aiImageUrl ?? undefined,
      );
      setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
    } catch { /* silent */ }
    setPreviewLoading(false);
  };

  /* Auto-preview once streaming is done */
  useEffect(() => {
    if (!streaming && text) generatePreview();
  }, [streaming]);

  /* Re-render preview when AI image arrives */
  useEffect(() => {
    if (aiImageUrl && !streaming && text) generatePreview(aiImageUrl);
  }, [aiImageUrl]);

  /* Auto-generate AI background when streaming finishes + style profile exists + image format */
  const hasAutoGeneratedRef = useRef(false);
  useEffect(() => {
    if (!streaming && text && !fmt.isText && styleProfile && !aiImageUrl && !hasAutoGeneratedRef.current) {
      hasAutoGeneratedRef.current = true;
      generateAiPhoto();
    }
  }, [streaming]);

  /* Generate an AI photo background via KIE.AI */
  const [aiElapsed, setAiElapsed] = useState(0);
  const aiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateAiPhoto = async () => {
    if (!text || streaming || aiImageLoading) return;
    setAiImageLoading(true);
    setAiImageError(null);
    setAiElapsed(0);

    /* Start elapsed timer */
    aiTimerRef.current = setInterval(() => setAiElapsed(t => t + 1), 1000);

    try {
      const { hook } = extractHook(text);
      /* DO NOT pass referenceImageUrl — Instagram posts contain text overlays
         that FLUX reproduces in the background image. The competitor's style
         is already communicated via contentStyle, mood, colors, designNotes,
         and backgroundImagePrompt extracted by Claude Vision. */
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook,
          contentStyle:          styleProfile?.contentStyle,
          formatId:              fmt.id,
          brandColors:           styleProfile?.colorPalette
            ? [styleProfile.colorPalette.primary, styleProfile.colorPalette.accent, styleProfile.colorPalette.secondary]
            : undefined,
          brandName,
          mood:                  styleProfile?.mood,
          backgroundStyle:       styleProfile?.backgroundStyle,
          designNotes:           styleProfile?.designNotes,
          backgroundImagePrompt: styleProfile?.backgroundImagePrompt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error === "no_provider") {
          setShowApiKeyModal(true);
          if (aiTimerRef.current) clearInterval(aiTimerRef.current);
          setAiImageLoading(false);
          return;
        }
        throw new Error(err?.message ?? err?.error ?? "Image generation failed");
      }
      const { imageUrl } = await res.json();
      setAiImageUrl(imageUrl);
      toast({ title: "AI background generated", description: "Your image is ready." });
    } catch (err: any) {
      const msg = err?.message ?? "AI photo generation failed";
      setAiImageError(msg);
      toast({ title: "AI Photo failed", description: msg, variant: "destructive" });
    }
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);
    setAiImageLoading(false);
  };

  const pal = styleProfile?.colorPalette;

  return (
    <div className="neu-card rounded-2xl overflow-hidden flex flex-col">
      {/* Style palette strip — full width */}
      {pal && (
        <div className="flex h-1.5">
          {[pal.primary, pal.secondary, pal.accent, pal.text].map((c,i) => (
            <div key={i} className="flex-1" style={{background:c}} />
          ))}
        </div>
      )}

      {/* Body — vertical stack: header → thumbnail → actions → copy */}
      <div className="flex flex-col flex-1">

          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-2 flex-wrap">
              {streaming && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              <span className="hud-label">{totalVariants>1?`Version ${variantNum}`:fmt.label}</span>
              {styleProfile && !streaming && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  style-matched
                </span>
              )}
              {aiImageUrl && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold flex items-center gap-1">
                  <ImagePlus className="h-2.5 w-2.5" /> AI photo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{navigator.clipboard.writeText(deepCleanText(text));setCopied(true);setTimeout(()=>setCopied(false),1800);}}
                disabled={!text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium neu-raised-sm disabled:opacity-40">
                {copied?<><Check className="h-3 w-3 text-green-500"/>Copied</>:<><Copy className="h-3 w-3 text-muted-foreground"/>Copy</>}
              </button>
              <button
                onClick={async()=>{setDownloading(true);await downloadVariant(text,fmt,brandName,variantNum,styleProfile,toast,aiImageUrl??undefined);setDownloading(false);}}
                disabled={!text||streaming||downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-40 shadow-sm">
                {downloading?<Loader2 className="h-3 w-3 animate-spin"/>:
                  isMobile?<><Share2 className="h-3 w-3"/>Save</>:
                  <><Download className="h-3 w-3"/>Download PNG</>}
              </button>
            </div>
          </div>

          {/* ── Thumbnail — full aspect ratio, never cropped ── */}
          {!fmt.isText && (
            <div className="relative bg-black flex items-center justify-center overflow-hidden border-b border-border/20" style={{ minHeight: 240 }}>
              {savedImage ? (
                <>
                  <img src={savedImage} alt="Saved design" className="max-w-full object-contain block" style={{ maxHeight: 560 }} />
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow">
                      Modified
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent text-center">
                    <p className="text-[9px] text-white/80 leading-snug">
                      Saved design · Download for full resolution
                    </p>
                  </div>
                </>
              ) : (preview && !streaming) ? (
                <>
                  <img src={preview} alt="Post preview" className="max-w-full object-contain block" style={{ maxHeight: 560 }} />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent text-center">
                    <p className="text-[9px] text-white/80 leading-snug">
                      {fmt.canvasW}×{fmt.canvasH}px · Download for full resolution
                    </p>
                  </div>
                </>
              ) : previewLoading ? (
                <div className="h-[240px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                </div>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center gap-3">
                  <ImagePlus className="h-8 w-8 text-muted-foreground/20" />
                  <span className="text-[10px] text-muted-foreground/40">Generating preview…</span>
                </div>
              )}
            </div>
          )}

          {/* AI Photo + Edit buttons (image formats) */}
          {!streaming && text && !fmt.isText && (
            <div className="px-6 pt-4 pb-2 space-y-2.5">
              <button
                onClick={generateAiPhoto}
                disabled={aiImageLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-violet-500/30 text-violet-500 hover:bg-violet-500/8 disabled:opacity-50 transition-colors">
                {aiImageLoading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {aiElapsed < 30 ? `Generating AI photo… ${aiElapsed}s` : `Taking longer than usual… ${aiElapsed}s`}
                    </>
                  : aiImageUrl
                    ? <><ImagePlus className="h-3.5 w-3.5" />Regenerate AI background</>
                    : <><ImagePlus className="h-3.5 w-3.5" />Generate AI background photo</>
                }
              </button>
              {aiImageError && (
                <p className="text-[10px] text-red-400 text-center">{aiImageError}</p>
              )}
              {onEditGraphic && (
                <button
                  onClick={() => onEditGraphic(text, savedImage ?? aiImageUrl, variantNum - 1)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> {savedImage ? "Re-edit Saved Design" : "Edit in Graphic Editor"}
                </button>
              )}
            </div>
          )}

          {/* Edit Graphic button for text-only formats */}
          {!streaming && text && fmt.isText && onEditGraphic && (
            <div className="px-6 pt-4 pb-2">
              <button
                onClick={() => onEditGraphic(text, savedImage ?? null, variantNum - 1)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                <Pencil className="h-3.5 w-3.5" /> {savedImage ? "Re-edit Saved Design" : "Edit in Graphic Editor"}
              </button>
            </div>
          )}

          {/* ── Copy text ── */}
          <div className="px-6 py-5 min-h-[100px] border-t border-border/30">
            {text ? (
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-[inherit]">
                {deepCleanText(text)}
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

      </div>{/* end body */}

      {/* No API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="neu-card rounded-2xl p-6 max-w-sm mx-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center neu-raised-sm">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Image APIs Connected</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To generate AI images and graphics, connect your Replicate (FLUX) or Ideogram API key in Settings.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowApiKeyModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium neu-raised-sm text-muted-foreground hover:text-foreground transition-all">
                Cancel
              </button>
              <a href="/settings"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground text-center hover:bg-primary/90 transition-all">
                Go to Settings
              </a>
            </div>
          </div>
        </div>
      )}
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
  const [copyMode, setCopyMode]       = useState<"ai" | "own">("ai");

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

  /* ── Editor state (Step 4) ── */
  const [editorMode, setEditorMode]           = useState(false);
  const [editorText, setEditorText]           = useState("");
  const [editorAiImage, setEditorAiImage]     = useState<string|null>(null);
  const [editorVariantIndex, setEditorVariantIndex] = useState(0);
  const [savedImages, setSavedImages]         = useState<Record<number, string>>({});

  const selectedFormat = FORMATS.find(f => f.id === formatId);
  const brandName      = brand?.name ?? "AERIS";

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
      /* ── Safe JSON helper — avoids "Unexpected end of JSON" on empty bodies ── */
      const safeJson = async (res: Response) => {
        const text = await res.text();
        if (!text.trim()) return {};
        try { return JSON.parse(text); } catch { return { _raw: text }; }
      };

      /* 1. Scrape profile */
      const scrapeRes = await fetch("/api/content/scrape-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: socialUrl }),
      });

      if (!scrapeRes.ok) {
        const err = await safeJson(scrapeRes);
        throw new Error(err.error ?? `Profile scrape failed (${scrapeRes.status})`);
      }

      const profile: ProfileData = await safeJson(scrapeRes);
      if (!profile || !profile.username) throw new Error("Profile not found or is private");
      setProfileData(profile);

      /* 2. Analyze style (only if we have post images) */
      if (profile.posts?.length > 0) {
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
          const data = await safeJson(analyzeRes);
          if (data.styleProfile) setStyleProfile(data.styleProfile);
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
    (step===1 && brief.trim().length>5) ||
    (step===2 && !!formatId)
  );

  const goNext = () => {
    if (step===0 && sourceMode==="social_import") runProfileAnalysis();
    setStep(s => s + 1);
  };

  /* ── Generate ── */
  const handleGenerate = async () => {
    if (!formatId) return;
    setSavedImages({}); setData(""); setCarouselData(null); setVariants([]); setGenerated(true);
    const fmt = FORMATS.find(f=>f.id===formatId)!;

    /* "Write My Own" mode — skip AI copy generation, use the user's text directly */
    if (copyMode === "own" && !fmt.isText && !fmt.isCarousel) {
      setVariants([brief]);
      /* Auto-open graphic editor immediately for image formats */
      setEditorText(brief);
      setEditorAiImage(null);
      setEditorVariantIndex(0);
      setEditorMode(true);
      return;
    }

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
    setMethod("standard"); setFormatId(null); setVersionCount(1); setCopyMode("ai");
    setGenerated(false); setVariants([]); setCarouselData(null); setData("");
    setProfileData(null); setStyleProfile(null); setProfileLoading(false); setProfileError(null);
    setEditorMode(false); setEditorText(""); setEditorAiImage(null);
    setSavedImages({}); setEditorVariantIndex(0);
    analysisTriggered.current = false;
  };

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className={`${editorMode ? "max-w-6xl" : "max-w-4xl"} mx-auto space-y-6 animate-in fade-in duration-500 pb-20`}>

      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <p className="hud-label">Content Studio</p>
        <h1 className="text-3xl font-bold tracking-tight">Create Content That Converts</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          AI-powered content in three steps. Any format, any platform.
        </p>
      </div>

      {generated && !editorMode && (
        <div className="flex justify-center">
          <button onClick={startOver}
            className="flex items-center gap-2 px-4 py-2 rounded-xl neu-raised-sm text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
            <ChevronLeft className="h-4 w-4" /> Start Over
          </button>
        </div>
      )}

      {/* ════ GRAPHIC EDITOR MODE ════ */}
      {editorMode && selectedFormat && (
        <ContentEditor
          text={editorText}
          format={selectedFormat}
          styleProfile={styleProfile}
          brandName={brandName}
          aiImageUrl={editorAiImage}
          onBack={() => setEditorMode(false)}
          onSave={(dataUrl) => {
            setSavedImages(prev => ({ ...prev, [editorVariantIndex]: dataUrl }));
            setEditorMode(false);
          }}
        />
      )}

      {/* ════ GENERATED OUTPUT ════ */}
      {generated && !editorMode ? (
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
            <div className="flex gap-5 overflow-x-auto pb-2 justify-center">
              {Array.from({length:versionCount}).map((_,i)=>(
                <div key={i} className="flex-shrink-0"
                  style={{width:versionCount===1?"100%":versionCount===2?"48%":"32%"}}>
                  <SkeletonCard fmt={selectedFormat!} index={i} total={versionCount} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1">
              {(variants.length>0?variants:[rawText??""]).map((text,i)=>(
                <ContentCard key={i} text={text} variantNum={i+1} totalVariants={versionCount}
                  fmt={selectedFormat!} brandName={brandName} streaming={isStreaming&&i===variants.length-1}
                  styleProfile={styleProfile}
                  referenceImageUrl={sourceMode==="social_import"&&profileData?.posts?.length?profileData.posts[0].imageUrl:undefined}
                  savedImage={savedImages[i] ?? null}
                  onEditGraphic={(t, aiImg, variantIdx) => { setEditorText(t); setEditorAiImage(aiImg); setEditorVariantIndex(variantIdx); setEditorMode(true); }} />
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
                  <h2 className="text-xl font-bold">Where should AERIS pull your brand from?</h2>
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
                        <p className="text-sm text-muted-foreground">Uses your saved brand identity, voice, colors, and style examples.</p>
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
                      Paste a competitor's Instagram/LinkedIn/TikTok URL — AERIS scrapes their posts, extracts their visual style, and writes content that matches their aesthetic.
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
                  <p className="text-sm text-muted-foreground">Write your own copy or let AERIS generate it for you.</p>
                </div>

                {/* Profile analysis (social_import only) */}
                {sourceMode==="social_import" && (
                  <ProfileCard profile={profileData} styleProfile={styleProfile} loading={profileLoading} error={profileError} />
                )}

                {/* ── Copy mode toggle ── */}
                <div className="flex gap-2 p-1 rounded-2xl neu-inset-sm">
                  <button onClick={()=>setCopyMode("ai")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none
                      ${copyMode==="ai"?"bg-primary text-primary-foreground shadow-md":"text-muted-foreground hover:text-foreground"}`}>
                    <Sparkles className="h-4 w-4"/>
                    AERIS Writes It
                  </button>
                  <button onClick={()=>setCopyMode("own")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none
                      ${copyMode==="own"?"bg-primary text-primary-foreground shadow-md":"text-muted-foreground hover:text-foreground"}`}>
                    <PenTool className="h-4 w-4"/>
                    I'll Write It
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    {copyMode==="own" ? "Your Copy *" : "Your Message / Topic *"}
                  </label>
                  <NeuInput>
                    <Textarea value={brief} onChange={e=>setBrief(e.target.value)}
                      placeholder={copyMode==="own"
                        ? "Type your final copy here — exactly what you want to appear on the graphic. e.g. 1,000 users in 4 days. No ads. Just product."
                        : "e.g. We just hit 10,000 customers in 18 months without paid ads. Share the exact 3-step content strategy, include specific numbers, and why most people get step 2 wrong."}
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[110px] text-sm resize-none"/>
                  </NeuInput>
                  <p className="text-xs text-muted-foreground">
                    {copyMode==="own"
                      ? "This text will appear on your graphic as editable layers. You can adjust it in the editor after."
                      : "Include specific numbers, stories, or angles you want covered."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Target Audience</label>
                  <NeuInput>
                    <Input value={audience} onChange={e=>setAudience(e.target.value)}
                      placeholder="e.g. SaaS founders, D2C marketing managers, freelancers scaling to agency…"
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none"/>
                  </NeuInput>
                </div>

                {copyMode==="ai" && (
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
                )}

                {copyMode==="ai" && method==="viral_replication" && (
                  <div className="neu-inset-sm rounded-2xl p-5 space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Repeat2 className="h-4 w-4 text-amber-500"/> Paste the Original Viral Post
                    </label>
                    <NeuInput>
                      <Textarea value={originalPost} onChange={e=>setOriginalPost(e.target.value)}
                        placeholder="Paste the viral post here. AERIS keeps the hook structure and adapts it to your brand."
                        className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[90px] text-sm resize-none"/>
                    </NeuInput>
                  </div>
                )}

                {copyMode==="ai" && (
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
                )}
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

                {copyMode==="ai" && (
                <div className="space-y-3">
                  <div className="text-center space-y-0.5">
                    <p className="text-sm font-semibold">How many versions do you want?</p>
                    <p className="text-xs text-muted-foreground">AERIS writes multiple takes so you can pick the best one.</p>
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
                )}

                {copyMode==="own" && selectedFormat && !selectedFormat.isText && !selectedFormat.isCarousel && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl neu-inset-sm">
                    <PenTool className="h-4 w-4 text-primary flex-shrink-0"/>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Your copy is ready.</strong> Clicking Generate will open the graphic editor immediately — AERIS will generate a matching background image you can swap or keep.
                    </p>
                  </div>
                )}

                {styleProfile && (
                  <div className="flex items-center gap-2 p-4 rounded-2xl neu-inset-sm">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0"/>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Style-matching active.</strong> Output images will use @{profileData?.username}'s color palette: &nbsp;
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
                      <strong className="text-foreground">{selectedFormat.label}</strong> · {selectedFormat.platforms}
                      {copyMode==="ai" && ` · ${versionCount} version${versionCount>1?"s":""}`}
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
                {copyMode==="own" && selectedFormat && !selectedFormat?.isText && !selectedFormat?.isCarousel
                  ? "Open Graphic Editor"
                  : `Generate ${versionCount>1?`${versionCount} Versions`:"Content"}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
