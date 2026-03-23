export type PlatformChromeType =
  | "reel"
  | "feed"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "youtube_short"
  | "facebook"
  | "iphone_plain"
  | "none";

function getPlatformChrome(formatId: string, platforms?: string): PlatformChromeType {
  switch (formatId) {
    case "vertical":
    case "story":
      return "reel";
    case "square":
    case "portrait":
      return "feed";
    case "youtube_short":
      return "youtube_short";
    case "linkedin_post":
      return "linkedin";
    case "carousel":
      return "none";
    case "landscape":
      return "iphone_plain";
    default: {
      if (!platforms) return "iphone_plain";
      const p = platforms.toLowerCase();
      if (p.includes("tiktok")) return "tiktok";
      if (p.includes("twitter") || p.includes(" x ") || p.includes("x/")) return "twitter";
      if (p.includes("facebook")) return "facebook";
      if (p.includes("linkedin")) return "linkedin";
      if (p.includes("youtube")) return "youtube_short";
      if (p.includes("instagram")) return "feed";
      return "iphone_plain";
    }
  }
}

/* ── Helpers ── */

function clampCaption(text: string, maxLen = 70): string {
  if (!text) return "";
  const sentenceMatch = text.match(/[^.!?]*[.!?]/);
  const first = (sentenceMatch ? sentenceMatch[0] : text.split(/\n+/)[0]).trim();
  return first.length > maxLen ? first.slice(0, maxLen - 1) + "…" : first;
}

function makeHandle(brandName: string): string {
  return "@" + brandName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14);
}

function Avatar({ initial, size = 26, color = "#833ab4" }: { initial: string; size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, #fd1d1d, #fcb045)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid #fff", flexShrink: 0,
    }}>
      <span style={{ color: "#fff", fontSize: size * 0.38, fontWeight: 700 }}>{initial}</span>
    </div>
  );
}

interface ActionBtnProps { icon: React.ReactNode; label: string; }
function ActionBtn({ icon, label }: ActionBtnProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{ fontSize: 14, lineHeight: 1, color: "#fff" }}>{icon}</div>
      <span style={{ fontSize: 6, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  const fg = dark ? "#1a1a1a" : "#fff";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 0", zIndex: 20, position: "relative" }}>
      <span style={{ fontSize: 7, fontWeight: 700, color: fg }}>9:41</span>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        <svg width="9" height="6" viewBox="0 0 10 7">
          {[0,1,2,3].map(i => <rect key={i} x={i*2.5} y={7-(i+1)*1.5-1} width="1.8" height={(i+1)*1.5} rx="0.5" fill={fg} />)}
        </svg>
        <svg width="11" height="5" viewBox="0 0 12 6">
          <rect x="0" y="0.5" width="10" height="5" rx="1.5" stroke={fg} strokeWidth="0.8" fill="none" />
          <rect x="1" y="1.5" width="7" height="3" rx="0.5" fill={fg} />
          <path d="M10.5 2v2" stroke={fg} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

/* ── Instagram Reel / Story ── */
function ReelChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.18) 45%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 52, background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }} />
      <StatusBar />
      <div style={{ position: "absolute", top: 14, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <span style={{ color: "#fff", fontSize: 12 }}>⊙</span>
        <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5 }}>Reels</span>
        <span style={{ color: "#fff", fontSize: 11 }}>✕</span>
      </div>
      <div style={{ position: "absolute", right: 6, bottom: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", marginBottom: 2 }}>
          <Avatar initial={initial} size={24} />
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 13, height: 13, borderRadius: "50%", background: "#E1306C", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #fff" }}>
            <span style={{ color: "#fff", fontSize: 8, fontWeight: 900, lineHeight: 1 }}>+</span>
          </div>
        </div>
        <ActionBtn icon="♥" label="1.2K" />
        <ActionBtn icon="💬" label="847" />
        <ActionBtn icon="↗" label="Share" />
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#2a2a2a,#555)", border: "3px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 10, left: 6, right: 36, display: "flex", flexDirection: "column", gap: 2.5, zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Avatar initial={initial} size={16} />
          <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{handle}</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 7, margin: 0, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{caption}</p>
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 6.5 }}>♫ Original audio</span>
      </div>
    </div>
  );
}

/* ── Instagram Feed ── */
function FeedChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.5) 75%, transparent 100%)", paddingBottom: 6 }}>
        <StatusBar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 8px" }}>
          <span style={{ color: "#fff", fontSize: 9 }}>‹</span>
          <span style={{ color: "#fff", fontSize: 7, fontWeight: 700, letterSpacing: 0.5 }}>Instagram</span>
          <span style={{ color: "#fff", fontSize: 8, letterSpacing: 1 }}>•••</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px 3px" }}>
          <Avatar initial={initial} size={18} />
          <span style={{ color: "#fff", fontSize: 7, fontWeight: 700 }}>{handle.replace("@", "")}</span>
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 6, marginLeft: "auto" }}>Following</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.76)", padding: "5px 8px 7px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: "#fff" }}>♥</span>
          <span style={{ fontSize: 10, color: "#fff" }}>💬</span>
          <span style={{ fontSize: 10, color: "#fff" }}>↗</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "#fff" }}>🔖</span>
        </div>
        <p style={{ color: "#fff", fontSize: 6.5, fontWeight: 700, margin: "0 0 1.5px" }}>1,234 likes</p>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 6, margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          <strong>{handle.replace("@", "")}</strong> {caption}
        </p>
      </div>
    </div>
  );
}

/* ── TikTok ── */
function TikTokChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.08) 50%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 46, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
      <StatusBar />
      <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 7.5, fontWeight: 600 }}>Following</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>For You</span>
          <div style={{ width: 14, height: 2, borderRadius: 1, background: "#fff" }} />
        </div>
        <span style={{ position: "absolute", right: 8, color: "#fff", fontSize: 10 }}>🔍</span>
      </div>
      <div style={{ position: "absolute", right: 5, bottom: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", marginBottom: 3 }}>
          <Avatar initial={initial} size={24} color="#000" />
          <div style={{ position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)", width: 13, height: 13, borderRadius: "50%", background: "#FE2C55", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff" }}>
            <span style={{ color: "#fff", fontSize: 8, fontWeight: 900, lineHeight: 1 }}>+</span>
          </div>
        </div>
        <ActionBtn icon="❤️" label="28K" />
        <ActionBtn icon="💬" label="1.2K" />
        <ActionBtn icon="↗" label="Share" />
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#161823,#434343)", border: "4px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 8, left: 6, right: 40, display: "flex", flexDirection: "column", gap: 2.5 }}>
        <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{handle}</span>
        <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 7, margin: 0, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{caption}</p>
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 6.5 }}>♫ Original sound – {handle}</span>
      </div>
    </div>
  );
}

/* ── YouTube Shorts ── */
function YoutubeShortsChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 46, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }} />
      <StatusBar />
      <div style={{ position: "absolute", top: 12, left: 6, right: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 11, height: 7.5, background: "#FF0000", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "3.5px solid transparent", borderBottom: "3.5px solid transparent", borderLeft: "6px solid #fff" }} />
          </div>
          <span style={{ color: "#fff", fontSize: 7, fontWeight: 700, letterSpacing: 0.3 }}>Shorts</span>
        </div>
        <span style={{ color: "#fff", fontSize: 10 }}>✕</span>
      </div>
      <div style={{ position: "absolute", right: 5, bottom: 58, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <ActionBtn icon="👍" label="4.7K" />
        <ActionBtn icon="👎" label="" />
        <ActionBtn icon="💬" label="1.3K" />
        <ActionBtn icon="↗" label="Share" />
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#1a1a1a,#444)", border: "3px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Avatar initial={initial} size={9} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 10, left: 6, right: 38, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Avatar initial={initial} size={18} color="#FF0000" />
          <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{handle}</span>
          <div style={{ marginLeft: 3, background: "#fff", borderRadius: 3, padding: "1px 4px" }}>
            <span style={{ color: "#000", fontSize: 6, fontWeight: 700 }}>Subscribe</span>
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 7, margin: 0, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{caption}</p>
      </div>
    </div>
  );
}

/* ── LinkedIn (rendered inside iPhone screen) ── */
function LinkedInChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  const LI = "#0A66C2";
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#f3f2ef", overflowY: "hidden" }}>
      <StatusBar dark />
      <div style={{ background: "#fff", padding: "3px 7px 3px", display: "flex", alignItems: "center", gap: 5, borderBottom: "0.5px solid #ddd" }}>
        <div style={{ width: 12, height: 12, borderRadius: 2, background: LI, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontSize: 8, fontWeight: 900 }}>in</span>
        </div>
        <div style={{ flex: 1, background: "#eef3f8", borderRadius: 8, padding: "1.5px 5px" }}>
          <span style={{ color: "#999", fontSize: 5.5 }}>Search</span>
        </div>
        <span style={{ fontSize: 8, color: "#444" }}>💬</span>
      </div>
      <div style={{ background: "#fff", marginTop: 3, padding: "6px 7px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 4 }}>
          <Avatar initial={initial} size={19} color={LI} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 7, fontWeight: 700, color: "#000" }}>{handle.replace("@", "")}</p>
            <p style={{ margin: 0, fontSize: 5.5, color: "#999" }}>2h · 🌐</p>
          </div>
          <span style={{ fontSize: 7, color: LI, fontWeight: 700, flexShrink: 0 }}>+ Follow</span>
        </div>
        <p style={{ fontSize: 6.5, color: "#1a1a1a", margin: "0 0 4px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{caption || "Here's something worth sharing with your network…"}</p>
      </div>
      <div style={{ background: "#fff", borderTop: "0.5px solid #e0e0e0", padding: "3px 7px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 1.5, marginBottom: 2 }}>
          <span style={{ fontSize: 7 }}>👍</span><span style={{ fontSize: 7 }}>❤️</span><span style={{ fontSize: 7 }}>💡</span>
          <span style={{ fontSize: 5.5, color: "#666", marginLeft: 2 }}>3,421 · 142 comments</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "0.5px solid #e8e8e8", paddingTop: 3 }}>
          {["👍 Like","💬 Comment","↗ Share"].map(l => <span key={l} style={{ fontSize: 5.5, color: "#666", fontWeight: 600 }}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ── X / Twitter (rendered inside iPhone screen) ── */
function TwitterChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#fff" }}>
      <StatusBar dark />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3px 7px 3px", borderBottom: "0.5px solid #e7e7e7" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#000">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      <div style={{ padding: "5px 7px 0" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <Avatar initial={initial} size={19} color="#1DA1F2" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
              <span style={{ fontSize: 7, fontWeight: 700, color: "#0f1419" }}>{handle.replace("@","").slice(0,10)}</span>
              <span style={{ fontSize: 6, color: "#536471" }}>{handle} · 2h</span>
            </div>
            <p style={{ fontSize: 7, color: "#0f1419", margin: "2px 0 0", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{caption || "Tweet text preview…"}</p>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "4px 7px", borderTop: "0.5px solid #e7e7e7", marginTop: 5 }}>
        {[["💬","48"],["🔁","312"],["♥","2.1K"],["📊","84K"],["↗",""]].map(([ic,lb],i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <span style={{ fontSize: 8, color: "#536471" }}>{ic}</span>
            {lb && <span style={{ fontSize: 5.5, color: "#536471" }}>{lb}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Facebook (rendered inside iPhone screen) ── */
function FacebookChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  const FB = "#1877F2";
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#f0f2f5" }}>
      <StatusBar dark />
      <div style={{ background: "#fff", padding: "3px 7px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid #e4e6eb" }}>
        <span style={{ color: FB, fontSize: 12, fontWeight: 900, letterSpacing: -0.5 }}>f</span>
        <div style={{ background: "#f0f2f5", borderRadius: 10, padding: "1.5px 6px" }}>
          <span style={{ fontSize: 5.5, color: "#999" }}>🔍 Search</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontSize: 8, color: "#444" }}>💬</span>
          <span style={{ fontSize: 8, color: "#444" }}>🔔</span>
        </div>
      </div>
      <div style={{ background: "#fff", marginTop: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 7px 3px" }}>
          <Avatar initial={initial} size={19} color={FB} />
          <div>
            <p style={{ margin: 0, fontSize: 7, fontWeight: 700, color: "#050505" }}>{handle.replace("@","")}</p>
            <p style={{ margin: 0, fontSize: 5.5, color: "#65676b" }}>2h · 🌐</p>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 8, color: "#65676b" }}>•••</span>
        </div>
        <p style={{ fontSize: 6.5, color: "#050505", margin: "0 7px 4px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{caption || "Check out our latest content…"}</p>
      </div>
      <div style={{ background: "#fff", borderTop: "0.5px solid #e4e6eb", padding: "3px 7px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 1.5, marginBottom: 2 }}>
          <span style={{ fontSize: 7 }}>👍</span><span style={{ fontSize: 7 }}>❤️</span><span style={{ fontSize: 7 }}>😂</span>
          <span style={{ fontSize: 5.5, color: "#65676b", marginLeft: 2 }}>1,847 · 92 comments</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "0.5px solid #e4e6eb", paddingTop: 3 }}>
          {[["👍","Like"],["💬","Comment"],["↗","Share"]].map(([ic,lb]) => (
            <span key={lb} style={{ fontSize: 5.5, color: "#65676b", fontWeight: 600 }}>{ic} {lb}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */

interface PlatformMockupProps {
  previewUrl: string | null;
  savedImage?: string | null;
  formatId: string;
  platforms?: string;
  canvasW: number;
  canvasH: number;
  brandName: string;
  captionText: string;
  loading?: boolean;
}

const PHONE_W = 172;
const SIDE_BEZEL = 11;
const TOP_BEZEL = 12;
const BOTTOM_BEZEL = 22;

export function PlatformMockup({
  previewUrl,
  savedImage,
  formatId,
  platforms,
  canvasW,
  canvasH,
  brandName,
  captionText,
  loading = false,
}: PlatformMockupProps) {
  const chrome = getPlatformChrome(formatId, platforms);
  const imgSrc = savedImage || previewUrl;
  const handle = makeHandle(brandName);
  const initial = brandName[0]?.toUpperCase() ?? "A";
  const caption = clampCaption(captionText);

  /* Carousel: skip mockup entirely — keep existing carousel UI */
  if (chrome === "none") {
    return (
      <div className="w-full h-full flex items-center justify-center p-3">
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: `${canvasW}/${canvasH}` }}>
          {loading ? (
            <div className="w-full h-full bg-muted/30 animate-pulse rounded-xl" />
          ) : imgSrc ? (
            <img src={imgSrc} alt="Preview" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <div className="w-full h-full bg-muted/20 rounded-xl" />
          )}
        </div>
      </div>
    );
  }

  const screenW = PHONE_W - SIDE_BEZEL * 2;
  const screenH = Math.round(screenW * (canvasH / canvasW));
  const phoneH = TOP_BEZEL + screenH + BOTTOM_BEZEL;

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ padding: "12px 0" }}>
      {/* iPhone outer shell */}
      <div style={{
        width: PHONE_W, height: phoneH, borderRadius: 36,
        background: "linear-gradient(160deg,#2e2e32 0%,#1a1a1e 60%,#111114 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10),inset 0 2px 4px rgba(255,255,255,0.04),0 28px 80px rgba(0,0,0,0.55),0 8px 20px rgba(0,0,0,0.4)",
        position: "relative", flexShrink: 0,
      }}>
        {/* Side buttons */}
        <div style={{ position: "absolute", right: -3, top: "28%", width: 3, height: 26, borderRadius: "0 2px 2px 0", background: "#3a3a3e" }} />
        {[20, 50].map(t => <div key={t} style={{ position: "absolute", left: -3, top: `${t}%`, width: 3, height: 20, borderRadius: "2px 0 0 2px", background: "#3a3a3e" }} />)}

        {/* Dynamic Island */}
        <div style={{ position: "absolute", top: TOP_BEZEL + 5, left: "50%", transform: "translateX(-50%)", width: 58, height: 8, borderRadius: 8, background: "#000", zIndex: 30 }} />

        {/* Screen */}
        <div style={{ position: "absolute", top: TOP_BEZEL, left: SIDE_BEZEL, right: SIDE_BEZEL, height: screenH, borderRadius: 24, overflow: "hidden", background: "#000" }}>
          {/* Background image */}
          {loading ? (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a1a2e,#16213e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.18)", borderTopColor: "rgba(255,255,255,0.7)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : imgSrc ? (
            <img src={imgSrc} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" }} />
          )}

          {/* Platform chrome overlaid on the image */}
          {chrome === "reel"          && <ReelChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "feed"          && <FeedChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "tiktok"        && <TikTokChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "youtube_short" && <YoutubeShortsChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "linkedin"      && <LinkedInChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "twitter"       && <TwitterChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "facebook"      && <FacebookChrome handle={handle} caption={caption} initial={initial} />}
          {/* iphone_plain: no overlay — image fills screen directly */}
        </div>

        {/* Home indicator */}
        <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 70, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.32)" }} />
      </div>

      {/* Modified badge */}
      {savedImage && (
        <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm">
            Modified
          </span>
        </div>
      )}
    </div>
  );
}
