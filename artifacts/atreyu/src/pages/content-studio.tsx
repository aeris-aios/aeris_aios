import { useState, useEffect, useRef } from "react";
import { Copy, Check, Sparkles, Zap, Clock, Trash2 } from "lucide-react";
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
  { id: "twitter-x",        label: "Twitter/X",        icon: "💬" },
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
  { value: "professional",  label: "Professional"       },
  { value: "casual",        label: "Casual & Friendly"  },
  { value: "witty",         label: "Witty & Clever"     },
  { value: "inspirational", label: "Inspirational"      },
  { value: "urgent",        label: "Urgent & Action-Driven" },
  { value: "educational",   label: "Educational"        },
  { value: "storytelling",  label: "Storytelling"       },
  { value: "bold",          label: "Bold & Provocative" },
  { value: "minimal",       label: "Minimal & Clean"    },
  { value: "luxurious",     label: "Luxurious & Premium"},
];

type ProgressStep = { stage: string; message: string; status: "active" | "done" | "error" };

/* ── CopyButton ─────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", alignItems: "center", gap: 4,
        padding: "4px 10px", fontSize: 11, borderRadius: 4,
        background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
        color: copied ? "#22c55e" : "#94a3b8",
        cursor: "pointer", transition: "all 0.15s", opacity: 0,
      }}
      className="copy-btn-cs"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function ContentStudioPage() {
  const { toast } = useToast();

  /* Form state */
  const [prompt,     setPrompt]     = useState("");
  const [selected,   setSelected]   = useState<string[]>([]);
  const [tone,       setTone]       = useState("professional");
  const [brandVoice, setBrandVoice] = useState("");
  const [addContext, setAddContext] = useState("");

  /* UI state */
  const [skillCount,  setSkillCount]  = useState(0);
  const [generating,  setGenerating]  = useState(false);
  const [genError,    setGenError]    = useState("");
  const [steps,       setSteps]       = useState<ProgressStep[]>([]);
  const [progress,    setProgress]    = useState(0);
  const [result,      setResult]      = useState<ContentItem | null>(null);
  const [history,     setHistory]     = useState<ContentItem[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    loadSkillCount();
    loadHistory();
  }, []);

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
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const STAGE_ORDER = ["loading_skills","selecting_skills","generating","processing","saving","done","error"];
  function stageProgress(stage: string) {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / (STAGE_ORDER.length - 1)) * 100);
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setGenError("Please describe what you want to create."); return; }
    if (selected.length === 0) { setGenError("Please select at least one platform."); return; }

    setGenerating(true);
    setGenError("");
    setSteps([]);
    setProgress(0);
    setResult(null);

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
            setProgress(0);
            setGenError(message);
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
      if (err?.name !== "AbortError") {
        setGenError(err?.message ?? "Generation failed. Please try again.");
      }
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

  /* ── Styles ── */
  const cs = {
    page: { minHeight: "100%", background: "var(--bg-primary, #0d1117)", color: "var(--text-primary, #e6edf3)", fontFamily: "var(--font-sans, sans-serif)", overflowY: "auto" as const },
    section: { maxWidth: 820, margin: "0 auto", padding: "48px 24px 32px" },
    header: { textAlign: "center" as const, marginBottom: 36 },
    h1: { fontSize: 30, fontWeight: 700, marginBottom: 10, background: "linear-gradient(135deg, #e2e8f0, #a855f7, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" as any },
    sub: { color: "#94a3b8", fontSize: 14, lineHeight: 1.6, maxWidth: 540, margin: "0 auto" },
    form: { display: "flex", flexDirection: "column" as const, gap: 20 },
    group: { display: "flex", flexDirection: "column" as const, gap: 6 },
    label: { fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
    input: { background: "#0d1321", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", padding: "12px 14px", outline: "none", fontSize: 14, lineHeight: 1.5, width: "100%", boxSizing: "border-box" as const, fontFamily: "inherit" },
    row: { display: "flex", gap: 16 },
    chip: (active: boolean): React.CSSProperties => ({
      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
      background: active ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${active ? "#a855f7" : "#1e293b"}`,
      borderRadius: 8, fontSize: 13, color: active ? "#c084fc" : "#94a3b8",
      cursor: "pointer", transition: "all 0.2s", userSelect: "none",
    }),
    skillsBadge: { padding: "12px 16px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8" },
    genBtn: (disabled: boolean): React.CSSProperties => ({
      width: "100%", padding: "14px 24px",
      background: disabled ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #a855f7)",
      color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15,
      cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", marginTop: 8,
      opacity: disabled ? 0.6 : 1,
    }),
    errorBox: { padding: "10px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#ef4444", fontSize: 13 },
    progressBox: { maxWidth: 820, margin: "20px auto 0", padding: "0 24px" },
    progressTrack: { height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden", marginBottom: 12 },
    progressFill: (pct: number): React.CSSProperties => ({
      height: "100%", background: "linear-gradient(90deg, #3b82f6, #a855f7)", borderRadius: 2,
      width: `${pct}%`, transition: "width 0.5s ease",
    }),
    stepRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", padding: "6px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 },
    outputSection: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px 20px" },
    outputH2: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
    outputMeta: { fontSize: 12, color: "#475569", display: "flex", gap: 16, flexWrap: "wrap" as const, marginTop: 4 },
    skillsPanel: { marginBottom: 24, padding: "16px 20px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 14 },
    strategyPanel: { marginBottom: 24, padding: "16px 20px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 14, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
    platformCard: { background: "#151c2c", border: "1px solid #1e293b", borderRadius: 14, overflow: "hidden", marginBottom: 20 },
    platformCardHeader: { display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "rgba(255,255,255,0.02)", fontSize: 16, fontWeight: 600 },
    platformCardBody: { padding: 20 },
    historySection: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" },
  };

  /* ── Spinner ── */
  const Spinner = () => (
    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "cs-spin 0.6s linear infinite", verticalAlign: "middle", marginRight: 6 }} />
  );

  const stepIcon = (s: ProgressStep) =>
    s.status === "done"  ? "✓" :
    s.status === "error" ? "✕" : "●";

  const stepColor = (s: ProgressStep) =>
    s.status === "done"  ? "#22c55e" :
    s.status === "error" ? "#ef4444" : "#3b82f6";

  return (
    <div style={cs.page}>
      <style>{`
        @keyframes cs-spin { to { transform: rotate(360deg); } }
        .copy-btn-cs { opacity: 0 !important; }
        .piece-text-cs:hover .copy-btn-cs { opacity: 1 !important; }
        .cs-history-item:hover { background: #1a2236 !important; border-color: #2a3a52 !important; }
        .cs-platform-chip:hover { border-color: #2a3a52; background: rgba(255,255,255,0.06); }
      `}</style>

      {/* ── Create Section ── */}
      <div style={cs.section}>
        <div style={cs.header}>
          <h1 style={cs.h1}>AI Content Studio</h1>
          <p style={cs.sub}>
            Describe what you want to create. ATREYU uses your trained skills from Agent Studio to generate platform-ready content.
          </p>
        </div>

        <div style={cs.form}>
          {/* Prompt */}
          <div style={cs.group}>
            <label style={cs.label}>What do you want to create?</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g., Create a product launch campaign for our new AI writing tool that helps developers write documentation 10x faster. Target audience: software developers and tech leads. Key benefits: saves time, maintains consistency, integrates with GitHub."
              style={{ ...cs.input, resize: "vertical" }}
              disabled={generating}
            />
          </div>

          {/* Platforms */}
          <div style={cs.group}>
            <label style={cs.label}>Select Platforms</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PLATFORMS.map(p => (
                <div
                  key={p.id}
                  className="cs-platform-chip"
                  style={cs.chip(selected.includes(p.id))}
                  onClick={() => !generating && togglePlatform(p.id)}
                >
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          {/* Tone & Brand Voice */}
          <div style={cs.row}>
            <div style={{ ...cs.group, flex: 1 }}>
              <label style={cs.label}>Tone</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                style={{ ...cs.input, cursor: "pointer" }}
                disabled={generating}
              >
                {TONES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ ...cs.group, flex: 1 }}>
              <label style={cs.label}>Brand Voice (optional)</label>
              <input
                type="text"
                value={brandVoice}
                onChange={e => setBrandVoice(e.target.value)}
                placeholder="e.g., Fun, tech-savvy, like talking to a smart friend"
                style={cs.input}
                disabled={generating}
              />
            </div>
          </div>

          {/* Additional Context */}
          <div style={cs.group}>
            <label style={cs.label}>Additional Context (optional)</label>
            <textarea
              value={addContext}
              onChange={e => setAddContext(e.target.value)}
              rows={2}
              placeholder="Target demographics, campaign goals, specific requirements, competitor references..."
              style={{ ...cs.input, resize: "vertical" }}
              disabled={generating}
            />
          </div>

          {/* Skills badge */}
          <div style={cs.skillsBadge}>
            <Sparkles size={16} color="#a855f7" />
            <span>ATREYU has <strong style={{ color: "#e2e8f0" }}>{skillCount}</strong> trained skill{skillCount !== 1 ? "s" : ""} ready to use</span>
            <a href="/claude" style={{ marginLeft: "auto", fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>Train more skills →</a>
          </div>

          {/* Generate button */}
          <button
            style={cs.genBtn(generating || selected.length === 0 || !prompt.trim())}
            onClick={handleGenerate}
            disabled={generating || selected.length === 0 || !prompt.trim()}
          >
            {generating ? <><Spinner />Generating...</> : "Generate Content"}
          </button>

          {genError && <div style={cs.errorBox}>{genError}</div>}
        </div>

        {/* Progress */}
        {steps.length > 0 && (
          <div style={{ ...cs.progressBox, padding: "20px 0 0" }}>
            <div style={cs.progressTrack}>
              <div style={cs.progressFill(progress)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ ...cs.stepRow, color: stepColor(s) }}>
                  <span style={{ width: 18, textAlign: "center", fontSize: 12, flexShrink: 0, color: stepColor(s) }}>
                    {stepIcon(s)}
                  </span>
                  {s.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Output Section ── */}
      {result && (
        <div ref={outputRef} style={cs.outputSection}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={cs.outputH2}>Generated Content</h2>
            <div style={cs.outputMeta}>
              <span>Tone: {result.tone}</span>
              <span>{result.platforms.length} platform{result.platforms.length !== 1 ? "s" : ""}</span>
              <span>{new Date(result.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Skills applied */}
          {result.skillsUsed && result.skillsUsed.length > 0 && (
            <div style={cs.skillsPanel}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "#a855f7", marginBottom: 10 }}>
                Skills Applied by ATREYU
              </div>
              {result.skillsUsed.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.4 }}>
                  <span style={{ color: "#a855f7", flexShrink: 0 }}>→</span>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap" }}>{s.skill_name}</span>
                  <span>— {s.reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Strategy notes */}
          {result.strategyNotes && (
            <div style={cs.strategyPanel}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, color: "#3b82f6", marginBottom: 8 }}>
                Content Strategy
              </div>
              {result.strategyNotes}
            </div>
          )}

          {/* Platform cards */}
          {(result.content ?? []).map((platform, pi) => (
            <div key={pi} style={cs.platformCard}>
              <div style={cs.platformCardHeader}>
                <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[platform.platform] ?? "📄"}</span>
                {platform.platform_name}
              </div>
              <div style={cs.platformCardBody}>
                {(platform.pieces ?? []).map((piece, ii) => (
                  <div key={ii} style={{ marginBottom: ii < platform.pieces.length - 1 ? 20 : 0, paddingBottom: ii < platform.pieces.length - 1 ? 20 : 0, borderBottom: ii < platform.pieces.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", color: "#475569", marginBottom: 8 }}>
                      {piece.label || piece.type}
                    </div>
                    <div
                      className="piece-text-cs"
                      style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap", position: "relative" }}
                    >
                      {piece.text}
                      <CopyButton text={piece.text} />
                    </div>
                    {piece.notes && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#475569", fontStyle: "italic", lineHeight: 1.5 }}>
                        {piece.notes}
                      </div>
                    )}
                  </div>
                ))}

                {/* Hashtags */}
                {platform.hashtags && platform.hashtags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {platform.hashtags.map((h, hi) => (
                      <span key={hi} style={{ fontSize: 12, color: "#3b82f6", padding: "2px 8px", background: "rgba(59,130,246,0.15)", borderRadius: 4, fontFamily: "monospace" }}>
                        #{h.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata grid */}
                {platform.metadata && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {platform.metadata.suggested_visual && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: "#475569", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 3, fontSize: 10 }}>Visual Direction</div>
                        <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>{platform.metadata.suggested_visual}</div>
                      </div>
                    )}
                    {platform.metadata.best_posting_time && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: "#475569", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 3, fontSize: 10 }}>Best Posting Time</div>
                        <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>{platform.metadata.best_posting_time}</div>
                      </div>
                    )}
                    {platform.metadata.target_audience && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: "#475569", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 3, fontSize: 10 }}>Target Audience</div>
                        <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>{platform.metadata.target_audience}</div>
                      </div>
                    )}
                    {platform.metadata.estimated_engagement && (
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: "#475569", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 3, fontSize: 10 }}>Engagement Estimate</div>
                        <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>{platform.metadata.estimated_engagement}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── History Section ── */}
      <div style={cs.historySection}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Content History</h2>
          {history.length > 0 && (
            <span style={{ fontSize: 13, color: "#475569" }}>{history.length} item{history.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569", fontSize: 13 }}>
            No content generated yet. Fill out the form above and click Generate Content.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map(item => (
              <div
                key={item.id}
                className="cs-history-item"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#151c2c", border: "1px solid #1e293b", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", gap: 12 }}
                onClick={() => loadHistoryItem(item.id)}
              >
                <span style={{ fontSize: 13, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.prompt}
                </span>
                <span style={{ display: "flex", gap: 4, fontSize: 16, marginRight: 12, flexShrink: 0 }}>
                  {(item.platforms ?? []).slice(0, 5).map(p => PLATFORM_ICONS[p] ?? "").join(" ")}
                </span>
                <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <button
                  style={{ padding: "4px 8px", fontSize: 11, color: "#ef4444", background: "transparent", border: "1px solid transparent", borderRadius: 4, cursor: "pointer", flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
