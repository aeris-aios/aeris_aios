import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agentReposTable, agentJobsTable } from "@workspace/db";
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
async function ingestGitHubRepo(owner: string, repo: string): Promise<{ description: string; context: string }> {
  const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json", "User-Agent": "ATREYU-Agent" };

  /* Fetch repo metadata */
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const meta    = metaRes.ok ? await metaRes.json() : {};
  const description: string = meta.description ?? "";

  /* Fetch top-level tree */
  const treeRes  = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
  const treeData = treeRes.ok ? await treeRes.json() : { tree: [] };
  const tree: Array<{ path: string; type: string; size?: number }> = treeData.tree ?? [];

  /* Priority files to read */
  const PRIORITY = ["README.md", "README.txt", "readme.md", "AGENTS.md", "SKILLS.md", "docs/", "src/", ".cursorrules", "CLAUDE.md", "system_prompt.md", "prompts/", "agent/"];
  const candidates = tree
    .filter(f => f.type === "blob" && (f.size ?? 0) < 80_000)
    .sort((a, b) => {
      const aScore = PRIORITY.findIndex(p => a.path.includes(p)) >= 0 ? 0 : 1;
      const bScore = PRIORITY.findIndex(p => b.path.includes(p)) >= 0 ? 0 : 1;
      return aScore - bScore;
    })
    .slice(0, 20);

  /* Fetch file contents in parallel */
  const chunks: string[] = [];
  await Promise.all(candidates.map(async (file) => {
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, { headers });
      if (!r.ok) return;
      const data = await r.json();
      if (data.encoding === "base64" && data.content) {
        const text = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
        chunks.push(`### FILE: ${file.path}\n\`\`\`\n${text.slice(0, 4000)}\n\`\`\``);
      }
    } catch {}
  }));

  const context = `# Repository: ${owner}/${repo}\nDescription: ${description}\n\n${chunks.join("\n\n")}`;
  return { description, context };
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
    `You are an elite AI marketing agent running inside ATREYU, a Marketing OS.`,
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

export default router;
