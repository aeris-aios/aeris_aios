import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { researchJobsTable, researchResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.get("/research/jobs", async (_req, res) => {
  const jobs = await db.select().from(researchJobsTable).where(eq(researchJobsTable.deletedAt, null as any)).orderBy(researchJobsTable.createdAt);
  res.json(jobs);
});

router.post("/research/jobs", async (req, res) => {
  const { title, sourceType, targets, scrapeTemplate } = req.body;
  if (!title || !sourceType || !targets) {
    res.status(400).json({ error: "title, sourceType, and targets are required" });
    return;
  }

  const [job] = await db.insert(researchJobsTable).values({
    title,
    sourceType,
    targets,
    scrapeTemplate,
    status: "pending",
  }).returning();

  simulateResearchJob(job.id, targets, sourceType).catch(() => {});

  res.status(201).json(job);
});

router.get("/research/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(researchJobsTable).where(eq(researchJobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Research job not found" });
    return;
  }
  res.json(job);
});

router.delete("/research/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(researchJobsTable).set({ deletedAt: new Date() }).where(eq(researchJobsTable.id, id));
  res.status(204).end();
});

router.get("/research/jobs/:id/results", async (req, res) => {
  const id = parseInt(req.params.id);
  const results = await db.select().from(researchResultsTable).where(eq(researchResultsTable.jobId, id));
  res.json(results);
});

router.post("/research/jobs/:id/summarize", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(researchJobsTable).where(eq(researchJobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Research job not found" });
    return;
  }

  const results = await db.select().from(researchResultsTable).where(eq(researchResultsTable.jobId, id));
  const context = results.map((r) => `URL: ${r.url ?? "N/A"}\nTitle: ${r.title ?? "N/A"}\nContent: ${r.content}`).join("\n\n---\n\n");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let summary = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `Analyze this research data and provide a comprehensive marketing intelligence summary:\n\nResearch Job: ${job.title}\nSource Type: ${job.sourceType}\nTargets: ${job.targets}\n\nResults:\n${context || "No results collected yet."}\n\nProvide:\n1. Key findings and insights\n2. Market opportunities identified\n3. Competitive intelligence\n4. Actionable recommendations for marketing strategy`,
      }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        summary += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.update(researchJobsTable).set({ summary, updatedAt: new Date() }).where(eq(researchJobsTable.id, id));
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
  }
});

async function simulateResearchJob(jobId: number, targets: string, sourceType: string) {
  await new Promise((r) => setTimeout(r, 2000));
  await db.update(researchJobsTable).set({ status: "running", updatedAt: new Date() }).where(eq(researchJobsTable.id, jobId));

  await new Promise((r) => setTimeout(r, 3000));

  const targetList = targets.split(",").map((t) => t.trim()).filter(Boolean);
  const results = targetList.map((target, i) => ({
    jobId,
    url: target.startsWith("http") ? target : `https://${target}`,
    title: `Research result ${i + 1} for ${target}`,
    content: `Simulated research data collected from ${target}. This would contain actual scraped content when Apify is configured. Source type: ${sourceType}. The content would include page text, metadata, and structured data extracted from the target URL.`,
  }));

  if (results.length > 0) {
    await db.insert(researchResultsTable).values(results);
  }

  await db.update(researchJobsTable).set({ status: "completed", updatedAt: new Date() }).where(eq(researchJobsTable.id, jobId));
}

export default router;
