# Batch Content Generation

Generate 10 ready-to-publish LinkedIn posts in a single run. Each post is self-sufficient — no "comment X for free resource" CTAs, no dependency on external links or follow-ups. Every post can be copied, pasted, and published immediately.

## Content Mix

### By Method (WHERE ideas come from)

| Method | Count | Description |
|--------|-------|-------------|
| Viral Replication | 5 | Find proven viral posts, steal the packaging, adapt the substance |
| Trend Surfing | 3 | What's trending RIGHT NOW in your niche |
| Pain Points | 2 | Deep audience problems with actionable solutions |

### By Format (HOW content is delivered)

Every post MUST have a visual. No text-only posts.

| Format | Count | Description |
|--------|-------|-------------|
| Text + Personal Photo | 4 | Post text + photo from `context/images/` matching the vibe |
| Text + AI Infographic | 4 | Post text + Kie.ai generated infographic with reference image |
| Carousel (PDF) | 2 | 7-11 slide carousel generated with `scripts/generate-carousel.py` |

### Assignment Matrix

Distribute methods across formats for maximum variety. No two posts should share both the same method AND the same format. Example distribution:

| # | Method | Format | Notes |
|---|--------|--------|-------|
| 1 | Viral Replication | Text + Personal Photo | |
| 2 | Viral Replication | Text + AI Infographic | |
| 3 | Viral Replication | Carousel | |
| 4 | Viral Replication | Text + AI Infographic | Different topic from #2 |
| 5 | Viral Replication | Text + Personal Photo | Different topic from #1 |
| 6 | Trend Surfing | Text + AI Infographic | |
| 7 | Trend Surfing | Text + Personal Photo | |
| 8 | Trend Surfing | Carousel | |
| 9 | Pain Point | Text + AI Infographic | |
| 10 | Pain Point | Text + Personal Photo | |

**Format order MUST be shuffled** — alternate between personal photo, infographic, and carousel so no two consecutive posts share the same format.

---

## CRITICAL RULES

### Diversity (NON-NEGOTIABLE)

The 10 posts MUST be diverse across ALL dimensions:

1. **Topic diversity** — No two posts on the same narrow topic. Cover at least 5 different sub-topics.

2. **Hook diversity** — Vary the hook structures:
   - Number-based: "7 tools that...", "I spent 200 hours..."
   - Contrarian: "Stop doing X. Here's why."
   - Story: "6 months ago I was..."
   - Question: "Why do 90% of founders fail at...?"
   - Confession: "I was wrong about..."
   - Bold claim: "This one change 10x'd my..."
   - No two consecutive posts should use the same hook structure

3. **Visual diversity** — The feed must look interesting when scrolling:
   - Personal photos: use DIFFERENT settings (desk, outdoor, gym, portrait, casual)
   - Infographics: use DIFFERENT reference images (ref-1, ref-2, ref-3) and different layouts
   - Carousels: use different slide counts and illustration styles
   - Alternate between image types — never 3 of the same format in a row

4. **Tone diversity** — Mix up the emotional register:
   - Some educational (teaching something specific)
   - Some vulnerable (sharing failures, real numbers)
   - Some bold/provocative (hot takes, contrarian views)
   - Some practical (step-by-step, tools, frameworks)

### Self-Sufficiency (NON-NEGOTIABLE)

Every post must be complete and ready to publish:
- NO "Comment X and I'll send you..." CTAs (these require follow-up)
- NO "Link in comments" (LinkedIn penalizes external links)
- NO "DM me for..." (requires manual follow-up)
- Acceptable CTAs: "Follow for more", "Repost to help your network", "Save this for later", "What's your experience with...?"
- The value must be IN the post, not gated behind an action

### Quality Standards

- Write in Adam Robinson's style (see `reference/adam-robinson-writing-style.md`)
- Every post must have a strong hook (first 2 lines are 80% of the work)
- Every post must deliver real value — not fluff
- Use YOUR real context: company name, real numbers, real experiences
- Specific numbers over vague claims

---

## Step-by-Step Execution

### Phase 1: Ideation (generate all 10 ideas first)

1. **Read context files** to refresh understanding:
   - `context/profile.md`, `context/business.md`, `context/strategy.md`, `context/metrics.md`
   - `reference/adam-robinson-writing-style.md` (skim for voice)
   - Check last 5 posts in `posts/` to avoid topic repetition

2. **Generate 5 Viral Replication ideas:**
   - Use WebSearch to find viral LinkedIn post examples and trending content formats
   - Reference Adam Robinson's top posts (`reference/adam-robinson-top-posts.md`) for proven packaging structures
   - Select 5 ideas that cover DIFFERENT topics
   - For each: document the hook structure, body structure, and visual format to replicate

3. **Generate 3 Trend Surfing ideas:**
   - Use WebSearch to find what's trending NOW in your niche
   - Find 3 timely angles that connect to your expertise
   - Each must be from a DIFFERENT trend source

4. **Generate 2 Pain Point ideas:**
   - Think deeply about the target audience:
     - What keeps them up at night?
     - What frustration do they have?
   - Pick 2 DIFFERENT pain point categories
   - Frame each as: pain → insight → actionable solution

5. **Assign formats** to all 10 ideas following the distribution table above
   - Ensure visual diversity — check that no 3 consecutive posts share a format
   - For personal photo posts: pre-select which photo from `context/images/` matches each post's vibe

6. **Save the ideation plan** to `outputs/YYYY-MM-DD-batch-content-plan.md`

7. **Proceed immediately to generation** — do NOT wait for user approval.

### Phase 2: Content Generation (immediately after ideation)

Execute ALL 10 posts. For each post:

**Determine the next post number:**
- Check existing `posts/` folders for the highest NNN number
- Start new posts at NNN+1

**For each Text + Personal Photo post:**
1. Write the full post text in Adam Robinson's style
2. Copy the pre-selected photo from `context/images/` as `image.png`
3. Save `post.md` with metadata + copy-paste ready text
4. If viral replication: save `original.md` with the original post

**For each Text + AI Infographic post:**
1. Write the full post text
2. Generate infographic using Kie.ai with `reference_image` parameter:
   - Rotate through `reference/infographic-ref-1.jpeg`, `ref-2`, `ref-3`
   - Use the standard style prefix in the prompt
   - Describe specific layout matching the content
3. Download and save as `image.png`
4. Save `post.md` + `original.md` if applicable

**For each Carousel post:**
1. Write the slide content (title, 5-9 numbered points with heading/subtitle/takeaway)
2. Create content JSON file
3. Run `python3 scripts/generate-carousel.py --json <file> --output posts/NNN-slug/carousel.pdf`
4. Write the companion post text (preview the carousel, don't duplicate it)
5. Save `post.md` with the post text + note that carousel.pdf is the visual

### Phase 3: Finalize

1. **Rebuild dashboard:** `python3 scripts/build-dashboard.py`
2. **Visual verification (MANDATORY):** Run a check that EVERY post has either:
   - `image.png` (for personal photo and AI infographic posts), OR
   - `carousel.pdf` + `carousel-slides/` with slide PNGs (for carousel posts)
   - If ANY post is missing a visual, fix it before reporting. No exceptions.
3. **Quality check:** Verify all 10 posts have:
   - Unique topics (no duplicates)
   - Diverse hooks (no repeated structures)
   - Proper post.md format with "## Post Text (copy-paste ready)" header
   - Format field in post.md matches the actual visual
4. **Report** what was created:
   - List all 10 posts with their number, title, method, format
   - Open the dashboard: `open outputs/dashboard.html`

---

## Post Storage Format

Each post in `posts/NNN-slug/`:

```
post.md           # Metadata + copy-paste ready text (MUST have "## Post Text (copy-paste ready)" header)
image.png          # For photo/infographic posts
carousel.pdf       # For carousel posts
original.md        # Original viral post (if viral replication)
original-image.jpg # Original image (if viral replication)
```

### post.md Template

```markdown
# [Post Title]

**Date created:** YYYY-MM-DD
**Method:** [Viral Replication / Trend Surfing / Pain Point]
**Format:** [Text + Personal Photo / Text + AI Infographic / Carousel]
**Platform:** LinkedIn
**Status:** Ready to publish

## Post Text (copy-paste ready)

[The actual post text goes here — ready to copy and paste into LinkedIn]

## Image Notes

[Description of the image/carousel, which reference was used, photo filename, etc.]

## Original Post (if applicable)

[Link to original, author, engagement metrics]
```

---

## Parallelization Notes

- Ideation for all 3 methods can run in parallel
- Kie.ai image generation calls can be submitted in parallel (submit all, then poll all)
- Carousel PDFs are generated locally and are fast
- Photo copying is instant
- Post text writing is sequential but fast
