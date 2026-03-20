import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { automationsTable, automationRunsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/automations", async (_req, res) => {
  const automations = await db.select().from(automationsTable).where(isNull(automationsTable.deletedAt)).orderBy(automationsTable.createdAt);
  res.json(automations);
});

router.post("/automations", async (req, res) => {
  const { title, description, trigger, action } = req.body;
  if (!title || !trigger || !action) {
    res.status(400).json({ error: "title, trigger, and action are required" });
    return;
  }
  const [automation] = await db.insert(automationsTable).values({ title, description, trigger, action, enabled: true }).returning();
  res.status(201).json(automation);
});

router.get("/automations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, id));
  if (!automation) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  res.json(automation);
});

router.put("/automations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, trigger, action, enabled } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (trigger !== undefined) updates.trigger = trigger;
  if (action !== undefined) updates.action = action;
  if (enabled !== undefined) updates.enabled = enabled;

  const [automation] = await db.update(automationsTable).set(updates).where(eq(automationsTable.id, id)).returning();
  if (!automation) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  res.json(automation);
});

router.delete("/automations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(automationsTable).set({ deletedAt: new Date() }).where(eq(automationsTable.id, id));
  res.status(204).end();
});

router.post("/automations/:id/toggle", async (req, res) => {
  const id = parseInt(req.params.id);
  const [current] = await db.select().from(automationsTable).where(eq(automationsTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  const [automation] = await db.update(automationsTable).set({ enabled: !current.enabled, updatedAt: new Date() }).where(eq(automationsTable.id, id)).returning();
  res.json(automation);
});

router.post("/automations/:id/run", async (req, res) => {
  const id = parseInt(req.params.id);
  const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, id));
  if (!automation) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }

  const [run] = await db.insert(automationRunsTable).values({
    automationId: id,
    status: "completed",
    output: `Automation "${automation.title}" executed successfully. Trigger: ${automation.trigger}. Action: ${automation.action}.`,
  }).returning();

  await db.update(automationsTable).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(automationsTable.id, id));

  res.json(run);
});

export default router;
