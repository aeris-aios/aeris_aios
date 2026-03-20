import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { execFileSync } from "child_process";
import simpleGit from "simple-git";
import AdmZip from "adm-zip";
import { runCodeStudioAgent, clearSession } from "../lib/codestudioAgent";

const router = Router();

/* ─── Project root dir ─────────────────────────────────────── */
const PROJECTS_ROOT = path.resolve(process.cwd(), "codestudio-projects");

async function ensureProjectsDir() {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
}

/* ─── UUID v4 regex ─────────────────────────────────────────── */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveProjectDir(id: string): string {
  if (!UUID_RE.test(id)) throw new Error(`Invalid project ID: ${id}`);
  const dir = path.resolve(PROJECTS_ROOT, id);
  if (!dir.startsWith(PROJECTS_ROOT + path.sep)) {
    throw new Error(`Project directory escape blocked: ${id}`);
  }
  return dir;
}

/* ─── Path-traversal guard ─────────────────────────────────── */
function guardPath(projectDir: string, relativePath: string): string {
  const root     = path.resolve(projectDir);
  const resolved = path.resolve(root, relativePath);
  const rel      = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return resolved;
}

/* ─── BYOK Auth session store ──────────────────────────────────
   Map from sessionToken (UUID) → { apiKey, keyHint }
   Stored in memory only — the raw key never persists to disk.   */
interface AuthSession {
  apiKey:  string;
  keyHint: string;   /* e.g. "sk-ant-...abc123" */
}
const authSessions = new Map<string, AuthSession>();

/* ────────────────────────────────────────────────────────────
   POST /api/codestudio/auth/connect
   Body: { apiKey: string }
   Validates the key with a live Anthropic call, then stores it.
   Returns: { sessionToken, keyHint }
──────────────────────────────────────────────────────────── */
router.post("/auth/connect", async (req, res) => {
  const { apiKey } = req.body as { apiKey?: string };

  if (!apiKey || typeof apiKey !== "string") {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }
  if (!apiKey.startsWith("sk-ant-")) {
    res.status(400).json({ error: "Invalid key — Anthropic keys start with sk-ant-" });
    return;
  }

  /* Validate the key by making a minimal test call */
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401) {
      res.status(401).json({ error: "Invalid API key — Anthropic rejected it. Please double-check and try again." });
    } else {
      res.status(500).json({ error: `Could not validate key: ${e.message ?? "unknown error"}` });
    }
    return;
  }

  const sessionToken = randomUUID();
  const keyHint      = `${apiKey.slice(0, 10)}...${apiKey.slice(-6)}`;
  authSessions.set(sessionToken, { apiKey, keyHint });

  res.json({ sessionToken, keyHint });
});

/* ────────────────────────────────────────────────────────────
   GET /api/codestudio/auth/status?token=<sessionToken>
──────────────────────────────────────────────────────────── */
router.get("/auth/status", (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.json({ connected: false });
    return;
  }
  const session = authSessions.get(token);
  if (!session) {
    res.json({ connected: false });
    return;
  }
  res.json({ connected: true, keyHint: session.keyHint });
});

/* ────────────────────────────────────────────────────────────
   POST /api/codestudio/auth/disconnect
   Body: { sessionToken: string }
──────────────────────────────────────────────────────────── */
router.post("/auth/disconnect", (req, res) => {
  const { sessionToken } = req.body as { sessionToken?: string };
  if (sessionToken) authSessions.delete(sessionToken);
  res.json({ ok: true });
});

/* ─── Require auth middleware ──────────────────────────────── */
function requireApiKey(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const token = (req.body?.sessionToken as string | undefined)
    ?? (req.query.sessionToken as string | undefined);

  if (!token) {
    res.status(401).json({ error: "sessionToken required — connect your Anthropic API key first" });
    return;
  }
  const session = authSessions.get(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session — please reconnect your API key" });
    return;
  }
  /* Attach apiKey to locals for downstream handlers */
  res.locals.apiKey = session.apiKey;
  next();
}

/* ─── File tree helper ─────────────────────────────────────── */
const SKIP = new Set(["node_modules", ".git", ".DS_Store", "dist", ".next", "__pycache__", ".cache"]);

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

async function buildTree(dir: string, rel = ""): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      nodes.push({
        name: e.name,
        path: relPath,
        type: "dir",
        children: await buildTree(path.join(dir, e.name), relPath),
      });
    } else {
      nodes.push({ name: e.name, path: relPath, type: "file" });
    }
  }
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/* ─── Multer ────────────────────────────────────────────────── */
const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      const tmpDir = path.join(PROJECTS_ROOT, ".tmp-uploads");
      await fs.mkdir(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

/* ────────────────────────────────────────────────────────────
   POST /api/codestudio/projects
──────────────────────────────────────────────────────────── */
router.post("/projects", requireApiKey, async (_req, res) => {
  await ensureProjectsDir();
  const projectId  = randomUUID();
  const projectDir = path.resolve(PROJECTS_ROOT, projectId);
  await fs.mkdir(projectDir, { recursive: true });
  res.json({ projectId });
});

/* ────────────────────────────────────────────────────────────
   POST /api/codestudio/projects/:id/upload
──────────────────────────────────────────────────────────── */
router.post("/projects/:id/upload", requireApiKey, upload.array("files"), async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
    await fs.access(projectDir);
  } catch (err: unknown) {
    res.status(404).json({ error: (err as Error).message });
    return;
  }

  const uploaded = req.files as Express.Multer.File[];
  if (!uploaded || uploaded.length === 0) {
    res.status(400).json({ error: "No files provided" });
    return;
  }

  const results: string[] = [];

  for (const file of uploaded) {
    const isZip = file.originalname.toLowerCase().endsWith(".zip") || file.mimetype === "application/zip";

    if (isZip) {
      const zip = new AdmZip(file.path);
      const entries = zip.getEntries();

      const MAX_ENTRIES = 1000;
      const MAX_TOTAL   = 500 * 1024 * 1024;
      const MAX_ENTRY   =  50 * 1024 * 1024;

      if (entries.length > MAX_ENTRIES) {
        await fs.unlink(file.path);
        res.status(400).json({ error: `Zip has ${entries.length} entries; limit is ${MAX_ENTRIES}` });
        return;
      }

      let totalBytes = 0;
      for (const entry of entries) {
        if (entry.isDirectory) continue;
        const entrySize = entry.header.size;
        if (entrySize > MAX_ENTRY) { results.push(`SKIPPED (too large): ${entry.entryName}`); continue; }
        totalBytes += entrySize;
        if (totalBytes > MAX_TOTAL) { results.push("STOPPED: total size limit reached"); break; }
        try {
          const destPath = guardPath(projectDir, entry.entryName);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          zip.extractEntryTo(entry, path.dirname(destPath), false, true);
          results.push(`extracted: ${entry.entryName}`);
        } catch (e: unknown) {
          results.push(`BLOCKED: ${(e as Error).message}`);
        }
      }
      await fs.unlink(file.path);
    } else {
      const relativePath = (req.body as Record<string, string>)[`path_${file.fieldname}`] || file.originalname;
      try {
        const destPath = guardPath(projectDir, relativePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.rename(file.path, destPath);
        results.push(`uploaded: ${relativePath}`);
      } catch (e: unknown) {
        await fs.unlink(file.path).catch(() => {});
        results.push(`BLOCKED: ${(e as Error).message}`);
      }
    }
  }

  const tree = await buildTree(projectDir);
  res.json({ results, tree });
});

/* ────────────────────────────────────────────────────────────
   POST /api/codestudio/projects/:id/git-clone
──────────────────────────────────────────────────────────── */
router.post("/projects/:id/git-clone", requireApiKey, async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
    await fs.access(projectDir);
  } catch (err: unknown) {
    res.status(404).json({ error: (err as Error).message });
    return;
  }

  const { repoUrl } = req.body as { repoUrl: string };
  if (!repoUrl || typeof repoUrl !== "string") {
    res.status(400).json({ error: "repoUrl is required" });
    return;
  }
  if (!/^https:\/\//i.test(repoUrl)) {
    res.status(400).json({ error: "Only https:// Git URLs are allowed" });
    return;
  }

  try {
    const git = simpleGit();
    await git.clone(repoUrl, projectDir, ["--depth", "50"]);
    const tree = await buildTree(projectDir);
    res.json({ message: "Cloned successfully", tree });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ────────────────────────────────────────────────────────────
   GET /api/codestudio/projects/:id/files
──────────────────────────────────────────────────────────── */
router.get("/projects/:id/files", requireApiKey, async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
    await fs.access(projectDir);
  } catch {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const tree = await buildTree(projectDir);
  res.json(tree);
});

/* ────────────────────────────────────────────────────────────
   GET /api/codestudio/projects/:id/file?path=...&sessionToken=...
──────────────────────────────────────────────────────────── */
router.get("/projects/:id/file", requireApiKey, async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "path query param required" });
    return;
  }

  try {
    const resolved = guardPath(projectDir, filePath);
    const content  = await fs.readFile(resolved, "utf-8");
    res.type("text/plain").send(content);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") res.status(404).json({ error: "File not found" });
    else res.status(400).json({ error: (e as Error).message });
  }
});

/* ────────────────────────────────────────────────────────────
   PUT /api/codestudio/projects/:id/file
──────────────────────────────────────────────────────────── */
router.put("/projects/:id/file", requireApiKey, async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const { path: filePath, content } = req.body as { path: string; content: string };
  if (!filePath || content === undefined) {
    res.status(400).json({ error: "path and content are required" });
    return;
  }

  try {
    const resolved = guardPath(projectDir, filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");
    res.json({ ok: true });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/* ────────────────────────────────────────────────────────────
   DELETE /api/codestudio/projects/:id/file?path=...&sessionToken=...
──────────────────────────────────────────────────────────── */
router.delete("/projects/:id/file", requireApiKey, async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "path query param required" });
    return;
  }

  try {
    const resolved = guardPath(projectDir, filePath);
    const stat = await fs.stat(resolved);
    if (stat.isDirectory()) {
      await fs.rm(resolved, { recursive: true, force: true });
    } else {
      await fs.unlink(resolved);
    }
    const tree = await buildTree(projectDir);
    res.json({ ok: true, tree });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") res.status(404).json({ error: "File not found" });
    else res.status(400).json({ error: (e as Error).message });
  }
});

/* ────────────────────────────────────────────────────────────
   POST /api/codestudio/projects/:id/chat
──────────────────────────────────────────────────────────── */
router.post("/projects/:id/chat", requireApiKey, async (req, res) => {
  let projectDir: string;
  try {
    projectDir = resolveProjectDir(req.params.id);
    await fs.access(projectDir);
  } catch {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { message, sessionId } = req.body as { message: string; sessionId: string };
  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: object) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    await runCodeStudioAgent({
      apiKey:     res.locals.apiKey as string,
      sessionId:  sessionId || `anon-${req.params.id}`,
      projectId:  req.params.id,
      projectDir,
      message,
      onEvent: send,
    });
  } catch (err: unknown) {
    send({ type: "error", message: (err as Error).message });
  }

  res.end();
});

/* ────────────────────────────────────────────────────────────
   DELETE /api/codestudio/sessions/:sessionId
──────────────────────────────────────────────────────────── */
router.delete("/sessions/:sessionId", (req, res) => {
  clearSession(req.params.sessionId);
  res.json({ ok: true });
});

export default router;
