import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agentReposTable, agentJobsTable, agentSkillsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import workspaceRouter, { loadWorkspaceFileContexts } from "./workspace";

const router: IRouter = Router();

const MODEL_MAP: Record<string, string> = {
  sonnet: "claude-sonnet-4-6",
  opus:   "claude-opus-4-6",
  haiku:  "claude-haiku-4-5",
};

function resolveModel(alias?: string): string {
  return MODEL_MAP[alias ?? "sonnet"] ?? MODEL_MAP["sonnet"];
}

/* ── Fetch key files from a public GitHub repo ─────────────────── */
async function ingestGitHubRepo(owner: string, repo: string): Promise<{ description: string; context: string; treeSummary: string }> {
  const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json", "User-Agent": "AERIS-Agent" };

  /* Fetch repo metadata */
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const meta    = metaRes.ok ? await metaRes.json() : {};
  const description: string = meta.description ?? "";

  /* Fetch top-level tree */
  const treeRes  = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
  const treeData = treeRes.ok ? await treeRes.json() : { tree: [] };
  const tree: Array<{ path: string; type: string; size?: number }> = treeData.tree ?? [];

  /* Build tree summary */
  const treeSummary = tree
    .filter(f => !f.path.startsWith("node_modules") && !f.path.startsWith(".git") && !f.path.startsWith("dist/") && !f.path.startsWith("build/"))
    .slice(0, 200)
    .map(f => f.path)
    .join("\n");

  /* Priority files to read */
  const CODE_EXTS = new Set([".js",".ts",".jsx",".tsx",".py",".rb",".go",".rs",".java",".c",".cpp",".cs",".php",".swift",".kt",".vue",".svelte",".html",".css",".scss",".sql",".sh",".yaml",".yml",".toml",".json",".md",".mdx"]);
  const PRIORITY = ["readme", "package.json", "pyproject.toml", "cargo.toml", "requirements.txt", "go.mod", "main", "index", "app", "src/", "lib/", "core/"];
  const SKIP = new Set(["node_modules","dist","build",".git","vendor",".venv","venv","target","bin",".cache","coverage","__pycache__"]);

  const candidates = tree
    .filter(f => {
      if (f.type !== "blob") return false;
      if ((f.size ?? 0) > 80_000) return false;
      const parts = f.path.split("/");
      if (parts.some(p => SKIP.has(p))) return false;
      const ext = "." + (f.path.split(".").pop()?.toLowerCase() ?? "");
      return CODE_EXTS.has(ext);
    })
    .sort((a, b) => {
      const score = (p: string) => {
        const lower = p.toLowerCase();
        for (let i = 0; i < PRIORITY.length; i++) {
          if (lower.includes(PRIORITY[i])) return i;
        }
        return PRIORITY.length;
      };
      return score(a.path) - score(b.path);
    })
    .slice(0, 40);

  /* Fetch file contents in parallel */
  const chunks: string[] = [];
  await Promise.all(candidates.map(async (file) => {
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, { headers });
      if (!r.ok) return;
      const data = await r.json();
      if (data.encoding === "base64" && data.content) {
        const text = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
        chunks.push(`### FILE: ${file.path}\n\`\`\`\n${text.slice(0, 5000)}\n\`\`\``);
      }
    } catch {}
  }));

  const context = `# Repository: ${owner}/${repo}\nDescription: ${description}\n\n${chunks.join("\n\n")}`;
  return { description, context, treeSummary };
}

/* Mount workspace sub-routes */
router.use(workspaceRouter);

/* ── REPOS ─────────────────────────────────────────────────────── */

router.get("/repos", async (_req, res) => {
  const repos = await db.select().from(agentReposTable).where(isNull(agentReposTable.deletedAt)).orderBy(agentReposTable.createdAt);
  res.json(repos);
});

router.post("/repos", async (req, res) => {
  const { url } = req.body;
  if (!url) { res.status(400).json({ error: "url is required" }); return; }

  /* Parse GitHub URL → owner/repo */
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) { res.status(400).json({ error: "Invalid GitHub URL" }); return; }
  const [, owner, repoName] = match;
  const repo = repoName.replace(/\.git$/, "");

  try {
    const { description, context } = await ingestGitHubRepo(owner, repo);
    const [row] = await db.insert(agentReposTable).values({ url, owner, repo, description, context }).returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to ingest repository" });
  }
});

router.delete("/repos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(agentReposTable).set({ deletedAt: new Date() }).where(eq(agentReposTable.id, id));
  res.status(204).end();
});

/* ── SKILLS ─────────────────────────────────────────────────────── */

router.get("/skills", async (_req, res) => {
  const skills = await db.select().from(agentSkillsTable).where(isNull(agentSkillsTable.deletedAt)).orderBy(agentSkillsTable.trainedAt);
  res.json(skills.map(s => ({
    ...s,
    keyConcepts: tryParseJson(s.keyConcepts, []),
    useCases:    tryParseJson(s.useCases, []),
  })));
});

router.delete("/skills/:id", async (req, res) => {
  await db.update(agentSkillsTable).set({ deletedAt: new Date() }).where(eq(agentSkillsTable.id, req.params.id));
  res.status(204).end();
});

/* SSE: train skills from a GitHub repo */
router.post("/skills/train", async (req, res) => {
  const { url } = req.body;
  if (!url) { res.status(400).json({ error: "url is required" }); return; }

  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) { res.status(400).json({ error: "Invalid GitHub URL. Use an HTTPS github.com link." }); return; }
  const [, owner, repoRaw] = match;
  const repoName = repoRaw.replace(/\.git$/, "");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (evt: object) => res.write(`data: ${JSON.stringify(evt)}\n\n`);

  try {
    send({ stage: "cloning", message: `Fetching ${owner}/${repoName} from GitHub...` });

    const { description, context, treeSummary } = await ingestGitHubRepo(owner, repoName);

    send({ stage: "analyzing", message: `Analyzing codebase with Claude...` });

    const prompt = `You are AERIS, an AI that learns reusable skills from codebases.

Analyze this repository and extract distinct, reusable SKILLS — specific capabilities, patterns, techniques, or domain knowledge demonstrated in the code.

Examples of good skill names: "JWT Authentication with Refresh Tokens", "React Server Components with Streaming", "PostgreSQL Full-Text Search", "Rate Limiting with Token Bucket Algorithm".

Repository: ${url}
Description: ${description}

Directory Structure:
${treeSummary.slice(0, 3000)}

Source Files:
${context.slice(0, 60000)}

Extract 5-15 distinct skills. For each skill provide:
1. name: A clear, specific skill name (3-8 words)
2. category: One of: Frontend, Backend, Database, DevOps, API, Auth, Testing, AI/ML, Architecture, Tooling, Data Processing, Security
3. summary: One sentence describing the skill (under 120 chars)
4. description: A detailed 3-5 sentence explanation of what this skill does, how it works, and when to use it
5. key_concepts: Array of 3-6 key concepts/technologies involved
6. code_example: A short representative code snippet from the repo that demonstrates this skill (under 30 lines)
7. use_cases: Array of 2-4 practical use cases for this skill
8. complexity: One of "beginner", "intermediate", "advanced"

Respond with ONLY a raw JSON array. No markdown fences, no explanation, just the JSON array.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    send({ stage: "processing", message: "Processing extracted skills..." });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    let rawSkills: any[];
    try {
      const jsonStr = text.replace(/^```json?\s*/m, "").replace(/\s*```$/m, "").trim();
      rawSkills = JSON.parse(jsonStr);
    } catch (err) {
      throw new Error("Failed to parse skill data from Claude. Try a different repository.");
    }

    if (!Array.isArray(rawSkills)) throw new Error("Expected a JSON array of skills.");

    send({ stage: "saving", message: `Saving ${rawSkills.length} skills...` });

    const saved = [];
    for (const s of rawSkills) {
      try {
        const [row] = await db.insert(agentSkillsTable).values({
          name:        String(s.name ?? "Unnamed Skill").slice(0, 200),
          category:    String(s.category ?? "Architecture").slice(0, 100),
          summary:     String(s.summary ?? "").slice(0, 500),
          description: String(s.description ?? ""),
          keyConcepts: JSON.stringify(Array.isArray(s.key_concepts) ? s.key_concepts : []),
          codeExample:  String(s.code_example ?? ""),
          useCases:    JSON.stringify(Array.isArray(s.use_cases) ? s.use_cases : []),
          complexity:  ["beginner","intermediate","advanced"].includes(s.complexity) ? s.complexity : "intermediate",
          sourceRepo:  url,
        }).returning();
        saved.push({
          ...row,
          keyConcepts: tryParseJson(row.keyConcepts, []),
          useCases:    tryParseJson(row.useCases, []),
        });
      } catch {}
    }

    send({ stage: "done", message: `Training complete! Learned ${saved.length} new skills.`, skills: saved });
  } catch (err: any) {
    send({ stage: "error", message: err?.message ?? "Training failed" });
  } finally {
    res.end();
  }
});

/* ── JOBS ──────────────────────────────────────────────────────── */

router.get("/jobs", async (_req, res) => {
  const jobs = await db.select().from(agentJobsTable).orderBy(agentJobsTable.createdAt);
  res.json(jobs);
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(agentJobsTable).where(eq(agentJobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

router.post("/jobs", async (req, res) => {
  const { task, model, outputTarget, repoIds, workspaceFileIds, title } = req.body;
  if (!task) { res.status(400).json({ error: "task is required" }); return; }

  /* Load repo contexts */
  let repoContext = "";
  if (Array.isArray(repoIds) && repoIds.length > 0) {
    const repos = await db.select().from(agentReposTable).where(isNull(agentReposTable.deletedAt));
    const selected = repos.filter(r => repoIds.includes(r.id));
    repoContext = selected.map(r => r.context ?? "").join("\n\n---\n\n");
  }

  /* Load workspace file contexts */
  let workspaceContext = "";
  if (Array.isArray(workspaceFileIds) && workspaceFileIds.length > 0) {
    workspaceContext = await loadWorkspaceFileContexts(workspaceFileIds);
  }

  const systemPrompt = [
    `You are an elite AI marketing agent running inside AERIS, a Marketing OS.`,
    `You execute marketing tasks with precision: creating automations, writing campaigns, generating content, and performing analysis.`,
    `Your output should be detailed, actionable, and structured. Use markdown headers and bullet points.`,
    outputTarget ? `Your output will be saved to: ${outputTarget.toUpperCase()} module.` : "",
    repoContext       ? `\n## Skill Repository Context\n${repoContext}` : "",
    workspaceContext  ? `\n## Project Workspace Files\nThe user has provided the following project files for context:\n\n${workspaceContext}` : "",
  ].filter(Boolean).join("\n");

  /* Insert job record as running */
  const [job] = await db.insert(agentJobsTable).values({
    title:        title ?? task.slice(0, 60),
    task,
    model:        model ?? "sonnet",
    status:       "running",
    outputTarget: outputTarget ?? "dashboard",
    repoIds:      JSON.stringify(repoIds ?? []),
  }).returning();

  /* SSE headers */
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`data: ${JSON.stringify({ jobId: job.id })}\n\n`);

  let fullOutput = "";

  try {
    const stream = anthropic.messages.stream({
      model: resolveModel(model),
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: task }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullOutput += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.update(agentJobsTable).set({ status: "complete", output: fullOutput, updatedAt: new Date() }).where(eq(agentJobsTable.id, job.id));
    res.write(`data: ${JSON.stringify({ done: true, jobId: job.id, model: resolveModel(model) })}\n\n`);
    res.end();
  } catch (err) {
    await db.update(agentJobsTable).set({ status: "failed", updatedAt: new Date() }).where(eq(agentJobsTable.id, job.id));
    res.write(`data: ${JSON.stringify({ error: "Agent execution failed" })}\n\n`);
    res.end();
  }
});

/* ── helpers ─────────────────────────────────────────────────────── */
function tryParseJson(raw: string | null | undefined, fallback: any) {
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export default router;
