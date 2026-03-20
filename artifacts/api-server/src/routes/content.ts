import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contentAssetsTable, brandProfilesTable, styleExamplesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const MODEL_MAP: Record<string, string> = {
  sonnet: "claude-sonnet-4-6",
  opus:   "claude-opus-4-6",
  haiku:  "claude-haiku-4-5",
};

const CONTENT_TYPE_PROMPTS: Record<string, string> = {
  ad_copy:      "Create compelling ad copy",
  email:        "Write a high-converting email sequence",
  landing_page: "Write persuasive landing page copy",
  social:       "Create engaging social media content",
  headline:     "Generate powerful headlines and sub-headlines",
  hook:         "Write attention-grabbing hooks",
  offer:        "Craft an irresistible offer",
  cta:          "Write compelling calls-to-action",
  blog_outline: "Create a detailed blog post outline",
};

router.get("/content/assets", async (_req, res) => {
  const assets = await db.select().from(contentAssetsTable).where(eq(contentAssetsTable.deletedAt, null as any)).orderBy(contentAssetsTable.createdAt);
  res.json(assets);
});

router.post("/content/assets", async (req, res) => {
  const { title, type, content, platform, tone } = req.body;
  if (!title || !type || !content) {
    res.status(400).json({ error: "title, type, and content are required" });
    return;
  }
  const [asset] = await db.insert(contentAssetsTable).values({ title, type, content, platform, tone }).returning();
  res.status(201).json(asset);
});

router.get("/content/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [asset] = await db.select().from(contentAssetsTable).where(eq(contentAssetsTable.id, id));
  if (!asset) { res.status(404).json({ error: "Content asset not found" }); return; }
  res.json(asset);
});

router.delete("/content/assets/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(contentAssetsTable).set({ deletedAt: new Date() }).where(eq(contentAssetsTable.id, id));
  res.status(204).end();
});

router.post("/content/generate", async (req, res) => {
  const { type, platform, tone, audience, context, model, variants = 1 } = req.body;

  if (!type || !context) {
    res.status(400).json({ error: "type and context are required" });
    return;
  }

  /* ── Load brand context ── */
  const [brand] = await db.select().from(brandProfilesTable).limit(1);
  const styleExamples = await db.select()
    .from(styleExamplesTable)
    .where(isNull(styleExamplesTable.deletedAt))
    .limit(3);

  const analyzedExamples = styleExamples.filter(e => e.analysisResult);

  /* ── Build brand context block ── */
  let brandContext = "";
  if (brand) {
    brandContext = `
## BRAND IDENTITY
Brand Name: ${brand.name}${brand.tagline ? `\nTagline: ${brand.tagline}` : ""}${brand.industry ? `\nIndustry: ${brand.industry}` : ""}${brand.description ? `\nBrand Description: ${brand.description}` : ""}${brand.voiceDescription ? `\nBrand Voice & Tone: ${brand.voiceDescription}` : ""}${brand.primaryAudience ? `\nPrimary Target Audience: ${brand.primaryAudience}` : ""}${brand.usps ? `\nUnique Selling Points / Key Differentiators:\n${brand.usps}` : ""}${brand.competitors ? `\nKey Competitors (write to stand out from): ${brand.competitors}` : ""}${brand.styleNotes ? `\nStyle & Aesthetic Notes: ${brand.styleNotes}` : ""}${brand.colorPalette ? `\nBrand Colors: Primary: ${brand.colorPalette.primary ?? "—"}, Secondary: ${brand.colorPalette.secondary ?? "—"}, Accent: ${brand.colorPalette.accent ?? "—"}` : ""}
`;
  }

  let styleContext = "";
  if (analyzedExamples.length > 0) {
    styleContext = `
## STYLE REFERENCE (replicate this aesthetic)
${analyzedExamples.map((e, i) => `### Example ${i + 1}: ${e.name}\n${e.analysisResult}`).join("\n\n")}
`;
  }

  const selectedModel = MODEL_MAP[model ?? "sonnet"] ?? MODEL_MAP["sonnet"];
  const basePrompt = CONTENT_TYPE_PROMPTS[type] ?? "Create marketing content";

  const prompt = `${basePrompt}${platform ? ` for ${platform}` : ""}${tone ? ` with a ${tone} tone` : ""}${audience ? ` targeting ${audience}` : ""}.

## CONTENT BRIEF
${context}
${variants > 1 ? `\nGenerate ${variants} distinct variants, clearly labeled as Variant 1, Variant 2, etc.` : ""}

Be specific, compelling, and optimized for conversion. Every word should feel unmistakably on-brand.`;

  const systemPrompt = `You are ATREYU, an elite marketing copywriter and strategist specializing in branded content.${brandContext ? `\n${brandContext}` : ""}${styleContext ? `\n${styleContext}` : ""}

Your role: Create high-converting, professional marketing content that is unmistakably ON-BRAND. Use the brand identity and style references above as your creative DNA — every word, structural choice, and tone decision should reflect this brand perfectly.${brand ? "" : "\n\nNo brand profile is set up yet — write professional, compelling marketing content based on the brief provided."}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model: selectedModel,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, model: selectedModel, brandActive: !!brand, styleExamplesUsed: analyzedExamples.length })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
  }
});

export default router;
