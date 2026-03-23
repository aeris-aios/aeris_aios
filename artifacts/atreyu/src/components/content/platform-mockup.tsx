/* ─────────────────────────────────────────────────────────────
   Platform iPhone Mockup — Task #6
   Shows the canvas preview inside a realistic iPhone frame with
   platform-specific UI chrome (Reel, Feed, TikTok, LinkedIn,
   X/Twitter, YouTube Shorts, Facebook, etc.)
   Pure CSS/HTML — no external image requests.
───────────────────────────────────────────────────────────── */

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

/** Map format IDs to their platform chrome type.
 *  @param formatId  The FORMATS entry id (e.g. "vertical", "square")
 *  @param platforms Optional platforms string from the format definition
 *                   (e.g. "Instagram · TikTok · YouTube") used for
 *                   inference when the formatId has no explicit mapping.
 */
function getPlatformChrome(
  formatId: string,
  platforms?: string,
): PlatformChromeType {
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
    case "carousel":
      return "linkedin";
    case "landscape":
      return "none";
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

/* ── Shared helpers ── */

function clampCaption(text: string, maxLen = 70): string {
  if (!text) return "";
  const first = text.split(/\n+/)[0].trim();
  return first.length > maxLen ? first.slice(0, maxLen - 1) + "…" : first;
}

function makeHandle(brandName: string): string {
  return "@" + brandName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14);
}

interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  white?: boolean;
}
function ActionBtn({ icon, label, white = true }: ActionBtnProps) {
  const c = white ? "#fff" : "#1a1a1a";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{ fontSize: 16, lineHeight: 1, color: c }}>{icon}</div>
      <span style={{ fontSize: 6.5, color: white ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)", fontWeight: 600 }}>{label}</span>
    </div>
  );
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

/* ── Status bar row (inside screen) ── */
function StatusBar({ dark = false }: { dark?: boolean }) {
  const fg = dark ? "#1a1a1a" : "#fff";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "4px 12px 0",
      zIndex: 20, position: "relative",
    }}>
      <span style={{ fontSize: 7.5, fontWeight: 700, color: fg }}>9:41</span>
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        <svg width="10" height="7" viewBox="0 0 10 7">
          {[0,1,2,3].map(i => (
            <rect key={i} x={i * 2.5} y={7 - (i+1)*1.5 - 1} width="1.8" height={(i+1)*1.5}
              rx="0.5" fill={fg} opacity={i < 4 ? 1 : 0.3} />
          ))}
        </svg>
        <svg width="8" height="6" viewBox="0 0 8 6">
          <path d="M4 5.5a.5.5 0 110-1 .5.5 0 010 1z" fill={fg} />
          <path d="M2 3.5Q3 2 4 2q1 0 2 1.5" stroke={fg} strokeWidth="0.8" fill="none" />
          <path d="M.5 2Q2 .5 4 .5q2 0 3.5 1.5" stroke={fg} strokeWidth="0.8" fill="none" opacity="0.5" />
        </svg>
        <svg width="12" height="6" viewBox="0 0 12 6">
          <rect x="0" y="0.5" width="10" height="5" rx="1.5" stroke={fg} strokeWidth="0.8" fill="none" />
          <rect x="1" y="1.5" width="7" height="3" rx="0.5" fill={fg} />
          <path d="M10.5 2v2" stroke={fg} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PLATFORM CHROME OVERLAYS
════════════════════════════════════════════════════ */

/* ── Instagram Reel / Story chrome ── */
function ReelChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.2) 45%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 60,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
      }} />

      <StatusBar />

      <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
        <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>⊙</span>
        <span style={{ color: "#fff", fontSize: 8, fontWeight: 700, letterSpacing: 0.5 }}>Reels</span>
        <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✕</span>
      </div>

      <div style={{
        position: "absolute", right: 7, bottom: 58,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <div style={{ position: "relative", marginBottom: 2 }}>
          <Avatar initial={initial} size={26} />
          <div style={{
            position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)",
            width: 14, height: 14, borderRadius: "50%",
            background: "#E1306C", display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid #fff",
          }}>
            <span style={{ color: "#fff", fontSize: 9, fontWeight: 900, lineHeight: 1 }}>+</span>
          </div>
        </div>
        <ActionBtn icon="♥" label="1.2K" />
        <ActionBtn icon="💬" label="847" />
        <ActionBtn icon="↗" label="Share" />
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, #2a2a2a, #555)",
          border: "3px solid rgba(255,255,255,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 12, left: 8, right: 42,
        display: "flex", flexDirection: "column", gap: 3, zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Avatar initial={initial} size={18} />
          <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>{handle}</span>
        </div>
        <p style={{
          color: "rgba(255,255,255,0.92)", fontSize: 7.5, margin: 0,
          lineHeight: 1.35, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>{caption}</p>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 7 }}>♫ Original audio</span>
      </div>
    </div>
  );
}

/* ── Instagram Feed chrome ── */
function FeedChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 75%, transparent 100%)",
        paddingBottom: 8,
      }}>
        <StatusBar />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 10px",
        }}>
          <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>‹</span>
          <svg width="16" height="10" viewBox="0 0 32 20" fill="none">
            <rect x="1" y="1" width="14" height="10" rx="1.5" stroke="#fff" strokeWidth="1.5" />
            <path d="M17 4l7-3v12l-7-3V4z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span style={{ color: "#fff", fontSize: 9, letterSpacing: 1 }}>•••</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px 4px" }}>
          <Avatar initial={initial} size={20} />
          <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{handle.replace("@", "")}</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 6.5, marginLeft: "auto" }}>Following</span>
          <span style={{ color: "#fff", fontSize: 9 }}>•••</span>
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "rgba(0,0,0,0.78)",
        padding: "6px 10px 8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: "#fff" }}>♥</span>
          <span style={{ fontSize: 11, color: "#fff" }}>💬</span>
          <span style={{ fontSize: 11, color: "#fff" }}>↗</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "#fff" }}>🔖</span>
        </div>
        <p style={{ color: "#fff", fontSize: 7, fontWeight: 700, margin: "0 0 2px" }}>1,234 likes</p>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 6.5, margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          <strong>{handle.replace("@", "")}</strong> {caption}
        </p>
      </div>
    </div>
  );
}

/* ── TikTok chrome ── */
function TikTokChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.08) 50%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 50,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
      }} />

      <StatusBar />

      {/* Top nav: Following | For You */}
      <div style={{ position: "absolute", top: 14, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, fontWeight: 600 }}>Following</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>For You</span>
          <div style={{ width: 16, height: 2, borderRadius: 1, background: "#fff" }} />
        </div>
        {/* TikTok search icon */}
        <span style={{ position: "absolute", right: 10, color: "#fff", fontSize: 11 }}>🔍</span>
      </div>

      {/* Right action column */}
      <div style={{
        position: "absolute", right: 7, bottom: 62,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <div style={{ position: "relative", marginBottom: 4 }}>
          <Avatar initial={initial} size={26} color="#000" />
          <div style={{
            position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
            width: 14, height: 14, borderRadius: "50%",
            background: "#FE2C55", display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #fff",
          }}>
            <span style={{ color: "#fff", fontSize: 9, fontWeight: 900, lineHeight: 1 }}>+</span>
          </div>
        </div>
        <ActionBtn icon="❤️" label="28.4K" />
        <ActionBtn icon="💬" label="1.2K" />
        <ActionBtn icon="↗" label="Share" />
        {/* TikTok spinning disc */}
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "linear-gradient(135deg, #161823, #434343)",
          border: "4px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>

      {/* Bottom: user info + caption + sound */}
      <div style={{ position: "absolute", bottom: 10, left: 8, right: 44, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>{handle}</span>
        <p style={{
          color: "rgba(255,255,255,0.92)", fontSize: 7.5, margin: 0, lineHeight: 1.35,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>{caption}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 7 }}>♫</span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 6.5, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 100 }}>Original sound – {handle}</span>
        </div>
      </div>
    </div>
  );
}

/* ── LinkedIn chrome ── */
function LinkedInChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  const LI_BLUE = "#0A66C2";
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#f3f2ef" }}>
      {/* Status bar (dark text on light bg) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 0" }}>
        <span style={{ fontSize: 7.5, fontWeight: 700, color: "#1a1a1a" }}>9:41</span>
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <svg width="10" height="7" viewBox="0 0 10 7">
            {[0,1,2,3].map(i => (
              <rect key={i} x={i * 2.5} y={7 - (i+1)*1.5 - 1} width="1.8" height={(i+1)*1.5} rx="0.5" fill="#1a1a1a" />
            ))}
          </svg>
          <svg width="12" height="6" viewBox="0 0 12 6">
            <rect x="0" y="0.5" width="10" height="5" rx="1.5" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
            <rect x="1" y="1.5" width="7" height="3" rx="0.5" fill="#1a1a1a" />
          </svg>
        </div>
      </div>

      {/* LinkedIn top bar */}
      <div style={{
        background: "#fff", borderBottom: "0.5px solid #e0e0e0",
        padding: "4px 8px 4px",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {/* LinkedIn "in" logo */}
        <div style={{ width: 14, height: 14, borderRadius: 3, background: LI_BLUE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontSize: 9, fontWeight: 900, lineHeight: 1 }}>in</span>
        </div>
        <div style={{ flex: 1, background: "#eef3f8", borderRadius: 10, padding: "2px 6px" }}>
          <span style={{ color: "#999", fontSize: 6 }}>Search</span>
        </div>
        <span style={{ fontSize: 9, color: "#444" }}>💬</span>
      </div>

      {/* Post card */}
      <div style={{ background: "#fff", marginTop: 4, padding: "8px 8px 0" }}>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 5 }}>
          <Avatar initial={initial} size={22} color={LI_BLUE} />
          <div>
            <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: "#000" }}>{handle.replace("@", "")}</p>
            <p style={{ margin: 0, fontSize: 6, color: "#666" }}>Marketing Professional • 1st</p>
            <p style={{ margin: 0, fontSize: 6, color: "#999" }}>2h • 🌐</p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ fontSize: 9, color: LI_BLUE, fontWeight: 700 }}>+ Follow</span>
          </div>
        </div>

        {/* Post text */}
        <p style={{
          fontSize: 7, color: "#1a1a1a", margin: "0 0 5px", lineHeight: 1.4,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>{caption || "Here's something worth sharing with your network…"}</p>
      </div>

      {/* Post image area (shows behind the chrome in the screen) */}
      {/* Reactions bar */}
      <div style={{ background: "#fff", borderTop: "0.5px solid #e0e0e0", padding: "4px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 3 }}>
          <span style={{ fontSize: 8 }}>👍</span>
          <span style={{ fontSize: 8 }}>❤️</span>
          <span style={{ fontSize: 8 }}>💡</span>
          <span style={{ fontSize: 6, color: "#666", marginLeft: 2 }}>3,421 · 142 comments</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "0.5px solid #e5e5e5", paddingTop: 4 }}>
          {["👍 Like", "💬 Comment", "↗ Share"].map(lbl => (
            <span key={lbl} style={{ fontSize: 6, color: "#666", fontWeight: 600 }}>{lbl}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── X / Twitter chrome ── */
function TwitterChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#fff" }}>
      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 0" }}>
        <span style={{ fontSize: 7.5, fontWeight: 700, color: "#1a1a1a" }}>9:41</span>
        <svg width="12" height="6" viewBox="0 0 12 6">
          <rect x="0" y="0.5" width="10" height="5" rx="1.5" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
          <rect x="1" y="1.5" width="7" height="3" rx="0.5" fill="#1a1a1a" />
        </svg>
      </div>

      {/* X top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px 4px", borderBottom: "0.5px solid #e7e7e7" }}>
        {/* X logo */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#000">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {/* Tweet card */}
      <div style={{ padding: "8px 8px 0" }}>
        <div style={{ display: "flex", gap: 5 }}>
          <Avatar initial={initial} size={22} color="#1DA1F2" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: "#0f1419" }}>{handle.replace("@", "").slice(0, 10)}</span>
              <span style={{ fontSize: 6.5, color: "#536471" }}>{handle}</span>
              <span style={{ fontSize: 6.5, color: "#536471", marginLeft: "auto" }}>· 2h</span>
            </div>
            <p style={{
              fontSize: 7.5, color: "#0f1419", margin: "2px 0 0", lineHeight: 1.4,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 4, WebkitBoxOrient: "vertical",
            } as React.CSSProperties}>{caption || "Tweet text preview…"}</p>
          </div>
        </div>
      </div>

      {/* Post image spacer (image renders in screen behind) */}
      <div style={{ margin: "6px 8px 0", height: 60, borderRadius: 8, background: "#f7f9f9", overflow: "hidden" }}>
        {/* image shows through the screen layer */}
      </div>

      {/* Action row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "5px 8px", borderBottom: "0.5px solid #e7e7e7" }}>
        {[
          { icon: "💬", label: "48" },
          { icon: "🔁", label: "312" },
          { icon: "♥", label: "2.1K" },
          { icon: "📊", label: "84K" },
          { icon: "↗", label: "" },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 9, color: "#536471" }}>{a.icon}</span>
            {a.label && <span style={{ fontSize: 6, color: "#536471" }}>{a.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── YouTube Shorts chrome ── */
function YoutubeShortsChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 50,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
      }} />

      <StatusBar />

      <div style={{ position: "absolute", top: 14, left: 8, right: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 8, background: "#FF0000", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "7px solid #fff" }} />
          </div>
          <span style={{ color: "#fff", fontSize: 7, fontWeight: 700, letterSpacing: 0.3 }}>Shorts</span>
        </div>
        <span style={{ color: "#fff", fontSize: 11 }}>✕</span>
      </div>

      <div style={{
        position: "absolute", right: 7, bottom: 65,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <ActionBtn icon="👍" label="4.7K" />
        <ActionBtn icon="👎" label="" />
        <ActionBtn icon="💬" label="1.3K" />
        <ActionBtn icon="↗" label="Share" />
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1a1a, #444)",
          border: "3px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Avatar initial={initial} size={10} />
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 12, left: 8, right: 42, zIndex: 2, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Avatar initial={initial} size={20} color="#FF0000" />
          <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{handle}</span>
          <div style={{ marginLeft: 4, background: "#fff", borderRadius: 3, padding: "1px 5px" }}>
            <span style={{ color: "#000", fontSize: 6.5, fontWeight: 700 }}>Subscribe</span>
          </div>
        </div>
        <p style={{
          color: "rgba(255,255,255,0.92)", fontSize: 7.5, margin: 0, lineHeight: 1.35,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>{caption}</p>
      </div>
    </div>
  );
}

/* ── Facebook chrome ── */
function FacebookChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  const FB_BLUE = "#1877F2";
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#f0f2f5" }}>
      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 0" }}>
        <span style={{ fontSize: 7.5, fontWeight: 700, color: "#1a1a1a" }}>9:41</span>
        <svg width="12" height="6" viewBox="0 0 12 6">
          <rect x="0" y="0.5" width="10" height="5" rx="1.5" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
          <rect x="1" y="1.5" width="7" height="3" rx="0.5" fill="#1a1a1a" />
        </svg>
      </div>

      {/* Facebook top bar */}
      <div style={{
        background: "#fff", padding: "3px 8px 4px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "0.5px solid #e4e6eb",
      }}>
        {/* FB logo text */}
        <span style={{ color: FB_BLUE, fontSize: 13, fontWeight: 900, letterSpacing: -0.5 }}>f</span>
        <div style={{ background: "#f0f2f5", borderRadius: 12, padding: "2px 8px" }}>
          <span style={{ fontSize: 6, color: "#999" }}>🔍 Search</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <span style={{ fontSize: 9, color: "#444" }}>💬</span>
          <span style={{ fontSize: 9, color: "#444" }}>🔔</span>
        </div>
      </div>

      {/* Post card */}
      <div style={{ background: "#fff", marginTop: 4 }}>
        {/* Post header */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 8px 4px" }}>
          <Avatar initial={initial} size={22} color={FB_BLUE} />
          <div>
            <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: "#050505" }}>{handle.replace("@", "")}</p>
            <p style={{ margin: 0, fontSize: 6, color: "#65676b" }}>2 h · 🌐</p>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#65676b" }}>•••</span>
        </div>

        {/* Post text */}
        <p style={{
          fontSize: 7, color: "#050505", margin: "0 8px 5px", lineHeight: 1.4,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>{caption || "Check out our latest content…"}</p>
      </div>

      {/* Image is in the screen layer behind — the card text sits on top */}
      {/* Reactions bar */}
      <div style={{ background: "#fff", borderTop: "0.5px solid #e4e6eb", padding: "3px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 1, marginBottom: 2 }}>
          <span style={{ fontSize: 7 }}>👍</span>
          <span style={{ fontSize: 7 }}>❤️</span>
          <span style={{ fontSize: 7 }}>😂</span>
          <span style={{ fontSize: 6, color: "#65676b", marginLeft: 2 }}>1,847 · 92 comments</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", borderTop: "0.5px solid #e4e6eb", paddingTop: 3 }}>
          {[
            { icon: "👍", label: "Like" },
            { icon: "💬", label: "Comment" },
            { icon: "↗", label: "Share" },
          ].map(a => (
            <span key={a.label} style={{ fontSize: 6.5, color: "#65676b", fontWeight: 600 }}>{a.icon} {a.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Plain chrome — just image, no overlay ── */
function PlainChrome() {
  return null;
}

/* ═══════════════════════════════════════════════════════
   MAIN: PlatformMockup
═══════════════════════════════════════════════════════ */

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

  /* Landscape / carousel: bare image (no phone frame) */
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

  /* LinkedIn / Twitter / Facebook: card-style chrome fills the panel */
  if (chrome === "linkedin" || chrome === "twitter" || chrome === "facebook") {
    const screenH = Math.min(320, Math.round((PHONE_W - SIDE_BEZEL * 2) * (canvasH / canvasW)) + TOP_BEZEL + BOTTOM_BEZEL);
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ borderRadius: 0 }}>
        {/* Background image fills behind the card chrome */}
        {imgSrc && !loading && (
          <img
            src={imgSrc}
            alt="Preview"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.25 }}
          />
        )}
        {/* Platform card chrome overlay */}
        <div style={{ position: "absolute", inset: 0 }}>
          {chrome === "linkedin" && <LinkedInChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "twitter" && <TwitterChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "facebook" && <FacebookChrome handle={handle} caption={caption} initial={initial} />}
        </div>
        {savedImage && (
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", zIndex: 20 }}>
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm">
              Modified
            </span>
          </div>
        )}
      </div>
    );
  }

  const screenW = PHONE_W - SIDE_BEZEL * 2;
  const screenH = Math.round(screenW * (canvasH / canvasW));
  const phoneH = TOP_BEZEL + screenH + BOTTOM_BEZEL;

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ padding: "12px 0" }}
    >
      {/* ── iPhone outer shell ── */}
      <div
        style={{
          width: PHONE_W,
          height: phoneH,
          borderRadius: 36,
          background: "linear-gradient(160deg, #2e2e32 0%, #1a1a1e 60%, #111114 100%)",
          boxShadow: [
            "inset 0 0 0 1px rgba(255,255,255,0.10)",
            "inset 0 2px 4px rgba(255,255,255,0.04)",
            "0 28px 80px rgba(0,0,0,0.55)",
            "0 8px 20px rgba(0,0,0,0.4)",
          ].join(", "),
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Power button */}
        <div style={{
          position: "absolute", right: -3, top: "28%",
          width: 3, height: 26, borderRadius: "0 2px 2px 0",
          background: "#3a3a3e",
        }} />
        {/* Volume buttons */}
        {[20, 50].map(top => (
          <div key={top} style={{
            position: "absolute", left: -3, top: `${top}%`,
            width: 3, height: 20, borderRadius: "2px 0 0 2px",
            background: "#3a3a3e",
          }} />
        ))}

        {/* Dynamic Island */}
        <div style={{
          position: "absolute",
          top: TOP_BEZEL + 5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 60, height: 9,
          borderRadius: 8,
          background: "#000",
          zIndex: 30,
        }} />

        {/* ── Screen ── */}
        <div
          style={{
            position: "absolute",
            top: TOP_BEZEL,
            left: SIDE_BEZEL,
            right: SIDE_BEZEL,
            height: screenH,
            borderRadius: 24,
            overflow: "hidden",
            background: "#000",
          }}
        >
          {loading ? (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.7)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
            }} />
          )}

          {/* Platform chrome overlay */}
          {chrome === "reel"          && <ReelChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "feed"          && <FeedChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "tiktok"        && <TikTokChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "youtube_short" && <YoutubeShortsChrome handle={handle} caption={caption} initial={initial} />}
          {chrome === "iphone_plain"  && <PlainChrome />}
        </div>

        {/* Home indicator */}
        <div style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 72, height: 4,
          borderRadius: 4,
          background: "rgba(255,255,255,0.35)",
        }} />
      </div>

      {/* Saved badge overlay */}
      {savedImage && (
        <div style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}>
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm">
            Modified
          </span>
        </div>
      )}
    </div>
  );
}
