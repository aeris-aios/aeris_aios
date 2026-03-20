import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { knowledgeItemsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/knowledge", async (_req, res) => {
  const items = await db.select().from(knowledgeItemsTable).where(isNull(knowledgeItemsTable.deletedAt)).orderBy(knowledgeItemsTable.createdAt);
  res.json(items);
});

router.post("/knowledge", async (req, res) => {
  const { title, type, content, tags, url, includeInContext } = req.body;
  if (!title || !type || !content) {
    res.status(400).json({ error: "title, type, and content are required" });
    return;
  }
  const [item] = await db.insert(knowledgeItemsTable).values({ title, type, content, tags, url, includeInContext: includeInContext ?? false }).returning();
  res.status(201).json(item);
});

router.get("/knowledge/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [item] = await db.select().from(knowledgeItemsTable).where(eq(knowledgeItemsTable.id, id));
  if (!item) {
    res.status(404).json({ error: "Knowledge item not found" });
    return;
  }
  res.json(item);
});

router.delete("/knowledge/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(knowledgeItemsTable).set({ deletedAt: new Date() }).where(eq(knowledgeItemsTable.id, id));
  res.status(204).end();
});

export default router;
