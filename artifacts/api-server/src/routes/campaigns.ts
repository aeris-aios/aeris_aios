import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/campaigns", async (_req, res) => {
  const campaigns = await db.select().from(campaignsTable).where(isNull(campaignsTable.deletedAt)).orderBy(campaignsTable.createdAt);
  res.json(campaigns);
});

router.post("/campaigns", async (req, res) => {
  const { title, description, objective, audience } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [campaign] = await db.insert(campaignsTable).values({ title, description, objective, audience, status: "planning" }).returning();
  res.status(201).json(campaign);
});

router.get("/campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(campaign);
});

router.put("/campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, status, objective, audience } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (objective !== undefined) updates.objective = objective;
  if (audience !== undefined) updates.audience = audience;

  const [campaign] = await db.update(campaignsTable).set(updates).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(campaign);
});

router.delete("/campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(campaignsTable).set({ deletedAt: new Date() }).where(eq(campaignsTable.id, id));
  res.status(204).end();
});

export default router;
