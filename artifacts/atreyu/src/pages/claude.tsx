import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/contexts/theme";
import { useSSE } from "@/hooks/use-sse";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneLight, atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  Github, Plus, Trash2, Play, Loader2, CheckCircle2, XCircle,
  Clock, Cpu, BookOpen, Zap, X, Upload,
  FolderOpen, File, Check, Search, ChevronDown, ChevronUp,
  Sparkles, Code2, Layers,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type Repo  = { id: number; url: string; owner: string; repo: string; description?: string; createdAt: string };
type Job   = { id: number; title: string; task: string; model: string; status: string; output?: string; outputTarget?: string; createdAt: string };
type WFile = { id: number; name: string; path: string; objectPath: string; mimeType: string; fileSize?: number; createdAt: string };
type Skill = {
  id: string; name: string; category: string; summary: string; description?: string;
  keyConcepts: string[]; codeExample?: string; useCases: string[];
  complexity: string; sourceRepo?: string; trainedAt: string;
};
type TrainEvent = { stage: string; message: string; skills?: Skill[] };

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

const CATEGORIES = ["All","Frontend","Backend","Database","DevOps","API","Auth","Testing","AI/ML","Architecture","Tooling","Data Processing","Security"];

const COMPLEXITY_COLORS: Record<string, string> = {
  beginner:     "#30d158",
  intermediate: "#e67e41",
  advanced:     "#ff453a",
};

const CATEGORY_COLORS: Record<string, string> = {
  Frontend:         "#007aff",
  Backend:          "#5856d6",
  Database:         "#32ade6",
  DevOps:           "#30b0c7",
  API:              "#ff9f0a",
  Auth:             "#ff2d55",
  Testing:          "#30d158",
  "AI/ML":          "#bf5af2",
  Architecture:     "#e67e41",
  Tooling:          "#64d2ff",
  "Data Processing":"#ffd60a",
  Security:         "#ff453a",
};

const API = "/api/agents";

/* ── Helpers ─────────────────────────────────────────────────────── */
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["ts","tsx","js","jsx","py","go","rs","java","cpp","c","cs"].includes(ext)) return "📄";
  if (["json","yaml","yml","toml","env"].includes(ext)) return "⚙️";
  if (["md","txt","rst"].includes(ext)) return "📝";
  if (["png","jpg","jpeg","gif","svg","webp"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📕";
  return "📄";
}

function humanSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function langFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts:"typescript", tsx:"typescript", js:"javascript", jsx:"javascript",
    py:"python", go:"go", rs:"rust", java:"java", c:"c", cpp:"cpp",
    cs:"csharp", rb:"ruby", php:"php", sh:"bash", bash:"bash",
    json:"json", yaml:"yaml", yml:"yaml", toml:"toml",
    md:"markdown", html:"html", css:"css", xml:"xml", sql:"sql",
  };
  return map[ext] ?? "plaintext";
}

async function uploadWorkspaceFile(file: File, relativePath: string): Promise<WFile | null> {
  try {
    const urlRes = await fetch(`${API}/workspace/files/upload-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "text/plain" }),
    });
    if (!urlRes.ok) return null;
    const { uploadURL, objectPath } = await urlRes.json();
    const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
    if (!putRes.ok) return null;
    const metaRes = await fetch(`${API}/workspace/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, path: relativePath, objectPath, mimeType: file.type || "text/plain", fileSize: file.size }),
    });
    if (!metaRes.ok) return null;
    return metaRes.json();
  } catch { return null; }
}

async function uploadZipServerSide(zipFile: File, onProgress: (msg: string) => void): Promise<WFile[]> {
  onProgress("Uploading zip…");
  const urlRes = await fetch(`${API}/workspace/files/upload-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: zipFile.name, size: zipFile.size, contentType: "application/zip" }),
  });
  if (!urlRes.ok) return [];
  const { uploadURL, objectPath } = await urlRes.json();
  const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": "application/zip" }, body: zipFile });
  if (!putRes.ok) return [];
  onProgress("Extracting zip on server…");
  const extractRes = await fetch(`${API}/workspace/files/extract-zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath, zipName: zipFile.name }),
  });
  if (!extractRes.ok) return [];
  return extractRes.json();
}

/* ── Skill Card ──────────────────────────────────────────────────── */
function SkillCard({ skill, n, onDelete }: { skill: Skill; n: ReturnType<typeof useNeu>; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const catColor = CATEGORY_COLORS[skill.category] ?? "#e67e41";
  const cxColor  = COMPLEXITY_COLORS[skill.complexity] ?? "#e67e41";

  return (
    <div
      style={{
        background: n.bg, boxShadow: expanded ? n.insetSm : n.raisedSm,
        borderRadius: 16, padding: "16px", cursor: "pointer",
        transition: "all 0.2s ease", display: "flex", flexDirection: "column", gap: 10,
        border: expanded ? `1px solid ${catColor}33` : "1px solid transparent",
      }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: n.bg, boxShadow: n.raisedSm,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: catColor, fontSize: 16,
        }}>
          <Code2 style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: n.fg, lineHeight: 1.3, marginBottom: 4 }}>
            {skill.name}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 6, background: catColor + "22", color: catColor }}>
              {skill.category}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 6, background: cxColor + "22", color: cxColor }}>
              {skill.complexity}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onDelete(skill.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2, opacity: 0.6 }}
          >
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
          <div style={{ color: n.sub }}>
            {expanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 11, color: n.sub, lineHeight: 1.5, paddingLeft: 46 }}>
        {skill.summary}
      </div>

      {/* Key concepts */}
      {skill.keyConcepts.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingLeft: 46 }}>
          {skill.keyConcepts.map((c, i) => (
            <span key={i} style={{ fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 5, background: n.dark + "44", color: n.sub, letterSpacing: "0.04em" }}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ paddingLeft: 46, display: "flex", flexDirection: "column", gap: 12, borderTop: `1px solid ${n.dark}44`, paddingTop: 12, marginTop: 2 }}
        >
          {skill.description && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: n.sub, marginBottom: 5, textTransform: "uppercase" }}>Description</div>
              <div style={{ fontSize: 11, color: n.fg, lineHeight: 1.6 }}>{skill.description}</div>
            </div>
          )}

          {skill.useCases.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: n.sub, marginBottom: 5, textTransform: "uppercase" }}>Use Cases</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                {skill.useCases.map((u, i) => (
                  <li key={i} style={{ fontSize: 11, color: n.fg, lineHeight: 1.5 }}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {skill.codeExample && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", color: n.sub, marginBottom: 5, textTransform: "uppercase" }}>Code Example</div>
              <div style={{
                borderRadius: 10, overflow: "hidden",
                boxShadow: `inset 2px 2px 6px ${n.dark}, inset -2px -2px 6px ${n.lite}`,
                fontSize: 10, fontFamily: "var(--app-font-mono)",
              }}>
                <SyntaxHighlighter
                  language="typescript"
                  style={n.isLight ? atomOneLight : atomOneDark}
                  customStyle={{ background: "transparent", margin: 0, padding: "12px", fontSize: 10 }}
                >
                  {skill.codeExample}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          {skill.sourceRepo && (
            <div style={{ fontSize: 9, color: n.sub, fontFamily: "var(--app-font-mono)" }}>
              Source: <a href={skill.sourceRepo} target="_blank" rel="noopener" style={{ color: "#e67e41", textDecoration: "none" }}>{skill.sourceRepo}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function AgentStudio() {
  const n = useNeu();

  /* ── Top-level view ── */
  const [view, setView] = useState<"skills" | "agent">("skills");

  /* ── Skills state ── */
  const [skills, setSkills]         = useState<Skill[]>([]);
  const [trainUrl, setTrainUrl]     = useState("");
  const [training, setTraining]     = useState(false);
  const [trainSteps, setTrainSteps] = useState<TrainEvent[]>([]);
  const [trainDone, setTrainDone]   = useState(false);
  const [trainError, setTrainError] = useState("");
  const [catFilter, setCatFilter]   = useState("All");
  const [search, setSearch]         = useState("");
  const trainAbortRef = useRef<AbortController | null>(null);

  /* ── Left panel tab ── */
  const [leftTab, setLeftTab] = useState<"repos" | "files">("repos");

  /* ── Repos ── */
  const [repos, setRepos]         = useState<Repo[]>([]);
  const [repoUrl, setRepoUrl]     = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);

  /* ── Workspace files ── */
  const [wfiles, setWfiles]               = useState<WFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploading, setUploading]         = useState(false);
  const [uploadMsg, setUploadMsg]         = useState("");
  const [viewingFile, setViewingFile]     = useState<WFile | null>(null);
  const [fileContent, setFileContent]     = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [dragging, setDragging]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Job builder ── */
  const [task, setTask]     = useState("");
  const [model, setModel]   = useState("sonnet");
  const [target, setTarget] = useState("dashboard");

  /* ── Jobs feed ── */
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  /* ── SSE for job streaming ── */
  const { stream, data: streamData, isStreaming, setData } = useSSE();

  useEffect(() => { fetchSkills(); fetchRepos(); fetchJobs(); fetchWfiles(); }, []);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [streamData]);

  async function fetchSkills() {
    const r = await fetch(`${API}/skills`);
    if (r.ok) setSkills(await r.json());
  }

  async function fetchRepos() {
    const r = await fetch(`${API}/repos`);
    if (r.ok) setRepos(await r.json());
  }

  async function fetchJobs() {
    const r = await fetch(`${API}/jobs`);
    if (r.ok) setJobs((await r.json()).reverse());
  }

  async function fetchWfiles() {
    const r = await fetch(`${API}/workspace/files`);
    if (r.ok) setWfiles(await r.json());
  }

  /* ── Skills trainer ── */
  async function startTraining() {
    const url = trainUrl.trim();
    if (!url || training) return;
    if (!url.includes("github.com")) { setTrainError("Please enter a valid github.com URL"); return; }

    setTraining(true);
    setTrainDone(false);
    setTrainError("");
    setTrainSteps([]);

    const ctrl = new AbortController();
    trainAbortRef.current = ctrl;

    try {
      const res = await fetch(`${API}/skills/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({ error: "Training failed" }));
        setTrainError(e.error ?? "Training failed");
        return;
      }

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let buf      = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt: TrainEvent = JSON.parse(line.slice(6));
            setTrainSteps(prev => [...prev, evt]);
            if (evt.stage === "done") {
              setTrainDone(true);
              await fetchSkills();
            }
            if (evt.stage === "error") {
              setTrainError(evt.message);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setTrainError(err?.message ?? "Training failed");
    } finally {
      setTraining(false);
      trainAbortRef.current = null;
    }
  }

  async function deleteSkill(id: string) {
    await fetch(`${API}/skills/${id}`, { method: "DELETE" });
    setSkills(prev => prev.filter(s => s.id !== id));
  }

  /* ── Filtered skills ── */
  const filteredSkills = skills.filter(s => {
    const matchesCat = catFilter === "All" || s.category === catFilter;
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.summary.toLowerCase().includes(search.toLowerCase()) || s.keyConcepts.some(k => k.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  /* ── Repo handlers ── */
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

  /* ── Workspace file handlers ── */
  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setUploadMsg("Preparing…");
    const newFiles: WFile[] = [];
    for (const f of files) {
      if (f.name.toLowerCase().endsWith(".zip")) {
        const extracted = await uploadZipServerSide(f, setUploadMsg);
        newFiles.push(...extracted);
      } else {
        setUploadMsg(`Uploading ${f.name}…`);
        const uploaded = await uploadWorkspaceFile(f, f.name);
        if (uploaded) newFiles.push(uploaded);
      }
    }
    setWfiles(prev => [...prev, ...newFiles]);
    setUploading(false);
    setUploadMsg("");
  }

  function toggleWfile(id: number) {
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }

  async function deleteWfile(id: number) {
    await fetch(`${API}/workspace/files/${id}`, { method: "DELETE" });
    setSelectedFiles(prev => prev.filter(f => f !== id));
    if (viewingFile?.id === id) { setViewingFile(null); setFileContent(""); }
    setWfiles(prev => prev.filter(f => f.id !== id));
  }

  async function viewWfile(file: WFile) {
    if (viewingFile?.id === file.id) { setViewingFile(null); setFileContent(""); return; }
    setViewingFile(file);
    setLoadingContent(true);
    setFileContent("");
    try {
      const r = await fetch(`${API}/workspace/files/${file.id}/content`);
      if (r.ok) setFileContent(await r.text());
      else setFileContent("(Could not load file content)");
    } finally { setLoadingContent(false); }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, []);

  /* ── Run agent ── */
  async function runAgent() {
    if (!task.trim() || isStreaming) return;
    setData("");
    setActiveJob(null);
    await stream(`${API}/jobs`, { task, model, outputTarget: target, repoIds: selectedRepos, workspaceFileIds: selectedFiles, title: task.slice(0, 60) });
    await fetchJobs();
  }

  async function viewJob(job: Job) { setActiveJob(job); setData(job.output ?? ""); }

  /* ── Shared style helpers ── */
  const panel = { background: n.bg, boxShadow: n.inset, borderRadius: 18, display: "flex" as const, flexDirection: "column" as const, overflow: "hidden" };
  const pill  = (active: boolean) => ({
    padding: "6px 14px", borderRadius: 10, background: n.bg,
    boxShadow: active ? n.insetSm : n.raisedSm, cursor: "pointer",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
    color: active ? "#e67e41" : n.sub, border: "none", transition: "all 0.18s ease", whiteSpace: "nowrap" as const,
  });
  const tab = (active: boolean) => ({
    flex: 1, padding: "7px 0", border: "none", cursor: "pointer",
    background: n.bg, boxShadow: active ? n.insetSm : n.raisedSm,
    fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const,
    color: active ? "#e67e41" : n.sub, transition: "all 0.18s ease", borderRadius: 8,
  });
  const statusColor = (s: string) => s === "complete" ? "#30d158" : s === "failed" ? "#ff453a" : "#e67e41";
  const statusIcon  = (s: string) =>
    s === "complete" ? <CheckCircle2 style={{ width: 13, height: 13 }} /> :
    s === "failed"   ? <XCircle      style={{ width: 13, height: 13 }} /> :
                       <Loader2      style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />;

  const TRAIN_STAGES: Record<string, number> = { cloning: 20, analyzing: 50, processing: 75, saving: 90, done: 100 };
  const progressPct = trainSteps.length ? (TRAIN_STAGES[trainSteps[trainSteps.length - 1]?.stage] ?? 10) : 0;

  return (
    <div style={{
      margin: "-24px -32px 0 -32px",
      height: "calc(100vh - 232px)",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      padding: "16px 16px 0",
      boxSizing: "border-box",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .skill-card-anim { animation: fadeIn 0.25s ease both; }
        .ws-drop-active { outline: 2px dashed #e67e41; outline-offset: -4px; }
        .filter-cat:hover { opacity: 0.85; }
      `}</style>

      {/* ══ TOP NAV: VIEW SWITCHER ══════════════════════════════════ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setView("skills")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer",
            background: n.bg, boxShadow: view === "skills" ? n.insetSm : n.raisedSm,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.10em",
            textTransform: "uppercase", color: view === "skills" ? "#e67e41" : n.sub,
            transition: "all 0.18s ease",
          }}
        >
          <Sparkles style={{ width: 13, height: 13 }} /> Skills Library
        </button>
        <button
          onClick={() => setView("agent")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer",
            background: n.bg, boxShadow: view === "agent" ? n.insetSm : n.raisedSm,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.10em",
            textTransform: "uppercase", color: view === "agent" ? "#e67e41" : n.sub,
            transition: "all 0.18s ease",
          }}
        >
          <Cpu style={{ width: 13, height: 13 }} /> Run Agent
        </button>
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 12, background: n.bg, boxShadow: n.raisedSm,
          fontSize: 10, fontWeight: 700, color: "#e67e41", letterSpacing: "0.08em",
        }}>
          <Layers style={{ width: 12, height: 12 }} />
          {skills.length} skill{skills.length !== 1 ? "s" : ""} trained
        </div>
      </div>

      {/* ══ SKILLS LIBRARY VIEW ════════════════════════════════════ */}
      {view === "skills" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>

          {/* Train from GitHub hero */}
          <div style={{ ...panel, flexDirection: "column", flexShrink: 0, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: n.bg, boxShadow: n.raisedSm,
                display: "flex", alignItems: "center", justifyContent: "center", color: "#e67e41",
              }}>
                <Github style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: n.fg, letterSpacing: "0.04em" }}>Train ATREYU with New Skills</div>
                <div style={{ fontSize: 10, color: n.sub, marginTop: 2 }}>Paste a GitHub repo link. ATREYU will analyze the codebase and learn reusable skills, patterns, and techniques.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={trainUrl}
                onChange={e => { setTrainUrl(e.target.value); setTrainError(""); }}
                onKeyDown={e => e.key === "Enter" && startTraining()}
                placeholder="https://github.com/owner/repository"
                style={{
                  flex: 1, background: n.bg, boxShadow: n.insetSm,
                  border: "none", borderRadius: 12, padding: "10px 14px",
                  fontSize: 11, color: n.fg, fontFamily: "var(--app-font-mono)", outline: "none",
                }}
              />
              <button
                onClick={startTraining}
                disabled={training || !trainUrl.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", borderRadius: 12, border: "none",
                  cursor: training || !trainUrl.trim() ? "not-allowed" : "pointer",
                  background: n.bg, boxShadow: training ? n.insetSm : n.raised,
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase",
                  color: training ? n.sub : "#e67e41", transition: "all 0.18s ease",
                  opacity: training || !trainUrl.trim() ? 0.7 : 1,
                }}
              >
                {training
                  ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Training...</>
                  : <><Sparkles style={{ width: 13, height: 13 }} /> Train ATREYU</>}
              </button>
            </div>

            {/* Error */}
            {trainError && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "#ff453a18", color: "#ff453a", fontSize: 10, fontFamily: "var(--app-font-mono)" }}>
                {trainError}
              </div>
            )}

            {/* Progress */}
            {(training || (trainSteps.length > 0 && !trainDone)) && (
              <div style={{ marginTop: 14 }}>
                {/* Progress bar */}
                <div style={{ height: 4, borderRadius: 99, background: n.dark + "88", overflow: "hidden", marginBottom: 10 }}>
                  <div style={{
                    height: "100%", borderRadius: 99, background: "#e67e41",
                    width: `${progressPct}%`, transition: "width 0.5s ease",
                  }} />
                </div>
                {/* Steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {trainSteps.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: s.stage === "error" ? "#ff453a" : n.sub, fontFamily: "var(--app-font-mono)" }}>
                      {s.stage === "done" ? <CheckCircle2 style={{ width: 11, height: 11, color: "#30d158", flexShrink: 0 }} />
                       : s.stage === "error" ? <XCircle style={{ width: 11, height: 11, color: "#ff453a", flexShrink: 0 }} />
                       : i === trainSteps.length - 1 ? <Loader2 style={{ width: 11, height: 11, color: "#e67e41", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                       : <CheckCircle2 style={{ width: 11, height: 11, color: "#30d158", flexShrink: 0 }} />}
                      {s.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trainDone && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#30d158", fontFamily: "var(--app-font-mono)" }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                {trainSteps.find(s => s.stage === "done")?.message ?? "Training complete!"}
              </div>
            )}
          </div>

          {/* Filter bar + search */}
          <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center", overflowX: "auto", scrollbarWidth: "none" }}>
            {/* Search */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: n.sub, pointerEvents: "none" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search skills..."
                style={{
                  background: n.bg, boxShadow: n.insetSm,
                  border: "none", borderRadius: 10, padding: "7px 10px 7px 28px",
                  fontSize: 10, color: n.fg, outline: "none", width: 180,
                }}
              />
            </div>
            {/* Category pills */}
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className="filter-cat"
                onClick={() => setCatFilter(cat)}
                style={pill(catFilter === cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Skills grid */}
          <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
            {filteredSkills.length === 0 ? (
              <div style={{
                height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 12, color: n.sub,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: n.bg, boxShadow: n.raisedSm, display: "flex", alignItems: "center", justifyContent: "center", color: n.sub, opacity: 0.5 }}>
                  <BookOpen style={{ width: 24, height: 24 }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: n.fg, opacity: 0.6, marginBottom: 4 }}>
                    {skills.length === 0 ? "No skills trained yet" : "No skills match your filters"}
                  </div>
                  <div style={{ fontSize: 10, color: n.sub }}>
                    {skills.length === 0 ? "Paste a GitHub link above to teach ATREYU new skills." : "Try a different category or search term."}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, paddingBottom: 16 }}>
                {filteredSkills.map((skill, i) => (
                  <div key={skill.id} className="skill-card-anim" style={{ animationDelay: `${i * 0.04}s` }}>
                    <SkillCard skill={skill} n={n} onDelete={deleteSkill} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ RUN AGENT VIEW ════════════════════════════════════════ */}
      {view === "agent" && (
        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: "260px 1fr 300px",
          gap: 16, overflow: "hidden",
        }}>
          {/* ── LEFT: REPOS / PROJECT FILES ────────────────────── */}
          <div style={panel}>
            <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${n.dark}22`, display: "flex", gap: 6 }}>
              <button onClick={() => setLeftTab("repos")} style={tab(leftTab === "repos")}>
                <BookOpen style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />Skill Repos
              </button>
              <button onClick={() => setLeftTab("files")} style={tab(leftTab === "files")}>
                <FolderOpen style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />Project Files
              </button>
            </div>

            {/* REPOS TAB */}
            {leftTab === "repos" && (
              <>
                <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${n.dark}22` }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && ingestRepo()}
                      placeholder="github.com/owner/repo"
                      style={{ flex: 1, background: n.bg, boxShadow: n.insetSm, border: "none", borderRadius: 9, padding: "7px 10px", fontSize: 10, color: n.fg, fontFamily: "var(--app-font-mono)", outline: "none" }}
                    />
                    <button
                      onClick={ingestRepo}
                      disabled={ingesting || !repoUrl.trim()}
                      style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: n.bg, boxShadow: ingesting ? n.insetSm : n.raisedSm, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#e67e41" }}
                    >
                      {ingesting ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 12, height: 12 }} />}
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px", scrollbarWidth: "none" }}>
                  {repos.length === 0 ? (
                    <div style={{ padding: "20px 8px", textAlign: "center", color: n.sub, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>Paste a GitHub URL to inject repo context into agent tasks</div>
                  ) : repos.map(r => {
                    const active = selectedRepos.includes(r.id);
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 10px", borderRadius: 10, marginBottom: 4, background: n.bg, boxShadow: active ? n.insetSm : n.raisedSm, cursor: "pointer", transition: "box-shadow 0.18s ease" }} onClick={() => toggleRepo(r.id)}>
                        <Github style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1, color: active ? "#e67e41" : n.sub }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#e67e41" : n.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.owner}/{r.repo}</div>
                          {r.description && <div style={{ fontSize: 9, color: n.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteRepo(r.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2, flexShrink: 0 }}>
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* PROJECT FILES TAB */}
            {leftTab === "files" && (
              <>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={dragging ? "ws-drop-active" : ""}
                  style={{ margin: "10px", borderRadius: 12, padding: "14px 10px", background: n.bg, boxShadow: dragging ? n.insetSm : n.raisedSm, cursor: uploading ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.18s ease", borderBottom: `1px solid ${n.dark}22` }}
                >
                  {uploading ? (
                    <><Loader2 style={{ width: 18, height: 18, color: "#e67e41", animation: "spin 1s linear infinite" }} /><span style={{ fontSize: 9, color: "#e67e41", fontFamily: "var(--app-font-mono)", textAlign: "center" }}>{uploadMsg}</span></>
                  ) : (
                    <><Upload style={{ width: 16, height: 16, color: n.sub }} /><span style={{ fontSize: 9, fontWeight: 700, color: n.sub, textAlign: "center", letterSpacing: "0.06em" }}>DROP FILES OR CLICK TO UPLOAD</span><span style={{ fontSize: 8, color: n.sub, opacity: 0.7, textAlign: "center" }}>.zip archives are auto-extracted</span></>
                  )}
                  <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={e => e.target.files && handleFiles(e.target.files)} />
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px", scrollbarWidth: "none" }}>
                  {wfiles.length === 0 ? (
                    <div style={{ padding: "16px 8px", textAlign: "center", color: n.sub, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>No files yet — upload your project folder or files above</div>
                  ) : wfiles.map(f => {
                    const isSelected = selectedFiles.includes(f.id);
                    const isViewing  = viewingFile?.id === f.id;
                    return (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 9, marginBottom: 3, background: n.bg, boxShadow: isViewing ? n.insetSm : isSelected ? n.raisedSm : "none", cursor: "pointer" }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleWfile(f.id)} onClick={e => e.stopPropagation()} style={{ accentColor: "#e67e41", width: 11, height: 11, flexShrink: 0 }} />
                        <span onClick={() => viewWfile(f)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                          <span style={{ fontSize: 12 }}>{fileIcon(f.name)}</span>
                          <span style={{ fontSize: 10, color: isViewing ? "#e67e41" : n.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                          {f.fileSize && <span style={{ fontSize: 8, color: n.sub, flexShrink: 0 }}>{humanSize(f.fileSize)}</span>}
                        </span>
                        <button onClick={() => deleteWfile(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2, flexShrink: 0, opacity: 0.6 }}>
                          <Trash2 style={{ width: 9, height: 9 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {viewingFile && (
                  <div style={{ borderTop: `1px solid ${n.dark}22`, padding: "8px", display: "flex", flexDirection: "column", gap: 4, maxHeight: "45%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: n.sub, letterSpacing: "0.08em" }}>{viewingFile.name}</span>
                      <button onClick={() => { setViewingFile(null); setFileContent(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: n.sub }}>
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", borderRadius: 8, background: n.bg, boxShadow: n.insetSm, padding: "6px 8px", scrollbarWidth: "none" }}>
                      {loadingContent ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><Loader2 style={{ width: 14, height: 14, color: "#e67e41", animation: "spin 1s linear infinite" }} /></div>
                      ) : (
                        <SyntaxHighlighter
                          language={langFromExt(viewingFile.name)}
                          style={n.isLight ? atomOneLight : atomOneDark}
                          customStyle={{ background: "transparent", margin: 0, padding: 0, fontSize: 9, fontFamily: "var(--app-font-mono)" }}
                        >
                          {fileContent}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── MIDDLE: TASK BUILDER ──────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Task input */}
            <div style={{ ...panel, padding: "14px" }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: n.sub, marginBottom: 8, textTransform: "uppercase" }}>Task</div>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAgent(); }}
                placeholder="Describe what you want the agent to do..."
                style={{ flex: 1, background: n.bg, boxShadow: n.insetSm, border: "none", borderRadius: 12, padding: "12px 14px", fontSize: 11, color: n.fg, resize: "none", outline: "none", minHeight: 100, fontFamily: "inherit", lineHeight: 1.6 }}
              />

              {/* Model + Target + Run */}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* Model */}
                <div style={{ display: "flex", gap: 4 }}>
                  {MODELS.map(m => (
                    <button key={m.id} onClick={() => setModel(m.id)} style={{ ...pill(model === m.id), padding: "5px 10px", fontSize: 9 }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {/* Target */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {OUTPUT_TARGETS.map(t => (
                    <button key={t.id} onClick={() => setTarget(t.id)} style={{ ...pill(target === t.id), padding: "5px 10px", fontSize: 9 }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <button
                  onClick={runAgent}
                  disabled={!task.trim() || isStreaming}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, border: "none", cursor: (!task.trim() || isStreaming) ? "not-allowed" : "pointer", background: n.bg, boxShadow: isStreaming ? n.insetSm : n.raised, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: isStreaming ? n.sub : "#e67e41", transition: "all 0.18s ease", opacity: (!task.trim() || isStreaming) ? 0.6 : 1 }}
                >
                  {isStreaming ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Running...</> : <><Play style={{ width: 13, height: 13 }} /> Run Agent</>}
                </button>
              </div>
            </div>

            {/* Streaming output */}
            <div style={{ ...panel, flex: 1 }}>
              <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${n.dark}22`, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap style={{ width: 11, height: 11, color: "#e67e41" }} />
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: n.sub, textTransform: "uppercase" }}>
                  {activeJob ? `Job #${activeJob.id} — ${activeJob.title}` : isStreaming ? "Streaming output..." : "Output"}
                </span>
                {isStreaming && <div style={{ marginLeft: "auto" }}><Loader2 style={{ width: 11, height: 11, color: "#e67e41", animation: "spin 1s linear infinite" }} /></div>}
              </div>
              <div ref={outputRef} style={{ flex: 1, overflowY: "auto", padding: "14px", scrollbarWidth: "none" }}>
                {streamData ? (
                  <div style={{ fontSize: 11, lineHeight: 1.7, color: n.fg }}>
                    <ReactMarkdown
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <SyntaxHighlighter language={match[1]} style={n.isLight ? atomOneLight : atomOneDark} customStyle={{ borderRadius: 10, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code {...props} style={{ fontFamily: "var(--app-font-mono)", fontSize: 10, background: n.dark + "44", padding: "1px 5px", borderRadius: 4 }}>{children}</code>
                          );
                        },
                      }}
                    >
                      {streamData}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: n.sub }}>
                    <Cpu style={{ width: 28, height: 28, opacity: 0.3 }} />
                    <div style={{ fontSize: 10, fontFamily: "var(--app-font-mono)", opacity: 0.5 }}>Run a task to see output here</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: JOB HISTORY ────────────────────────────── */}
          <div style={panel}>
            <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${n.dark}22`, display: "flex", alignItems: "center", gap: 6 }}>
              <Clock style={{ width: 11, height: 11, color: n.sub }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: n.sub, textTransform: "uppercase" }}>Job History</span>
              <span style={{ marginLeft: "auto", fontSize: 9, color: n.sub }}>{jobs.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px", scrollbarWidth: "none" }}>
              {jobs.length === 0 ? (
                <div style={{ padding: "20px 8px", textAlign: "center", color: n.sub, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>No jobs run yet</div>
              ) : jobs.map(j => (
                <div
                  key={j.id}
                  onClick={() => viewJob(j)}
                  style={{ padding: "10px 11px", borderRadius: 10, marginBottom: 4, background: n.bg, boxShadow: activeJob?.id === j.id ? n.insetSm : n.raisedSm, cursor: "pointer", transition: "box-shadow 0.18s ease" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: statusColor(j.status) }}>{statusIcon(j.status)}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: activeJob?.id === j.id ? "#e67e41" : n.fg, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {j.title}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 5, background: n.dark + "44", color: n.sub, letterSpacing: "0.04em" }}>{j.model}</span>
                    {j.outputTarget && <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 5, background: n.dark + "44", color: n.sub }}>{j.outputTarget}</span>}
                    <span style={{ fontSize: 8, color: n.sub, marginLeft: "auto" }}>{new Date(j.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
