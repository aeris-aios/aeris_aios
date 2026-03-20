# Init — Build Context From URLs

Initialize the entire workspace context for a new user. Takes any combination of URLs and text, scrapes everything, analyzes it, and builds the full context files + updates CLAUDE.md.

**This command is destructive** — it overwrites existing context files. Only run for initial setup or a full reset.

## Input

The user provides `$ARGUMENTS` which can be any combination of:
- LinkedIn profile URL (e.g. `https://www.linkedin.com/in/username/`)
- YouTube channel URL (e.g. `https://www.youtube.com/@ChannelName`)
- Instagram URL (e.g. `https://www.instagram.com/username/`)
- Twitter/X URL (e.g. `https://x.com/username`)
- Website URL (e.g. `https://example.com`)
- Free-form text (bio, business description, goals, anything)

Minimum required: at least ONE social profile URL or enough text to understand who the person is.

## Step-by-Step Execution

### Phase 1: Parse Inputs

1. Parse `$ARGUMENTS` to identify:
   - LinkedIn URL (if any)
   - YouTube URL (if any)
   - Instagram URL (if any)
   - Twitter/X URL (if any)
   - Website URLs (if any)
   - Free-form text (everything that isn't a URL)

2. Confirm what was detected and proceed immediately (no approval needed).

### Phase 2: Scrape All Sources (in parallel)

Run all applicable scrapers simultaneously. Read API keys from `.env` file directly (don't use `source .env` — it fails silently).

**LinkedIn Profile + Posts** (if LinkedIn URL provided):
```python
# Profile scraper — actor: 2SyF0bMFpUje24Gqt (LinkedIn Profile Scraper)
import requests
APIFY_KEY = "<read from .env>"
resp = requests.post(
    "https://api.apify.com/v2/acts/2SyF0bMFpUje24Gqt/runs",
    headers={"Authorization": f"Bearer {APIFY_KEY}", "Content-Type": "application/json"},
    json={"profileUrls": ["<LINKEDIN_URL>"]}
)
run_id = resp.json()["data"]["id"]
# Poll: GET https://api.apify.com/v2/actor-runs/{run_id}?token={APIFY_KEY}
# Results: GET https://api.apify.com/v2/actor-runs/{run_id}/dataset/items?token={APIFY_KEY}
```

```python
# Posts scraper — actor: apimaestro~linkedin-profile-post-scraper (LinkedIn Profile Posts)
resp = requests.post(
    "https://api.apify.com/v2/acts/apimaestro~linkedin-profile-post-scraper/runs",
    headers={"Authorization": f"Bearer {APIFY_KEY}", "Content-Type": "application/json"},
    json={"profileUrls": ["<LINKEDIN_URL>"], "maxPosts": 100}
)
```

**YouTube Channel + Videos** (if YouTube URL provided):
```python
# YouTube scraper — actor: streamers~youtube-scraper
resp = requests.post(
    "https://api.apify.com/v2/acts/streamers~youtube-scraper/runs",
    headers={"Authorization": f"Bearer {APIFY_KEY}", "Content-Type": "application/json"},
    json={"startUrls": [{"url": "<YOUTUBE_URL>/videos"}], "maxResults": 50}
)
```

**Website** (if website URL provided):
- Use WebFetch to grab the homepage and key pages (about, services, pricing)
- Extract: company name, value proposition, target audience, services

**Instagram** (if Instagram URL provided):
```python
# Instagram scraper — actor: apify~instagram-profile-scraper
resp = requests.post(
    "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs",
    headers={"Authorization": f"Bearer {APIFY_KEY}", "Content-Type": "application/json"},
    json={"usernames": ["<USERNAME>"]}
)
```

**Twitter/X** (if Twitter URL provided):
- Use WebSearch to find public info about the account
- Extract: bio, follower count, content themes

### Phase 3: Wait for Scrapers

Poll all running Apify tasks every 10 seconds until complete (timeout: 3 minutes per task).

```python
import time
while True:
    time.sleep(10)
    r = requests.get(f"https://api.apify.com/v2/actor-runs/{run_id}?token={APIFY_KEY}")
    status = r.json()["data"]["status"]
    if status == "SUCCEEDED":
        results = requests.get(f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items?token={APIFY_KEY}").json()
        break
    elif status in ("FAILED", "ABORTED", "TIMED-OUT"):
        break
```

### Phase 4: Save Raw Data

Save all scraped data to `context/data/`:

```
context/data/
├── linkedin/
│   ├── profile.json      # Full profile data
│   └── posts.json         # All scraped posts with engagement
├── youtube/
│   └── videos.json        # Channel videos with view counts
├── instagram/
│   └── profile.json       # Instagram profile + recent posts
└── twitter/
    └── profile.json       # Twitter/X profile data
```

Only create directories/files for platforms that were actually scraped.

### Phase 5: Analyze and Build Context Files

Using ALL collected data (scraped + free-form text), build the four context files:

**`context/profile.md`** — WHO they are:
- Full name, location, professional title
- All social profile URLs with current headlines/bios
- Content platforms table (which platforms, what audience, what content focus)
- Voice & personality analysis (analyze their actual posts for tone, style, patterns)
- Note about personal photos in `context/images/` (user adds these manually)

**`context/business.md`** — WHAT they do:
- Company/business name and description
- What it does (product/service)
- Target audience / ICP (Ideal Customer Profile)
- Revenue model (if detectable from content)
- Products & services
- Key facts, notable clients, results

**`context/strategy.md`** — WHERE they're going:
- Current focus and mission (inferred from recent content themes)
- Priorities (ranked by content frequency and engagement)
- Success metrics
- Open questions / strategic tensions

**`context/metrics.md`** — Current numbers:
- Follower/subscriber counts per platform
- Top performing content (by views/engagement)
- Scraped data inventory table
- Last updated date

### Phase 6: Analyze Writing Voice

From the scraped posts, analyze the person's writing patterns:
- Hook styles they use most
- Sentence structure (short/long, fragments, questions)
- Tone patterns (formal/casual, vulnerable/authoritative)
- Common phrases or verbal tics
- Use of numbers, stories, lists
- CTA patterns

Save as `context/voice-analysis.md` — this becomes the AI's reference for matching their voice.

### Phase 7: Identify ICP (Ideal Customer Profile)

From the business context, content themes, and engagement patterns, build:

**`context/icp.md`** — WHO they serve:
- Primary ICP persona (title, industry, company size, pain points)
- Secondary ICP if applicable
- What content topics this audience engages with most
- What problems they're trying to solve
- Where they spend time (which platforms)
- What language/jargon they use
- What makes them buy / take action

### Phase 8: Update CLAUDE.md

Update the "Who You Are" section and other person-specific parts of CLAUDE.md:
- Replace placeholder details with the new person's info
- Update social profile links
- Update the content platforms table
- Update voice & tone guidelines based on voice analysis
- Keep all command documentation, workspace structure, and workflow docs intact

### Phase 9: Summary Report

Print a summary of what was built:
```
Context initialized for [Full Name]

Sources scraped:
  - LinkedIn: [X] posts, [Y] connections, [Z] followers
  - YouTube: [X] videos, [Y] subscribers
  - Website: [pages fetched]

Files created:
  - context/profile.md
  - context/business.md
  - context/strategy.md
  - context/metrics.md
  - context/voice-analysis.md
  - context/icp.md
  - context/data/[platform]/...

CLAUDE.md updated with new identity.

Next steps:
  1. Add personal photos to context/images/
  2. Add 3 infographic reference images to reference/ (infographic-ref-1.jpeg, infographic-ref-2.jpeg, infographic-ref-3.jpeg)
  3. Run /prime to verify context
  4. Start creating content with /create-10-posts
```

---

## Important Notes

- **Parallel scraping:** Submit ALL Apify jobs at once, then poll all of them. Don't wait for one before starting the next.
- **Graceful degradation:** If a scraper fails or a URL isn't provided, skip that source and work with what's available. Even a LinkedIn URL alone is enough to build useful context.
- **Don't hallucinate:** Only write context from actual data. If something can't be determined from the scraped data, mark it as "TBD" or "Not detected — add manually."
- **Voice analysis quality:** The more posts available, the better the voice analysis. With <10 posts, note that the analysis is preliminary.
- **ICP inference:** ICP is inferred from content themes and audience engagement. It should be treated as a starting hypothesis — the user should review and refine.
- **API keys:** Read `APIFY_API_KEY` directly from `.env` file using Python. Don't rely on shell `source`.
