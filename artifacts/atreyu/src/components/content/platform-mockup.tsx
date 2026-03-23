/* ─────────────────────────────────────────────────────────────
   Platform iPhone Mockup — Task #6
   Shows the canvas preview inside a realistic iPhone frame with
   platform-specific UI chrome (Reel, Feed, YT Shorts, etc.)
   Pure CSS/HTML — no external image requests.
───────────────────────────────────────────────────────────── */

export type PlatformChromeType =
  | "reel"
  | "feed"
  | "youtube_short"
  | "iphone_plain"
  | "none";

/** Map format IDs to their platform chrome type */
export function getPlatformChrome(formatId: string): PlatformChromeType {
  if (formatId === "vertical" || formatId === "story") return "reel";
  if (formatId === "square" || formatId === "portrait") return "feed";
  if (formatId === "youtube_short") return "youtube_short";
  if (formatId === "landscape" || formatId === "carousel") return "none";
  return "iphone_plain";
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
        {/* Signal bars */}
        <svg width="10" height="7" viewBox="0 0 10 7">
          {[0,1,2,3].map(i => (
            <rect key={i} x={i * 2.5} y={7 - (i+1)*1.5 - 1} width="1.8" height={(i+1)*1.5}
              rx="0.5" fill={fg} opacity={i < 4 ? 1 : 0.3} />
          ))}
        </svg>
        {/* Wifi */}
        <svg width="8" height="6" viewBox="0 0 8 6">
          <path d="M4 5.5a.5.5 0 110-1 .5.5 0 010 1z" fill={fg} />
          <path d="M2 3.5Q3 2 4 2q1 0 2 1.5" stroke={fg} strokeWidth="0.8" fill="none" />
          <path d="M.5 2Q2 .5 4 .5q2 0 3.5 1.5" stroke={fg} strokeWidth="0.8" fill="none" opacity="0.5" />
        </svg>
        {/* Battery */}
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
      {/* Bottom gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.2) 45%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Top gradient for readability */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 60,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
      }} />

      {/* Status bar */}
      <StatusBar />

      {/* Top bar: Camera | Reels | X */}
      <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
        <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>⊙</span>
        <span style={{ color: "#fff", fontSize: 8, fontWeight: 700, letterSpacing: 0.5 }}>Reels</span>
        <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✕</span>
      </div>

      {/* Right action column */}
      <div style={{
        position: "absolute", right: 7, bottom: 58,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        {/* Avatar with follow + */}
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
        {/* Music disc */}
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, #2a2a2a, #555)",
          border: "3px solid rgba(255,255,255,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>

      {/* Bottom left: handle + caption + audio */}
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
      {/* Top bar: dark semi-transparent overlay with IG nav + profile row */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 75%, transparent 100%)",
        paddingBottom: 8,
      }}>
        {/* Status bar */}
        <StatusBar />

        {/* IG navigation row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 10px",
        }}>
          <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>‹</span>
          <svg width="16" height="10" viewBox="0 0 32 20" fill="none">
            <rect width="32" height="20" rx="3" fill="none" />
            <rect x="1" y="1" width="14" height="10" rx="1.5" stroke="#fff" strokeWidth="1.5" />
            <path d="M17 4l7-3v12l-7-3V4z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span style={{ color: "#fff", fontSize: 9, letterSpacing: 1 }}>•••</span>
        </div>

        {/* Profile row */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px 4px" }}>
          <Avatar initial={initial} size={20} />
          <span style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{handle.replace("@", "")}</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 6.5, marginLeft: "auto" }}>Following</span>
          <span style={{ color: "#fff", fontSize: 9 }}>•••</span>
        </div>
      </div>

      {/* Bottom action bar: opaque dark */}
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

/* ── YouTube Shorts chrome ── */
function YoutubeShortsChrome({ handle, caption, initial }: { handle: string; caption: string; initial: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Gradients */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 50,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
      }} />

      {/* Status bar */}
      <StatusBar />

      {/* Top: YouTube Shorts logo + close */}
      <div style={{ position: "absolute", top: 14, left: 8, right: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* YT icon */}
          <div style={{ width: 12, height: 8, background: "#FF0000", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "7px solid #fff" }} />
          </div>
          <span style={{ color: "#fff", fontSize: 7, fontWeight: 700, letterSpacing: 0.3 }}>Shorts</span>
        </div>
        <span style={{ color: "#fff", fontSize: 11 }}>✕</span>
      </div>

      {/* Right action column */}
      <div style={{
        position: "absolute", right: 7, bottom: 65,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <ActionBtn icon="👍" label="4.7K" />
        <ActionBtn icon="👎" label="" />
        <ActionBtn icon="💬" label="1.3K" />
        <ActionBtn icon="↗" label="Share" />
        {/* Disc */}
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1a1a, #444)",
          border: "3px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Avatar initial={initial} size={10} />
        </div>
      </div>

      {/* Bottom: channel info + subscribe */}
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
  canvasW,
  canvasH,
  brandName,
  captionText,
  loading = false,
}: PlatformMockupProps) {
  const chrome = getPlatformChrome(formatId);
  const imgSrc = savedImage || previewUrl;
  const handle = makeHandle(brandName);
  const initial = brandName[0]?.toUpperCase() ?? "A";
  const caption = clampCaption(captionText);

  /* Landscape: bare image (no phone frame) */
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
        {/* Power button (right side) */}
        <div style={{
          position: "absolute", right: -3, top: "28%",
          width: 3, height: 26, borderRadius: "0 2px 2px 0",
          background: "#3a3a3e",
        }} />
        {/* Volume buttons (left side) */}
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
          width: 60,
          height: 9,
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
          {/* Preview image */}
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
          {chrome === "reel" && (
            <ReelChrome handle={handle} caption={caption} initial={initial} />
          )}
          {chrome === "feed" && (
            <FeedChrome handle={handle} caption={caption} initial={initial} />
          )}
          {chrome === "youtube_short" && (
            <YoutubeShortsChrome handle={handle} caption={caption} initial={initial} />
          )}
          {chrome === "iphone_plain" && <PlainChrome />}
        </div>

        {/* Home indicator */}
        <div style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 72,
          height: 4,
          borderRadius: 4,
          background: "rgba(255,255,255,0.35)",
        }} />
      </div>

      {/* Saved badge overlay (if saved design) */}
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
