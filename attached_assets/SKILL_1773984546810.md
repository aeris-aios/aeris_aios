# Carousel Creation Skill

## Purpose
Create LinkedIn carousel posts (PDF format) with a clean, professional style.

## When to Use
- User asks to create a carousel, slide deck, or multi-slide post
- User says "carousel", "slides", "swipe post", "PDF post"

## Visual Style (NON-NEGOTIABLE)

### Brand Adaptation

> **Customize these colors in `scripts/generate-carousel.py`**

- **Background:** Cream (#F5F3EE)
- **Text:** Black (#1A1A1A)
- **Accent:** [YOUR ACCENT COLOR — default: Lime green #C8E64A]
- **Branding:** Dark banner (#1A1A1A) with "[YOUR BRAND]" on cover and CTA slides
- **Typography:** Serif headings (bold), regular subtitles, italic quotes

### Slide Structure

**Cover Slide:**
- Large serif title, centered
- Decorative overlapping circles in accent color (translucent)
- Key phrase in italic for emphasis
- Bottom banner with branding

**Content Slides (one per point):**
- Top: Numbered heading in bold serif + 1-line subtitle
- Center: Simple geometric illustration (circles, dots, lines)
  - Use accent color as highlight
  - Each slide MUST have a different illustration
- Bottom: Italic serif takeaway/insight quote
- Generous whitespace throughout

**CTA Slide (last):**
- "Follow for more" or relevant CTA
- Author name
- Brand banner

### Dimensions
- **1080 x 1350px** (4:5 ratio — LinkedIn carousel standard)

## How to Generate

Use the Python script at `scripts/generate-carousel.py`:

```bash
python3 scripts/generate-carousel.py --json content.json --output posts/NNN-slug/carousel.pdf
```

### Content Structure (JSON)

```json
{
  "title": "The 7 AI Tools That 10x'd My Productivity",
  "title_emphasis": "AI Tools",
  "slides": [
    {
      "number": 1,
      "heading": "Tool Name",
      "subtitle": "One-line description of what it does.",
      "takeaway": "Key insight or quote for this slide."
    }
  ],
  "cta_text": "Follow [YOUR NAME] for more insights.",
  "cta_subtitle": "Repost to help your network."
}
```

## Workflow

1. **Decide topic** — use content ideation or viral replication
2. **Write slide content** — title, numbered points with headings + subtitles + takeaways
3. **Generate PDF** — run the script with the content JSON
4. **Write post text** — mirror the carousel content in the post caption
5. **Save** — store in `posts/NNN-slug/` with carousel.pdf, post.md, original.md
6. **Rebuild dashboard** — `python3 scripts/build-dashboard.py`

## Post Storage

```
posts/NNN-slug/
  post.md           # Metadata + copy-paste ready text
  carousel.pdf      # The carousel PDF for LinkedIn upload
  carousel-slides/  # Auto-generated slide PNGs for preview
  content.json      # Content JSON (for regeneration)
  original.md       # Original viral post (if replicated)
```

## Tips for High-Performing Carousels

- **7-11 slides** is the sweet spot (cover + 5-9 content + CTA)
- **Cover must hook** — use numbers, power words, curiosity gaps
- **One idea per slide** — don't overcrowd
- **Bottom italic quote** should be the ONE thing people remember from that slide
- **Variety in illustrations** — never two slides with the same graphic
- **Post text should preview** the carousel content (not duplicate it word-for-word)
