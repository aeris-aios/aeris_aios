#!/usr/bin/env python3
"""
Build an HTML dashboard showing all posts in the posts/ directory.
Run this after creating/updating posts to regenerate the dashboard.
Output: outputs/dashboard.html
"""

import os
import base64
import glob
from pathlib import Path

# Auto-detect workspace root (parent of scripts/)
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(WORKSPACE, "posts")
OUTPUT = os.path.join(WORKSPACE, "outputs", "dashboard.html")


def image_to_base64(path):
    ext = Path(path).suffix.lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}.get(ext.lstrip("."), "image/png")
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return f"data:{mime};base64,{data}"


def parse_post_md(path):
    with open(path) as f:
        content = f.read()
    meta = {}
    lines = content.split("\n")
    for line in lines:
        if line.startswith("**") and ":**" in line:
            key = line.split(":**")[0].replace("**", "").strip()
            val = line.split(":**")[1].strip()
            meta[key] = val
    post_text = ""
    in_text = False
    for line in lines:
        if "Post Text" in line or "copy-paste ready" in line.lower():
            in_text = True
            continue
        if in_text:
            post_text += line + "\n"
    return meta, post_text.strip()


def get_carousel_slides(post_dir):
    # Check both root-level slide-*.png and carousel-slides/ subfolder
    slides = sorted(glob.glob(os.path.join(post_dir, "slide-*.png")))
    if not slides:
        slides = sorted(glob.glob(os.path.join(post_dir, "carousel-slides", "slide-*.png")))
    return slides


carousel_counter = [0]

def build_carousel_html(slides):
    carousel_counter[0] += 1
    cid = f"carousel-{carousel_counter[0]}"
    total = len(slides)
    slide_imgs = []
    for i, slide_path in enumerate(slides):
        b64 = image_to_base64(slide_path)
        hidden = ' style="display:none"' if i > 0 else ''
        slide_imgs.append(
            f'<img class="carousel-slide" data-carousel="{cid}" data-index="{i}"{hidden} src="{b64}" alt="Slide {i+1}">'
        )
    dots = []
    for i in range(total):
        active = " active" if i == 0 else ""
        dots.append(f'<button class="dot{active}" data-carousel="{cid}" data-dot="{i}" onclick="carouselGo(\'{cid}\', {i})"></button>')
    dots_html = "".join(dots)
    slides_html = "".join(slide_imgs)
    return f"""
        <div class="carousel" id="{cid}">
            <div class="carousel-stage">
                {slides_html}
                <button class="carousel-arrow arrow-left" onclick="carouselNav('{cid}', -1)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button class="carousel-arrow arrow-right" onclick="carouselNav('{cid}', 1)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <div class="carousel-counter" id="{cid}-counter">1 / {total}</div>
            </div>
            <div class="carousel-dots">{dots_html}</div>
        </div>
    """


def build_card(post_dir):
    slug = os.path.basename(post_dir)
    post_md = os.path.join(post_dir, "post.md")
    image_path = os.path.join(post_dir, "image.png")

    if not os.path.exists(post_md):
        return None

    meta, post_text = parse_post_md(post_md)
    carousel_slides = get_carousel_slides(post_dir)

    visual_html = '<span class="no-visual">--</span>'
    if len(carousel_slides) > 0:
        visual_html = build_carousel_html(carousel_slides)
    elif os.path.exists(image_path):
        visual_html = f'<img src="{image_to_base64(image_path)}" alt="Post image" class="post-image">'

    post_text_html = post_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
    post_num = slug.split("-")[0] if slug[0].isdigit() else slug

    return f"""
    <div class="card">
        <div class="card-header">
            <span class="card-num">{post_num}</span>
            <button class="copy-btn" onclick="copyText(this)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy
            </button>
            <textarea class="hidden-text" style="display:none">{post_text}</textarea>
        </div>
        <div class="card-visual">
            {visual_html}
        </div>
        <div class="card-text">
            <div class="post-text">{post_text_html}</div>
        </div>
    </div>
    """


def build_html():
    carousel_counter[0] = 0
    post_dirs = sorted(glob.glob(os.path.join(POSTS_DIR, "*")))
    post_dirs = [d for d in post_dirs if os.path.isdir(d) and not os.path.basename(d).startswith(".")]

    cards = []
    for post_dir in post_dirs:
        card = build_card(post_dir)
        if card:
            cards.append(card)

    # Build rows of 2
    rows_html = ""
    for i in range(0, len(cards), 2):
        left = cards[i]
        right = cards[i + 1] if i + 1 < len(cards) else '<div class="card empty"></div>'
        rows_html += f'<div class="row">{left}{right}</div>\n'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
            background: #fafafa;
            color: #09090b;
            padding: 32px;
            -webkit-font-smoothing: antialiased;
        }}

        h1 {{
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.025em;
            margin-bottom: 24px;
        }}

        .row {{
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }}

        .card {{
            flex: 1;
            background: #fff;
            border: 1px solid #e4e4e7;
            border-radius: 10px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }}
        .card.empty {{
            border: none;
            background: transparent;
        }}

        .card-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            border-bottom: 1px solid #f4f4f5;
        }}

        .card-num {{
            font-size: 13px;
            font-weight: 700;
            color: #a1a1aa;
            font-variant-numeric: tabular-nums;
        }}

        .card-visual {{
            display: flex;
            justify-content: center;
            align-items: center;
            background: #fafafa;
            min-height: 80px;
        }}

        .card-text {{
            padding: 12px 14px;
            border-top: 1px solid #f4f4f5;
            flex: 1;
        }}

        .post-text {{
            font-size: 14px;
            line-height: 1.6;
            font-weight: 450;
            color: #18181b;
            max-height: 220px;
            overflow-y: auto;
            padding-right: 6px;
        }}
        .post-text::-webkit-scrollbar {{ width: 3px; }}
        .post-text::-webkit-scrollbar-track {{ background: transparent; }}
        .post-text::-webkit-scrollbar-thumb {{ background: #e4e4e7; border-radius: 3px; }}

        .copy-btn {{
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 500;
            font-family: inherit;
            color: #71717a;
            background: #fff;
            border: 1px solid #e4e4e7;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.15s;
        }}
        .copy-btn:hover {{
            background: #f4f4f5;
            color: #09090b;
            border-color: #d4d4d8;
        }}
        .copy-btn.copied {{
            background: #09090b;
            color: #fff;
            border-color: #09090b;
        }}

        .no-visual {{
            color: #d4d4d8;
            padding: 24px;
        }}

        .post-image {{
            max-height: 260px;
            max-width: 100%;
            width: auto;
            border-radius: 0;
            object-fit: contain;
        }}

        /* Carousel */
        .carousel {{
            width: 100%;
        }}
        .carousel-stage {{
            position: relative;
            overflow: hidden;
            background: #f4f4f5;
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        .carousel-slide {{
            display: block;
            max-height: 260px;
            max-width: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
        }}

        .carousel-arrow {{
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.9);
            box-shadow: 0 1px 4px rgba(0,0,0,0.12);
            color: #09090b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            opacity: 0;
            z-index: 2;
        }}
        .carousel-stage:hover .carousel-arrow {{
            opacity: 1;
        }}
        .carousel-arrow:hover {{
            background: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.16);
        }}
        .arrow-left {{ left: 6px; }}
        .arrow-right {{ right: 6px; }}

        .carousel-counter {{
            position: absolute;
            bottom: 6px;
            right: 8px;
            background: rgba(0,0,0,0.6);
            color: #fff;
            font-size: 10px;
            font-weight: 500;
            padding: 2px 7px;
            border-radius: 10px;
            z-index: 2;
            font-variant-numeric: tabular-nums;
        }}

        .carousel-dots {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 6px 0;
        }}
        .dot {{
            width: 5px;
            height: 5px;
            border-radius: 9999px;
            border: none;
            background: #d4d4d8;
            cursor: pointer;
            padding: 0;
            transition: all 0.2s;
        }}
        .dot:hover {{ background: #a1a1aa; }}
        .dot.active {{
            background: #18181b;
            width: 16px;
        }}
    </style>
</head>
<body>
    <h1>Content Dashboard</h1>
    {rows_html}

    <script>
        function copyText(btn) {{
            const textarea = btn.nextElementSibling;
            navigator.clipboard.writeText(textarea.value).then(() => {{
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copied!';
                btn.classList.add('copied');
                setTimeout(() => {{
                    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy';
                    btn.classList.remove('copied');
                }}, 2000);
            }});
        }}

        function carouselNav(carouselId, direction) {{
            const slides = document.querySelectorAll('img[data-carousel="' + carouselId + '"]');
            if (slides.length === 0) return;
            let current = 0;
            slides.forEach((s, i) => {{ if (s.style.display !== 'none') current = i; }});
            const next = Math.max(0, Math.min(slides.length - 1, current + direction));
            if (next === current) return;
            carouselGo(carouselId, next);
        }}

        function carouselGo(carouselId, index) {{
            const slides = document.querySelectorAll('img[data-carousel="' + carouselId + '"]');
            const dots = document.querySelectorAll('button[data-carousel="' + carouselId + '"]');
            const total = slides.length;
            slides.forEach((s, i) => {{ s.style.display = i === index ? 'block' : 'none'; }});
            dots.forEach((d, i) => {{ d.classList.toggle('active', i === index); }});
            document.getElementById(carouselId + '-counter').textContent = (index + 1) + ' / ' + total;
        }}
    </script>
</body>
</html>"""

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        f.write(html)
    print(f"Dashboard built: {OUTPUT}")
    print(f"Posts found: {len(cards)}")


if __name__ == "__main__":
    build_html()
