---
name: content-ideation
description: Generate content ideas for LinkedIn posts using three methods - viral replication (stealing proven formats), trend surfing (what's hot right now), and audience pain points (solving real problems). Use when asked to "generate content ideas", "come up with post ideas", "brainstorm content", "find topics to post about", "give me ideas", or any request for content ideation. The user can request any number of ideas (e.g., "give me 15 ideas") and they will be split evenly across the three methods.
---

# Content Ideation

Generate content ideas using three complementary methods. When asked for N ideas, split evenly: N/3 viral replication ideas, N/3 trend ideas, N/3 pain point ideas. Round up where needed.

## Method 1: Viral Replication Ideas

Find proven viral posts from other creators and propose replicating their packaging.

**Process:**
1. Check `context/data/linkedin/trending-posts-research.json` for scraped viral posts
2. If data is stale (>7 days old), use Apify to scrape fresh trending posts:
   - Actor: `apimaestro~linkedin-posts-search-scraper-no-cookies`
   - Search queries relevant to your niche
   - Sort by engagement score (reactions + comments*3 + shares*2)
3. Filter for replicable posts:
   - Has high engagement (500+ score)
   - Is NOT a deep personal story (we can't replicate those)
   - Is a framework, tool list, skill share, how-to, or listicle
   - Has an image or infographic (not video)
4. For each idea, document: original author, engagement, hook, why it's replicable, how to adapt

**Output format per idea:**
```
### [Idea title adapted to your niche]
- **Method:** Viral Replication
- **Original:** [Author name] ([engagement] engagement)
- **Original hook:** "[First 2 lines]"
- **Our hook:** "[Adapted first 2 lines]"
- **Format:** [Personal photo + text / AI infographic + text / Carousel]
- **Image type:** [Infographic / Personal photo / None]
- **Why it works:** [1-2 sentences]
- **Replication difficulty:** [Easy / Medium]
```

## Method 2: Trend Surfing Ideas

Find what's trending RIGHT NOW and create timely content around it.

**Process:**
1. Use WebSearch to check current trends in your niche
2. Check Google Trends for rising topics
3. Check recent YouTube outliers (videos with disproportionate views vs channel size = massive signal)
4. Filter for:
   - Happened in the last 7 days (maximum freshness)
   - Relevant to your niche
   - Has a clear angle or take you can add

**Output format per idea:**
```
### [Timely topic + your angle]
- **Method:** Trend Surfing
- **Trend source:** [News / Google Trends / YouTube outlier / Platform update]
- **Why it's timely:** [What happened and when]
- **Our hook:** "[Proposed first 2 lines]"
- **Format:** [Personal photo + text / AI infographic + text / Carousel]
- **Image type:** [Infographic / Personal photo / None]
- **Why it works:** [1-2 sentences]
- **Expiry:** [How many days until this is no longer timely]
```

## Method 3: Audience Pain Point Ideas

Think deeply about the target audience's problems and create content that addresses them.

**Process:**
1. Read `context/business.md` and `context/strategy.md` for audience context
2. Read `context/data/linkedin/posts.json` — look at highest-engagement posts to see what topics your audience responds to
3. For each idea, start with the PAIN, then propose the content that solves it
4. Frame as: "What keeps this person up at night?" → "What would they screenshot and save?"

**Pain point categories to rotate through:**
- **Time:** "I don't have time to..." → show them efficient systems
- **Voice:** "My content doesn't sound like me" → show them techniques
- **Strategy:** "I don't know what to..." → give them frameworks
- **ROI:** "Is this even worth it?" → show them the business case
- **Tools:** "There are too many tools, which ones matter?" → curate for them
- **Consistency:** "I start then stop after 2 weeks" → give them sustainable systems

**Output format per idea:**
```
### [Content title addressing the pain]
- **Method:** Pain Point
- **Pain:** [The specific audience pain in their words]
- **Our hook:** "[Proposed first 2 lines]"
- **Format:** [Personal photo + text / AI infographic + text / Carousel]
- **Image type:** [Infographic / Personal photo / None]
- **Why it resonates:** [Why this pain point is acute right now]
- **CTA angle:** [What action should the reader take]
```

## Output Structure

Save all ideas to `outputs/YYYY-MM-DD-content-ideas.md` with:

```markdown
# Content Ideas — [Date]

**Generated:** [date]
**Total ideas:** [N]
**Split:** [X] viral replication, [X] trend surfing, [X] pain points

---

## Viral Replication Ideas
[ideas]

## Trend Surfing Ideas
[ideas]

## Audience Pain Point Ideas
[ideas]

---

## Recommended Top 5
[Pick the 5 best ideas across all methods, ranked by predicted engagement]
```

## Quality Filters (apply to ALL ideas)

- Must be relevant to your niche
- Must be replicable without deep personal stories
- Must have a clear, specific hook — not vague topics
- Must specify format and image type
- Prefer ideas where the hook contains specific numbers or a surprising statement
- Avoid topics you've posted about in the last 30 days
- No more than 2 ideas on the exact same sub-topic

## Writing Style for Hooks

All proposed hooks should follow Adam Robinson's style:
- Lowercase, conversational
- Specific numbers over vague claims
- Curiosity gap or contrarian angle
- See `reference/adam-robinson-writing-style.md`
