import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campaignsTable, brandProfilesTable, knowledgeItemsTable, settingsTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

/* ── Helper: load a setting by key ── */
async function getSetting(key: string): Promise<string | null> {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN CRUD
═══════════════════════════════════════════════════════════ */

router.get("/campaigns", async (_req, res) => {
  const campaigns = await db.select().from(campaignsTable).where(isNull(campaignsTable.deletedAt)).orderBy(campaignsTable.createdAt);
  res.json(campaigns);
});

router.post("/campaigns", async (req, res) => {
  const { title, description, objective, audience, status } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" }); return;
  }
  const [campaign] = await db.insert(campaignsTable).values({
    title, description, objective, audience,
    status: status ?? "planning",
  }).returning();
  res.status(201).json(campaign);
});

router.get("/campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
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
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.json(campaign);
});

router.delete("/campaigns/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(campaignsTable).set({ deletedAt: new Date() }).where(eq(campaignsTable.id, id));
  res.status(204).end();
});

/* ═══════════════════════════════════════════════════════════
   GENERATE AD COPY — AI-powered ad creative generation
═══════════════════════════════════════════════════════════ */
router.post("/campaigns/:id/generate-ads", async (req, res) => {
  const id = parseInt(req.params.id);
  const { channel, format } = req.body as { channel?: string; format?: string };

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  /* Load brand + knowledge context */
  const [brand] = await db.select().from(brandProfilesTable).limit(1);
  const knowledgeItems = await db.select().from(knowledgeItemsTable)
    .where(and(isNull(knowledgeItemsTable.deletedAt), eq(knowledgeItemsTable.includeInContext, true)));

  const brandCtx = brand
    ? `Brand: ${brand.name}. ${brand.tagline ?? ""}. Voice: ${brand.voiceDescription ?? "professional"}. Industry: ${brand.industry ?? "general"}.`
    : "";
  const knowledgeCtx = knowledgeItems.length > 0
    ? `\nBusiness context: ${knowledgeItems.map(k => k.content.slice(0, 200)).join(". ")}`
    : "";

  const channelGuidelines: Record<string, string> = {
    meta: `Facebook/Instagram Ads format:
- Primary text (125 chars max)
- Headline (40 chars max)
- Description (30 chars max)
- CTA options: Learn More, Shop Now, Sign Up, Get Offer, Contact Us
Generate 3 ad variations.`,
    google: `Google Ads format:
- Responsive Search Ad: 15 headlines (30 chars each), 4 descriptions (90 chars each)
- Keyword suggestions (10-15 relevant keywords)
- Suggested bid strategy
Generate a complete responsive search ad.`,
    email: `Email Campaign (MailChimp-style):
- Subject line (50 chars max) + 2 alternatives
- Preview text (90 chars)
- Email body (scannable, 3-5 short paragraphs)
- CTA button text
- Suggested send time
Generate a complete email campaign.`,
  };

  const guidelines = channelGuidelines[channel ?? "meta"] ?? channelGuidelines.meta;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are AERIS, an expert advertising copywriter. Generate high-converting ad copy.
${brandCtx}${knowledgeCtx}

Return ONLY valid JSON — no markdown, no explanation.`,
      messages: [{
        role: "user",
        content: `Campaign: "${campaign.title}"
Objective: ${campaign.objective ?? "awareness"}
Target Audience: ${campaign.audience ?? "general"}
Description: ${campaign.description ?? ""}
Channel: ${channel ?? "meta"}

${guidelines}

Return JSON with this structure:
{
  "channel": "${channel ?? "meta"}",
  "campaign_name": "${campaign.title}",
  "variations": [
    {
      "name": "Variation 1",
      "headline": "...",
      "primary_text": "...",
      "description": "...",
      "cta": "..."
    }
  ],
  "keywords": ["keyword1", "keyword2"],
  "targeting_suggestions": "...",
  "estimated_performance": "..."
}`,
      }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse ad copy");

    const adCopy = JSON.parse(jsonMatch[0]);
    res.json(adCopy);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Ad copy generation failed" });
  }
});

/* ═══════════════════════════════════════════════════════════
   META ADS — Submit to Facebook/Instagram Ads API
═══════════════════════════════════════════════════════════ */
router.post("/campaigns/:id/publish/meta", async (req, res) => {
  const metaToken = await getSetting("meta_ads_token");
  const metaAdAccount = await getSetting("meta_ad_account_id");

  if (!metaToken || !metaAdAccount) {
    res.status(400).json({
      error: "Meta Ads not configured. Add your Meta access token and ad account ID in Settings > Integrations.",
      setup_required: true,
    });
    return;
  }

  const { adCreative } = req.body;
  if (!adCreative) { res.status(400).json({ error: "adCreative is required" }); return; }

  try {
    /* Create campaign on Meta */
    const campaignRes = await fetch(
      `https://graph.facebook.com/v21.0/act_${metaAdAccount}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: metaToken,
          name: adCreative.campaign_name ?? "AERIS Campaign",
          objective: "OUTCOME_AWARENESS",
          status: "PAUSED",
          special_ad_categories: [],
        }),
      },
    );

    if (!campaignRes.ok) {
      const err = await campaignRes.json();
      throw new Error(err?.error?.message ?? "Meta API error");
    }

    const campaignData = await campaignRes.json();
    res.json({
      success: true,
      meta_campaign_id: campaignData.id,
      status: "PAUSED",
      message: "Campaign created on Meta (paused). Review and activate in Meta Ads Manager.",
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message ?? "Failed to publish to Meta Ads" });
  }
});

/* ═══════════════════════════════════════════════════════════
   MAILCHIMP — Send email campaign
═══════════════════════════════════════════════════════════ */
router.post("/campaigns/:id/publish/email", async (req, res) => {
  const mailchimpKey = await getSetting("mailchimp_api_key");
  const mailchimpServer = await getSetting("mailchimp_server_prefix");
  const mailchimpListId = await getSetting("mailchimp_list_id");

  if (!mailchimpKey || !mailchimpServer) {
    res.status(400).json({
      error: "MailChimp not configured. Add your API key and server prefix in Settings > Integrations.",
      setup_required: true,
    });
    return;
  }

  const { subject, previewText, htmlContent } = req.body;
  if (!subject || !htmlContent) {
    res.status(400).json({ error: "subject and htmlContent are required" }); return;
  }

  try {
    const campaignRes = await fetch(
      `https://${mailchimpServer}.api.mailchimp.com/3.0/campaigns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mailchimpKey}`,
        },
        body: JSON.stringify({
          type: "regular",
          recipients: { list_id: mailchimpListId ?? "" },
          settings: {
            subject_line: subject,
            preview_text: previewText ?? "",
            from_name: "AERIS",
            reply_to: "noreply@example.com",
          },
        }),
      },
    );

    if (!campaignRes.ok) {
      const err = await campaignRes.json();
      throw new Error(err?.detail ?? "MailChimp API error");
    }

    const campaignData = await campaignRes.json();

    /* Set email content */
    await fetch(
      `https://${mailchimpServer}.api.mailchimp.com/3.0/campaigns/${campaignData.id}/content`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mailchimpKey}`,
        },
        body: JSON.stringify({ html: htmlContent }),
      },
    );

    res.json({
      success: true,
      mailchimp_campaign_id: campaignData.id,
      status: "draft",
      message: "Email campaign created as draft in MailChimp. Review and send from MailChimp.",
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message ?? "Failed to create MailChimp campaign" });
  }
});

/* ═══════════════════════════════════════════════════════════
   GOOGLE ADS — Submit responsive search ad
═══════════════════════════════════════════════════════════ */
router.post("/campaigns/:id/publish/google", async (req, res) => {
  const googleAdsToken = await getSetting("google_ads_developer_token");

  if (!googleAdsToken) {
    res.status(400).json({
      error: "Google Ads not configured. Add your developer token in Settings > Integrations.",
      setup_required: true,
    });
    return;
  }

  /* Google Ads API requires OAuth2 and is more complex — for now, return the generated ad copy
     in Google Ads Editor import format so users can bulk-import */
  const { adCopy } = req.body;
  if (!adCopy) { res.status(400).json({ error: "adCopy is required" }); return; }

  const variations = adCopy.variations ?? [];
  const csvLines = [
    "Campaign,Ad Group,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Final URL",
    ...variations.map((v: any, i: number) =>
      `${adCopy.campaign_name ?? "AERIS Campaign"},Ad Group ${i + 1},"${v.headline ?? ""}","${v.primary_text?.slice(0, 30) ?? ""}","${v.cta ?? ""}","${v.description ?? ""}","${v.primary_text?.slice(0, 90) ?? ""}",https://example.com`
    ),
  ];

  res.json({
    success: true,
    format: "google_ads_editor_csv",
    csv: csvLines.join("\n"),
    message: "Google Ads copy ready for import. Copy the CSV into Google Ads Editor for bulk upload.",
    keywords: adCopy.keywords ?? [],
  });
});

export default router;
