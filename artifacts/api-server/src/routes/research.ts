import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { researchJobsTable, researchResultsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.get("/research/jobs", async (_req, res) => {
  const jobs = await db
    .select()
    .from(researchJobsTable)
    .where(isNull(researchJobsTable.deletedAt))
    .orderBy(researchJobsTable.createdAt);
  res.json(jobs);
});

router.post("/research/jobs", async (req, res) => {
  const { title, sourceType, targets, scrapeTemplate } = req.body;
  if (!title || !sourceType || !targets) {
    res.status(400).json({ error: "title, sourceType, and targets are required" });
    return;
  }

  const [job] = await db
    .insert(researchJobsTable)
    .values({ title, sourceType, targets, scrapeTemplate, status: "pending" })
    .returning();

  let platforms: string[] = [];
  try {
    platforms = JSON.parse(scrapeTemplate || "{}").platforms || [];
  } catch {
    platforms = [];
  }

  runApifyResearch(job.id, sourceType, platforms, targets).catch(() => {});

  res.status(201).json(job);
});

router.get("/research/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(researchJobsTable).where(eq(researchJobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Research job not found" });
    return;
  }
  res.json(job);
});

router.delete("/research/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db
    .update(researchJobsTable)
    .set({ deletedAt: new Date() })
    .where(eq(researchJobsTable.id, id));
  res.status(204).end();
});

router.get("/research/jobs/:id/results", async (req, res) => {
  const id = parseInt(req.params.id);
  const results = await db
    .select()
    .from(researchResultsTable)
    .where(eq(researchResultsTable.jobId, id));
  res.json(results);
});

router.post("/research/jobs/:id/summarize", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(researchJobsTable).where(eq(researchJobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Research job not found" });
    return;
  }

  const results = await db
    .select()
    .from(researchResultsTable)
    .where(eq(researchResultsTable.jobId, id));

  const context = results
    .map(r => `URL: ${r.url ?? "N/A"}\nTitle: ${r.title ?? "N/A"}\nContent: ${r.content}`)
    .join("\n\n---\n\n");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let summary = "";
  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Analyze this research data and provide a comprehensive marketing intelligence summary:\n\nResearch Job: ${job.title}\nSource Type: ${job.sourceType}\nTargets: ${job.targets}\n\nResults:\n${context || "No results collected yet."}\n\nProvide:\n1. Key findings and insights\n2. Market opportunities identified\n3. Competitive intelligence\n4. Actionable recommendations for marketing strategy`,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        summary += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db
      .update(researchJobsTable)
      .set({ summary, updatedAt: new Date() })
      .where(eq(researchJobsTable.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch {
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
    res.end();
  }
});

const ACTOR_MAP: Record<string, Record<string, { actorId: string; buildInput: (kw: string) => Record<string, unknown> }>> = {
  instagram: {
    trending: {
      actorId: "apify/instagram-hashtag-scraper",
      buildInput: (kw) => ({
        hashtags: kw.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean),
        resultsLimit: 20,
      }),
    },
    competitor: {
      actorId: "apify/instagram-profile-scraper",
      buildInput: (kw) => ({
        usernames: kw.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean),
        resultsPerPage: 12,
      }),
    },
    influencer: {
      actorId: "apify/instagram-hashtag-scraper",
      buildInput: (kw) => ({
        hashtags: kw.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean),
        resultsLimit: 20,
      }),
    },
  },
  tiktok: {
    trending: {
      actorId: "clockworks/free-tiktok-scraper",
      buildInput: (kw) => ({
        hashtags: kw.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean),
        resultsPerPage: 20,
      }),
    },
    competitor: {
      actorId: "clockworks/free-tiktok-scraper",
      buildInput: (kw) => ({
        profiles: kw.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean),
        resultsPerPage: 20,
      }),
    },
    influencer: {
      actorId: "clockworks/free-tiktok-scraper",
      buildInput: (kw) => ({
        hashtags: kw.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean),
        resultsPerPage: 20,
      }),
    },
  },
  twitter: {
    trending: {
      actorId: "quacker/twitter-scraper",
      buildInput: (kw) => ({
        searchTerms: kw.split(",").map(s => s.trim()).filter(Boolean),
        maxTweets: 30,
      }),
    },
    competitor: {
      actorId: "quacker/twitter-scraper",
      buildInput: (kw) => ({
        handles: kw.split(",").map(s => s.trim().replace(/^@/, "")).filter(Boolean),
        maxTweets: 30,
      }),
    },
    community: {
      actorId: "quacker/twitter-scraper",
      buildInput: (kw) => ({
        searchTerms: kw.split(",").map(s => s.trim()).filter(Boolean),
        maxTweets: 30,
      }),
    },
    influencer: {
      actorId: "quacker/twitter-scraper",
      buildInput: (kw) => ({
        searchTerms: kw.split(",").map(s => s.trim()).filter(Boolean),
        maxTweets: 30,
      }),
    },
  },
  reddit: {
    trending: {
      actorId: "trudax/reddit-scraper-lite",
      buildInput: (kw) => ({
        searches: kw.split(",").map(s => s.trim()).filter(Boolean),
        searchLimit: 25,
      }),
    },
    community: {
      actorId: "trudax/reddit-scraper-lite",
      buildInput: (kw) => ({
        searches: kw.split(",").map(s => s.trim()).filter(Boolean),
        searchLimit: 25,
      }),
    },
  },
  linkedin: {
    competitor: {
      actorId: "anchor-labs/linkedin-company-research",
      buildInput: (kw) => ({
        companyUrls: kw.split(",").map(s => s.trim()).filter(Boolean),
      }),
    },
  },
  youtube: {
    trending: {
      actorId: "streamers/youtube-scraper",
      buildInput: (kw) => ({
        searchKeywords: kw.split(",")[0]?.trim() || kw,
        maxResults: 20,
      }),
    },
    influencer: {
      actorId: "streamers/youtube-scraper",
      buildInput: (kw) => ({
        searchKeywords: kw.split(",")[0]?.trim() || kw,
        maxResults: 20,
      }),
    },
  },
  facebook: {
    competitor: {
      actorId: "apify/facebook-pages-scraper",
      buildInput: (kw) => ({
        startUrls: kw
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .map(url => ({ url: url.startsWith("http") ? url : `https://www.facebook.com/${url}` })),
      }),
    },
  },
  google: {
    search: {
      actorId: "apify/google-search-scraper",
      buildInput: (kw) => ({
        queries: kw,
        maxPagesPerQuery: 1,
        resultsPerPage: 20,
      }),
    },
    trending: {
      actorId: "apify/google-search-scraper",
      buildInput: (kw) => ({
        queries: kw,
        maxPagesPerQuery: 1,
        resultsPerPage: 20,
      }),
    },
    reviews: {
      actorId: "apify/google-search-scraper",
      buildInput: (kw) => ({
        queries: kw.split(",").map(s => `${s.trim()} reviews`).join("\n"),
        maxPagesPerQuery: 1,
        resultsPerPage: 10,
      }),
    },
  },
  trustpilot: {
    reviews: {
      actorId: "apify/trustpilot-scraper",
      buildInput: (kw) => ({
        startUrls: kw
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .map(url => ({
            url: url.startsWith("http")
              ? url
              : `https://www.trustpilot.com/review/${url}`,
          })),
        count: 50,
      }),
    },
  },
  g2: {
    reviews: {
      actorId: "apify/g2-scraper",
      buildInput: (kw) => ({
        startUrls: kw
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .map(url => ({
            url: url.startsWith("http")
              ? url
              : `https://www.g2.com/products/${url}/reviews`,
          })),
      }),
    },
  },
};

function getActorConfig(platform: string, intent: string) {
  return (
    ACTOR_MAP[platform]?.[intent] ||
    ACTOR_MAP[platform]?.["trending"] ||
    null
  );
}

function normalizeItem(
  item: Record<string, unknown>,
  platform: string
): { url?: string; title?: string; content: string; rawData: string } {
  const raw = JSON.stringify(item);

  switch (platform) {
    case "instagram":
      return {
        url: (item.url as string) || (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : undefined),
        title: item.ownerUsername ? `@${item.ownerUsername}` : "Instagram Post",
        content:
          (item.caption as string) ||
          (item.alt as string) ||
          `${item.likesCount || 0} likes, ${item.commentsCount || 0} comments`,
        rawData: raw,
      };
    case "tiktok":
      return {
        url: (item.webVideoUrl as string) || (item.url as string),
        title:
          (item.authorMeta as Record<string, unknown>)?.name
            ? `@${(item.authorMeta as Record<string, unknown>).name}`
            : "TikTok Video",
        content:
          (item.text as string) ||
          (item.description as string) ||
          `${item.diggCount || 0} likes, ${item.playCount || 0} plays`,
        rawData: raw,
      };
    case "twitter":
      return {
        url:
          (item.url as string) ||
          (item.id ? `https://twitter.com/i/web/status/${item.id}` : undefined),
        title: (item.author as Record<string, unknown>)?.name
          ? `@${(item.author as Record<string, unknown>).userName || (item.author as Record<string, unknown>).name}`
          : "Tweet",
        content:
          (item.text as string) ||
          (item.fullText as string) ||
          (item.content as string) ||
          "",
        rawData: raw,
      };
    case "reddit":
      return {
        url: item.url as string,
        title: item.title as string,
        content:
          (item.selftext as string) ||
          (item.body as string) ||
          `${item.score || 0} upvotes - r/${item.subreddit}`,
        rawData: raw,
      };
    case "youtube":
      return {
        url: item.url as string,
        title: item.title as string,
        content:
          (item.description as string) ||
          `${item.viewCount || 0} views - ${item.channelName || ""}`,
        rawData: raw,
      };
    case "google":
      return {
        url: item.url as string,
        title: item.title as string,
        content: (item.description as string) || (item.snippet as string) || "",
        rawData: raw,
      };
    case "trustpilot":
    case "g2":
      return {
        url: item.url as string,
        title:
          (item.title as string) ||
          (item.reviewTitle as string) ||
          `${item.stars || item.rating || 0} stars`,
        content:
          (item.text as string) ||
          (item.reviewText as string) ||
          (item.content as string) ||
          "",
        rawData: raw,
      };
    case "linkedin":
      return {
        url: item.url as string,
        title: (item.name as string) || (item.companyName as string) || "LinkedIn Company",
        content: (item.description as string) || (item.about as string) || "",
        rawData: raw,
      };
    default:
      return {
        url: item.url as string,
        title: (item.title as string) || (item.name as string),
        content:
          (item.content as string) ||
          (item.description as string) ||
          (item.text as string) ||
          raw.slice(0, 300),
        rawData: raw,
      };
  }
}

async function callApifyActor(
  platform: string,
  intent: string,
  keywords: string
): Promise<{ url?: string; title?: string; content: string; rawData: string }[]> {
  const token = process.env.APIFY_API_KEY;
  if (!token) {
    return simulatePlatformResults(platform, keywords);
  }

  const config = getActorConfig(platform, intent);
  if (!config) return [];

  const { actorId, buildInput } = config;
  const input = buildInput(keywords);

  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    console.error(`[Apify] Failed to start run for ${platform}/${intent}:`, await runRes.text());
    return [];
  }

  const runData = (await runRes.json()) as { data?: { id: string } };
  const runId = runData.data?.id;
  if (!runId) return [];

  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise(r => setTimeout(r, 5000));

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );
    const statusData = (await statusRes.json()) as { data?: { status: string } };
    const status = statusData.data?.status;

    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      console.error(`[Apify] Run ${runId} ended with status: ${status}`);
      return [];
    }
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=50`
  );
  const items = (await itemsRes.json()) as Record<string, unknown>[];
  if (!Array.isArray(items)) return [];

  return items.map(item => normalizeItem(item, platform));
}

async function runApifyResearch(
  jobId: number,
  intent: string,
  platforms: string[],
  keywords: string
) {
  await db
    .update(researchJobsTable)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(researchJobsTable.id, jobId));

  const platformsToRun = platforms.length > 0 ? platforms : ["google"];

  const settled = await Promise.allSettled(
    platformsToRun.map(p => callApifyActor(p, intent, keywords))
  );

  const toInsert: {
    jobId: number;
    url?: string;
    title?: string;
    content: string;
    rawData?: string;
  }[] = [];

  for (let i = 0; i < platformsToRun.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        toInsert.push({ jobId, ...item });
      }
    } else {
      console.error(`[Research] Platform ${platformsToRun[i]} failed:`, result.reason);
    }
  }

  if (toInsert.length > 0) {
    await db.insert(researchResultsTable).values(toInsert);
  }

  await db
    .update(researchJobsTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(researchJobsTable.id, jobId));
}

function simulatePlatformResults(
  platform: string,
  keywords: string
): { url?: string; title?: string; content: string; rawData: string }[] {
  const kw = keywords.split(",")[0]?.trim() || keywords;
  return Array.from({ length: 5 }, (_, i) => ({
    url: `https://${platform}.com/post/${i + 1}`,
    title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} result ${i + 1} for "${kw}"`,
    content: `Simulated ${platform} content for "${kw}". Configure your APIFY_API_KEY to fetch real data from ${platform}.`,
    rawData: JSON.stringify({ platform, keyword: kw, index: i }),
  }));
}

export default router;
