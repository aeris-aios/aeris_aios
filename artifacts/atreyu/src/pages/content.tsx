import { useState, useEffect } from "react";
import {
  PenTool, Wand2, ChevronRight, ChevronLeft, CheckCircle2, Loader2,
  Repeat2, TrendingUp, HeartHandshake, LayoutTemplate, Layers,
  Copy, Check, Save, Download, Palette, Building2, Globe, Link,
  Instagram, Youtube, Twitter, Linkedin, Facebook,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  id: string;
  label: string;
  sublabel: string;
  w: number;   // display ratio width
  h: number;   // display ratio height
  platforms: string;
  contentType: string;
  isText?: boolean;
  isCarousel?: boolean;
};

interface CarouselSlide { number?: number; heading: string; subtitle: string; takeaway: string; }
interface CarouselStructure {
  title: string; brandName: string; accentColor: string;
  slides: CarouselSlide[]; ctaText: string; ctaSubtitle: string;
}

/* ─────────────── Constants ─────────────── */
const FORMATS: OutputFormat[] = [
  { id: "linkedin_post",    label: "LinkedIn Post",    sublabel: "Text-only post",         w: 4, h: 3,  platforms: "LinkedIn",                   contentType: "linkedin_post", isText: true  },
  { id: "carousel",         label: "Carousel",         sublabel: "Multi-slide swipe post",  w: 4, h: 5,  platforms: "LinkedIn · Instagram",        contentType: "linkedin_post", isCarousel: true },
  { id: "square",           label: "Square 1:1",       sublabel: "Feed image",              w: 1, h: 1,  platforms: "Instagram · Facebook",        contentType: "social"         },
  { id: "portrait",         label: "Portrait 4:5",     sublabel: "Tall feed image",         w: 4, h: 5,  platforms: "Instagram · LinkedIn",        contentType: "social"         },
  { id: "vertical",         label: "Vertical 9:16",    sublabel: "Reels / TikTok",          w: 9, h: 16, platforms: "Instagram · TikTok · YouTube",contentType: "social"         },
  { id: "story",            label: "Story",            sublabel: "Instagram / Facebook",    w: 9, h: 16, platforms: "Instagram · Facebook",        contentType: "social"         },
  { id: "landscape",        label: "Landscape 16:9",   sublabel: "YouTube / LinkedIn video",w: 16,h: 9,  platforms: "YouTube · LinkedIn",          contentType: "social"         },
  { id: "youtube_short",    label: "YouTube Short",    sublabel: "60s vertical video",      w: 9, h: 16, platforms: "YouTube",                    contentType: "social"         },
];

const METHODS = [
  { id: "standard",          label: "Standard",          icon: PenTool,         desc: "Write a compelling post from your brief"                                },
  { id: "viral_replication", label: "Viral Replication", icon: Repeat2,         desc: "Clone the structure of a proven viral post"                            },
  { id: "trend_surfing",     label: "Trend Surfing",     icon: TrendingUp,      desc: "Connect a current trend to your expertise"                             },
  { id: "pain_point",        label: "Pain Point",        icon: HeartHandshake,  desc: "Pain → Insight → Solution framework"                                   },
] as const;

const PLATFORMS: { id: Platform; label: string; color: string; example: string }[] = [
  { id: "instagram", label: "Instagram", color: "#E1306C", example: "instagram.com/username" },
  { id: "facebook",  label: "Facebook",  color: "#1877F2", example: "facebook.com/pagename"  },
  { id: "linkedin",  label: "LinkedIn",  color: "#0A66C2", example: "linkedin.com/in/username"},
  { id: "twitter",   label: "X / Twitter",color:"#000000", example: "x.com/username"          },
  { id: "tiktok",    label: "TikTok",    color: "#010101", example: "tiktok.com/@username"    },
  { id: "youtube",   label: "YouTube",   color: "#FF0000", example: "youtube.com/@channel"    },
];

function detectPlatform(url: string): Platform | null {
  if (/instagram\.com/i.test(url))  return "instagram";
  if (/facebook\.com/i.test(url))   return "facebook";
  if (/linkedin\.com/i.test(url))   return "linkedin";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  if (/tiktok\.com/i.test(url))     return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  return null;
}

/* ─────────────── Step indicator ─────────────── */
const STEPS = ["Source", "Brief", "Format"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const done    = i < step;
        const current = i === step;
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
              <span className={`text-xs mt-1 font-medium ${current ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
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
  const maxH = 72;
  const maxW = 90;
  const ratio = fmt.w / fmt.h;
  const displayH = ratio < 1 ? maxH : Math.round(maxW / ratio);
  const displayW = ratio < 1 ? Math.round(maxH * ratio) : maxW;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center w-full hover:border-primary/50 ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      {/* Aspect ratio visual */}
      <div className="flex items-center justify-center" style={{ height: maxH + 4, width: maxW + 4 }}>
        <div
          className={`rounded-lg flex items-center justify-center transition-colors ${
            selected ? "bg-primary/20 border-2 border-primary/40" : "bg-muted/60 border-2 border-border"
          }`}
          style={{ width: displayW, height: displayH }}
        >
          {fmt.isText && (
            <div className="flex flex-col gap-1 p-1 w-full px-2">
              {[100, 80, 90, 60].map((w, i) => (
                <div key={i} className={`h-1 rounded-full ${selected ? "bg-primary/40" : "bg-muted-foreground/30"}`} style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
          {fmt.isCarousel && (
            <div className="flex gap-0.5 items-stretch h-full py-1 px-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`flex-1 rounded-sm ${selected ? "bg-primary/40" : "bg-muted-foreground/30"}`} style={{ opacity: 1 - i * 0.25 }} />
              ))}
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

/* ─────────────── Carousel preview ─────────────── */
function CarouselPreview({ data }: { data: CarouselStructure }) {
  const [copied, setCopied] = useState<number | null>(null);
  const accent = data.accentColor ?? "#6366f1";

  const allSlides = [
    { heading: data.title, subtitle: "", takeaway: "", isCover: true },
    ...data.slides,
    { heading: data.ctaText, subtitle: data.ctaSubtitle, takeaway: "", isCta: true },
  ];

  const copy = (slide: any, idx: number) => {
    const text = [slide.heading, slide.subtitle, slide.takeaway ? `"${slide.takeaway}"` : ""].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Strip */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {allSlides.map((slide, idx) => {
          const isCover = idx === 0;
          const isCta = idx === allSlides.length - 1;
          return (
            <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="rounded-xl overflow-hidden border border-border"
                style={{ width: 120, aspectRatio: "4/5", background: "#F5F3EE", fontFamily: "Georgia,serif", position: "relative" }}>
                {/* Bottom band */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 20, background: "#1A1A1A",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 5.5, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1 }}>
                    {data.brandName?.toUpperCase() ?? "BRAND"}
                  </span>
                </div>
                <div style={{ padding: "8px 8px 26px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
                  {isCover ? (
                    <>
                      <div style={{ height: 1.5, width: 28, background: accent, margin: "3px auto 6px" }} />
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ fontSize: 7, fontWeight: 700, color: "#1A1A1A", textAlign: "center", lineHeight: 1.3 }}>{slide.heading}</p>
                      </div>
                      <p style={{ fontSize: 5, color: "#999", textAlign: "center", fontFamily: "sans-serif" }}>swipe →</p>
                    </>
                  ) : isCta ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 6 }}>✓</span>
                      </div>
                      <p style={{ fontSize: 6, fontWeight: 700, color: "#1A1A1A", textAlign: "center", lineHeight: 1.3 }}>{slide.heading}</p>
                      <p style={{ fontSize: 4.5, color: "#888", textAlign: "center", fontFamily: "sans-serif", lineHeight: 1.4 }}>{slide.subtitle}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 5.5, fontWeight: 700, color: "#fff" }}>{(slide as any).number}</span>
                        </div>
                        <p style={{ fontSize: 5.5, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2 }}>{slide.heading}</p>
                      </div>
                      <p style={{ fontSize: 4.5, color: "#555", lineHeight: 1.4, fontFamily: "sans-serif", marginBottom: 3 }}>{slide.subtitle}</p>
                      {slide.takeaway && (
                        <p style={{ fontSize: 4, fontStyle: "italic", color: "#333", textAlign: "center" }}>"{slide.takeaway}"</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => copy(slide, idx)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
                {copied === idx ? <><Check className="h-2.5 w-2.5 text-green-500" />Copied</> : <><Copy className="h-2.5 w-2.5" />Copy</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Slide content */}
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
        <div className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{data.ctaText}</p>
            <p className="text-xs text-muted-foreground">{data.ctaSubtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
export default function ContentStudio() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  /* ── Brand profile ── */
  const [brand, setBrand] = useState<{ name: string } | null>(null);
  useEffect(() => {
    fetch("/api/brand/profile").then(r => r.json()).then(p => { if (p?.name) setBrand({ name: p.name }); }).catch(() => {});
  }, []);

  /* ── Wizard state ── */
  const [step, setStep] = useState(0);

  /* Step 1 – Source */
  const [sourceMode, setSourceMode]   = useState<SourceMode | null>(null);
  const [socialUrl, setSocialUrl]     = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);

  /* Step 2 – Brief */
  const [brief, setBrief]             = useState("");
  const [audience, setAudience]       = useState("");
  const [method, setMethod]           = useState<Method>("standard");
  const [writingStyle, setWritingStyle] = useState<WritingStyle>("adam_robinson");
  const [customStyle, setCustomStyle] = useState("");
  const [originalPost, setOriginalPost] = useState("");

  /* Step 3 – Format */
  const [formatId, setFormatId]       = useState<string | null>(null);
  const [slideCount, setSlideCount]   = useState(7);

  /* Generation */
  const { stream, data: generatedText, isStreaming, setData } = useSSE();
  const [carouselData, setCarouselData]   = useState<CarouselStructure | null>(null);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [generated, setGenerated]     = useState(false);

  const selectedFormat = FORMATS.find(f => f.id === formatId);

  /* Detect platform from URL */
  useEffect(() => {
    setDetectedPlatform(detectPlatform(socialUrl));
  }, [socialUrl]);

  /* ── Navigation ── */
  const canNext = (
    (step === 0 && (sourceMode === "brand_kit" || (sourceMode === "social_import" && socialUrl.trim().length > 5))) ||
    (step === 1 && brief.trim().length > 0) ||
    (step === 2 && !!formatId)
  );

  const goNext = () => { if (step < 2) setStep(s => s + 1); };
  const goBack = () => { setStep(s => s - 1); };

  /* ── Generate ── */
  const handleGenerate = async () => {
    if (!formatId) return;
    setData("");
    setCarouselData(null);
    setGenerated(true);

    const fmt = FORMATS.find(f => f.id === formatId)!;

    await stream("/api/content/generate", {
      type: fmt.contentType,
      platform: fmt.platforms.split("·")[0].trim(),
      context: brief,
      audience,
      model: "sonnet",
      method,
      writingStyle,
      customStyle,
      originalPost: method === "viral_replication" ? originalPost : "",
      format: fmt.isCarousel ? "text_carousel" : "text_only",
      socialProfileUrl: sourceMode === "social_import" ? socialUrl : "",
    });
  };

  /* ── Build carousel ── */
  const handleCarousel = async () => {
    setCarouselLoading(true);
    try {
      const res = await fetch("/api/content/carousel/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: brief, slideCount, audience, model: "sonnet", postText: generatedText ?? "" }),
      });
      const data = await res.json();
      setCarouselData(data);
      toast({ title: "Carousel built", description: `${data.slides?.length ?? 0} slides ready.` });
    } catch {
      toast({ title: "Carousel generation failed", variant: "destructive" });
    } finally {
      setCarouselLoading(false);
    }
  };

  /* ── Start over ── */
  const startOver = () => {
    setStep(0); setSourceMode(null); setSocialUrl(""); setBrief(""); setAudience("");
    setMethod("standard"); setFormatId(null); setGenerated(false); setCarouselData(null);
    setData("");
  };

  /* ══════ RENDER ══════ */
  return (
    <div className="max-w-4xl mx-auto space-y-2 animate-in fade-in duration-500 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <PenTool className="h-8 w-8 text-primary" />
            Content Studio
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Create high-converting content in three steps.</p>
        </div>
        {generated && (
          <Button variant="outline" onClick={startOver} className="text-sm border-border">
            ← Start Over
          </Button>
        )}
      </div>

      {/* ── GENERATION OUTPUT (shown after generate) ── */}
      {generated ? (
        <div className="space-y-6">
          {/* Format badge */}
          {selectedFormat && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{selectedFormat.label}</span>
              <span>·</span>
              <span>{selectedFormat.platforms}</span>
              {sourceMode === "social_import" && detectedPlatform && (
                <><span>·</span><span className="capitalize">{detectedPlatform} import</span></>
              )}
            </div>
          )}

          {/* Post output */}
          <Card className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <span className="font-semibold text-sm">Generated Copy</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs border-border">
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                </Button>
                <Button size="sm" className="h-8 text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25">
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                </Button>
              </div>
            </div>
            <div className="p-6 min-h-[200px]">
              {generatedText ? (
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{generatedText}</ReactMarkdown>
                  {isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse align-middle" />}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Writing your content…</span>
                </div>
              )}
            </div>
          </Card>

          {/* Carousel trigger + preview */}
          {selectedFormat?.isCarousel && generatedText && !isStreaming && (
            <div>
              {!carouselData ? (
                <Button onClick={handleCarousel} disabled={carouselLoading}
                  className="w-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10" variant="outline">
                  {carouselLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building carousel slides…</>
                    : <><Layers className="h-4 w-4 mr-2" /> Build Carousel Slides ({slideCount} slides)</>}
                </Button>
              ) : (
                <Card className="rounded-2xl border border-border bg-card">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" /> Carousel Preview
                    </span>
                    <span className="text-xs text-muted-foreground">{carouselData.slides.length + 2} slides · 1080×1350</span>
                  </div>
                  <div className="p-5">
                    <CarouselPreview data={carouselData} />
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── WIZARD ── */
        <div>
          <StepBar step={step} />

          {/* ══ STEP 1: SOURCE ══ */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-foreground">Where should ATREYU pull your brand from?</h2>
                <p className="text-sm text-muted-foreground mt-1">Your brand identity shapes every word of the output.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brand Kit card */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSourceMode("brand_kit")}
                  onKeyDown={e => e.key === "Enter" && setSourceMode("brand_kit")}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                    sourceMode === "brand_kit"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  {sourceMode === "brand_kit" && (
                    <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Use My Brand Kit</p>
                      <p className="text-xs text-muted-foreground">Recommended</p>
                    </div>
                  </div>
                  {brand ? (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400 font-medium">{brand.name} configured</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      <p className="text-sm text-muted-foreground">ATREYU will use your saved brand identity, voice, colours, and style examples.</p>
                      <span onClick={e => { e.stopPropagation(); navigate("/brand"); }}
                        className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                        <Palette className="h-3 w-3" /> Set up Brand Kit first →
                      </span>
                    </div>
                  )}
                  {brand && <p className="text-sm text-muted-foreground mt-1">Uses your saved voice, colours, and style examples.</p>}
                </div>

                {/* Social import card */}
                <button
                  onClick={() => setSourceMode("social_import")}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                    sourceMode === "social_import"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  {sourceMode === "social_import" && (
                    <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Import Social Profile</p>
                      <p className="text-xs text-muted-foreground">Match a profile's style</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paste a social profile link — ATREYU will analyse their content style and replicate it.
                  </p>
                  {/* Platform icons */}
                  <div className="flex items-center gap-3 mt-3">
                    {[
                      { color: "#E1306C", icon: Instagram },
                      { color: "#1877F2", icon: Facebook },
                      { color: "#0A66C2", icon: Linkedin },
                      { color: "#000", icon: Twitter },
                      { color: "#FF0000", icon: Youtube },
                    ].map(({ color, icon: Icon }, i) => (
                      <Icon key={i} className="h-5 w-5" style={{ color }} />
                    ))}
                    <span className="text-xs text-muted-foreground">+ TikTok</span>
                  </div>
                </button>
              </div>

              {/* Social URL input */}
              {sourceMode === "social_import" && (
                <div className="space-y-3 p-5 rounded-2xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Profile URL</label>
                    {detectedPlatform && (
                      <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                        {detectedPlatform} detected
                      </span>
                    )}
                  </div>
                  <Input
                    value={socialUrl}
                    onChange={e => setSocialUrl(e.target.value)}
                    placeholder="e.g. instagram.com/nike or linkedin.com/in/username"
                    className="bg-card border-border"
                  />
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

          {/* ══ STEP 2: BRIEF ══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-foreground">What do you want to say?</h2>
                <p className="text-sm text-muted-foreground mt-1">Give ATREYU a clear brief — the more specific, the better the output.</p>
              </div>

              {/* Message brief */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Your Message / Topic *</label>
                <Textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder="e.g. We just hit 10,000 customers in 18 months without paid ads. Here's the exact 3-step content strategy we used — share the process, specific numbers, and why most people get step 2 wrong."
                  className="bg-muted/60 border-border min-h-[120px] text-sm"
                />
                <p className="text-xs text-muted-foreground">Include specific numbers, stories, or angles you want covered.</p>
              </div>

              {/* Audience */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Target Audience</label>
                <Input
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  placeholder="e.g. SaaS founders, D2C marketing managers, freelancers scaling to agency…"
                  className="bg-muted/60 border-border"
                />
              </div>

              {/* Content method */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Content Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {METHODS.map(m => {
                    const Icon = m.icon;
                    const active = method === m.id;
                    return (
                      <button key={m.id} onClick={() => setMethod(m.id as Method)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${
                          active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30 hover:bg-muted/20"
                        }`}>
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

              {/* Viral original post */}
              {method === "viral_replication" && (
                <div className="space-y-2 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Repeat2 className="h-4 w-4 text-amber-500" /> Paste the Original Viral Post
                  </label>
                  <Textarea
                    value={originalPost}
                    onChange={e => setOriginalPost(e.target.value)}
                    placeholder="Paste the viral post here. ATREYU keeps the hook structure and body architecture — only swapping the topic for your brand's story."
                    className="bg-card border-border min-h-[100px] text-sm"
                  />
                </div>
              )}

              {/* Writing style */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Writing Style</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "adam_robinson", label: "Adam Robinson", desc: "Raw · conversational · real numbers · never corporate" },
                    { id: "brand_voice",   label: "Brand Voice",   desc: "Your Brand Kit voice profile"                          },
                    { id: "custom",        label: "Custom",        desc: "Describe your own style"                               },
                  ].map(s => (
                    <button key={s.id} onClick={() => setWritingStyle(s.id as WritingStyle)}
                      className={`flex-1 min-w-[140px] text-left p-3 rounded-xl border-2 transition-all ${
                        writingStyle === s.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                      }`}>
                      <p className={`text-sm font-semibold ${writingStyle === s.id ? "text-primary" : "text-foreground"}`}>{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
                {writingStyle === "custom" && (
                  <Textarea value={customStyle} onChange={e => setCustomStyle(e.target.value)}
                    placeholder="Describe the writing style in detail — tone, sentence length, words to avoid, favourite phrases…"
                    className="bg-muted/60 border-border min-h-[80px] text-sm" />
                )}
              </div>
            </div>
          )}

          {/* ══ STEP 3: FORMAT ══ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-foreground">What's the output format?</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose where and how this content will be published.</p>
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
                        className={`w-9 h-8 text-sm rounded-lg border transition-colors ${
                          n === slideCount ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Format info */}
              {selectedFormat && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Selected: <strong className="text-foreground">{selectedFormat.label}</strong> — {selectedFormat.platforms}</span>
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
              <Button
                onClick={handleGenerate}
                disabled={!canNext || isStreaming}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 shadow-[0_0_20px_rgba(0,150,255,0.3)]"
              >
                <Wand2 className={`h-4 w-4 mr-2 ${isStreaming ? "animate-spin" : ""}`} />
                Generate Content
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
