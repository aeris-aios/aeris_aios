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
  ad_copy:        "Create compelling ad copy",
  email:          "Write a high-converting email sequence",
  landing_page:   "Write persuasive landing page copy",
  social:         "Create engaging social media content",
  headline:       "Generate powerful headlines and sub-headlines",
  hook:           "Write attention-grabbing hooks",
  offer:          "Craft an irresistible offer",
  cta:            "Write compelling calls-to-action",
  blog_outline:   "Create a detailed blog post outline",
  linkedin_post:  "Write a high-performing LinkedIn post",
};

/* ────────────────────────────────────────────────────────────
   Adam Robinson writing style — injected when writingStyle
   is "adam_robinson" or method is viral/trend/pain
──────────────────────────────────────────────────────────── */
const ADAM_ROBINSON_STYLE = `
## WRITING STYLE: Adam Robinson (LinkedIn voice)

Write like you're texting a smart friend — stream of consciousness, conversational, raw.

RULES:
- Start mid-thought. No setup sentences. Just jump in.
- Use parenthetical asides that break your own flow: "(I was like, wait, what?)"
- Imperfect grammar on purpose: fragments are fine. Start sentences with "And", "But", "So".
- Capitalize for EMPHASIS only (sparingly). Not for structure.
- Real, specific numbers — not "grew a lot" but "up 47% in 6 weeks"
- Self-deprecating honesty: "honestly I have no idea if this is right"
- Short paragraphs: 1–3 sentences max. Never more.
- The HOOK (first 2 lines) = 80% of the work. Make it undeniable.
- End can be abrupt — not every post needs a clean CTA bow.
- Storytelling with dialogue when relevant: 'He said: "..."  I told him no.'
- Ask real messy questions: "Am I right about this??? Anyone else???"

NEVER write:
- "Here's the thing:"
- "Let me break it down:"
- "In today's landscape"
- "I'm excited to share"
- "Game-changer", "synergy", "leverage", "utilize"
- Emojis systematically — only rare 👇 or 🚀 if genuinely fitting
- "Link in comments" (penalized by LinkedIn)
- "Comment X and I'll send you Y" (requires manual follow-up)

CTAs that work:
- "Save this for later"
- "Repost to help your network"
- "What's your experience with this?"
- "Follow for more"
`;

/* ────────────────────────────────────────────────────────────
   Method-specific instructions
──────────────────────────────────────────────────────────── */
const METHOD_PROMPTS: Record<string, string> = {
  viral_replication: `
## METHOD: Viral Replication

You are REPLICATING a proven viral LinkedIn post. The packaging — hook structure, body architecture, CTA mechanic — is what drives virality, NOT the content itself.

RULES:
- Keep the hook (first 2 lines) almost identical in structure — change only the topic-specific words
- Follow the exact same body flow: same number of sections, same transition logic
- Keep the same CTA mechanic at the end
- Only swap: the topic/subject matter to fit this brand's expertise
- Do NOT add sections the original doesn't have
- Do NOT change the hook structure significantly — this destroys the replication

ORIGINAL POST TO REPLICATE:
`,
  trend_surfing: `
## METHOD: Trend Surfing

Write a timely LinkedIn post that connects a current trend, event, or news development to the brand's expertise. Be the first smart voice with a real take.

RULES:
- Lead with the specific trend/event — name it directly in the first line
- Add a non-obvious insight or angle that others haven't said yet
- Connect back to your expertise/experience with a concrete example
- Keep it timely but evergreen enough to be relevant for 7–14 days
- The value is in your INTERPRETATION of the trend, not just reporting it
`,
  pain_point: `
## METHOD: Pain Point

Write a LinkedIn post structured around a deep, specific audience pain. The formula: Pain → Insight → Solution.

RULES:
- Open with the pain in the audience's exact words (they should see themselves in line 1)
- Build to an insight that reframes WHY the pain exists
- Deliver a clear, actionable solution they can use today
- Every reader should want to screenshot and save this
- Be specific — vague pain gets scrolled past
`,
  standard: "",
};

/* ────────────────────────────────────────────────────────────
   Content asset CRUD
──────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────
   Main content generation (SSE stream)
──────────────────────────────────────────────────────────── */
router.post("/content/generate", async (req, res) => {
  const {
    type, platform, tone, audience, context, model, variants = 1,
    // LinkedIn-specific
    method = "standard",
    writingStyle = "brand_voice",
    customStyle = "",
    originalPost = "",
    format = "text_only",
  } = req.body;

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
Brand Name: ${brand.name}${brand.tagline ? `\nTagline: ${brand.tagline}` : ""}${brand.industry ? `\nIndustry: ${brand.industry}` : ""}${brand.description ? `\nDescription: ${brand.description}` : ""}${brand.voiceDescription ? `\nBrand Voice: ${brand.voiceDescription}` : ""}${brand.primaryAudience ? `\nTarget Audience: ${brand.primaryAudience}` : ""}${brand.usps ? `\nUSPs:\n${brand.usps}` : ""}${brand.competitors ? `\nCompetitors: ${brand.competitors}` : ""}${brand.styleNotes ? `\nStyle Notes: ${brand.styleNotes}` : ""}
`;
  }

  let styleContext = "";
  if (analyzedExamples.length > 0) {
    styleContext = `
## STYLE REFERENCE
${analyzedExamples.map((e, i) => `### Example ${i + 1}: ${e.name}\n${e.analysisResult}`).join("\n\n")}
`;
  }

  const selectedModel = MODEL_MAP[model ?? "sonnet"] ?? MODEL_MAP["sonnet"];
  const basePrompt = CONTENT_TYPE_PROMPTS[type] ?? "Create marketing content";

  /* ── LinkedIn post: specialized system prompt ── */
  let systemPrompt: string;
  let userPrompt: string;

  if (type === "linkedin_post") {
    const styleBlock =
      writingStyle === "adam_robinson" ? ADAM_ROBINSON_STYLE :
      writingStyle === "custom" && customStyle ? `\n## WRITING STYLE (custom)\n${customStyle}\n` :
      brand?.voiceDescription ? `\n## WRITING STYLE\nFollow this brand voice exactly:\n${brand.voiceDescription}\n` :
      ADAM_ROBINSON_STYLE;

    const methodBlock = METHOD_PROMPTS[method] ?? "";
    const formatNote = format === "text_carousel"
      ? "\n\nIMPORTANT: Write ONLY the LinkedIn post caption text here. The carousel slides will be generated separately. The post text should tease/preview the carousel content without duplicating it word-for-word.\n"
      : "";

    systemPrompt = `You are an expert LinkedIn content strategist and ghostwriter.${brandContext ? `\n${brandContext}` : ""}${styleBlock}${styleContext ? `\n${styleContext}` : ""}${brand ? "" : "\n\nNo brand profile set — write for a generic professional brand based on the brief."}`;

    userPrompt = `${methodBlock}${originalPost && method === "viral_replication" ? originalPost + "\n\n---\n\nNow write the adapted version:\n" : ""}

## CONTENT BRIEF
${context}
${audience ? `\nTarget Audience: ${audience}` : ""}
${platform && platform !== "LinkedIn" ? `\nOptimize for: ${platform}` : ""}
${tone ? `\nTone modifier: ${tone}` : ""}
${formatNote}
${variants > 1 ? `\nGenerate ${variants} distinct variants, clearly labeled Variant 1, Variant 2, etc.` : ""}

Write the LinkedIn post now.`;

  } else {
    /* ── Standard content types ── */
    systemPrompt = `You are ATREYU, an elite marketing copywriter and strategist.${brandContext ? `\n${brandContext}` : ""}${styleContext ? `\n${styleContext}` : ""}

Create high-converting, professional marketing content that is unmistakably ON-BRAND.${brand ? "" : "\n\nNo brand profile set — write professional content based on the brief provided."}`;

    userPrompt = `${basePrompt}${platform ? ` for ${platform}` : ""}${tone ? ` with a ${tone} tone` : ""}${audience ? ` targeting ${audience}` : ""}.

## CONTENT BRIEF
${context}
${variants > 1 ? `\nGenerate ${variants} distinct variants, clearly labeled as Variant 1, Variant 2, etc.` : ""}

Be specific, compelling, and optimized for conversion.`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model: selectedModel,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
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

/* ────────────────────────────────────────────────────────────
   Carousel structure generation
   Returns a JSON object with slide content ready to render
──────────────────────────────────────────────────────────── */
router.post("/content/carousel/structure", async (req, res) => {
  const { topic, slideCount = 7, audience, model, postText = "" } = req.body;

  if (!topic) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const [brand] = await db.select().from(brandProfilesTable).limit(1);
  const selectedModel = MODEL_MAP[model ?? "sonnet"] ?? MODEL_MAP["sonnet"];

  const brandName = brand?.name ?? "YOUR BRAND";
  const brandVoice = brand?.voiceDescription ?? "";
  const accentColor = brand?.colorPalette?.accent ?? "#6366f1";

  const systemPrompt = `You are a LinkedIn carousel content strategist. You create concise, high-impact carousel slides that deliver one clear insight per slide. Each slide must be self-contained and memorable.

Return ONLY valid JSON — no markdown, no explanation, just the JSON object.`;

  const userPrompt = `Create a ${slideCount}-slide LinkedIn carousel about: "${topic}"
${audience ? `Target audience: ${audience}` : ""}
${brandVoice ? `Brand voice: ${brandVoice}` : ""}
${postText ? `This carousel accompanies this LinkedIn post:\n${postText.slice(0, 500)}` : ""}

Return exactly this JSON structure (${slideCount - 2} content slides + cover + CTA = ${slideCount} total):
{
  "title": "The carousel title (compelling, specific, uses numbers if possible)",
  "titleEmphasis": "1-3 words from the title to italicize for emphasis",
  "brandName": "${brandName}",
  "accentColor": "${accentColor}",
  "slides": [
    {
      "number": 1,
      "heading": "Short punchy heading (3-6 words)",
      "subtitle": "One clear sentence explaining this point (max 12 words)",
      "takeaway": "The one thing to remember from this slide (italic quote style, max 15 words)"
    }
  ],
  "ctaText": "Follow [name] for more [topic] insights.",
  "ctaSubtitle": "Repost if this was useful."
}

Rules:
- Cover slide has NO number field
- Content slides numbered 1 to ${slideCount - 2}
- CTA slide has NO number field
- All text must be punchy and scannable
- takeaway should feel like a quote they'd screenshot`;

  try {
    const response = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Failed to parse carousel structure", raw: rawText });
      return;
    }

    const structure = JSON.parse(jsonMatch[0]);
    // Ensure slides array contains only numbered content slides
    // Assign sequential numbers if Claude omitted them
    if (Array.isArray(structure.slides)) {
      let contentSlides = structure.slides.filter((s: any) => s.number !== undefined && s.number !== null);
      if (contentSlides.length === 0) {
        // Claude omitted numbers — assign them sequentially
        contentSlides = structure.slides.map((s: any, i: number) => ({ ...s, number: i + 1 }));
      }
      // Cap to requested slide count minus cover + CTA
      structure.slides = contentSlides.slice(0, slideCount - 2);
    }
    res.json(structure);
  } catch (err: any) {
    console.error("Carousel structure error:", err);
    res.status(500).json({ error: err.message ?? "Carousel generation failed" });
  }
});

export default router;
