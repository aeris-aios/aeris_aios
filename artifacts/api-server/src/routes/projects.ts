import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, campaignsTable, researchJobsTable, contentAssetsTable, knowledgeItemsTable, automationsTable, automationRunsTable } from "@workspace/db";
import { eq, isNull, desc, sql, gte, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/projects", async (_req, res) => {
  const projects = await db.select().from(projectsTable).where(isNull(projectsTable.deletedAt)).orderBy(projectsTable.createdAt);
  res.json(projects);
});

router.post("/projects", async (req, res) => {
  const { title, description, industry, useCase } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [project] = await db.insert(projectsTable).values({ title, description, industry, useCase }).returning();
  res.status(201).json(project);
});

router.get("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.delete("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(projectsTable).set({ deletedAt: new Date() }).where(eq(projectsTable.id, id));
  res.status(204).end();
});

router.get("/dashboard/stats", async (_req, res) => {
  const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projectsTable).where(isNull(projectsTable.deletedAt));
  const [campaignCount] = await db.select({ count: sql<number>`count(*)` }).from(campaignsTable).where(isNull(campaignsTable.deletedAt));
  const [researchCount] = await db.select({ count: sql<number>`count(*)` }).from(researchJobsTable).where(isNull(researchJobsTable.deletedAt));
  const [contentCount] = await db.select({ count: sql<number>`count(*)` }).from(contentAssetsTable).where(isNull(contentAssetsTable.deletedAt));
  const [knowledgeCount] = await db.select({ count: sql<number>`count(*)` }).from(knowledgeItemsTable).where(isNull(knowledgeItemsTable.deletedAt));
  const [automationCount] = await db.select({ count: sql<number>`count(*)` }).from(automationsTable).where(isNull(automationsTable.deletedAt));
  const [activeAutomationCount] = await db.select({ count: sql<number>`count(*)` }).from(automationsTable).where(eq(automationsTable.enabled, true));

  const recentProjects = await db.select({ title: projectsTable.title, createdAt: projectsTable.createdAt }).from(projectsTable).where(isNull(projectsTable.deletedAt)).orderBy(desc(projectsTable.createdAt)).limit(3);
  const recentCampaigns = await db.select({ title: campaignsTable.title, createdAt: campaignsTable.createdAt }).from(campaignsTable).where(isNull(campaignsTable.deletedAt)).orderBy(desc(campaignsTable.createdAt)).limit(3);
  const recentContent = await db.select({ title: contentAssetsTable.title, createdAt: contentAssetsTable.createdAt }).from(contentAssetsTable).where(isNull(contentAssetsTable.deletedAt)).orderBy(desc(contentAssetsTable.createdAt)).limit(3);

  /* Include research jobs and automation runs in activity feed */
  const recentResearch = await db.select({ title: researchJobsTable.title, createdAt: researchJobsTable.createdAt }).from(researchJobsTable).where(isNull(researchJobsTable.deletedAt)).orderBy(desc(researchJobsTable.createdAt)).limit(3);
  const recentRuns = await db.select({ automationId: automationRunsTable.automationId, status: automationRunsTable.status, createdAt: automationRunsTable.createdAt }).from(automationRunsTable).orderBy(desc(automationRunsTable.createdAt)).limit(3);

  const recentActivity = [
    ...recentProjects.map((r) => ({ type: "project", title: r.title, createdAt: r.createdAt.toISOString() })),
    ...recentCampaigns.map((r) => ({ type: "campaign", title: r.title, createdAt: r.createdAt.toISOString() })),
    ...recentContent.map((r) => ({ type: "content", title: r.title, createdAt: r.createdAt.toISOString() })),
    ...recentResearch.map((r) => ({ type: "research", title: r.title, createdAt: r.createdAt.toISOString() })),
    ...recentRuns.map((r) => ({ type: "automation_run", title: `Automation #${r.automationId} — ${r.status}`, createdAt: r.createdAt.toISOString() })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);

  /* Weekly activity chart — count items created per day for last 7 days */
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const weeklyContent = await db.select({ count: sql<number>`count(*)`, day: sql<string>`to_char(created_at, 'Dy')` }).from(contentAssetsTable).where(and(isNull(contentAssetsTable.deletedAt), gte(contentAssetsTable.createdAt, sevenDaysAgo))).groupBy(sql`to_char(created_at, 'Dy'), date_trunc('day', created_at)`).orderBy(sql`date_trunc('day', created_at)`);
  const weeklyResearch = await db.select({ count: sql<number>`count(*)`, day: sql<string>`to_char(created_at, 'Dy')` }).from(researchJobsTable).where(and(isNull(researchJobsTable.deletedAt), gte(researchJobsTable.createdAt, sevenDaysAgo))).groupBy(sql`to_char(created_at, 'Dy'), date_trunc('day', created_at)`).orderBy(sql`date_trunc('day', created_at)`);
  const weeklyRuns = await db.select({ count: sql<number>`count(*)`, day: sql<string>`to_char(created_at, 'Dy')` }).from(automationRunsTable).where(gte(automationRunsTable.createdAt, sevenDaysAgo)).groupBy(sql`to_char(created_at, 'Dy'), date_trunc('day', created_at)`).orderBy(sql`date_trunc('day', created_at)`);

  /* Merge into a single chart dataset */
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const chartData = dayNames.map(day => {
    const content = weeklyContent.find(r => r.day === day);
    const research = weeklyResearch.find(r => r.day === day);
    const runs = weeklyRuns.find(r => r.day === day);
    return {
      name: day,
      content: Number(content?.count ?? 0),
      research: Number(research?.count ?? 0),
      automations: Number(runs?.count ?? 0),
      total: Number(content?.count ?? 0) + Number(research?.count ?? 0) + Number(runs?.count ?? 0),
    };
  });

  res.json({
    totalProjects: Number(projectCount?.count ?? 0),
    totalCampaigns: Number(campaignCount?.count ?? 0),
    totalResearchJobs: Number(researchCount?.count ?? 0),
    totalContentAssets: Number(contentCount?.count ?? 0),
    totalKnowledgeItems: Number(knowledgeCount?.count ?? 0),
    totalAutomations: Number(automationCount?.count ?? 0),
    activeAutomations: Number(activeAutomationCount?.count ?? 0),
    recentActivity,
    chartData,
  });
});

export default router;
