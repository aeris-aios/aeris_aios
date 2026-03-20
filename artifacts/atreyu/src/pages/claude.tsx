import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/contexts/theme";
import { useSSE } from "@/hooks/use-sse";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneLight, atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  Github, Plus, Trash2, Play, Loader2, CheckCircle2, XCircle,
  Clock, ChevronRight, Cpu, BookOpen, Zap, X, Upload,
  FileText, FolderOpen, File, Check,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type Repo  = { id: number; url: string; owner: string; repo: string; description?: string; createdAt: string };
type Job   = { id: number; title: string; task: string; model: string; status: string; output?: string; outputTarget?: string; createdAt: string };
type WFile = { id: number; name: string; path: string; objectPath: string; mimeType: string; fileSize?: number; createdAt: string };

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

/* Map file extension → highlight.js language name */
function langFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts:"typescript", tsx:"typescript", js:"javascript", jsx:"javascript",
    py:"python", go:"go", rs:"rust", java:"java", c:"c", cpp:"cpp",
    cs:"csharp", rb:"ruby", php:"php", sh:"bash", bash:"bash",
    json:"json", yaml:"yaml", yml:"yaml", toml:"toml",
    md:"markdown", html:"html", css:"css", xml:"xml", sql:"sql",
    graphql:"graphql", swift:"swift", kt:"kotlin", r:"r", lua:"lua",
  };
  return map[ext] ?? "plaintext";
}

/* ── Upload a single file (presigned URL → GCS → save metadata) ─── */
async function uploadWorkspaceFile(file: File, relativePath: string): Promise<WFile | null> {
  try {
    const urlRes = await fetch(`${API}/workspace/files/upload-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "text/plain" }),
    });
    if (!urlRes.ok) return null;
    const { uploadURL, objectPath } = await urlRes.json();

    const putRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!putRes.ok) return null;

    const metaRes = await fetch(`${API}/workspace/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        path: relativePath,
        objectPath,
        mimeType: file.type || "text/plain",
        fileSize: file.size,
      }),
    });
    if (!metaRes.ok) return null;
    return metaRes.json();
  } catch {
    return null;
  }
}

/* ── Upload zip then have the SERVER extract it ──────────────────── */
async function uploadZipServerSide(zipFile: File, onProgress: (msg: string) => void): Promise<WFile[]> {
  onProgress("Uploading zip…");

  /* 1. Get presigned URL for the raw zip */
  const urlRes = await fetch(`${API}/workspace/files/upload-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: zipFile.name, size: zipFile.size, contentType: "application/zip" }),
  });
  if (!urlRes.ok) return [];
  const { uploadURL, objectPath } = await urlRes.json();

  /* 2. PUT the zip to GCS */
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "application/zip" },
    body: zipFile,
  });
  if (!putRes.ok) return [];

  onProgress("Extracting zip on server…");

  /* 3. Ask the server to extract the zip and store each file */
  const extractRes = await fetch(`${API}/workspace/files/extract-zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath, zipName: zipFile.name }),
  });
  if (!extractRes.ok) return [];
  return extractRes.json();
}

export default function AgentStudio() {
  const n = useNeu();

  /* ── Left panel tab ── */
  const [leftTab, setLeftTab] = useState<"repos" | "files">("repos");

  /* ── Repos ── */
  const [repos, setRepos]         = useState<Repo[]>([]);
  const [repoUrl, setRepoUrl]     = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);

  /* ── Workspace files ── */
  const [wfiles, setWfiles]             = useState<WFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadMsg, setUploadMsg]       = useState("");
  const [viewingFile, setViewingFile]   = useState<WFile | null>(null);
  const [fileContent, setFileContent]   = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [dragging, setDragging]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Job builder ── */
  const [task, setTask]   = useState("");
  const [model, setModel] = useState("sonnet");
  const [target, setTarget] = useState("dashboard");

  /* ── Jobs feed ── */
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  /* ── SSE for streaming ── */
  const { stream, data: streamData, isStreaming, setData } = useSSE();

  /* Load data on mount */
  useEffect(() => { fetchRepos(); fetchJobs(); fetchWfiles(); }, []);

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

  async function fetchWfiles() {
    const r = await fetch(`${API}/workspace/files`);
    if (r.ok) setWfiles(await r.json());
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

  /* ── Workspace file handlers ── */
  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setUploadMsg("Preparing…");

    const newFiles: WFile[] = [];
    for (const f of files) {
      if (f.name.toLowerCase().endsWith(".zip")) {
        /* Server-side zip extraction via adm-zip */
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

  /* ── Drag-and-drop ── */
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
    await stream(`${API}/jobs`, {
      task,
      model,
      outputTarget: target,
      repoIds: selectedRepos,
      workspaceFileIds: selectedFiles,
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

  const tab = (active: boolean) => ({
    flex: 1, padding: "7px 0", border: "none", cursor: "pointer",
    background: n.bg,
    boxShadow: active ? n.insetSm : n.raisedSm,
    fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: active ? "#e67e41" : n.sub,
    transition: "all 0.18s ease",
    borderRadius: active ? 8 : 8,
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
    s === "failed"   ? <XCircle      style={{ width: 13, height: 13 }} /> :
                       <Loader2      style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />;

  const totalCtx = selectedRepos.length + selectedFiles.length;

  return (
    <div style={{
      margin: "-24px -32px 0 -32px",
      height: "calc(100vh - 232px)",
      display: "grid",
      gridTemplateColumns: "260px 1fr 300px",
      gridTemplateRows: "1fr",
      gap: 16,
      padding: "16px 16px 0",
      boxSizing: "border-box",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ws-tree-row:hover { opacity: 0.85; }
        .ws-drop-active { outline: 2px dashed #e67e41; outline-offset: -4px; }
      `}</style>

      {/* ══ LEFT: TAB — REPOS / PROJECT FILES ════════════════════ */}
      <div style={panel}>
        {/* Tab switcher */}
        <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${n.dark}22`, display: "flex", gap: 6 }}>
          <button onClick={() => setLeftTab("repos")} style={tab(leftTab === "repos")}>
            <BookOpen style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
            Skill Repos
          </button>
          <button onClick={() => setLeftTab("files")} style={tab(leftTab === "files")}>
            <FolderOpen style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
            Project Files
          </button>
        </div>

        {/* ── REPOS TAB ────────────────────────────────────── */}
        {leftTab === "repos" && (
          <>
            <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${n.dark}22` }}>
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
                      <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#e67e41" : n.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          </>
        )}

        {/* ── PROJECT FILES TAB ─────────────────────────────── */}
        {leftTab === "files" && (
          <>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={dragging ? "ws-drop-active" : ""}
              style={{
                margin: "10px", borderRadius: 12,
                padding: "14px 10px",
                background: n.bg, boxShadow: dragging ? n.insetSm : n.raisedSm,
                cursor: uploading ? "not-allowed" : "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.18s ease",
                borderBottom: `1px solid ${n.dark}22`,
              }}
            >
              {uploading ? (
                <>
                  <Loader2 style={{ width: 18, height: 18, color: "#e67e41", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 9, color: "#e67e41", fontFamily: "var(--app-font-mono)", textAlign: "center" }}>{uploadMsg}</span>
                </>
              ) : (
                <>
                  <Upload style={{ width: 16, height: 16, color: n.sub }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: n.sub, textAlign: "center", letterSpacing: "0.06em" }}>
                    DROP FILES OR CLICK TO UPLOAD
                  </span>
                  <span style={{ fontSize: 8, color: n.sub, opacity: 0.7, textAlign: "center" }}>
                    .zip archives are auto-extracted
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={e => e.target.files && handleFiles(e.target.files)}
              />
            </div>

            {/* File tree */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 8px", scrollbarWidth: "none" }}>
              {wfiles.length === 0 ? (
                <div style={{ padding: "16px 8px", textAlign: "center", color: n.sub, fontSize: 10, fontFamily: "var(--app-font-mono)" }}>
                  No files yet — upload your project folder or files above
                </div>
              ) : wfiles.map(f => {
                const isSelected = selectedFiles.includes(f.id);
                const isViewing  = viewingFile?.id === f.id;
                return (
                  <div
                    key={f.id}
                    className="ws-tree-row"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 8px", borderRadius: 9, marginBottom: 3,
                      background: n.bg, boxShadow: isViewing ? n.insetSm : (isSelected ? n.raisedSm : "none"),
                      cursor: "pointer", transition: "box-shadow 0.15s ease",
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleWfile(f.id); }}
                      style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        background: n.bg, boxShadow: isSelected ? n.insetSm : n.raisedSm,
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {isSelected && <Check style={{ width: 8, height: 8, color: "#e67e41" }} />}
                    </button>

                    {/* File info */}
                    <div
                      style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5 }}
                      onClick={() => viewWfile(f)}
                    >
                      <span style={{ fontSize: 11 }}>{fileIcon(f.name)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: isViewing ? "#e67e41" : n.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: 8, color: n.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.path !== f.name ? f.path : ""}{f.fileSize ? ` ${humanSize(f.fileSize)}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteWfile(f.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2, flexShrink: 0, opacity: 0.6 }}
                    >
                      <Trash2 style={{ width: 9, height: 9 }} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* File viewer panel */}
            {viewingFile && (
              <div style={{
                borderTop: `1px solid ${n.dark}22`,
                maxHeight: "35%", display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                <div style={{
                  padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: `1px solid ${n.dark}22`, flexShrink: 0,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e67e41", fontFamily: "var(--app-font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {viewingFile.path}
                  </span>
                  <button
                    onClick={() => { setViewingFile(null); setFileContent(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: n.sub, padding: 2, flexShrink: 0 }}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
                  {loadingContent ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: n.sub, fontSize: 9, padding: "8px 12px" }}>
                      <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                      Loading…
                    </div>
                  ) : (
                    <SyntaxHighlighter
                      language={langFromExt(viewingFile.name)}
                      style={n.isLight ? atomOneLight : atomOneDark}
                      customStyle={{
                        margin: 0,
                        padding: "8px 12px",
                        background: "transparent",
                        fontSize: 8.5,
                        lineHeight: 1.6,
                        fontFamily: "var(--app-font-mono)",
                      }}
                      wrapLongLines
                      showLineNumbers={fileContent.split("\n").length > 5}
                    >
                      {fileContent || "(empty file)"}
                    </SyntaxHighlighter>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Context indicator */}
        {totalCtx > 0 && (
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${n.dark}22`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Cpu style={{ width: 11, height: 11, color: "#e67e41" }} />
            <span style={{ fontSize: 9, fontFamily: "var(--app-font-mono)", color: "#e67e41", letterSpacing: "0.08em" }}>
              {selectedRepos.length > 0 && `${selectedRepos.length} REPO${selectedRepos.length > 1 ? "S" : ""}`}
              {selectedRepos.length > 0 && selectedFiles.length > 0 && " + "}
              {selectedFiles.length > 0 && `${selectedFiles.length} FILE${selectedFiles.length > 1 ? "S" : ""}`}
              {" IN CONTEXT"}
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
            {selectedFiles.length > 0 && (
              <span style={{ fontSize: 8, fontFamily: "var(--app-font-mono)", color: "#e67e41", background: `${n.bg}`, boxShadow: n.raisedSm, padding: "2px 7px", borderRadius: 6 }}>
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} in context
              </span>
            )}
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
