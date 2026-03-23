import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  automationsTable,
  automationRunsTable,
  brandProfilesTable,
  knowledgeItemsTable,
} from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

/* ═══════════════════════════════════════════════════════════
   ACTION EXECUTOR
   Parses the action string and actually executes AI tasks.
═══════════════════════════════════════════════════════════ */
async function executeAction(action: string, automation: { title: string; trigger: string }): Promise<string> {
  const actionLower = action.toLowerCase();

  /* ── Generate content action ── */
  if (
    actionLower.includes("generate") ||
    actionLower.includes("create") ||
    actionLower.includes("write") ||
    actionLower.includes("post")
  ) {
    /* Load brand + knowledge for context */
    const [brand] = await db.select().from(brandProfilesTable).limit(1);
    const knowledgeItems = await db
      .select()
      .from(knowledgeItemsTable)
      .where(
        and(isNull(knowledgeItemsTable.deletedAt), eq(knowledgeItemsTable.includeInContext, true)),
      );

    const brandContext = brand
      ? `Brand: ${brand.name}${brand.tagline ? ` — ${brand.tagline}` : ""}. ${brand.voiceDescription ?? ""}. Audience: ${brand.primaryAudience ?? "general"}.`
      : "";

    const knowledgeContext =
      knowledgeItems.length > 0
        ? `\nBusiness context: ${knowledgeItems.map((k) => `${k.title}: ${k.content.slice(0, 300)}`).join(". ")}`
        : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are AERIS, an autonomous marketing AI. Generate professional marketing content based on the action requested. Write in plain text only — no markdown, no bold, no headers. Write exactly as it would appear on social media.${brandContext ? `\n${brandContext}` : ""}${knowledgeContext}`,
      messages: [
        {
          role: "user",
          content: `Automation "${automation.title}" triggered (${automation.trigger}). Execute this action: ${action}. Generate the content now.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return `Content generated:\n\n${text}`;
  }

  /* ── Research action ── */
  if (actionLower.includes("research") || actionLower.includes("monitor") || actionLower.includes("analyze")) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system:
        "You are AERIS, an autonomous marketing intelligence agent. Provide a brief research summary or competitive analysis based on the action requested. Be specific and actionable.",
      messages: [
        {
          role: "user",
          content: `Automation "${automation.title}" triggered (${automation.trigger}). Execute this research action: ${action}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return `Research completed:\n\n${text}`;
  }

  /* ── Summary / report action ── */
  if (actionLower.includes("summary") || actionLower.includes("report") || actionLower.includes("digest")) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system:
        "You are AERIS, an autonomous marketing AI. Generate a brief marketing performance summary or digest based on the action requested.",
      messages: [
        {
          role: "user",
          content: `Automation "${automation.title}" triggered (${automation.trigger}). Execute this action: ${action}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return `Report generated:\n\n${text}`;
  }

  /* ── Default: execute as a general AI task ── */
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: "You are AERIS, an autonomous marketing AI. Execute the requested action concisely.",
    messages: [
      {
        role: "user",
        content: `Execute: ${action}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return `Action executed:\n\n${text}`;
}

/* ═══════════════════════════════════════════════════════════
   SCHEDULER — checks for due automations every 60 seconds
═══════════════════════════════════════════════════════════ */
function parseTriggerInterval(trigger: string): number | null {
  const lower = trigger.toLowerCase();
  /* Match patterns like "every 1 hour", "every 30 minutes", "daily", "weekly", "every day" */
  if (/every\s*(\d+)\s*min/i.test(lower)) {
    const m = lower.match(/every\s*(\d+)\s*min/i);
    return m ? parseInt(m[1]) * 60_000 : null;
  }
  if (/every\s*(\d+)\s*hour/i.test(lower)) {
    const m = lower.match(/every\s*(\d+)\s*hour/i);
    return m ? parseInt(m[1]) * 3_600_000 : null;
  }
  if (/every\s*(\d+)\s*day/i.test(lower) || /daily/i.test(lower) || /every\s*day/i.test(lower)) {
    const m = lower.match(/every\s*(\d+)\s*day/i);
    return m ? parseInt(m[1]) * 86_400_000 : 86_400_000;
  }
  if (/weekly|every\s*week/i.test(lower)) return 7 * 86_400_000;
  if (/every\s*(\d+)\s*sec/i.test(lower)) {
    const m = lower.match(/every\s*(\d+)\s*sec/i);
    return m ? parseInt(m[1]) * 1_000 : null;
  }
  return null;
}

let schedulerRunning = false;

async function runScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;

  try {
    const automations = await db
      .select()
      .from(automationsTable)
      .where(and(isNull(automationsTable.deletedAt), eq(automationsTable.enabled, true)));

    const now = Date.now();

    for (const auto of automations) {
      const interval = parseTriggerInterval(auto.trigger);
      if (!interval) continue; /* not a time-based trigger */

      const lastRun = auto.lastRunAt ? new Date(auto.lastRunAt).getTime() : 0;
      if (now - lastRun < interval) continue; /* not due yet */

      console.log(`[scheduler] Running automation: "${auto.title}" (id=${auto.id})`);

      try {
        const output = await executeAction(auto.action, auto);

        await db.insert(automationRunsTable).values({
          automationId: auto.id,
          status: "completed",
          output,
        });

        await db
          .update(automationsTable)
          .set({ lastRunAt: new Date(), updatedAt: new Date() })
          .where(eq(automationsTable.id, auto.id));

        console.log(`[scheduler] Completed: "${auto.title}"`);
      } catch (err: any) {
        console.error(`[scheduler] Failed: "${auto.title}"`, err?.message);

        await db.insert(automationRunsTable).values({
          automationId: auto.id,
          status: "failed",
          output: err?.message ?? "Execution failed",
        });

        await db
          .update(automationsTable)
          .set({ lastRunAt: new Date(), updatedAt: new Date() })
          .where(eq(automationsTable.id, auto.id));
      }
    }
  } catch (err: any) {
    console.error("[scheduler] Error:", err?.message);
  } finally {
    schedulerRunning = false;
  }
}

/* Start the scheduler — check every 60 seconds */
const SCHEDULER_INTERVAL = 60_000;
setInterval(runScheduler, SCHEDULER_INTERVAL);
/* Run once on startup after a short delay */
setTimeout(runScheduler, 5_000);

/* ═══════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════ */

router.get("/automations", async (_req, res) => {
  const automations = await db
    .select()
    .from(automationsTable)
    .where(isNull(automationsTable.deletedAt))
    .orderBy(automationsTable.createdAt);
  res.json(automations);
});

router.post("/automations", async (req, res) => {
  const { title, description, trigger, action } = req.body;
  if (!title || !trigger || !action) {
    res.status(400).json({ error: "title, trigger, and action are required" });
    return;
  }
  const [automation] = await db
    .insert(automationsTable)
    .values({ title, description, trigger, action, enabled: true })
    .returning();
  res.status(201).json(automation);
});

router.get("/automations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [automation] = await db
    .select()
    .from(automationsTable)
    .where(eq(automationsTable.id, id));
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

  const [automation] = await db
    .update(automationsTable)
    .set(updates)
    .where(eq(automationsTable.id, id))
    .returning();
  if (!automation) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  res.json(automation);
});

router.delete("/automations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .update(automationsTable)
    .set({ deletedAt: new Date() })
    .where(eq(automationsTable.id, id));
  res.status(204).end();
});

router.post("/automations/:id/toggle", async (req, res) => {
  const id = parseInt(req.params.id);
  const [current] = await db
    .select()
    .from(automationsTable)
    .where(eq(automationsTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  const [automation] = await db
    .update(automationsTable)
    .set({ enabled: !current.enabled, updatedAt: new Date() })
    .where(eq(automationsTable.id, id))
    .returning();
  res.json(automation);
});

/* ── Real execution — runs the action through AI ── */
router.post("/automations/:id/run", async (req, res) => {
  const id = parseInt(req.params.id);
  const [automation] = await db
    .select()
    .from(automationsTable)
    .where(eq(automationsTable.id, id));
  if (!automation) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }

  /* Create a "running" record first */
  const [run] = await db
    .insert(automationRunsTable)
    .values({
      automationId: id,
      status: "running",
      output: "",
    })
    .returning();

  try {
    const output = await executeAction(automation.action, automation);

    const [updated] = await db
      .update(automationRunsTable)
      .set({ status: "completed", output })
      .where(eq(automationRunsTable.id, run.id))
      .returning();

    await db
      .update(automationsTable)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(automationsTable.id, id));

    res.json(updated);
  } catch (err: any) {
    await db
      .update(automationRunsTable)
      .set({ status: "failed", output: err?.message ?? "Execution failed" })
      .where(eq(automationRunsTable.id, run.id));

    await db
      .update(automationsTable)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(automationsTable.id, id));

    res.status(500).json({ error: err?.message ?? "Execution failed" });
  }
});

/* ── Get run history for an automation ── */
router.get("/automations/:id/runs", async (req, res) => {
  const id = parseInt(req.params.id);
  const runs = await db
    .select()
    .from(automationRunsTable)
    .where(eq(automationRunsTable.automationId, id))
    .orderBy(automationRunsTable.createdAt);
  res.json(runs);
});

export default router;
