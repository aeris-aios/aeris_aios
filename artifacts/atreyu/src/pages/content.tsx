import { useState, useEffect, useRef } from "react";
import {
  PenTool, Wand2, Download, Save, Palette, CheckCircle2, Loader2,
  Linkedin, Repeat2, TrendingUp, HeartHandshake, LayoutTemplate,
  Layers, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSSE } from "@/hooks/use-sse";
import ReactMarkdown from "react-markdown";
import { useCreateContentAsset } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

/* ─────────────── Types ─────────────── */
type ContentMethod  = "standard" | "viral_replication" | "trend_surfing" | "pain_point";
type WritingStyle   = "adam_robinson" | "brand_voice" | "custom";
type ContentFormat  = "text_only" | "text_carousel";

interface CarouselSlide {
  number?: number;
  heading: string;
  subtitle: string;
  takeaway: string;
}
interface CarouselStructure {
  title: string;
  titleEmphasis?: string;
  brandName: string;
  accentColor: string;
  slides: CarouselSlide[];
  ctaText: string;
  ctaSubtitle: string;
}

/* ─────────────── Carousel slide preview ─────────────── */
function CarouselSlideCard({
  slide, index, total, accentColor, brandName,
}: {
  slide: CarouselSlide & { isCover?: boolean; isCta?: boolean };
  index: number; total: number; accentColor: string; brandName: string;
}) {
  const isCover = index === 0;
  const isCta = index === total - 1;

  return (
    <div
      className="rounded-xl overflow-hidden border border-border flex-shrink-0"
      style={{ width: 180, aspectRatio: "4/5", background: "#F5F3EE", position: "relative", fontFamily: "Georgia, serif" }}
    >
      {/* Bottom banner */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 28,
        background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: "#fff", fontSize: 7, fontFamily: "sans-serif", fontWeight: 700, letterSpacing: 1 }}>
          {brandName.toUpperCase()}
        </span>
      </div>

      <div style={{ padding: "10px 10px 36px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        {isCover ? (
          /* Cover slide */
          <>
            <div style={{ height: 2, width: 40, background: accentColor, margin: "4px auto 8px" }} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", textAlign: "center", lineHeight: 1.3 }}>
                {slide.heading}
              </p>
            </div>
            <p style={{ fontSize: 6, color: "#888", textAlign: "center", fontFamily: "sans-serif" }}>swipe →</p>
          </>
        ) : isCta ? (
          /* CTA slide */
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#1A1A1A", fontSize: 8 }}>✓</span>
              </div>
              <p style={{ fontSize: 8, fontWeight: 700, color: "#1A1A1A", textAlign: "center", lineHeight: 1.3 }}>
                {slide.heading}
              </p>
              <p style={{ fontSize: 6, color: "#888", textAlign: "center", fontFamily: "sans-serif", lineHeight: 1.4 }}>
                {slide.subtitle}
              </p>
            </div>
          </>
        ) : (
          /* Content slide */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: "#1A1A1A" }}>{slide.number}</span>
              </div>
              <p style={{ fontSize: 7.5, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2 }}>{slide.heading}</p>
            </div>
            <p style={{ fontSize: 6, color: "#555", lineHeight: 1.4, fontFamily: "sans-serif", marginBottom: 4 }}>
              {slide.subtitle}
            </p>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${accentColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: accentColor }} />
              </div>
            </div>
            <p style={{ fontSize: 5.5, fontStyle: "italic", color: "#333", textAlign: "center", lineHeight: 1.4 }}>
              "{slide.takeaway}"
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Option pill button ─────────────── */
function Pill({
  label, icon: Icon, active, onClick,
}: { label: string; icon?: React.ElementType; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════ */
export default function ContentStudio() {
  const [, navigate] = useLocation();
  const [brandProfile, setBrandProfile] = useState<{ name: string; styleExamplesCount?: number } | null>(null);

  useEffect(() => {
    fetch("/api/brand/profile").then(r => r.json()).then(p => {
      if (p?.name) setBrandProfile({ name: p.name });
    }).catch(() => {});
    fetch("/api/brand/examples").then(r => r.json()).then((examples: any[]) => {
      const analyzed = examples.filter((e: any) => e.analysisResult);
      if (analyzed.length > 0) setBrandProfile(prev => prev ? { ...prev, styleExamplesCount: analyzed.length } : null);
    }).catch(() => {});
  }, []);

  /* ── Core form state ── */
  const [formData, setFormData] = useState({
    type: "linkedin_post",
    platform: "LinkedIn",
    tone: "",
    audience: "",
    context: "",
    model: "sonnet",
  });

  /* ── LinkedIn mode state ── */
  const [method, setMethod]               = useState<ContentMethod>("standard");
  const [writingStyle, setWritingStyle]   = useState<WritingStyle>("adam_robinson");
  const [customStyle, setCustomStyle]     = useState("");
  const [format, setFormat]               = useState<ContentFormat>("text_only");
  const [originalPost, setOriginalPost]   = useState("");
  const [slideCount, setSlideCount]       = useState(7);
  const [showOriginalPost, setShowOriginalPost] = useState(false);

  /* ── Carousel state ── */
  const [carouselData, setCarouselData]       = useState<CarouselStructure | null>(null);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [copiedIdx, setCopiedIdx]             = useState<number | null>(null);

  const { stream, data: generatedText, isStreaming } = useSSE();
  const { mutate: saveAsset, isPending: isSaving } = useCreateContentAsset();
  const { toast } = useToast();

  const isLinkedIn = formData.type === "linkedin_post";

  /* ── Generate post text ── */
  const handleGenerate = async () => {
    if (!formData.context.trim()) return;
    setCarouselData(null);
    await stream("/api/content/generate", {
      ...formData,
      method,
      writingStyle,
      customStyle,
      format,
      originalPost: method === "viral_replication" ? originalPost : "",
    });
  };

  /* ── Generate carousel structure ── */
  const handleGenerateCarousel = async () => {
    if (!formData.context.trim()) return;
    setCarouselLoading(true);
    try {
      const res = await fetch("/api/content/carousel/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formData.context,
          slideCount,
          audience: formData.audience,
          model: formData.model,
          postText: generatedText ?? "",
        }),
      });
      if (!res.ok) throw new Error("Carousel generation failed");
      const data = await res.json();
      setCarouselData(data);
      toast({ title: "Carousel structure ready", description: `${data.slides?.length ?? 0} slides generated.` });
    } catch {
      toast({ title: "Carousel generation failed", variant: "destructive" });
    } finally {
      setCarouselLoading(false);
    }
  };

  /* ── Save asset ── */
  const handleSave = () => {
    if (!generatedText) return;
    saveAsset({
      data: {
        title: `${isLinkedIn ? "LinkedIn Post" : formData.type} — ${new Date().toLocaleDateString()}`,
        type: formData.type,
        content: generatedText,
        platform: formData.platform,
        tone: formData.tone,
      }
    }, {
      onSuccess: () => toast({ title: "Asset saved", description: "Content saved to your workspace." }),
    });
  };

  /* ── Copy slide text ── */
  const copySlideText = (slide: CarouselSlide, idx: number) => {
    const text = [slide.heading, slide.subtitle, slide.takeaway ? `"${slide.takeaway}"` : ""].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  /* ── Carousel slides array for display (cover + content + cta) ── */
  const carouselSlides = carouselData ? [
    { heading: carouselData.title, subtitle: "", takeaway: "", isCover: true },
    ...carouselData.slides,
    { heading: carouselData.ctaText, subtitle: carouselData.ctaSubtitle, takeaway: "", isCta: true },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <PenTool className="h-8 w-8 text-primary" />
            Content Studio
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Synthesize high-converting copy across all channels.</p>
        </div>
        {brandProfile ? (
          <button onClick={() => navigate("/brand")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-medium hover:bg-pink-500/20 transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{brandProfile.name}</span>
            {brandProfile.styleExamplesCount ? <span className="opacity-60">· {brandProfile.styleExamplesCount} style {brandProfile.styleExamplesCount === 1 ? "example" : "examples"}</span> : null}
          </button>
        ) : (
          <button onClick={() => navigate("/brand")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">
            <Palette className="h-3.5 w-3.5" />
            Set up Brand Kit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Controls ── */}
        <Card className="lg:col-span-4 rounded-2xl border border-border bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Content type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Content Type</label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v, platform: v === "linkedin_post" ? "LinkedIn" : formData.platform })}>
                <SelectTrigger className="bg-muted/60 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-border text-white">
                  <SelectItem value="linkedin_post">
                    <span className="flex items-center gap-2"><Linkedin className="h-3.5 w-3.5" /> LinkedIn Post</span>
                  </SelectItem>
                  <SelectItem value="ad_copy">Ad Copy</SelectItem>
                  <SelectItem value="email">Email Sequence</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="social">Social Media Post</SelectItem>
                  <SelectItem value="headline">Headlines & Hooks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── LinkedIn-specific controls ── */}
            {isLinkedIn && (
              <>
                {/* Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Method</label>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill label="Standard"  active={method === "standard"}          onClick={() => { setMethod("standard"); setShowOriginalPost(false); }} />
                    <Pill label="Viral Replication" icon={Repeat2}    active={method === "viral_replication"} onClick={() => { setMethod("viral_replication"); setShowOriginalPost(true); }} />
                    <Pill label="Trend Surfing"     icon={TrendingUp} active={method === "trend_surfing"}     onClick={() => { setMethod("trend_surfing"); setShowOriginalPost(false); }} />
                    <Pill label="Pain Point"        icon={HeartHandshake} active={method === "pain_point"}   onClick={() => { setMethod("pain_point"); setShowOriginalPost(false); }} />
                  </div>
                </div>

                {/* Original post (viral replication) */}
                {showOriginalPost && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Original Post to Replicate</label>
                    <Textarea
                      value={originalPost}
                      onChange={e => setOriginalPost(e.target.value)}
                      placeholder="Paste the viral post here. ATREYU will keep the hook + structure and adapt the topic to your brand."
                      className="bg-muted/60 border-border min-h-[100px] text-sm"
                    />
                  </div>
                )}

                {/* Writing style */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Writing Style</label>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill label="Adam Robinson"  active={writingStyle === "adam_robinson"} onClick={() => setWritingStyle("adam_robinson")} />
                    <Pill label="Brand Voice"    active={writingStyle === "brand_voice"}   onClick={() => setWritingStyle("brand_voice")} />
                    <Pill label="Custom"         active={writingStyle === "custom"}         onClick={() => setWritingStyle("custom")} />
                  </div>
                  {writingStyle === "adam_robinson" && (
                    <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">
                      Raw, conversational, stream-of-consciousness. Real numbers. Parenthetical asides. Short paragraphs. Never corporate.
                    </p>
                  )}
                  {writingStyle === "brand_voice" && (
                    <p className="text-xs text-muted-foreground/70 mt-1">Uses the voice description from your Brand Kit.</p>
                  )}
                  {writingStyle === "custom" && (
                    <Textarea
                      value={customStyle}
                      onChange={e => setCustomStyle(e.target.value)}
                      placeholder="Describe the writing style in detail..."
                      className="bg-muted/60 border-border min-h-[80px] text-sm mt-1"
                    />
                  )}
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Format</label>
                  <div className="flex gap-1.5">
                    <Pill label="Post Only"      active={format === "text_only"}    onClick={() => setFormat("text_only")} />
                    <Pill label="Post + Carousel" icon={LayoutTemplate} active={format === "text_carousel"} onClick={() => setFormat("text_carousel")} />
                  </div>
                  {format === "text_carousel" && (
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-xs text-muted-foreground">Slides:</label>
                      <div className="flex items-center gap-1">
                        {[5, 7, 9, 11].map(n => (
                          <button key={n} onClick={() => setSlideCount(n)}
                            className={`w-8 h-7 text-xs rounded-lg border transition-colors ${n === slideCount ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Non-LinkedIn: platform + tone */}
            {!isLinkedIn && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Platform</label>
                  <Input value={formData.platform} onChange={e => setFormData({ ...formData, platform: e.target.value })}
                    placeholder="Meta, LinkedIn, Google..." className="bg-muted/60 border-border" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tone of Voice</label>
                  <Input value={formData.tone} onChange={e => setFormData({ ...formData, tone: e.target.value })}
                    placeholder="Persuasive, technical, witty..." className="bg-muted/60 border-border" />
                </div>
              </>
            )}

            {/* Audience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Audience</label>
              <Input value={formData.audience} onChange={e => setFormData({ ...formData, audience: e.target.value })}
                placeholder="SaaS Founders, D2C Marketers..." className="bg-muted/60 border-border" />
            </div>

            {/* Context / Brief */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {isLinkedIn ? "Post Topic / Brief" : "Context / Brief"}
              </label>
              <Textarea value={formData.context} onChange={e => setFormData({ ...formData, context: e.target.value })}
                placeholder={isLinkedIn
                  ? "What's this post about? Include any specific angles, numbers, stories, or talking points."
                  : "Product details, unique selling points, offers..."}
                className="bg-muted/60 border-border min-h-[120px]" />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Model</label>
              <Select value={formData.model} onValueChange={v => setFormData({ ...formData, model: v })}>
                <SelectTrigger className="bg-muted/60 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-border text-white">
                  <SelectItem value="haiku">Claude Haiku (Fast)</SelectItem>
                  <SelectItem value="sonnet">Claude Sonnet (Balanced)</SelectItem>
                  <SelectItem value="opus">Claude Opus (Best)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isStreaming || !formData.context.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,150,255,0.3)]"
            >
              <Wand2 className={`h-4 w-4 mr-2 ${isStreaming ? "animate-spin" : ""}`} />
              {isStreaming ? "Writing…" : isLinkedIn ? "Write Post" : "Generate Content"}
            </Button>

            {/* Carousel trigger */}
            {isLinkedIn && format === "text_carousel" && generatedText && !isStreaming && (
              <Button
                onClick={handleGenerateCarousel}
                disabled={carouselLoading}
                variant="outline"
                className="w-full border-primary/30 text-primary hover:bg-primary/5"
              >
                {carouselLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building Carousel…</>
                  : <><Layers className="h-4 w-4 mr-2" /> Build Carousel ({slideCount} slides)</>}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Output ── */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="glass-panel border-border bg-muted/60 flex flex-col min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/50">
              <CardTitle className="text-lg">
                {isLinkedIn ? "LinkedIn Post" : "Generated Output"}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!generatedText || isStreaming} className="bg-transparent border-border hover:bg-muted">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button onClick={handleSave} size="sm" disabled={!generatedText || isStreaming || isSaving}
                  className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30">
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-8 overflow-y-auto">
              {generatedText ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{generatedText}</ReactMarkdown>
                  {isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse align-middle" />}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <Wand2 className="h-16 w-16 mb-4" />
                  <p className="text-sm">Configure parameters and generate content.</p>
                  {isLinkedIn && (
                    <p className="text-xs mt-2 max-w-xs text-center">
                      Choose a method, write your brief, and ATREYU will write in your style.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Carousel preview ── */}
          {carouselData && (
            <Card className="rounded-2xl border border-border bg-card">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Carousel Preview — {carouselSlides.length} slides
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">1080 × 1350px (4:5)</span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Slide strip */}
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {carouselSlides.map((slide, idx) => (
                    <div key={idx} className="flex-shrink-0">
                      <CarouselSlideCard
                        slide={slide as any}
                        index={idx}
                        total={carouselSlides.length}
                        accentColor={carouselData.accentColor ?? "#6366f1"}
                        brandName={carouselData.brandName ?? "BRAND"}
                      />
                      <button
                        onClick={() => copySlideText(slide as any, idx)}
                        className="mt-1.5 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedIdx === idx
                          ? <><Check className="h-3 w-3 text-green-500" /> Copied</>
                          : <><Copy className="h-3 w-3" /> Copy text</>}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Slide content list (full text) */}
                <div className="mt-6 space-y-3 border-t border-border pt-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slide Content</p>
                  {carouselData.slides.map((slide, idx) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: carouselData.accentColor + "33", color: carouselData.accentColor }}>
                        {slide.number ?? idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{slide.heading}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{slide.subtitle}</p>
                        {slide.takeaway && <p className="text-xs italic text-muted-foreground/70 mt-1">"{slide.takeaway}"</p>}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{carouselData.ctaText}</p>
                      <p className="text-xs text-muted-foreground">{carouselData.ctaSubtitle}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
