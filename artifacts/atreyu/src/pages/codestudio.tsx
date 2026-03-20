import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { useTheme } from "@/contexts/theme";
import {
  FolderOpen, Folder, FileText, Upload, GitBranch,
  Send, RefreshCw, Trash2, ChevronRight, ChevronDown, X,
} from "lucide-react";

const API = "/api/codestudio";

/* ─── Types ─────────────────────────────────────────────────── */
type FileNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
};

type TextBlock  = { kind: "text"; text: string };
type ToolBlock  = { kind: "tool"; name: string; input: string; result?: string; open: boolean };
type MsgBlock   = TextBlock | ToolBlock;
type Message    = { role: "user" | "assistant"; blocks: MsgBlock[] };

type ActiveFile = { path: string; content: string; isDirty: boolean };

/* ─── Language map for Monaco ─────────────────────────────── */
const LANG: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  cs: "csharp", cpp: "cpp", c: "c", h: "c", php: "php",
  html: "html", htm: "html", css: "css", scss: "scss", less: "less",
  json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
  md: "markdown", mdx: "markdown", sh: "shell", bash: "shell",
  sql: "sql", graphql: "graphql", xml: "xml", svg: "xml",
};

function getLang(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return LANG[ext] ?? "plaintext";
}

/* ─── File Tree component ───────────────────────────────────── */
function FileTree({
  nodes,
  onOpen,
  activePath,
}: {
  nodes: FileNode[];
  onOpen: (path: string) => void;
  activePath: string | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }

  function renderNode(node: FileNode, depth: number): React.ReactNode {
    const isActive = node.path === activePath;
    const isOpen   = !collapsed.has(node.path);
    const indent   = depth * 12;

    if (node.type === "dir") {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggle(node.path)}
            className="w-full text-left flex items-center gap-1 px-2 py-[3px] rounded hover:bg-white/10 transition-colors"
            style={{ paddingLeft: 8 + indent }}
          >
            <span style={{ flexShrink: 0, opacity: 0.6 }}>
              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </span>
            <span style={{ flexShrink: 0, opacity: 0.7 }}>
              {isOpen ? <FolderOpen size={12} /> : <Folder size={12} />}
            </span>
            <span className="truncate text-[11px]" style={{ color: "var(--app-fg)", opacity: 0.8 }}>
              {node.name}
            </span>
          </button>
          {isOpen && node.children?.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        onClick={() => onOpen(node.path)}
        className="w-full text-left flex items-center gap-1 px-2 py-[3px] rounded transition-colors"
        style={{
          paddingLeft: 8 + indent,
          background: isActive ? "rgba(124,58,237,0.18)" : "transparent",
          color: isActive ? "#a78bfa" : "var(--app-fg)",
        }}
      >
        <FileText size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
        <span className="truncate text-[11px]">{node.name}</span>
      </button>
    );
  }

  if (nodes.length === 0) {
    return (
      <p className="text-[11px] px-3 py-4 opacity-40" style={{ color: "var(--app-muted)" }}>
        No files yet. Upload a zip or clone a repo.
      </p>
    );
  }

  return <div className="py-1">{nodes.map((n) => renderNode(n, 0))}</div>;
}

/* ─── Chat message renderer ─────────────────────────────────── */
function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      {msg.blocks.map((block, i) => {
        if (block.kind === "text") {
          return (
            <div
              key={i}
              className="max-w-[90%] px-3 py-2 rounded-xl text-[12px] leading-[1.6] whitespace-pre-wrap"
              style={{
                background: isUser
                  ? "linear-gradient(135deg,#7c3aed,#5b21b6)"
                  : "var(--app-surface)",
                color: isUser ? "#fff" : "var(--app-fg)",
                boxShadow: isUser ? "none" : "var(--neu-raised-sm)",
              }}
            >
              {block.text}
            </div>
          );
        }

        /* tool block */
        const tb = block as ToolBlock;
        return (
          <details key={i} className="max-w-[90%] text-[11px]" open={tb.open}>
            <summary
              className="cursor-pointer px-2 py-1 rounded flex items-center gap-1 select-none"
              style={{ color: "#a78bfa", listStyle: "none" }}
            >
              <span>⚙️</span>
              <span className="font-mono">{tb.name}</span>
              <span className="opacity-50 truncate max-w-[160px]">({tb.input})</span>
            </summary>
            {tb.result && (
              <pre
                className="mt-1 px-2 py-1 rounded text-[10px] overflow-x-auto max-h-[120px]"
                style={{
                  background: "var(--app-surface)",
                  color: "var(--app-muted)",
                  boxShadow: "var(--neu-inset-sm)",
                }}
              >
                {tb.result}
              </pre>
            )}
          </details>
        );
      })}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function CodeStudio() {
  const { theme } = useTheme();

  /* project state */
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileTree,  setFileTree]  = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [projectName, setProjectName] = useState("New Project");

  /* chat state */
  const sessionId   = useRef(`cs-${Date.now()}`);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const chatBottom  = useRef<HTMLDivElement>(null);

  /* ui state */
  const [uploading, setUploading] = useState(false);
  const [cloning,   setCloning]   = useState(false);
  const [cloneUrl,  setCloneUrl]  = useState("");
  const [showClone, setShowClone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* auto-save debounce */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Create project on mount ────────────────────────────── */
  useEffect(() => {
    fetch(`${API}/projects`, { method: "POST" })
      .then((r) => r.json())
      .then((d: { projectId: string }) => setProjectId(d.projectId))
      .catch(console.error);
  }, []);

  /* ── Scroll chat to bottom ─────────────────────────────── */
  useEffect(() => {
    chatBottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Open a file in Monaco ─────────────────────────────── */
  async function openFile(filePath: string) {
    if (!projectId) return;
    const r = await fetch(`${API}/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`);
    if (!r.ok) return;
    const content = await r.text();
    setActiveFile({ path: filePath, content, isDirty: false });
  }

  /* ── Monaco change handler (debounced save) ────────────── */
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeFile || value === undefined) return;
    setActiveFile((prev) => prev ? { ...prev, content: value, isDirty: true } : null);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!projectId) return;
      await fetch(`${API}/projects/${projectId}/file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeFile.path, content: value }),
      });
      setActiveFile((prev) => prev ? { ...prev, isDirty: false } : null);
    }, 1000);
  }, [projectId, activeFile]);

  /* ── File upload (zip or individual files) ─────────────── */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !projectId) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      const r = await fetch(`${API}/projects/${projectId}/upload`, { method: "POST", body: form });
      const d = await r.json() as { tree: FileNode[]; results: string[] };
      setFileTree(d.tree ?? []);
      if (files.length === 1) setProjectName(files[0].name.replace(/\.zip$/, ""));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ── Git clone ─────────────────────────────────────────── */
  async function handleClone() {
    if (!cloneUrl.trim() || !projectId) return;
    setCloning(true);
    try {
      const r = await fetch(`${API}/projects/${projectId}/git-clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: cloneUrl.trim() }),
      });
      const d = await r.json() as { tree?: FileNode[]; error?: string };
      if (d.tree) {
        setFileTree(d.tree);
        const repoName = cloneUrl.split("/").pop()?.replace(/\.git$/, "") ?? "Repo";
        setProjectName(repoName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCloning(false);
      setCloneUrl("");
      setShowClone(false);
    }
  }

  /* ── New session ────────────────────────────────────────── */
  async function newSession() {
    const old = sessionId.current;
    sessionId.current = `cs-${Date.now()}`;
    setMessages([]);
    if (projectId) {
      await fetch(`${API}/sessions/${old}`, { method: "DELETE" }).catch(() => {});
    }
  }

  /* ── Send chat message ─────────────────────────────────── */
  async function sendMessage() {
    const text = chatInput.trim();
    if (!text || !projectId || streaming) return;

    setChatInput("");
    setStreaming(true);

    /* add user message */
    setMessages((prev) => [...prev, { role: "user", blocks: [{ kind: "text", text }] }]);

    /* add empty assistant message to fill */
    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", blocks: [] }]);

    try {
      const res = await fetch(`${API}/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId.current }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; text?: string; name?: string; input?: string; result?: string;
            };

            setMessages((prev) => {
              const next = [...prev];
              const msg  = { ...next[assistantIdx], blocks: [...(next[assistantIdx]?.blocks ?? [])] };

              if (event.type === "text" && event.text) {
                const lastBlock = msg.blocks[msg.blocks.length - 1];
                if (lastBlock?.kind === "text") {
                  msg.blocks[msg.blocks.length - 1] = { kind: "text", text: lastBlock.text + event.text };
                } else {
                  msg.blocks.push({ kind: "text", text: event.text });
                }
              } else if (event.type === "tool" && event.name) {
                if (event.result !== undefined) {
                  /* update last tool block with result */
                  const lastTool = [...msg.blocks].reverse().find((b) => b.kind === "tool" && (b as ToolBlock).name === event.name) as ToolBlock | undefined;
                  if (lastTool) lastTool.result = event.result;
                } else {
                  msg.blocks.push({ kind: "tool", name: event.name!, input: event.input ?? "", open: false });
                }
              }

              next[assistantIdx] = msg;
              return next;
            });
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStreaming(false);
    }
  }

  /* ── Refresh file tree (after Claude may have written files) */
  async function refreshTree() {
    if (!projectId) return;
    const r = await fetch(`${API}/projects/${projectId}/files`);
    if (r.ok) setFileTree(await r.json());
    /* if active file was modified by Claude, reload it */
    if (activeFile) await openFile(activeFile.path);
  }

  /* ── Monaco setup callback ──────────────────────────────── */
  function handleEditorMount(_editor: unknown, monaco: Monaco) {
    monaco.editor.defineTheme("atreyu-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: { "editor.background": "#0f1117" },
    });
    monaco.editor.defineTheme("atreyu-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: { "editor.background": "#eef0f6" },
    });
    monaco.editor.setTheme(theme === "dark" ? "atreyu-dark" : "atreyu-light");
  }

  /* ─── Render ──────────────────────────────────────────── */
  const panelStyle: React.CSSProperties = {
    background: "var(--app-surface)",
    boxShadow: "var(--neu-inset)",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12, gap: 10, background: "var(--app-bg)" }}>

      {/* ── Topbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* Project name */}
        <div
          className="neu-raised-sm"
          style={{ borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "var(--app-fg)", flexShrink: 0 }}
        >
          {projectName}
        </div>

        {/* Upload button */}
        <label
          className="neu-raised-sm"
          style={{
            borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5, color: "var(--app-fg)", flexShrink: 0,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <Upload size={12} />
          {uploading ? "Uploading…" : "Upload / Zip"}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </label>

        {/* Git clone */}
        {showClone ? (
          <div style={{ display: "flex", gap: 6, flex: 1, maxWidth: 440 }}>
            <input
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClone()}
              placeholder="https://github.com/owner/repo.git"
              autoFocus
              className="neu-inset-sm"
              style={{
                flex: 1, borderRadius: 8, padding: "6px 10px", fontSize: 11,
                border: "none", background: "transparent", color: "var(--app-fg)", outline: "none",
              }}
            />
            <button
              onClick={handleClone}
              disabled={cloning || !cloneUrl.trim()}
              className="neu-raised-sm"
              style={{ borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", border: "none", background: "transparent", color: "#a78bfa", flexShrink: 0 }}
            >
              {cloning ? "Cloning…" : "Clone"}
            </button>
            <button
              onClick={() => setShowClone(false)}
              className="neu-raised-sm"
              style={{ borderRadius: 8, padding: "6px 8px", cursor: "pointer", border: "none", background: "transparent", color: "var(--app-muted)", flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClone(true)}
            className="neu-raised-sm"
            style={{ borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", border: "none", background: "transparent", color: "var(--app-fg)", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
          >
            <GitBranch size={12} />
            Git Clone
          </button>
        )}

        {/* Refresh tree */}
        <button
          onClick={refreshTree}
          title="Refresh file tree"
          className="neu-raised-sm"
          style={{ borderRadius: 8, padding: "6px 8px", cursor: "pointer", border: "none", background: "transparent", color: "var(--app-muted)", marginLeft: "auto", flexShrink: 0 }}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* ── Three panels ── */}
      <div style={{ display: "flex", gap: 10, flex: 1, minHeight: 0 }}>

        {/* LEFT: File tree */}
        <div style={{ ...panelStyle, width: 200, flexShrink: 0 }}>
          <div style={{ padding: "8px 10px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--app-muted)", flexShrink: 0 }}>
            Files
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <FileTree nodes={fileTree} onOpen={openFile} activePath={activeFile?.path ?? null} />
          </div>
        </div>

        {/* CENTER: Monaco editor */}
        <div style={{ ...panelStyle, flex: 1, minWidth: 0 }}>
          {activeFile ? (
            <>
              {/* tab bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: "1px solid rgba(128,128,128,0.12)", flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--app-fg)", fontFamily: "var(--app-font-mono,'SF Mono',monospace)" }}>
                  {activeFile.path}
                </span>
                {activeFile.isDirty && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} title="Unsaved changes" />
                )}
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                  key={activeFile.path}
                  value={activeFile.content}
                  language={getLang(activeFile.path)}
                  theme={theme === "dark" ? "atreyu-dark" : "atreyu-light"}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    fontSize: 12,
                    lineHeight: 20,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 12 },
                    smoothScrolling: true,
                    cursorBlinking: "phase",
                    fontFamily: "var(--app-font-mono,'SF Mono',Menlo,monospace)",
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, opacity: 0.35 }}>
              <FileText size={32} />
              <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Select a file to open</span>
            </div>
          )}
        </div>

        {/* RIGHT: Claude chat */}
        <div style={{ ...panelStyle, width: 340, flexShrink: 0 }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 6px", borderBottom: "1px solid rgba(128,128,128,0.12)", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.06em" }}>ATREYU CODE STUDIO</span>
            <button
              onClick={newSession}
              title="New session"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--app-muted)", display: "flex", alignItems: "center" }}
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", opacity: 0.35, marginTop: 40 }}>
                <p style={{ fontSize: 12, color: "var(--app-muted)" }}>Ask Claude to read, write, or explain your code.</p>
              </div>
            )}
            {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
            <div ref={chatBottom} />
          </div>

          {/* input */}
          <div style={{ padding: 10, borderTop: "1px solid rgba(128,128,128,0.12)", display: "flex", gap: 6, flexShrink: 0 }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask Claude…"
              rows={2}
              disabled={streaming || !projectId}
              className="neu-inset-sm"
              style={{
                flex: 1, borderRadius: 8, padding: "7px 10px", fontSize: 11,
                resize: "none", border: "none", background: "transparent",
                color: "var(--app-fg)", outline: "none", lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !chatInput.trim() || !projectId}
              style={{
                borderRadius: 8, padding: "0 10px", border: "none", cursor: "pointer",
                background: streaming ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#5b21b6)",
                color: "#fff", flexShrink: 0, alignSelf: "stretch",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: (!chatInput.trim() || !projectId) ? 0.4 : 1,
                boxShadow: "var(--neu-raised-sm)",
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
