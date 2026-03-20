---
name: viral-replication
description: Create LinkedIn posts by replicating proven viral content. Use when asked to replicate a viral post, copy a post's structure, create content based on a trending post, or do viral replication. Triggers on phrases like "replicate this post", "viral replication", "copy this format", "steal the hook", "replicate the packaging".
---

# Viral Replication

Replicate proven viral LinkedIn posts by keeping the packaging (hook + visual structure) nearly identical while adapting the topic and applying your visual style and voice.

## Core Principle

**Packaging drives virality, not originality.** When deviating from the viral example, you reduce chances of producing high-quality content dramatically. As David Ogilvy said: "When you wrote your title, you spent 80 cents of your advertising dollar."

Steal the structure. Adapt the substance.

## What to Steal (Keep Nearly Identical)

1. **Text hook** — first 2 lines must mirror the original's wording and structure closely
2. **Post body structure** — same sections, same flow, same CTA mechanic
3. **Image layout** — same element placement, same hierarchy, same information architecture
4. **Image text structure** — similar headline, subtitle, feature sections, CTA placement

## What to Adapt

1. **Topic** — swap to your niche and expertise area
2. **Visual style** — apply your brand style (see Style Guide below), NOT the original's colors/fonts
3. **Voice** — use Adam Robinson's writing style (see `reference/adam-robinson-writing-style.md`)
4. **Personal details** — use your real numbers, experiences, and brand name

## Step-by-Step Process

### Step 1: Source the Viral Post

Find or receive a viral post to replicate. Evaluate by:
- Engagement score (reactions + comments*3 + shares*2)
- Recency (prefer posts from last 7 days)
- Replicability (avoid deep personal stories; prefer frameworks, tools, listicles, skills)
- Niche relevance to your expertise

Save the original post text and image for comparison.

### Step 2: Analyze the Packaging

Document exactly:
- **Hook:** First 2 lines word-for-word
- **Body structure:** Section breakdown (intro, features, social proof, CTA)
- **CTA mechanic:** What readers must do
- **Image layout:** Element positions, hierarchy, sections, text blocks
- **Image style:** Colors, fonts, spacing (note these to AVOID copying — we apply our own)

### Step 3: Write the Post Text

1. Mirror the hook almost verbatim — change only the topic-specific words
2. Follow the same body structure section by section
3. Apply Adam Robinson's writing style:
   - Parenthetical asides that break flow
   - Imperfect punctuation (multiple ??, starting with "And", "But")
   - Real specific numbers (not "many" but "71")
   - Self-deprecating humor
   - Capitalize for EMPHASIS not structure
   - End messy — not every post needs a clean bow
4. Keep the same CTA mechanic

See `reference/adam-robinson-writing-style.md` for full style guide.
See `reference/adam-robinson-top-posts.md` for 50 real examples.

### Step 4: Create the Image

**Two rules that must BOTH be satisfied:**
1. **Style consistency** — every image must match your brand style (colors, fonts, icons, banner)
2. **Layout diversity** — every image must have a DIFFERENT composition/layout from other posts in the feed

Determine the original image type:

**If infographic/graphic — use Kie.ai with reference images:**

ALWAYS generate infographics using Kie.ai API with a style reference image. Never use Pillow alone — it produces flat, template-like results.

```python
import requests, base64, io, json, time
from PIL import Image

API_KEY = "<from .env>"

# 1. Load a style reference (resize to ~512px for API)
img = Image.open("reference/infographic-ref-N.jpeg")  # Pick 1, 2, or 3
img.thumbnail((512, 512), Image.LANCZOS)
buf = io.BytesIO()
img.save(buf, format="JPEG", quality=70)
ref_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"

# 2. Submit with reference_image parameter
resp = requests.post("https://api.kie.ai/api/v1/jobs/createTask",
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json={"model": "nano-banana-pro", "input": {
        "prompt": "<STYLE PREFIX> + <LAYOUT DESCRIPTION> + <CONTENT>",
        "width": 1080, "height": 1350, "image_num": 1,
        "reference_image": ref_b64
    }})
task_id = resp.json()["data"]["taskId"]

# 3. Poll until done
while True:
    time.sleep(5)
    r = requests.get(f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={task_id}",
        headers={"Authorization": f"Bearer {API_KEY}"})
    state = r.json()["data"]["state"]
    if state == "success":
        url = json.loads(r.json()["data"]["resultJson"])["resultUrls"][0]
        img_data = requests.get(url).content
        with open("posts/NNN-slug/image.png", "wb") as f:
            f.write(img_data)
        break
    elif state == "failed":
        break
```

**Style prefix for EVERY prompt (customize this for your brand):**
> [YOUR BRAND] style infographic. Light warm cream off-white background with subtle dot grid. [YOUR ACCENT COLOR] accents. Bold black sans-serif headings. Gray body text. Simple line-art icons. Numbered [YOUR ACCENT COLOR] circle badges. Dark bottom banner with [YOUR BRAND NAME] in white. Clean airy whitespace.

**Achieving layout diversity — rotate through reference images:**
- `infographic-ref-1.jpeg` — Radial/circular layout, items around a central element
- `infographic-ref-2.jpeg` — Scattered numbered items around a large central headline
- `infographic-ref-3.jpeg` — Vertical flowing path with items cascading down

Each new infographic post MUST use a different reference from the previous one.

**If personal photo (original post uses a selfie/portrait):**
- Select a photo from `context/images/` that matches the original's vibe
- Copy the photo directly as `image.png` — do NOT process or overlay text
- The photo IS the image; the post text carries the content

### Step 5: Save in Post Folder

Create `posts/NNN-slug/` containing:
- `post.md` — metadata + copy-paste ready text
- `image.png` — the final image
- `original.md` — the original post's text + metadata
- `original-image.jpg` — the original image for comparison

## Visual Style Guide

> **Customize these values for YOUR brand. Add 3 reference images to `reference/` that match your desired style.**

| Element | Specification |
|---------|--------------|
| Background | Light cream/off-white (#F5F3EE) with subtle dot grid |
| Primary accent | [YOUR ACCENT COLOR — e.g., #C8E64A lime green] |
| Headings | Bold black sans-serif (#1A1A1A) |
| Body text | Dark gray (#4A4A4A) |
| Secondary text | Light gray (#8A8A8A) |
| Cards/sections | Slightly darker cream (#EDEBE6) |
| Bottom banner | Dark (#1A1A1A) with "[YOUR BRAND]" in white |
| Numbered badges | Accent color circles with black numbers |
| Icons | Simple line-art style |
| Spacing | Clean, airy, lots of whitespace |

## Style Consistency + Visual Diversity

**These are equally important and non-negotiable.**

Style consistency means: every image looks like it belongs to the same brand. Same color palette, same typography feel, same quality level, brand banner.

Visual diversity means: no two images in the feed should look like the same template. Different layouts, different compositions, different information architecture.

**How to achieve both:**
- The style reference images share a consistent brand style but each has a completely different layout
- When generating, ALWAYS pass one of these as `reference_image` to Kie.ai — this locks the style
- Rotate which reference you use — this varies the layout
- Describe the specific layout structure in the prompt — this controls composition

**Feed diversity checklist (before creating a new post):**
- Look at the last 3-4 posts in `posts/` — what image types were used?
- Alternate between: infographic, personal photo, personal photo + text
- For infographics, never use the same reference/layout as the previous infographic
- For personal photos, pick different settings (desk, portrait, outdoor, casual)

## Anti-Patterns (Never Do These)

- Do NOT change the hook structure significantly — this ruins the replication
- Do NOT use the original's colors/fonts — always apply your brand style
- Do NOT generate infographics with Pillow alone — always use Kie.ai with reference images
- Do NOT reuse the same layout/composition as another recent post
- Do NOT use dark backgrounds, neon colors, or any palette outside your brand style
- Do NOT add sections the original doesn't have — match the structure
- Do NOT use AI-sounding language ("Here's the thing:", "Let me break it down:", "In today's landscape")
- Do NOT use emojis systematically — occasional is fine, but keep it minimal
- Do NOT include external links (LinkedIn algorithm penalty of -60% reach)
