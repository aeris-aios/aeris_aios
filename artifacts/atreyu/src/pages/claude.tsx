import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/theme";
import { useSSE } from "@/hooks/use-sse";
import ReactMarkdown from "react-markdown";
import {
  Github, Plus, Trash2, Play, Loader2, CheckCircle2, XCircle,
  Clock, ChevronRight, Cpu, BookOpen, Zap, X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type Repo = { id: number; url: string; owner: string; repo: string; description?: string; createdAt: string };
type Job  = { id: number; title: string; task: string; model: string; status: string; output?: string; outputTarget?: string; createdAt: string };

/* ── Neumorphic hook ─────────────────────────────────────────────── */
function useNeu() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const bg   = isLight ? "#e8ecf4" : "#0f111a";
  const dark = isLight ? "#b0b7ca" : "#07090e";
  const lite = isLight ? "#ffffff" : "#1a1e2e";
  const fg   = isLight ? "#1e2030" : "#c8d0e0";
  const sub  = isLight ? "rgba(30,32,48,0.38)" : "rgba(200,208,224,0.38)";
  return {
    isLight, bg, dark, lite, fg, sub,
    raised:  `6px 6px 16px ${dark}, -6px -6px 16px ${lite}`,
    raisedSm:`3px 3px 8px ${dark}, -3px -3px 8px ${lite}`,
    inset:   `inset 5px 5px 12px ${dark}, inset -5px -5px 12px ${lite}`,
    insetSm: `inset 3px 3px 7px ${dark}, inset -3px -3px 7px ${lite}`,
  };
}

const OUTPUT_TARGETS = [
  { id: "dashboard",   label: "Dashboard",   icon: "📊" },
  { id: "automations", label: "Automations", icon: "⚡" },
  { id: "campaigns",   label: "Campaigns",   icon: "📣" },
  { id: "content",     label: "Content",     icon: "✍️" },
  { id: "knowledge",   label: "Knowledge",   icon: "📚" },
];

const MODELS = [
  { id: "haiku",  label: "Haiku",  desc: "Fast" },
  { id: "sonnet", label: "Sonnet", desc: "Balanced" },
  { id: "opus",   label: "Opus",   desc: "Powerful" },
];

const API = "/api/agents";

export default function AgentStudio() {
  const n = useNeu();

  /* ── Repos ── */
  const [repos, setRepos]         = useState<Repo[]>([]);
  const [repoUrl, setRepoUrl]     = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);

  /* ── Job builder ── */
  const [task, setTask]         = useState("");
  const [model, setModel]       = useState("sonnet");
  const [target, setTarget]     = useState("dashboard");

  /* ── Jobs feed ── */
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  /* ── SSE for streaming ── */
  const { stream, data: streamData, isStreaming, setData } = useSSE();

  /* Load repos + jobs on mount */
  useEffect(() => {
    fetchRepos();
    fetchJobs();
  }, []);

  /* Scroll output to bottom on new stream data */
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [streamData]);

  async function fetchRepos() {
    const r = await fetch(`${API}/repos`);
    if (r.ok) setRepos(await r.json());
  }

  async function fetchJobs() {
    const r = await fetch(`${API}/jobs`);
    if (r.ok) setJobs((await r.json()).reverse());
  }

  async function ingestRepo() {
    if (!repoUrl.trim()) return;
    setIngesting(true);
    try {
      const r = await fetch(`${API}/repos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: repoUrl }) });
      if (r.ok) { setRepoUrl(""); await fetchRepos(); }
    } finally { setIngesting(false); }
  }

  async function deleteRepo(id: number) {
    await fetch(`${API}/repos/${id}`, { method: "DELETE" });
    setSelectedRepos(prev => prev.filter(r => r !== id));
    await fetchRepos();
  }

  function toggleRepo(id: number) {
    setSelectedRepos(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  async function runAgent() {
    if (!task.trim() || isStreaming) return;
    setData("");
    setActiveJob(null);
    await stream(`${API}/jobs`, {
      task,
      model,
      outputTarget: target,
      repoIds: selectedRepos,
      title: task.slice(0, 60),
    });
    await fetchJobs();
  }

  async function viewJob(job: Job) {
    setActiveJob(job);
    setData(job.output ?? "");
  }

  /* ── Shared styles ── */
  const panel = {
    background: n.bg,
    boxShadow: n.inset,
    borderRadius: 18,
    display: "flex" as const,
    flexDirection: "column" as const,
    overflow: "hidden",
  };

  const pill = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: 10,
    background: n.bg,
    boxShadow: active ? n.insetSm : n.raisedSm,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: active ? "#e67e41" : n.sub,
    border: "none",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap" as const,
  });

  const runBtn = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 22px", borderRadius: 12,
    background: n.bg, boxShadow: isStreaming ? n.insetSm : n.raised,
    border: "none", cursor: isStreaming ? "not-allowed" : "pointer",
    fontSize: 12, fontWeight: 800, letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: isStreaming ? n.sub : "#e67e41",
    transition: "all 0.18s ease",
  };

  const statusColor = (s: string) =>
    s === "complete" ? "#30d158" : s === "failed" ? "#ff453a" : "#e67e41";

  const statusIcon = (s: string) =>
    s === "complete" ? <CheckCircle2 style={{ width: 13, height: 13 }} /> :
    s === "failed"   ? <XCircle       style={{ width: 13, height: 13 }} /> :
                       <Loader2       style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />;

  return (
    <div style={{
      margin: "-24px -32px 0 -32px",
      height: "calc(100vh - 172px)",
      display: "grid",
      gridTemplateColumns: "240px 1fr 300px",
      gridTemplateRows: "1fr",
      gap: 16,
      padding: "16px 16px 0",
      boxSizing: "border-box",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ══ LEFT: REPO LIBRARY ════════════════════════════════════ */}
      <div style={panel}>
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${n.dark}22` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <BookOpen style={{ width: 13, height: 13, color: "#e67e41" }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: n.sub }}>Skill Repos</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ingestRepo()}
              placeholder="github.com/owner/repo"
              style={{
                flex: 1, background: n.bg, boxShadow: n.insetSm,
                border: "none", borderRadius: 9, padding: "7px 10px",
                fontSize: 10, color: n.fg, fontFamily: "var(--app-font-mono)",
                outline: "none",
              }}
            />
            <button
              onClick={ingestRepo}
              disabled={ingesting || !repoUrl.trim()}
              style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: n.bg, boxShadow: ingesting ? n.insetSm : n.raisedSm,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#e67e41",
              }}
            >
              {ingesting ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 12, height: 12 }} />}
            </button>
          </div>
        </div>

        {/* Repo list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px", scrollbarWidth: "none" }}>
          {repos.length === 0 ? (
            <div style={{ padding: "20px 8px", textAlign: "center", color: n.sub, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>
              Paste a GitHub URL to teach agents new skills
            </div>
          ) : repos.map(r => {
            const active = selectedRepos.includes(r.id);
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "9px 10px", borderRadius: 10, marginBottom: 4,
                  background: n.bg, boxShadow: active ? n.insetSm : n.raisedSm,
                  cursor: "pointer", transition: "box-shadow 0.18s ease",
                }}
                onClick={() => toggleRepo(r.id)}
              >
                <Github style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1, color: active ? "#e67e41" : n.sub }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#e67e41" : n.fg, truncate: true, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.owner}/{r.repo}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 9, color: n.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteRepo(r.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2, flexShrink: 0 }}
                >
                  <Trash2 style={{ width: 10, height: 10 }} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Context indicator */}
        {selectedRepos.length > 0 && (
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${n.dark}22`, display: "flex", alignItems: "center", gap: 6 }}>
            <Cpu style={{ width: 11, height: 11, color: "#e67e41" }} />
            <span style={{ fontSize: 9, fontFamily: "var(--app-font-mono)", color: "#e67e41", letterSpacing: "0.08em" }}>
              {selectedRepos.length} REPO{selectedRepos.length > 1 ? "S" : ""} IN CONTEXT
            </span>
          </div>
        )}
      </div>

      {/* ══ CENTER: AGENT BUILDER + OUTPUT ═══════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Builder card */}
        <div style={{ ...panel, flexShrink: 0, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <Zap style={{ width: 13, height: 13, color: "#e67e41" }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: n.sub }}>Agent Task</span>
          </div>

          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Describe what you want the agent to do…&#10;e.g. Write a 5-email drip campaign for SaaS free trial users who haven't upgraded after 7 days."
            rows={4}
            style={{
              width: "100%", background: n.bg, boxShadow: n.insetSm,
              border: "none", borderRadius: 12, padding: "12px 14px",
              fontSize: 12, color: n.fg, fontFamily: "inherit",
              outline: "none", resize: "none", lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
            {/* Model selector */}
            <div style={{ display: "flex", gap: 6 }}>
              {MODELS.map(m => (
                <button key={m.id} onClick={() => setModel(m.id)} style={pill(model === m.id)}>
                  {m.label}
                  <span style={{ fontWeight: 400, opacity: 0.5, marginLeft: 4 }}>{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Output target + run */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                style={{
                  background: n.bg, boxShadow: n.insetSm,
                  border: "none", borderRadius: 9, padding: "6px 10px",
                  fontSize: 10, fontWeight: 700, color: n.fg,
                  fontFamily: "inherit", cursor: "pointer", outline: "none",
                  letterSpacing: "0.06em",
                }}
              >
                {OUTPUT_TARGETS.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>

              <button onClick={runAgent} disabled={!task.trim() || isStreaming} style={runBtn}>
                {isStreaming
                  ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                  : <Play style={{ width: 13, height: 13 }} />}
                {isStreaming ? "Running…" : "Run Agent"}
              </button>
            </div>
          </div>
        </div>

        {/* Output area */}
        <div style={{ ...panel, flex: 1 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${n.dark}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {isStreaming && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e67e41", boxShadow: "0 0 8px #e67e41", display: "inline-block", animation: "spin 2s ease-in-out infinite" }} />}
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: n.sub }}>
                {isStreaming ? "Agent Running" : activeJob ? `Output — ${activeJob.title}` : "Output"}
              </span>
            </div>
            {(streamData || activeJob?.output) && (
              <button
                onClick={() => { setData(""); setActiveJob(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2 }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
          <div
            ref={outputRef}
            style={{
              flex: 1, overflowY: "auto", padding: "16px 20px",
              scrollbarWidth: "none", fontSize: 12, lineHeight: 1.7,
              color: n.fg,
            }}
          >
            {!streamData && !activeJob?.output ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: n.sub }}>
                <Cpu style={{ width: 28, height: 28, opacity: 0.2 }} />
                <span style={{ fontSize: 10, fontFamily: "var(--app-font-mono)", letterSpacing: "0.08em" }}>Agent output will appear here</span>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none" style={{ fontSize: 12 }}>
                <ReactMarkdown>{streamData || activeJob?.output || ""}</ReactMarkdown>
                {isStreaming && <span style={{ display: "inline-block", width: 7, height: 14, background: "#e67e41", animation: "spin 1s step-end infinite", verticalAlign: "middle", marginLeft: 2 }} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ RIGHT: JOBS FEED ═════════════════════════════════════ */}
      <div style={panel}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${n.dark}22` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Clock style={{ width: 12, height: 12, color: "#e67e41" }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: n.sub }}>Agent Jobs</span>
            </div>
            <button
              onClick={fetchJobs}
              style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, fontSize: 9, letterSpacing: "0.08em", fontFamily: "var(--app-font-mono)" }}
            >
              REFRESH
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px", scrollbarWidth: "none" }}>
          {jobs.length === 0 ? (
            <div style={{ padding: "20px 8px", textAlign: "center", color: n.sub, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>
              No agents have run yet
            </div>
          ) : jobs.map(job => (
            <div
              key={job.id}
              onClick={() => viewJob(job)}
              style={{
                padding: "10px 12px", borderRadius: 12, marginBottom: 6,
                background: n.bg,
                boxShadow: activeJob?.id === job.id ? n.insetSm : n.raisedSm,
                cursor: "pointer", transition: "box-shadow 0.18s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: n.fg,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginBottom: 4,
                  }}>
                    {job.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: statusColor(job.status) }}>{statusIcon(job.status)}</span>
                    <span style={{ fontSize: 9, color: statusColor(job.status), fontFamily: "var(--app-font-mono)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {job.status}
                    </span>
                    <span style={{ fontSize: 9, color: n.sub, fontFamily: "var(--app-font-mono)" }}>
                      · {job.model}
                    </span>
                  </div>
                </div>
                <ChevronRight style={{ width: 12, height: 12, color: n.sub, flexShrink: 0, marginTop: 2 }} />
              </div>
              {job.outputTarget && (
                <div style={{ marginTop: 5, fontSize: 9, color: n.sub, fontFamily: "var(--app-font-mono)", letterSpacing: "0.06em" }}>
                  → {job.outputTarget.toUpperCase()}
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 9, color: n.sub, opacity: 0.6 }}>
                {new Date(job.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
