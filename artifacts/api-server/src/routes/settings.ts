import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/* ── GET /api/settings — returns all settings as a key-value object ── */
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value ?? "";
    }
    res.json(settings);
  } catch {
    /* Table might not exist yet — return empty defaults */
    res.json({});
  }
});

/* ── PUT /api/settings — upsert one or more settings ── */
router.put("/settings", async (req, res) => {
  const updates = req.body as Record<string, string>;

  if (!updates || typeof updates !== "object") {
    res.status(400).json({ error: "Request body must be a key-value object" });
    return;
  }

  try {
    for (const [key, value] of Object.entries(updates)) {
      const [existing] = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, key));

      if (existing) {
        await db
          .update(settingsTable)
          .set({ value: String(value), updatedAt: new Date() })
          .where(eq(settingsTable.key, key));
      } else {
        await db.insert(settingsTable).values({ key, value: String(value) });
      }
    }

    /* Return updated settings */
    const rows = await db.select().from(settingsTable);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value ?? "";
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to save settings" });
  }
});

export default router;
