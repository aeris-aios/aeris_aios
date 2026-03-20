import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { brandProfilesTable, brandAssetsTable, styleExamplesTable, brandPhotosTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

/* ── Brand Profile ── */

router.get("/brand/profile", async (_req, res) => {
  const profiles = await db.select().from(brandProfilesTable).limit(1);
  res.json(profiles[0] ?? null);
});

router.post("/brand/profile", async (req, res) => {
  const { name, tagline, description, voiceDescription, primaryAudience, usps, competitors, styleNotes, colorPalette, websiteUrl, industry } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const existing = await db.select().from(brandProfilesTable).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(brandProfilesTable)
      .set({ name, tagline, description, voiceDescription, primaryAudience, usps, competitors, styleNotes, colorPalette, websiteUrl, industry, updatedAt: new Date() })
      .where(eq(brandProfilesTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(brandProfilesTable)
      .values({ name, tagline, description, voiceDescription, primaryAudience, usps, competitors, styleNotes, colorPalette, websiteUrl, industry })
      .returning();
    res.status(201).json(created);
  }
});

/* ── Brand Assets (logos, fonts) ── */

router.get("/brand/assets", async (_req, res) => {
  const assets = await db.select().from(brandAssetsTable)
    .where(eq(brandAssetsTable.deletedAt, null as any))
    .orderBy(brandAssetsTable.createdAt);
  res.json(assets);
});

router.post("/brand/assets", async (req, res) => {
  const { name, type, objectPath, mimeType, fileSize, metadata } = req.body;
  if (!name || !type || !objectPath) {
    res.status(400).json({ error: "name, type, and objectPath are required" });
    return;
  }
  const [asset] = await db.insert(brandAssetsTable).values({ name, type, objectPath, mimeType, fileSize, metadata }).returning();
  res.status(201).json(asset);
});

router.delete("/brand/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(brandAssetsTable).set({ deletedAt: new Date() }).where(eq(brandAssetsTable.id, id));
  res.status(204).end();
});

/* ── Style Examples ── */

router.get("/brand/examples", async (_req, res) => {
  const examples = await db.select().from(styleExamplesTable)
    .where(eq(styleExamplesTable.deletedAt, null as any))
    .orderBy(styleExamplesTable.createdAt);
  res.json(examples);
});

router.post("/brand/examples", async (req, res) => {
  const { name, fileType, objectPath, mimeType, tags } = req.body;
  if (!name || !fileType || !objectPath) {
    res.status(400).json({ error: "name, fileType, and objectPath are required" });
    return;
  }
  const [example] = await db.insert(styleExamplesTable).values({ name, fileType, objectPath, mimeType, tags }).returning();
  res.status(201).json(example);
});

router.post("/brand/examples/:id/analyze", async (req, res) => {
  const id = parseInt(req.params.id);
  const [example] = await db.select().from(styleExamplesTable).where(eq(styleExamplesTable.id, id));
  if (!example) {
    res.status(404).json({ error: "Style example not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const fileUrl = `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/storage${example.objectPath}`;

    let messageContent: any;

    if (example.fileType === "image") {
      const fileRes = await fetch(fileUrl);
      const buffer = await fileRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mediaType = (example.mimeType ?? "image/png") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      messageContent = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        },
        {
          type: "text",
          text: "Analyze this marketing content example in detail. Extract: 1) Visual aesthetic (layout density, whitespace usage, visual hierarchy), 2) Typography style (formal/casual, font personality descriptors), 3) Copy style (length, sentence structure, voice, tone), 4) Color mood and feel, 5) Target audience signals, 6) Overall brand personality. Return a structured style guide that can be used to replicate this aesthetic in future content generation.",
        },
      ];
    } else {
      const fileRes = await fetch(fileUrl);
      const text = await fileRes.text();
      messageContent = `Analyze this marketing content example and extract its style DNA:\n\n${text.slice(0, 8000)}\n\nIdentify: 1) Writing style and voice, 2) Tone and personality, 3) Sentence structure and length patterns, 4) Vocabulary level and word choice, 5) Persuasion techniques used, 6) Target audience signals. Return a structured style guide for replicating this content style.`;
    }

    let fullAnalysis = "";
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "You are a brand strategist and creative director analyzing marketing content to extract reusable style guidelines.",
      messages: [{ role: "user", content: messageContent }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullAnalysis += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.update(styleExamplesTable)
      .set({ analysisResult: fullAnalysis })
      .where(eq(styleExamplesTable.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "Analysis failed" })}\n\n`);
    res.end();
  }
});

router.delete("/brand/examples/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(styleExamplesTable).set({ deletedAt: new Date() }).where(eq(styleExamplesTable.id, id));
  res.status(204).end();
});

/* ── Photo Library ── */

router.get("/brand/photos", async (_req, res) => {
  const photos = await db.select().from(brandPhotosTable)
    .where(isNull(brandPhotosTable.deletedAt))
    .orderBy(brandPhotosTable.createdAt);
  res.json(photos);
});

router.post("/brand/photos", async (req, res) => {
  const { name, objectPath, mimeType, fileSize, setting, description } = req.body;
  if (!name || !objectPath) {
    res.status(400).json({ error: "name and objectPath are required" });
    return;
  }
  const [photo] = await db.insert(brandPhotosTable)
    .values({ name, objectPath, mimeType, fileSize, setting, description })
    .returning();
  res.status(201).json(photo);
});

router.patch("/brand/photos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { setting, description } = req.body;
  const [updated] = await db.update(brandPhotosTable)
    .set({ setting, description })
    .where(eq(brandPhotosTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Photo not found" }); return; }
  res.json(updated);
});

router.delete("/brand/photos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(brandPhotosTable).set({ deletedAt: new Date() }).where(eq(brandPhotosTable.id, id));
  res.status(204).end();
});

export default router;
