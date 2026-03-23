import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agentSkillsTable, contentItemsTable, knowledgeItemsTable, brandProfilesTable } from "@workspace/db";
import { eq, isNull, desc, and } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

function tryParseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

const PLATFORM_SPECS: Record<string, { name: string; guidelines: string }> = {
  "instagram-post": {
    name: "Instagram Post",
    guidelines: "Caption up to 2200 chars. Include 20-30 relevant hashtags in a separate block. Use line breaks for readability. Include a call to action. Suggest image/carousel direction.",
  },
  "instagram-story": {
    name: "Instagram Story",
    guidelines: "Very short punchy text for story slides (3-5 slides). Each slide has max ~250 chars. Include poll/question sticker ideas. Suggest visual style per slide. Include swipe-up CTA if applicable.",
  },
  "instagram-reel": {
    name: "Instagram Reel",
    guidelines: "Script for 15-60 second video. Include hook (first 3 seconds), body, and CTA. Write caption with hashtags. Suggest trending audio style. Include on-screen text overlay suggestions.",
  },
  "youtube-short": {
    name: "YouTube Short",
    guidelines: "Script for up to 60 second vertical video. Strong hook in first 2 seconds. Include on-screen text suggestions. Write a title (max 100 chars) and description. Suggest thumbnail concept.",
  },
  "youtube-video": {
    name: "YouTube Video",
    guidelines: "Full video script with timestamps. Include: title, description (with keywords), tags, thumbnail concept, hook, sections, and end screen CTA. Optimize for search.",
  },
  "twitter-x": {
    name: "Twitter/X Post",
    guidelines: "Max 280 characters per tweet. Create a single tweet and a thread version (3-5 tweets). Make it engaging and shareable. Include relevant hashtags sparingly (1-3).",
  },
  "linkedin": {
    name: "LinkedIn Post",
    guidelines: "Professional tone. Strong opening line (hook). Use short paragraphs and line breaks. Include a thought-provoking question or CTA at the end. 3-5 relevant hashtags.",
  },
  "tiktok": {
    name: "TikTok Video",
    guidelines: "Script for 15-60 second video. Extremely strong hook in first 1-2 seconds. Trendy, casual tone. Include on-screen text, suggested sounds/trends, caption with hashtags.",
  },
  "blog-post": {
    name: "Blog Post",
    guidelines: "SEO-optimized blog post. Include: title, meta description, H2/H3 headings, introduction, body sections, conclusion with CTA. 800-1500 words.",
  },
  "email-copy": {
    name: "Email Copy",
    guidelines: "Email with: subject line (and 2 alternatives), preview text, body copy, CTA button text. Keep it scannable with short paragraphs.",
  },
  "ad-copy": {
    name: "Ad Copy",
    guidelines: "Create multiple ad variations: headline (30 chars), description (90 chars), and long description. Include 3 variations each. Include suggested audience targeting.",
  },
  "website-copy": {
    name: "Website Copy",
    guidelines: "Landing page or section copy. Include: headline, subheadline, body paragraphs, bullet points for features/benefits, and CTA. Focus on conversion.",
  },
};

/* ── GET /api/content-studio/history ──────────────────────────── */
router.get("/content-studio/history", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(contentItemsTable)
      .where(isNull(contentItemsTable.deletedAt))
      .orderBy(desc(contentItemsTable.createdAt))
      .limit(100);
    res.json(rows.map(r => ({
      ...r,
      platforms:  tryParseJson(r.platforms, []),
      skillsUsed: tryParseJson(r.skillsUsed, []),
      content:    tryParseJson(r.content, []),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load history" });
  }
});

/* ── GET /api/content-studio/:id ──────────────────────────────── */
router.get("/content-studio/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, req.params.id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...row,
      platforms:  tryParseJson(row.platforms, []),
      skillsUsed: tryParseJson(row.skillsUsed, []),
      content:    tryParseJson(row.content, []),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load item" });
  }
});

/* ── DELETE /api/content-studio/:id ──────────────────────────── */
router.delete("/content-studio/:id", async (req, res) => {
  try {
    await db
      .update(contentItemsTable)
      .set({ deletedAt: new Date() })
      .where(eq(contentItemsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to delete" });
  }
});

/* ── POST /api/content-studio/generate (SSE) ─────────────────── */
router.post("/content-studio/generate", async (req, res) => {
  const { prompt, platforms, tone, brandVoice, additionalContext } = req.body;

  if (!prompt?.trim()) { res.status(400).json({ error: "prompt is required" }); return; }
  if (!platforms || platforms.length === 0) { res.status(400).json({ error: "Select at least one platform" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: Record<string, unknown>) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    send({ stage: "loading_skills", message: "Loading trained skills and knowledge base..." });

    const skillRows = await db
      .select()
      .from(agentSkillsTable)
      .where(isNull(agentSkillsTable.deletedAt));

    /* ── Load Knowledge Base (auto-inject items) ── */
    const knowledgeItems = await db.select()
      .from(knowledgeItemsTable)
      .where(and(
        isNull(knowledgeItemsTable.deletedAt),
        eq(knowledgeItemsTable.includeInContext, true),
      ));

    /* ── Load Brand Profile ── */
    const [brand] = await db.select().from(brandProfilesTable).limit(1);

    const skills = skillRows.map(r => ({
      ...r,
      keyConcepts: tryParseJson(r.keyConcepts, [] as string[]),
      useCases:    tryParseJson(r.useCases, [] as string[]),
    }));

    send({ stage: "selecting_skills", message: `Reviewing ${skills.length} trained skills for relevant expertise...` });

    const skillsSummary = skills.length > 0
      ? skills.map(s => `- ${s.name} (${s.category}): ${s.summary}`).join("\n")
      : "No skills trained yet. Generate content based on general best practices.";

    const skillDetails = skills.length > 0
      ? skills.map(s => [
          `### ${s.name} (${s.category})`,
          s.description ?? "",
          `Key concepts: ${(s.keyConcepts as string[]).join(", ")}`,
          `Use cases: ${(s.useCases as string[]).join("; ")}`,
          s.codeExample ? `Example:\n${s.codeExample}` : "",
        ].join("\n")).join("\n\n")
      : "";

    const platformDetails = (platforms as string[])
      .map(p => PLATFORM_SPECS[p])
      .filter(Boolean)
      .map(p => `### ${p.name}\n${p.guidelines}`)
      .join("\n\n");

    /* Build knowledge and brand blocks */
    const knowledgeBlock = knowledgeItems.length > 0
      ? `\nBUSINESS KNOWLEDGE (Use this context to inform all content):\n${knowledgeItems.map(k => `- ${k.title}: ${k.content.slice(0, 500)}`).join("\n")}\n`
      : "";

    const brandBlock = brand
      ? `\nBRAND IDENTITY:\nBrand: ${brand.name}${brand.tagline ? ` — ${brand.tagline}` : ""}${brand.voiceDescription ? `\nVoice: ${brand.voiceDescription}` : ""}${brand.primaryAudience ? `\nAudience: ${brand.primaryAudience}` : ""}${brand.usps ? `\nUSPs: ${brand.usps}` : ""}${brand.industry ? `\nIndustry: ${brand.industry}` : ""}\n`
      : "";

    const systemPrompt = `You are AERIS, an elite AI content strategist and creator. You have been trained on specific skills from real codebases and knowledge bases. Use these skills to inform and enhance the content you create.
${brandBlock}${knowledgeBlock}
YOUR TRAINED SKILLS:
${skillsSummary}

DETAILED SKILL KNOWLEDGE:
${skillDetails}

INSTRUCTIONS:
1. First, analyze which of your trained skills are most relevant to this content request
2. List the specific skills you are applying and WHY
3. Then generate the requested content for EACH platform specified
4. The content should be informed by your skill knowledge, not generic
5. Each platform's content must follow its specific format guidelines exactly

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object (no markdown fences, no explanation outside JSON) with this structure:
{
  "skills_used": [
    { "skill_name": "...", "reason": "Why this skill is relevant to this content" }
  ],
  "content": [
    {
      "platform": "platform-id",
      "platform_name": "Platform Display Name",
      "pieces": [
        {
          "type": "primary|variation|thread|slide|script",
          "label": "Main Post|Variation 1|Slide 1|Script|etc",
          "text": "The actual content text",
          "notes": "Additional notes, suggestions, or directions"
        }
      ],
      "hashtags": ["tag1", "tag2"],
      "metadata": {
        "suggested_visual": "Description of suggested visual/image",
        "best_posting_time": "Suggested posting time/day",
        "target_audience": "Who this content targets",
        "estimated_engagement": "Expected engagement level and why"
      }
    }
  ],
  "strategy_notes": "Overall content strategy explanation connecting the skills to the output"
}`;

    const userPrompt = `CONTENT REQUEST:
${prompt}

PLATFORMS TO CREATE FOR:
${platformDetails}

TONE:
${tone ?? "professional"}

${brandVoice ? `BRAND VOICE:\n${brandVoice}` : ""}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ""}

Generate the content now. State which trained skills you are using and why, then create platform-specific content following each platform's guidelines exactly. Return ONLY valid JSON.`;

    send({ stage: "generating", message: `Generating content for ${(platforms as string[]).length} platform(s) using ${skills.length} trained skills...` });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 12000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    send({ stage: "processing", message: "Processing generated content..." });

    const rawText = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonStr = rawText.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

    let parsed: {
      skills_used?: Array<{ skill_name: string; reason: string }>;
      content?: unknown[];
      strategy_notes?: string;
    };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse content from Claude. Please try again.");
    }

    send({ stage: "saving", message: "Saving to content history..." });

    const [saved] = await db.insert(contentItemsTable).values({
      prompt,
      platforms:     JSON.stringify(platforms),
      tone:          tone ?? "professional",
      brandVoice:    brandVoice ?? "",
      skillsUsed:    JSON.stringify(parsed.skills_used ?? []),
      content:       JSON.stringify(parsed.content ?? []),
      strategyNotes: parsed.strategy_notes ?? "",
    }).returning();

    const resultItem = {
      ...saved,
      platforms:  tryParseJson(saved.platforms, []),
      skillsUsed: tryParseJson(saved.skillsUsed, []),
      content:    tryParseJson(saved.content, []),
    };

    send({ stage: "done", message: "Content generated!", content: resultItem });
  } catch (err: any) {
    send({ stage: "error", message: err?.message ?? "Generation failed" });
  } finally {
    res.end();
  }
});

export default router;
