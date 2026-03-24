import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contentAssetsTable, brandProfilesTable, styleExamplesTable, knowledgeItemsTable, settingsTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

/* Helper: read a setting value from the DB */
async function getSettingValue(key: string): Promise<string | null> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    return row?.value ?? null;
  } catch { return null; }
}

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

/* ─── Universal formatting rules (injected into every prompt) ── */
const PLAIN_TEXT_RULES = `
CRITICAL OUTPUT FORMAT — READ THIS FIRST:
- Write in plain text only. Zero markdown.
- BANNED: ## headers, **bold**, *italic*, — em dash, – en dash, bullet hyphens (- item)
- BANNED: "Here's your post:", "Sure!", "Here's the content:" or any preamble
- Write exactly as the text will appear when posted on social media
- Use line breaks between short paragraphs instead of any markdown structure
- Em dash and en dash: replace with a comma or period instead
- Never use hyphens as list bullets; weave points into flowing sentences
`;

/* ─── Adam Robinson writing style ─────────────────────────── */
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

/* ─── Method prompts ─────────────────────────────────────── */
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

/* ─── Helpers ─────────────────────────────────────────────── */

/**
 * Validates that a URL is safe for server-side fetch (SSRF prevention).
 * Blocks: non-HTTPS, loopback, private IPv4/IPv6 ranges, cloud metadata
 * endpoints (169.254.x.x), and internal TLDs (.local / .internal).
 */
function isSafeExternalUrl(rawUrl: string): boolean {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return false; }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();

  /* Block loopback and localhost variants */
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") return false;

  /* Block private/reserved IPv4 literals */
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0)                           return false; // 0.0.0.0/8
    if (a === 10)                          return false; // 10.0.0.0/8 private
    if (a === 127)                         return false; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254)            return false; // 169.254.0.0/16 link-local / AWS metadata
    if (a === 172 && b >= 16 && b <= 31)  return false; // 172.16.0.0/12 private
    if (a === 192 && b === 168)            return false; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 carrier-grade NAT
  }

  /* Block internal TLDs */
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return false;

  return true;
}

async function imageUrlToBase64(url: string): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" } | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AERIS/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const ct  = resp.headers.get("content-type") ?? "image/jpeg";
    const mt: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
      ct.includes("png")  ? "image/png"  :
      ct.includes("webp") ? "image/webp" :
      ct.includes("gif")  ? "image/gif"  : "image/jpeg";
    return { data: Buffer.from(buf).toString("base64"), mediaType: mt };
  } catch { return null; }
}

/* ─── Content asset CRUD ──────────────────────────────────── */
router.get("/content/assets", async (_req, res) => {
  const assets = await db.select().from(contentAssetsTable).where(eq(contentAssetsTable.deletedAt, null as any)).orderBy(contentAssetsTable.createdAt);
  res.json(assets);
});

router.post("/content/assets", async (req, res) => {
  const { title, type, content, platform, tone } = req.body;
  if (!title || !type || !content) {
    res.status(400).json({ error: "title, type, and content are required" }); return;
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

/* ═══════════════════════════════════════════════════════════
   IMAGE PROXY
   Fetches social CDN images server-side to avoid CORS blocks.
   GET /api/content/image-proxy?url=<encoded_url>
═══════════════════════════════════════════════════════════ */
router.get("/content/image-proxy", async (req, res) => {
  const raw = req.query.url;
  if (!raw || typeof raw !== "string") { res.status(400).end("Missing url"); return; }

  let targetUrl: string;
  try { targetUrl = decodeURIComponent(raw); } catch { res.status(400).end("Bad url encoding"); return; }

  /* Only allow http/https */
  if (!/^https?:\/\//i.test(targetUrl)) { res.status(400).end("Invalid url scheme"); return; }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
      },
    });

    if (!upstream.ok) { res.status(upstream.status).end("Upstream error"); return; }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(502).end("Proxy fetch failed");
  }
});

/* ═══════════════════════════════════════════════════════════
   SCRAPE SOCIAL PROFILE
   Uses Apify to pull a competitor's latest posts
═══════════════════════════════════════════════════════════ */
router.post("/content/scrape-profile", async (req, res) => {
  const { url } = req.body;
  const APIFY_KEY = process.env.APIFY_API_KEY;

  if (!APIFY_KEY) {
    res.status(500).json({ error: "Apify API key not configured" }); return;
  }
  if (!url) {
    res.status(400).json({ error: "url is required" }); return;
  }

  /* Detect platform & extract handle */
  const igMatch  = url.match(/instagram\.com\/([^\/\?#@]+)/i);
  const liMatch  = url.match(/linkedin\.com\/(?:in|company)\/([^\/\?#]+)/i);
  const ttMatch  = url.match(/tiktok\.com\/@([^\/\?#]+)/i);
  const ytMatch  = url.match(/youtube\.com\/@([^\/\?#]+)/i);

  let actorId: string;
  let inputBody: object;
  let platform: string;
  let handle: string;

  if (igMatch) {
    handle   = igMatch[1].replace("@","");
    platform = "instagram";
    actorId  = "apify~instagram-profile-scraper";
    inputBody = { usernames: [handle], resultsLimit: 12 };
  } else if (liMatch) {
    handle   = liMatch[1];
    platform = "linkedin";
    actorId  = "2SyF0bMFpUje24Gqt";
    inputBody = { profileUrls: [url] };
  } else if (ttMatch) {
    handle   = ttMatch[1];
    platform = "tiktok";
    actorId  = "clockworks~free-tiktok-scraper";
    inputBody = { profiles: [handle], resultsPerPage: 12 };
  } else if (ytMatch) {
    handle   = ytMatch[1];
    platform = "youtube";
    actorId  = "streamers~youtube-scraper";
    inputBody = { startUrls: [{ url }], maxResults: 12 };
  } else {
    res.status(400).json({ error: "Unsupported platform. Paste an Instagram, LinkedIn, TikTok, or YouTube URL." }); return;
  }

  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?timeout=45`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${APIFY_KEY}` },
        body:    JSON.stringify(inputBody),
        signal:  AbortSignal.timeout(52000),
      }
    );

    if (!apifyRes.ok) {
      const txt = await apifyRes.text();
      throw new Error(`Apify ${apifyRes.status}: ${txt.slice(0,300)}`);
    }

    const data = await apifyRes.json();
    const raw  = Array.isArray(data) ? data[0] : data;

    if (!raw) {
      res.status(404).json({ error: "Profile not found or is private." }); return;
    }

    /* Normalize across platforms */
    let posts: Array<{ imageUrl: string; caption: string; likes: number }> = [];

    if (platform === "instagram") {
      posts = (raw.latestPosts ?? [])
        .filter((p: any) => p.displayUrl)
        .slice(0, 9)
        .map((p: any) => ({
          imageUrl: p.displayUrl ?? "",
          caption:  (p.caption ?? "").slice(0, 300),
          likes:    p.likesCount ?? 0,
        }));
    } else {
      /* Fallback for other platforms — pick whatever image/text fields exist */
      const rawPosts = raw.posts ?? raw.videos ?? raw.items ?? [];
      posts = rawPosts.slice(0, 9).map((p: any) => ({
        imageUrl: p.displayUrl ?? p.thumbnailUrl ?? p.image ?? "",
        caption:  (p.caption ?? p.text ?? p.title ?? "").slice(0, 300),
        likes:    p.likesCount ?? p.viewCount ?? 0,
      })).filter((p: any) => p.imageUrl);
    }

    res.json({
      platform,
      handle,
      username:    raw.username    ?? raw.handle ?? handle,
      fullName:    raw.fullName    ?? raw.displayName ?? raw.name ?? "",
      bio:         raw.biography   ?? raw.description ?? "",
      followers:   raw.followersCount ?? raw.followers ?? 0,
      postsCount:  raw.postsCount  ?? raw.videosCount ?? posts.length,
      profilePicUrl: raw.profilePicUrl ?? raw.profilePicUrlHD ?? raw.avatar ?? "",
      posts,
    });
  } catch (err: any) {
    console.error("[scrape-profile]", err.message);
    res.status(500).json({ error: err.message ?? "Failed to scrape profile" });
  }
});

/* ═══════════════════════════════════════════════════════════
   ANALYZE VISUAL STYLE
   Uses Claude Vision to extract a design style profile
   from the competitor's top posts
═══════════════════════════════════════════════════════════ */
router.post("/content/analyze-style", async (req, res) => {
  const { posts, username, platform } = req.body;

  if (!posts?.length) {
    res.status(400).json({ error: "No posts provided" }); return;
  }

  /* Fetch and base64-encode images (parallel, max 5) */
  const imageResults = await Promise.allSettled(
    (posts as Array<{ imageUrl: string }>)
      .slice(0, 5)
      .map(p => imageUrlToBase64(p.imageUrl))
  );

  const validImages = imageResults
    .filter((r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof imageUrlToBase64>>>> =>
      r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (!validImages.length) {
    res.status(400).json({ error: "Could not retrieve post images for analysis." }); return;
  }

  try {
    const imageBlocks = validImages.map(img => ({
      type: "image" as const,
      source: {
        type:       "base64" as const,
        media_type: img.mediaType,
        data:       img.data,
      },
    }));

    const response = await anthropic.messages.create({
      model:      "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          ...imageBlocks,
          {
            type: "text",
            text: `You are an elite visual brand analyst. Analyze these ${validImages.length} posts from @${username} on ${platform}.

Return ONLY valid JSON — no markdown wrapper, no explanation, no code block. Just the raw JSON object:
{
  "colorPalette": {
    "primary":   "#hexcode",
    "secondary": "#hexcode",
    "accent":    "#hexcode",
    "text":      "#hexcode"
  },
  "mood": "2-4 word description (e.g. warm and aspirational)",
  "backgroundStyle": "one of: solid | gradient | dark | light | textured | photographic",
  "typographyStyle": "one of: serif | sans-serif | bold | minimal | script",
  "layoutStyle": "one of: centered | left-aligned | editorial | fullbleed | split",
  "contentStyle": "1-2 sentences describing the overall aesthetic that a designer would follow to replicate this look",
  "designNotes": "bullet-point list of specific recurring visual elements: overlay styles, shapes, borders, patterns, spacing philosophy",
  "copyTone": "2-3 word description of the written voice (e.g. aspirational and direct, casual and relatable, premium and minimal)",
  "highlightPhrase": "The 2-5 power words this account consistently uses in ACCENT COLOR on their posts (e.g. for news/CEO accounts: a dollar figure like '$2 BILLION', a status word like 'BILLIONAIRE', or a key emotional phrase like 'WIFE AND KIDS'). Return empty string if the account does not use accent-colored text highlights.",
  "backgroundImagePrompt": "A Flux image generation prompt (60-90 words) for a PEOPLE-FREE background image that captures the visual STYLE of this account. CRITICAL RULES: (1) ALWAYS start with 'No people, no faces, no humans — ' (2) If the account uses photos of real people, describe the SETTING/ENVIRONMENT/OBJECTS in those photos instead of the person: e.g. luxury cars on a race track, a modern glass office building exterior, a dramatic city skyline at night, abstract wealth symbols. (3) Describe: scene type, lighting, color temperature, cinematic style, depth, mood. (4) End with: 'photorealistic, cinematic, no text, no watermarks, no people, no faces.'"
}

For colorPalette: pick actual hex colors from the dominant visual palette. If photos are lifestyle/product with no text overlays, sample the dominant tones of those photos. Ensure text color is readable against primary.
For backgroundImagePrompt: Focus on the SETTING/ENVIRONMENT/OBJECTS — not the human subjects. If the account posts Elon Musk, describe Tesla factories or electric cars. If they post Steve Jobs, describe a sleek Apple store or modern tech office. If they post billionaires, describe luxury yachts, private jets, or penthouses. For abstract or graphic accounts, describe the graphic design style. ALWAYS begin with 'No people, no faces, no humans — '.`,
          },
        ],
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Style analysis returned invalid format");

    const styleProfile = JSON.parse(jsonMatch[0]);
    res.json({ styleProfile, username, platform, imagesAnalyzed: validImages.length });
  } catch (err: any) {
    console.error("[analyze-style]", err.message);
    res.status(500).json({ error: err.message ?? "Style analysis failed" });
  }
});

/* ═══════════════════════════════════════════════════════════
   MAIN CONTENT GENERATION (SSE stream)
═══════════════════════════════════════════════════════════ */
router.post("/content/generate", async (req, res) => {
  const {
    type, platform, tone, audience, context, model, variants = 1,
    method        = "standard",
    writingStyle  = "brand_voice",
    customStyle   = "",
    originalPost  = "",
    format        = "text_only",
    styleProfile,        /* NEW: extracted competitor style profile */
    socialProfileUrl,    /* NEW: competitor profile URL (informational) */
  } = req.body;

  if (!type || !context) {
    res.status(400).json({ error: "type and context are required" }); return;
  }

  /* ── Load brand context ── */
  const [brand] = await db.select().from(brandProfilesTable).limit(1);
  const styleExamples = await db.select()
    .from(styleExamplesTable)
    .where(isNull(styleExamplesTable.deletedAt))
    .limit(3);
  const analyzedExamples = styleExamples.filter(e => e.analysisResult);

  /* ── Load Knowledge Base (auto-inject items) ── */
  const knowledgeItems = await db.select()
    .from(knowledgeItemsTable)
    .where(and(
      isNull(knowledgeItemsTable.deletedAt),
      eq(knowledgeItemsTable.includeInContext, true),
    ));

  let knowledgeContext = "";
  if (knowledgeItems.length > 0) {
    knowledgeContext = `
## BUSINESS KNOWLEDGE (Use this context to inform your content)
${knowledgeItems.map(k => `### ${k.title} (${k.type})
${k.content}${k.url ? `\nSource: ${k.url}` : ""}`).join("\n\n")}
`;
  }

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

  /* ── Competitor style block ── */
  let competitorBlock = "";
  if (styleProfile) {
    competitorBlock = `
## COPY STYLE REFERENCE — TONE AND FORMAT ONLY
Mood: ${styleProfile.mood ?? ""}
Copy Tone: ${styleProfile.copyTone ?? ""}

Adopt this energy, pacing, and sentence confidence in your output.

CRITICAL RULES:
1. DO NOT write about topics, stories, or themes from the competitor's posts.
2. The CONTENT TOPIC comes entirely from the brief below — use it verbatim.
3. Only borrow the competitor's sentence rhythm, word choice confidence, and brevity.
${socialProfileUrl ? `Style reference: ${socialProfileUrl}` : ""}
`;
  }

  const selectedModel = MODEL_MAP[model ?? "sonnet"] ?? MODEL_MAP["sonnet"];
  const basePrompt    = CONTENT_TYPE_PROMPTS[type] ?? "Create marketing content";

  let systemPrompt: string;
  let userPrompt:   string;

  if (type === "linkedin_post") {
    const styleBlock =
      writingStyle === "adam_robinson" ? ADAM_ROBINSON_STYLE :
      writingStyle === "custom" && customStyle ? `\n## WRITING STYLE (custom)\n${customStyle}\n` :
      brand?.voiceDescription ? `\n## WRITING STYLE\nFollow this brand voice exactly:\n${brand.voiceDescription}\n` :
      ADAM_ROBINSON_STYLE;

    const methodBlock = METHOD_PROMPTS[method] ?? "";
    const formatNote  = format === "text_carousel"
      ? "\n\nIMPORTANT: Write ONLY the LinkedIn post caption text here. The carousel slides will be generated separately.\n"
      : "";

    systemPrompt = `You are an expert LinkedIn content strategist and ghostwriter.${PLAIN_TEXT_RULES}${brandContext ? `\n${brandContext}` : ""}${knowledgeContext}${styleBlock}${styleContext ? `\n${styleContext}` : ""}${competitorBlock}${brand ? "" : "\n\nNo brand profile set — write for a generic professional brand based on the brief."}`;

    userPrompt = `${methodBlock}${originalPost && method === "viral_replication" ? originalPost + "\n\n---\n\nNow write the adapted version:\n" : ""}

## CONTENT BRIEF
${context}
${audience ? `\nTarget Audience: ${audience}` : ""}
${platform && platform !== "LinkedIn" ? `\nOptimize for: ${platform}` : ""}
${tone ? `\nTone modifier: ${tone}` : ""}
${formatNote}
${variants > 1 ? `\nGenerate ${variants} distinct variants, clearly labeled as Variant 1, Variant 2, etc.` : ""}

Write the LinkedIn post now.`;

  } else {
    systemPrompt = `You are AERIS, an elite marketing copywriter and strategist.${PLAIN_TEXT_RULES}${brandContext ? `\n${brandContext}` : ""}${knowledgeContext}${styleContext ? `\n${styleContext}` : ""}${competitorBlock}

Create high-converting, professional marketing content that is unmistakably ON-BRAND.${brand ? "" : "\n\nNo brand profile set — write professional content based on the brief provided."}`;

    userPrompt = `${basePrompt}:

## CONTENT BRIEF
${context}
${audience ? `\nTarget Audience: ${audience}` : ""}
${platform ? `\nPlatform: ${platform}` : ""}
${tone ? `\nTone: ${tone}` : ""}
${variants > 1 ? `\nGenerate ${variants} distinct variants, clearly labeled as Variant 1, Variant 2, etc.` : ""}

Be specific, compelling, and optimized for conversion.`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model:     selectedModel,
      max_tokens: 8192,
      system:    systemPrompt,
      messages:  [{ role: "user", content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, model: selectedModel, brandActive: !!brand, styleExamplesUsed: analyzedExamples.length, competitorStyleUsed: !!styleProfile })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
  }
});

/* ═══════════════════════════════════════════════════════════
   CAROUSEL STRUCTURE GENERATION
═══════════════════════════════════════════════════════════ */
router.post("/content/carousel/structure", async (req, res) => {
  const { topic, slideCount = 7, audience, model, postText = "" } = req.body;

  if (!topic) {
    res.status(400).json({ error: "topic is required" }); return;
  }

  const [brand] = await db.select().from(brandProfilesTable).limit(1);
  const selectedModel = MODEL_MAP[model ?? "sonnet"] ?? MODEL_MAP["sonnet"];
  const brandName   = brand?.name ?? "YOUR BRAND";
  const brandVoice  = brand?.voiceDescription ?? "";
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
      model:      selectedModel,
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const rawText   = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Failed to parse carousel structure", raw: rawText }); return;
    }

    const structure = JSON.parse(jsonMatch[0]);
    if (Array.isArray(structure.slides)) {
      let contentSlides = structure.slides.filter((s: any) => s.number !== undefined && s.number !== null);
      if (contentSlides.length === 0) {
        contentSlides = structure.slides.map((s: any, i: number) => ({ ...s, number: i + 1 }));
      }
      structure.slides = contentSlides.slice(0, slideCount - 2);
    }
    res.json(structure);
  } catch (err: any) {
    console.error("Carousel structure error:", err);
    res.status(500).json({ error: err.message ?? "Carousel generation failed" });
  }
});

/* ────── POST /api/content/generate-image ─────────────────────────────── */
/* Generates an AI photo background via KIE.AI Flux Kontext, polls until    */
/* done, and returns { imageUrl }.  Used by the Content page to composite   */
/* a real photograph behind the typographic canvas text overlay.            */

const KIE_ASPECT_MAP: Record<string, string> = {
  square:        "1:1",
  portrait:      "3:4",
  vertical:      "9:16",
  story:         "9:16",
  landscape:     "16:9",
  youtube_short: "9:16",
  carousel:      "3:4",
  linkedin_post: "4:3",
};

/* ── Provider-specific generators ── */

async function generateWithReplicate(
  prompt: string, aspectRatio: string, _referenceBase64: string | null, apiKey: string,
): Promise<string> {
  /* NOTE: We intentionally DO NOT pass reference images to FLUX Kontext for
     background generation. Instagram post images contain text overlays (like
     @advicefromceo bold headlines) and FLUX reproduces that text as part of
     style transfer — making the background unusable (text baked into image).
     Instead, the style info is encoded in the text prompt via contentStyle,
     mood, colors, and designNotes extracted by Claude Vision. */
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: "jpg",
    safety_tolerance: 2,
  };

  const submitRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Prefer": "wait" },
    body: JSON.stringify({ input }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    console.error("[replicate] submit failed:", err);
    throw new Error(`Replicate error: ${err.slice(0, 200)}`);
  }

  const prediction = await submitRes.json();

  /* Prefer: wait — Replicate may return a completed prediction immediately */
  if (prediction.status === "succeeded" && prediction.output) {
    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (url) return url;
  }
  if (prediction.status === "failed" || prediction.status === "canceled") {
    throw new Error(prediction.error ?? "Replicate generation failed");
  }

  const pollUrl = prediction.urls?.get ?? `https://api.replicate.com/v1/predictions/${prediction.id}`;

  /* Poll until done — max 90s */
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3_000));
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    console.log(`[replicate] poll ${i + 1}: status=${data.status}`);

    if (data.status === "succeeded" && data.output) {
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      if (url) return url;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error ?? "Replicate generation failed");
    }
  }
  throw new Error("Replicate generation timed out");
}

async function generateWithIdeogram(
  prompt: string, aspectRatio: string, apiKey: string,
): Promise<string> {
  /* Map aspect ratios to Ideogram format */
  const ideogramAR: Record<string, string> = {
    "1:1": "ASPECT_1_1", "3:4": "ASPECT_3_4", "4:3": "ASPECT_4_3",
    "9:16": "ASPECT_9_16", "16:9": "ASPECT_16_9",
  };

  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_request: {
        prompt,
        negative_prompt: "text, words, letters, numbers, watermarks, logos, signatures, captions, headlines, titles, labels, annotations, speech bubbles, any written content",
        model: "V_2",
        aspect_ratio: ideogramAR[aspectRatio] ?? "ASPECT_1_1",
        magic_prompt_option: "AUTO",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[ideogram] failed:", err);
    throw new Error(`Ideogram error: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const url = data?.data?.[0]?.url ?? data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image URL");
  return url;
}

router.post("/content/generate-image", async (req, res) => {
  const { hook, contentStyle, formatId, brandColors, brandName, mood, backgroundStyle, industry, referenceImageUrl, userPrompt, provider, designNotes, backgroundImagePrompt } = req.body as {
    hook: string;
    contentStyle?: string;
    formatId?: string;
    brandColors?: string[];
    brandName?: string;
    mood?: string;
    backgroundStyle?: string;
    industry?: string;
    referenceImageUrl?: string;
    userPrompt?: string;
    provider?: "replicate" | "ideogram" | "kie" | "auto";
    designNotes?: string;
    backgroundImagePrompt?: string;
  };

  if (!hook) { res.status(400).json({ error: "hook is required" }); return; }

  const aspectRatio = KIE_ASPECT_MAP[formatId ?? ""] ?? "1:1";

  /* ── Validate reference image URL for style transfer ── */
  /* Instagram CDN URLs are temporary and may be proxied through our server.  */
  /* Detect both: direct CDN URLs and frontend-proxied /api/content/image-proxy paths. */
  let validatedReferenceUrl: string | null = null;
  if (referenceImageUrl) {
    /* Frontend converts CDN URLs to /api/content/image-proxy?url=... (relative path).
       Extract the real target URL and fetch it directly — skip the SSRF check on the
       proxy path itself since we control that endpoint. */
    const PROXY_PREFIX = "/api/content/image-proxy?url=";
    let targetUrl = referenceImageUrl;
    if (referenceImageUrl.startsWith(PROXY_PREFIX)) {
      try {
        targetUrl = decodeURIComponent(referenceImageUrl.slice(PROXY_PREFIX.length));
      } catch { targetUrl = ""; }
    }

    if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
      console.warn("[generate-image] referenceImageUrl failed SSRF validation, skipping style transfer");
    } else {
      const b64 = await imageUrlToBase64(targetUrl);
      if (b64) {
        validatedReferenceUrl = `data:${b64.mediaType};base64,${b64.data}`;
        console.log("[generate-image] reference image fetched for style transfer");
      } else {
        console.warn("[generate-image] failed to fetch reference image, skipping style transfer");
      }
    }
  }

  /* ── Build a high-quality, brand-aligned art direction prompt ── */
  const colorHint = brandColors?.length
    ? `. Dominant color tones: ${brandColors.slice(0, 3).join(", ")}`
    : "";
  const styleHint = contentStyle ? `Visual style: ${contentStyle}. ` : "";
  const moodHint  = mood ? `Mood: ${mood}. ` : "";
  const industryHint = industry ? `Industry context: ${industry}. ` : "";

  /* Determine visual approach based on background style */
  let visualApproach: string;
  switch (backgroundStyle) {
    case "dark":
      visualApproach = "Dark, moody atmosphere with rich shadows and selective lighting. Deep blacks and subtle color accents.";
      break;
    case "gradient":
      visualApproach = "Smooth gradient backdrop with soft ambient lighting. Clean, modern, and aspirational.";
      break;
    case "textured":
      visualApproach = "Rich textures — marble, concrete, fabric, or natural materials. Tactile and premium feel.";
      break;
    case "light":
      visualApproach = "Bright, airy, and clean. Soft diffused light, white space, minimal and premium.";
      break;
    case "photographic":
      visualApproach = "Cinematic empty scene — luxury environment or dramatic landscape with no people. Wide angle, bokeh depth of field, high contrast, moody atmosphere. No humans, no faces. Keep the bottom 50% of the image relatively dark and clear — a dark text overlay will be placed there.";
      break;
    default:
      visualApproach = "Professional, polished commercial photography. Clean composition with clear focal point. No people, no faces.";
  }

  /* Absolute no-text prefix — FLUX and Ideogram weight the beginning of the prompt heavily.
     This MUST be the first thing in the prompt. Repeated at end for reinforcement. */
  const NO_TEXT_PREFIX = "BACKGROUND IMAGE ONLY. Do NOT include any text, words, letters, numbers, symbols, captions, titles, headlines, or any written content whatsoever in this image. This image will be used as a background — text will be added separately as an overlay. Generate ONLY a photograph or scene with ZERO text anywhere.";

  /* When the user supplies a custom prompt, use it as the primary directive
     while retaining hook/brand/style as supplementary context */
  const prompt = userPrompt?.trim()
    ? [
        NO_TEXT_PREFIX,
        userPrompt.trim(),
        validatedReferenceUrl ? "Adopt the visual style, color palette, and mood from the reference image." : "",
        styleHint,
        moodHint,
        `Composition: clean negative space reserved for text overlay.`,
        brandName ? `Brand: ${brandName}.` : "",
        colorHint,
        `No text, no watermarks, no logos, no letters, no words, no people, no faces.`,
      ].filter(Boolean).join(" ")
    /* Claude-generated style-matched background prompt (most accurate) */
    : backgroundImagePrompt?.trim()
    ? (() => {
        /* Always guarantee "no people" and "no text" lead the prompt — FLUX weights early constraints heavily */
        const base = backgroundImagePrompt.trim();
        const alreadyNegated = /^no people|^no faces|^no humans/i.test(base);
        const safeBase = alreadyNegated ? base : `No people, no faces, no humans — ${base}`;
        /* For photographic style: bottom strip will be covered by dark overlay — keep it dark/empty */
        const compositionNote = backgroundStyle === "photographic"
          ? "Composition: visual interest in the top 60% of the frame; bottom 40% darker and emptier to accommodate a dark text strip overlay."
          : "Composition: generous empty space in center and top third for text overlay.";
        return [
          NO_TEXT_PREFIX,
          safeBase,
          validatedReferenceUrl ? "Match the visual style, color palette, texture, and atmosphere from the reference image — no people." : "",
          brandColors?.length ? `Brand colors: ${brandColors.slice(0, 3).join(", ")}.` : "",
          compositionNote,
          `Photorealistic, cinematic. No text, no watermarks, no logos, no words, no numbers, no people, no faces, no hands.`,
        ].filter(Boolean).join(" ");
      })()
    : [
        NO_TEXT_PREFIX,
        `Ultra-high-quality social media marketing visual.`,
        validatedReferenceUrl ? "Adopt the visual style, color palette, and mood from the reference image." : "",
        styleHint,
        moodHint,
        industryHint,
        visualApproach,
        `Composition: clean negative space reserved for text overlay (top or center third).`,
        `Shot on professional DSLR, 85mm lens, f/2.8. Studio-grade lighting.`,
        `Premium stock photo quality suitable for Fortune 500 marketing materials.`,
        brandName ? `Brand context: ${brandName}.` : "",
        `No text, no watermarks, no logos, no letters, no words, no people, no faces.`,
        colorHint,
      ].filter(Boolean).join(" ");

  const negativePrompt = "text, watermarks, logos, words, letters, numbers, people, faces, hands, fingers, cluttered backgrounds, amateur photography, blurry, low quality, distorted, oversaturated, cartoon, illustration, drawing, painting, render, 3D, CGI, stock photo watermark, busy composition";

  /* ── Determine which provider to use ── */
  const REPLICATE_KEY = process.env.REPLICATE_API_KEY ?? await getSettingValue("replicate_api_key");
  const IDEOGRAM_KEY  = process.env.IDEOGRAM_API_KEY  ?? await getSettingValue("ideogram_api_key");

  let selectedProvider = provider ?? "auto";
  if (selectedProvider === "auto") {
    if (REPLICATE_KEY) selectedProvider = "replicate";
    else if (IDEOGRAM_KEY) selectedProvider = "ideogram";
    else {
      res.status(422).json({
        error: "no_provider",
        message: "No image or video generation APIs are configured. Go to Settings > Integrations to connect your Replicate or Ideogram API key.",
      });
      return;
    }
  }

  console.log(`[generate-image] provider=${selectedProvider} hasRef=${!!validatedReferenceUrl}`);

  try {
    let imageUrl: string;

    if (selectedProvider === "replicate") {
      if (!REPLICATE_KEY) { res.status(422).json({ error: "no_provider", message: "Replicate API key not configured. Go to Settings > Integrations to add it." }); return; }
      imageUrl = await generateWithReplicate(prompt, aspectRatio, validatedReferenceUrl, REPLICATE_KEY);
    } else if (selectedProvider === "ideogram") {
      if (!IDEOGRAM_KEY) { res.status(422).json({ error: "no_provider", message: "Ideogram API key not configured. Go to Settings > Integrations to add it." }); return; }
      imageUrl = await generateWithIdeogram(prompt, aspectRatio, IDEOGRAM_KEY);
    } else {
      res.status(422).json({ error: "no_provider", message: "Unknown provider. Select Replicate or Ideogram." });
      return;
    }

    console.log(`[generate-image] success via ${selectedProvider}`);
    res.json({ imageUrl, provider: selectedProvider });
  } catch (err: any) {
    console.error(`[generate-image] ${selectedProvider} error:`, err?.message);
    res.status(502).json({ error: err?.message ?? "Image generation failed" });
  }
});

/* ═══════════════════════════════════════════════════════════
   SAVE GRAPHIC
   Saves a generated graphic (base64 PNG/JPEG) as a content asset.
═══════════════════════════════════════════════════════════ */
router.post("/content/save-graphic", async (req, res) => {
  const { imageData, format, title } = req.body as {
    imageData: string;   /* base64-encoded image data (with or without data URI prefix) */
    format?: string;     /* output format id (square, portrait, etc.) */
    title?: string;      /* optional title for the asset */
  };

  if (!imageData) {
    res.status(400).json({ error: "imageData is required" }); return;
  }

  try {
    /* Strip data URI prefix if present */
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = imageData.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png";
    const extension = mimeType === "image/jpeg" ? "jpg" : "png";

    const assetTitle = title || `AERIS Graphic — ${format || "custom"} — ${new Date().toISOString().slice(0, 10)}`;

    const [asset] = await db.insert(contentAssetsTable).values({
      title: assetTitle,
      type: "graphic",
      content: base64.slice(0, 100) + "…", /* Store truncated reference, not full image */
      platform: format || "custom",
      tone: "generated",
    }).returning();

    res.status(201).json({ id: asset.id, title: assetTitle });
  } catch (err: any) {
    console.error("[save-graphic] error:", err);
    res.status(500).json({ error: err?.message ?? "Failed to save graphic" });
  }
});

export default router;
