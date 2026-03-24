import { useState, useEffect, useRef } from "react";
import { Copy, Check, Sparkles, Trash2, Loader2, ChevronRight, Zap, ImagePlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "/api/content-studio";
const SKILLS_API = "/api/agents/skills";

/* ── Types ─────────────────────────────────────────────────────── */
interface SkillUsed { skill_name: string; reason: string; }
interface ContentPiece { type: string; label: string; text: string; notes?: string; }
interface ContentMetadata {
  suggested_visual?: string;
  best_posting_time?: string;
  target_audience?: string;
  estimated_engagement?: string;
}
interface PlatformContent {
  platform: string;
  platform_name: string;
  pieces: ContentPiece[];
  hashtags?: string[];
  metadata?: ContentMetadata;
}
interface ContentItem {
  id: string;
  prompt: string;
  platforms: string[];
  tone: string;
  brandVoice?: string;
  skillsUsed: SkillUsed[];
  content: PlatformContent[];
  strategyNotes?: string;
  createdAt: string;
}

/* ── Platform definitions ───────────────────────────────────────── */
const PLATFORMS = [
  { id: "instagram-post",   label: "Instagram Post",   icon: "📷" },
  { id: "instagram-story",  label: "Instagram Story",  icon: "📸" },
  { id: "instagram-reel",   label: "Instagram Reel",   icon: "🎬" },
  { id: "youtube-short",    label: "YouTube Short",    icon: "▶️" },
  { id: "youtube-video",    label: "YouTube Video",    icon: "🎥" },
  { id: "twitter-x",        label: "Twitter / X",      icon: "💬" },
  { id: "linkedin",         label: "LinkedIn",         icon: "💼" },
  { id: "tiktok",           label: "TikTok",           icon: "🎵" },
  { id: "blog-post",        label: "Blog Post",        icon: "📝" },
  { id: "email-copy",       label: "Email Copy",       icon: "✉️" },
  { id: "ad-copy",          label: "Ad Copy",          icon: "⚡" },
  { id: "website-copy",     label: "Website Copy",     icon: "🌐" },
];

const PLATFORM_ICONS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map(p => [p.id, p.icon])
);

const TONES = [
  { value: "professional",  label: "Professional"            },
  { value: "casual",        label: "Casual & Friendly"       },
  { value: "witty",         label: "Witty & Clever"          },
  { value: "inspirational", label: "Inspirational"           },
  { value: "urgent",        label: "Urgent & Action-Driven"  },
  { value: "educational",   label: "Educational"             },
  { value: "storytelling",  label: "Storytelling"            },
  { value: "bold",          label: "Bold & Provocative"      },
  { value: "minimal",       label: "Minimal & Clean"         },
  { value: "luxurious",     label: "Luxurious & Premium"     },
];

type ProgressStep = { stage: string; message: string; status: "active" | "done" | "error" };

/* ── Copy button ─────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      }}
      className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all
        ${copied
          ? "bg-green-500/15 border border-green-500/30 text-green-500"
          : "neu-raised-sm text-muted-foreground opacity-0 group-hover/piece:opacity-100"}`}
    >
      {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
    </button>
  );
}

/* ── Platform to image format mapping ─────────────────────────────── */
const PLATFORM_FORMAT_MAP: Record<string, string> = {
  "instagram-post":  "square",
  "instagram-story": "vertical",
  "instagram-reel":  "vertical",
  "youtube-short":   "youtube_short",
  "youtube-video":   "landscape",
  "twitter-x":       "landscape",
  "linkedin":        "linkedin_post",
  "tiktok":          "vertical",
  "blog-post":       "landscape",
  "email-copy":      "landscape",
  "ad-copy":         "square",
  "website-copy":    "landscape",
};

/* ── Generate graphic button per platform ─────────────────────────── */
function GenerateGraphicButton({ text, platformId, brandName }: {
  text: string;
  platformId: string;
  brandName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [provider, setProvider] = useState<"auto" | "replicate" | "ideogram">("auto");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);

    try {
      /* Extract first sentence as hook */
      const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(Boolean);
      const hook = (sentences[0] ?? text).slice(0, 130);

      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook,
          formatId: PLATFORM_FORMAT_MAP[platformId] ?? "square",
          brandName: brandName ?? "AERIS",
          provider,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.error === "no_provider") {
          setShowApiKeyModal(true);
          if (timerRef.current) clearInterval(timerRef.current);
          setLoading(false);
          return;
        }
        throw new Error(err?.message ?? err?.error ?? "Image generation failed");
      }

      const { imageUrl: url } = await res.json();
      setImageUrl(url);
      toast({ title: "Graphic generated", description: "Your marketing visual is ready." });
    } catch (err: any) {
      setError(err?.message ?? "Failed to generate graphic");
      toast({ title: "Image generation failed", description: err?.message, variant: "destructive" });
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `aeris-${platformId}-graphic.jpg`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="space-y-2">
      {imageUrl && (
        <div className="rounded-xl overflow-hidden neu-inset-sm">
          <img src={imageUrl} alt="Generated graphic" className="w-full h-auto" />
        </div>
      )}
      {/* Provider selector */}
      <div className="flex gap-1">
        {([
          { id: "auto", label: "Auto" },
          { id: "replicate", label: "FLUX" },
          { id: "ideogram", label: "Ideogram" },
        ] as const).map(p => (
          <button key={p.id} onClick={() => setProvider(p.id)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              provider === p.id ? "bg-violet-500/20 text-violet-500 border border-violet-500/30" : "text-muted-foreground hover:text-foreground"
            }`}>{p.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-violet-500/30 text-violet-500 hover:bg-violet-500/8 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />
              {elapsed < 30 ? `Generating… ${elapsed}s` : `Almost there… ${elapsed}s`}
            </>
          ) : imageUrl ? (
            <><ImagePlus className="h-3.5 w-3.5" />Regenerate Graphic</>
          ) : (
            <><ImagePlus className="h-3.5 w-3.5" />Generate Graphic</>
          )}
        </button>
        {imageUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400 text-center">{error}</p>}

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
                To generate AI graphics, connect your Replicate (FLUX) or Ideogram API key in Settings.
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

/* ── Main component ─────────────────────────────────────────────── */
export default function ContentStudioPage() {
  const { toast } = useToast();

  const [prompt,     setPrompt]     = useState("");
  const [selected,   setSelected]   = useState<string[]>([]);
  const [tone,       setTone]       = useState("professional");
  const [brandVoice, setBrandVoice] = useState("");
  const [addContext, setAddContext] = useState("");

  const [skillCount, setSkillCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState("");
  const [steps,      setSteps]      = useState<ProgressStep[]>([]);
  const [progress,   setProgress]   = useState(0);
  const [result,     setResult]     = useState<ContentItem | null>(null);
  const [history,    setHistory]    = useState<ContentItem[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => { loadSkillCount(); loadHistory(); }, []);

  async function loadSkillCount() {
    try {
      const r = await fetch(SKILLS_API);
      if (r.ok) { const d = await r.json(); setSkillCount(Array.isArray(d) ? d.length : 0); }
    } catch {}
  }

  async function loadHistory() {
    try {
      const r = await fetch(`${API}/history`);
      if (r.ok) { const d = await r.json(); setHistory(Array.isArray(d) ? d : []); }
    } catch {}
  }

  function togglePlatform(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  const STAGE_ORDER = ["loading_skills", "selecting_skills", "generating", "processing", "saving", "done", "error"];
  function stageProgress(stage: string) {
    const idx = STAGE_ORDER.indexOf(stage);
    return idx < 0 ? 0 : Math.round(((idx + 1) / (STAGE_ORDER.length - 1)) * 100);
  }

  async function handleGenerate() {
    if (!prompt.trim())    { setGenError("Please describe what you want to create."); return; }
    if (!selected.length)  { setGenError("Please select at least one platform."); return; }

    setGenerating(true); setGenError(""); setSteps([]); setProgress(0); setResult(null);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, platforms: selected, tone, brandVoice, additionalContext: addContext }),
        signal: abort.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Request failed");
      }
      const reader = res.body?.getReader();
      const dec    = new TextDecoder();
      if (!reader) throw new Error("No response stream");
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let evt: Record<string, unknown>;
          try { evt = JSON.parse(raw); } catch { continue; }
          const stage   = String(evt.stage ?? "");
          const message = String(evt.message ?? "");
          if (stage === "error") {
            setSteps(prev => {
              const next = prev.map(s => s.status === "active" ? { ...s, status: "error" as const } : s);
              return [...next, { stage, message, status: "error" as const }];
            });
            setProgress(0); setGenError(message);
          } else if (stage === "done") {
            setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "done" as const } : s));
            setProgress(100);
            if (evt.content) {
              const item = evt.content as ContentItem;
              setResult(item);
              setHistory(prev => [item, ...prev].slice(0, 100));
              setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
            }
          } else {
            setProgress(stageProgress(stage));
            setSteps(prev => {
              const next = prev.map(s => s.status === "active" ? { ...s, status: "done" as const } : s);
              return [...next, { stage, message, status: "active" as const }];
            });
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setGenError(err?.message ?? "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function deleteHistoryItem(id: string) {
    if (!confirm("Delete this content item?")) return;
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      setHistory(prev => prev.filter(i => i.id !== id));
      if (result?.id === id) setResult(null);
    } catch {}
  }

  async function loadHistoryItem(id: string) {
    try {
      const r = await fetch(`${API}/${id}`);
      if (r.ok) {
        const item = await r.json();
        setResult(item);
        setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } catch {}
  }

  const canGenerate = !generating && selected.length > 0 && prompt.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24">

      {/* ── Header ── */}
      <div className="text-center space-y-1.5 pt-2">
        <p className="hud-label flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-violet-500" /> AI Content Studio
        </p>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 via-purple-400 to-blue-500 bg-clip-text text-transparent">
          Content That Converts
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Describe what you want. AERIS uses your trained skills to generate platform-ready content.
        </p>
      </div>

      {/* ── Form Card ── */}
      <div className="neu-card rounded-3xl p-7 space-y-6">

        {/* Prompt */}
        <div className="space-y-2">
          <label className="hud-label">What do you want to create?</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g., Create a product launch campaign for our new AI writing tool that helps developers write documentation 10x faster. Target audience: software developers and tech leads."
            disabled={generating}
            className="neu-inset-sm w-full rounded-xl px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none resize-y disabled:opacity-60 transition-all"
          />
        </div>

        {/* Platform chips */}
        <div className="space-y-2.5">
          <label className="hud-label">Select Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => {
              const active = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => !generating && togglePlatform(p.id)}
                  disabled={generating}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all select-none disabled:opacity-60
                    ${active
                      ? "neu-inset ring-2 ring-violet-500/30 text-violet-500"
                      : "neu-raised-sm text-muted-foreground hover:text-foreground"}`}
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tone + Brand Voice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="hud-label">Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              disabled={generating}
              className="neu-inset-sm w-full rounded-xl px-4 py-3 text-sm text-foreground bg-[hsl(var(--card))] outline-none cursor-pointer disabled:opacity-60 transition-all"
            >
              {TONES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="hud-label">Brand Voice <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
            <input
              type="text"
              value={brandVoice}
              onChange={e => setBrandVoice(e.target.value)}
              placeholder="e.g., Fun, tech-savvy, like talking to a smart friend"
              disabled={generating}
              className="neu-inset-sm w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none disabled:opacity-60 transition-all"
            />
          </div>
        </div>

        {/* Additional Context */}
        <div className="space-y-2">
          <label className="hud-label">Additional Context <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
          <textarea
            value={addContext}
            onChange={e => setAddContext(e.target.value)}
            rows={2}
            placeholder="Target demographics, campaign goals, specific requirements, competitor references…"
            disabled={generating}
            className="neu-inset-sm w-full rounded-xl px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none resize-y disabled:opacity-60 transition-all"
          />
        </div>

        {/* Skills badge */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl neu-raised-sm">
          <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground flex-1">
            AERIS has <span className="font-semibold text-foreground">{skillCount}</span> trained skill{skillCount !== 1 ? "s" : ""} ready to use
          </p>
          <a href="/claude" className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0">
            Train more <ChevronRight className="h-3 w-3" />
          </a>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
        >
          {generating
            ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</>
            : <><Zap className="h-4 w-4" />Generate Content</>}
        </button>

        {genError && (
          <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
            {genError}
          </div>
        )}

        {/* Progress */}
        {steps.length > 0 && (
          <div className="space-y-3 pt-1">
            {/* Track */}
            <div className="h-1 rounded-full neu-inset-sm overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Steps */}
            <div className="space-y-1.5">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl neu-raised-sm text-xs">
                  <span className={`flex-shrink-0 font-bold ${s.status === "done" ? "text-green-500" : s.status === "error" ? "text-destructive" : "text-violet-500"}`}>
                    {s.status === "done" ? "✓" : s.status === "error" ? "✕" : "●"}
                  </span>
                  <span className={s.status === "done" ? "text-muted-foreground" : s.status === "error" ? "text-destructive" : "text-foreground"}>
                    {s.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Output ── */}
      {result && (
        <div ref={outputRef} className="space-y-4">
          {/* Output header */}
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold">Generated Content</h2>
            <span className="text-xs text-muted-foreground">
              {result.platforms.length} platform{result.platforms.length !== 1 ? "s" : ""} · {result.tone} · {new Date(result.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Skills applied */}
          {result.skillsUsed?.length > 0 && (
            <div className="neu-card rounded-2xl p-5 space-y-3">
              <p className="hud-label flex items-center gap-1.5 text-violet-500">
                <Sparkles className="h-3 w-3" /> Skills Applied by AERIS
              </p>
              {result.skillsUsed.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                  <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span>
                  <span className="font-semibold text-foreground whitespace-nowrap">{s.skill_name}</span>
                  <span>— {s.reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Strategy notes */}
          {result.strategyNotes && (
            <div className="neu-card rounded-2xl p-5 space-y-2">
              <p className="hud-label text-blue-500">Content Strategy</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.strategyNotes}</p>
            </div>
          )}

          {/* Platform cards */}
          {(result.content ?? []).map((platform, pi) => (
            <div key={pi} className="neu-card rounded-2xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <span className="text-xl leading-none">{PLATFORM_ICONS[platform.platform] ?? "📄"}</span>
                <span className="font-semibold text-foreground">{platform.platform_name}</span>
              </div>
              {/* Card body */}
              <div className="p-5 space-y-5">
                {(platform.pieces ?? []).map((piece, ii) => (
                  <div key={ii} className={ii < platform.pieces.length - 1 ? "pb-5 border-b border-border/30" : ""}>
                    <p className="hud-label mb-2">{piece.label || piece.type}</p>
                    <div className="group/piece relative neu-inset-sm rounded-xl p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {piece.text}
                      <CopyButton text={piece.text} />
                    </div>
                    {piece.notes && (
                      <p className="mt-2 text-xs text-muted-foreground italic leading-relaxed">{piece.notes}</p>
                    )}
                  </div>
                ))}

                {/* Hashtags */}
                {platform.hashtags && platform.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {platform.hashtags.map((h, hi) => (
                      <span key={hi} className="text-xs text-blue-500 px-2.5 py-1 rounded-lg bg-blue-500/10 font-mono">
                        #{h.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata grid */}
                {platform.metadata && Object.values(platform.metadata).some(Boolean) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/30">
                    {platform.metadata.suggested_visual && (
                      <div className="neu-raised-sm rounded-xl px-4 py-3">
                        <p className="hud-label mb-1">Visual Direction</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{platform.metadata.suggested_visual}</p>
                      </div>
                    )}
                    {platform.metadata.best_posting_time && (
                      <div className="neu-raised-sm rounded-xl px-4 py-3">
                        <p className="hud-label mb-1">Best Posting Time</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{platform.metadata.best_posting_time}</p>
                      </div>
                    )}
                    {platform.metadata.target_audience && (
                      <div className="neu-raised-sm rounded-xl px-4 py-3">
                        <p className="hud-label mb-1">Target Audience</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{platform.metadata.target_audience}</p>
                      </div>
                    )}
                    {platform.metadata.estimated_engagement && (
                      <div className="neu-raised-sm rounded-xl px-4 py-3">
                        <p className="hud-label mb-1">Engagement Estimate</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{platform.metadata.estimated_engagement}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Generate graphic for this platform */}
                <div className="pt-3 border-t border-border/30">
                  <GenerateGraphicButton
                    text={(platform.pieces ?? []).map(p => p.text).join("\n")}
                    platformId={platform.platform}
                    brandName={brandVoice || undefined}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── History ── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">Content History</h2>
          {history.length > 0 && (
            <span className="text-xs text-muted-foreground">{history.length} item{history.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="neu-card rounded-2xl p-10 text-center text-muted-foreground text-sm">
            No content generated yet. Fill out the form above and click Generate Content.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(item => (
              <div
                key={item.id}
                onClick={() => loadHistoryItem(item.id)}
                className="neu-card-sm rounded-xl flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
              >
                <span className="flex gap-1 text-base flex-shrink-0">
                  {(item.platforms ?? []).slice(0, 4).map(p => PLATFORM_ICONS[p] ?? "").join("")}
                </span>
                <span className="text-sm text-foreground flex-1 truncate">{item.prompt}</span>
                <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
