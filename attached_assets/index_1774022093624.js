const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");
const { runAgent } = require("./claude-agent");

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECTS_DIR = path.join(process.cwd(), "user-projects");

// Ensure projects directory exists
fs.mkdir(PROJECTS_DIR, { recursive: true }).catch(() => {});

// --- Middleware ---
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "atreyu-aios-secret-" + uuidv4(),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);
app.use(express.static(path.join(__dirname, "../public")));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(PROJECTS_DIR, req.session.userId || "tmp", "uploads");
    fs.mkdir(dest, { recursive: true }).then(() => cb(null, dest));
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// --- Auth Middleware ---
function requireAuth(req, res, next) {
  if (!req.session.apiKey) {
    return res.status(401).json({ error: "Not authenticated. Please connect your Anthropic API key." });
  }
  next();
}

// ======================
// AUTH ROUTES
// ======================

// Connect with Anthropic API key
app.post("/api/auth/connect", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return res.status(400).json({ error: "Invalid API key. Anthropic keys start with sk-ant-" });
  }

  // Validate the key by making a test request
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    });

    req.session.apiKey = apiKey;
    req.session.userId = "user-" + uuidv4();
    req.session.chatSessions = {};

    // Create user project directory
    const userDir = path.join(PROJECTS_DIR, req.session.userId);
    await fs.mkdir(userDir, { recursive: true });

    res.json({ success: true, userId: req.session.userId });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Please check and try again." });
    }
    return res.status(500).json({ error: "Failed to validate key: " + err.message });
  }
});

// Check auth status
app.get("/api/auth/status", (req, res) => {
  res.json({
    authenticated: !!req.session.apiKey,
    userId: req.session.userId || null,
    // Show masked key so user knows which key is connected
    keyHint: req.session.apiKey
      ? "sk-ant-..." + req.session.apiKey.slice(-6)
      : null,
  });
});

// Disconnect / logout
app.post("/api/auth/disconnect", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ======================
// PROJECT ROUTES
// ======================

// List user's projects
app.get("/api/projects", requireAuth, async (req, res) => {
  const userDir = path.join(PROJECTS_DIR, req.session.userId);
  try {
    await fs.mkdir(userDir, { recursive: true });
    const entries = await fs.readdir(userDir, { withFileTypes: true });
    const projects = entries
      .filter((e) => e.isDirectory() && e.name !== "uploads")
      .map((e) => ({ id: e.name, name: e.name }));
    res.json(projects);
  } catch {
    res.json([]);
  }
});

// Create new project
app.post("/api/projects", requireAuth, async (req, res) => {
  const { name } = req.body;
  const projectId = (name || "project").replace(/[^a-zA-Z0-9_-]/g, "-") + "-" + Date.now();
  const projectDir = path.join(PROJECTS_DIR, req.session.userId, projectId);
  await fs.mkdir(projectDir, { recursive: true });
  res.json({ id: projectId, name: projectId });
});

// Upload files to a project
app.post("/api/projects/:projectId/upload", requireAuth, upload.array("files", 100), async (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.session.userId, req.params.projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const files = req.files || [];
  for (const file of files) {
    // Preserve relative paths sent from the frontend
    const relativePath = req.body[`path_${file.originalname}`] || file.originalname;
    const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
    const dest = path.join(projectDir, safePath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(file.path, dest);
  }

  res.json({ uploaded: files.length });
});

// Clone a git repo into a project
app.post("/api/projects/clone", requireAuth, async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "repoUrl required" });

  // Basic URL validation
  if (!/^https?:\/\/.+/.test(repoUrl) && !repoUrl.match(/^git@/)) {
    return res.status(400).json({ error: "Invalid repository URL" });
  }

  const repoName = path.basename(repoUrl, ".git") + "-" + Date.now();
  const projectDir = path.join(PROJECTS_DIR, req.session.userId, repoName);

  try {
    const { execSync } = require("child_process");
    execSync(`git clone --depth 50 "${repoUrl}" "${projectDir}"`, {
      timeout: 120000,
      stdio: "pipe",
    });
    res.json({ id: repoName, name: repoName });
  } catch (err) {
    res.status(500).json({ error: "Clone failed: " + err.stderr?.toString().slice(0, 200) });
  }
});

// Delete a project
app.delete("/api/projects/:projectId", requireAuth, async (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.session.userId, req.params.projectId);
  const resolved = path.resolve(projectDir);
  const allowed = path.resolve(path.join(PROJECTS_DIR, req.session.userId));
  if (!resolved.startsWith(allowed)) return res.status(403).json({ error: "Forbidden" });

  await fs.rm(projectDir, { recursive: true, force: true });
  res.json({ success: true });
});

// ======================
// FILE ROUTES
// ======================

// Get file tree
app.get("/api/files/:projectId", requireAuth, async (req, res) => {
  const projectDir = path.join(PROJECTS_DIR, req.session.userId, req.params.projectId);

  async function buildTree(dir, prefix = "") {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const result = [];
    const skip = new Set([".git", "node_modules", "__pycache__", ".next", "dist", ".venv"]);
    for (const e of entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })) {
      if (skip.has(e.name) || e.name.startsWith(".")) continue;
      const rel = path.join(prefix, e.name);
      if (e.isDirectory()) {
        result.push({
          name: e.name,
          path: rel,
          type: "dir",
          children: await buildTree(path.join(dir, e.name), rel),
        });
      } else {
        result.push({ name: e.name, path: rel, type: "file" });
      }
    }
    return result;
  }

  res.json(await buildTree(projectDir));
});

// Read a file
app.get("/api/files/:projectId/*", requireAuth, async (req, res) => {
  const filePath = path.join(PROJECTS_DIR, req.session.userId, req.params.projectId, req.params[0]);
  const resolved = path.resolve(filePath);
  const allowed = path.resolve(path.join(PROJECTS_DIR, req.session.userId));
  if (!resolved.startsWith(allowed)) return res.status(403).json({ error: "Forbidden" });

  try {
    const content = await fs.readFile(filePath, "utf-8");
    res.type("text/plain").send(content);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

// Save a file from the editor
app.put("/api/files/:projectId/*", requireAuth, async (req, res) => {
  const filePath = path.join(PROJECTS_DIR, req.session.userId, req.params.projectId, req.params[0]);
  const resolved = path.resolve(filePath);
  const allowed = path.resolve(path.join(PROJECTS_DIR, req.session.userId));
  if (!resolved.startsWith(allowed)) return res.status(403).json({ error: "Forbidden" });

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, req.body.content);
  res.json({ success: true });
});

// ======================
// CHAT / CLAUDE AGENT
// ======================

app.post("/api/chat", requireAuth, async (req, res) => {
  const { projectId, message, sessionId } = req.body;
  if (!projectId || !message) return res.status(400).json({ error: "projectId and message required" });

  const projectDir = path.join(PROJECTS_DIR, req.session.userId, projectId);
  const chatId = sessionId || "default";

  if (!req.session.chatSessions) req.session.chatSessions = {};
  const history = req.session.chatSessions[chatId] || [];

  // SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const updatedHistory = await runAgent(
      req.session.apiKey,
      message,
      projectDir,
      history,
      (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    );

    // Store conversation (limit to last 40 messages to avoid session bloat)
    req.session.chatSessions[chatId] = updatedHistory.slice(-40);
    req.session.save();

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`);
  }

  res.end();
});

// Clear chat session
app.delete("/api/chat/:sessionId", requireAuth, (req, res) => {
  if (req.session.chatSessions) {
    delete req.session.chatSessions[req.params.sessionId];
  }
  res.json({ success: true });
});

// ======================
// START
// ======================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ATREYU AIOS running on port ${PORT}`);
});
