import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Bot, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Search, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

const navItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard, color: "#2563eb", glow: "rgba(79,142,247,0.6)",  bg: "linear-gradient(145deg,#5a9bff,#1d55d6)" },
  { title: "Agent Studio",url: "/claude",      icon: Bot,             color: "#e67e41", glow: "rgba(230,126,65,0.6)",  bg: "linear-gradient(145deg,#f5a97f,#e67e41)" },
  { title: "Research",    url: "/research",    icon: Microscope,      color: "#0ea5e9", glow: "rgba(90,200,250,0.6)",  bg: "linear-gradient(145deg,#62d0ff,#0683c4)" },
  { title: "Content",     url: "/content",     icon: PenTool,         color: "#d97706", glow: "rgba(255,159,10,0.6)",  bg: "linear-gradient(145deg,#ffb733,#b86200)" },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone,       color: "#dc2626", glow: "rgba(255,80,80,0.6)",   bg: "linear-gradient(145deg,#ff6b6b,#b91c1c)" },
  { title: "Knowledge",   url: "/knowledge",   icon: Library,         color: "#7c3aed", glow: "rgba(167,100,255,0.6)", bg: "linear-gradient(145deg,#c474ff,#6220c4)" },
  { title: "Automations", url: "/automations", icon: Zap,             color: "#059669", glow: "rgba(48,209,88,0.6)",   bg: "linear-gradient(145deg,#3de87a,#047349)" },
  { title: "Settings",    url: "/settings",    icon: Settings,        color: "#6b7280", glow: "rgba(150,150,160,0.5)", bg: "linear-gradient(145deg,#a8b0be,#555f6d)" },
];

/* ─────────────────────────────────────────────────────────────
   GEOMETRY
───────────────────────────────────────────────────────────── */
const BAR_H    = 72;
const POCKET_H = 68;
const TOTAL_H  = BAR_H + POCKET_H;
const DOCK_W   = 490;
const OUTER_R  = 40;   /* concave join radius */
const INNER_R  = 22;   /* dock bottom corner radius */
const ICON_SZ  = 42;

/* ── Bottom command bar geometry (mirror of top, pocket goes UP) */
const BOT_BAR_H    = 16;   /* thin full-width strip at very bottom */
const BOT_POCKET_H = 60;   /* pocket going upward — holds the search input */
const BOT_TOTAL_H  = BOT_BAR_H + BOT_POCKET_H;   /* 76 */

/* ── Full-width sculpted path (solid wings) ────────────────── */
function buildPath(dockHalf: number) {
  const cx = 500;
  const or = OUTER_R;
  const ir = INNER_R;
  return [
    `M 0 0`, `L 1000 0`, `L 1000 ${BAR_H}`,
    `L ${cx + dockHalf + or} ${BAR_H}`,
    `Q ${cx + dockHalf} ${BAR_H} ${cx + dockHalf} ${BAR_H + or}`,
    `L ${cx + dockHalf} ${TOTAL_H - ir}`,
    `Q ${cx + dockHalf} ${TOTAL_H} ${cx + dockHalf - ir} ${TOTAL_H}`,
    `L ${cx - dockHalf + ir} ${TOTAL_H}`,
    `Q ${cx - dockHalf} ${TOTAL_H} ${cx - dockHalf} ${TOTAL_H - ir}`,
    `L ${cx - dockHalf} ${BAR_H + or}`,
    `Q ${cx - dockHalf} ${BAR_H} ${cx - dockHalf - or} ${BAR_H}`,
    `L 0 ${BAR_H}`, `Z`,
  ].join(" ");
}

/* ── Pocket-only path (transparent wings / island effect) ─────
   Only fills the center dock pocket. Wings stay transparent so
   workspace content scrolls visibly behind them.
─────────────────────────────────────────────────────────────── */
function pocketPath(dockHalf: number) {
  const cx = 500;
  const or = OUTER_R;
  const ir = INNER_R;
  return [
    `M ${cx - dockHalf - or} ${BAR_H}`,
    `Q ${cx - dockHalf} ${BAR_H} ${cx - dockHalf} ${BAR_H + or}`,
    `L ${cx - dockHalf} ${TOTAL_H - ir}`,
    `Q ${cx - dockHalf} ${TOTAL_H} ${cx - dockHalf + ir} ${TOTAL_H}`,
    `L ${cx + dockHalf - ir} ${TOTAL_H}`,
    `Q ${cx + dockHalf} ${TOTAL_H} ${cx + dockHalf} ${TOTAL_H - ir}`,
    `L ${cx + dockHalf} ${BAR_H + or}`,
    `Q ${cx + dockHalf} ${BAR_H} ${cx + dockHalf + or} ${BAR_H}`,
    `Z`,
  ].join(" ");
}

/* ── Bottom pocket path — pocket goes UPWARD (inverted top) ───
   Full-width thin bar at the bottom + center pocket going up.
   Wings between pocket and edges remain transparent.
─────────────────────────────────────────────────────────────── */
function bottomPocketPath(dockHalf: number) {
  const cx = 500;
  const or = OUTER_R;
  const ir = INNER_R;
  const barY = BOT_POCKET_H;      /* y where pocket meets the bottom bar */
  const totalY = BOT_TOTAL_H;
  return [
    `M 0 ${totalY}`,                          /* bottom-left */
    `L 1000 ${totalY}`,                        /* bottom-right */
    `L 1000 ${barY}`,                          /* up right edge */
    /* right concave join into pocket */
    `L ${cx + dockHalf + or} ${barY}`,
    `Q ${cx + dockHalf} ${barY} ${cx + dockHalf} ${barY - or}`,
    /* up right wall */
    `L ${cx + dockHalf} ${ir}`,
    /* top-right corner of pocket */
    `Q ${cx + dockHalf} 0 ${cx + dockHalf - ir} 0`,
    /* top of pocket */
    `L ${cx - dockHalf + ir} 0`,
    /* top-left corner of pocket */
    `Q ${cx - dockHalf} 0 ${cx - dockHalf} ${ir}`,
    /* down left wall */
    `L ${cx - dockHalf} ${barY - or}`,
    /* left concave join */
    `Q ${cx - dockHalf} ${barY} ${cx - dockHalf - or} ${barY}`,
    /* left of bar */
    `L 0 ${barY}`,
    `Z`,
  ].join(" ");
}

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: "var(--app-font-mono,'SF Mono',monospace)", fontSize: 10, letterSpacing: "0.10em", opacity: 0.38 }}>
      {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [cmd, setCmd]             = useState("");
  const [hov, setHov]             = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW]       = useState(1200);

  const isLight = theme === "light";

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrameW(e.contentRect.width));
    ro.observe(el);
    setFrameW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* ── Palette ─────────────────────────────────────────────── */
  const frameBg  = isLight ? "#e8ecf4" : "#0f111a";
  const fsdark   = isLight ? "#b0b7ca" : "#07090e";
  const fslite   = isLight ? "#ffffff"  : "#1a1e2e";
  const outerBg  = isLight
    ? "linear-gradient(145deg, #b6bdcc 0%, #c4cbda 40%, #b0b8c8 100%)"
    : "linear-gradient(145deg, #040509 0%, #070a12 50%, #03040a 100%)";

  const raisedSm  = `4px 4px 10px ${fsdark}, -4px -4px 10px ${fslite}`;
  const frameElev = isLight
    ? `20px 20px 60px #9da4b8, -12px -12px 40px #ffffff, 0 0 0 1px rgba(255,255,255,0.6)`
    : `20px 20px 60px #020307, -8px -8px 30px #1c2035, 0 0 0 1px rgba(255,255,255,0.04)`;
  const insetSm   = `inset 3px 3px 8px ${fsdark}, inset -3px -3px 8px ${fslite}`;
  const insetMd   = `inset 6px 6px 16px ${fsdark}, inset -6px -6px 16px ${fslite}`;

  /* SVG paths — dockHalf in SVG's 0-1000 coordinate space */
  const dockHalf     = frameW > 0 ? (DOCK_W / 2 / frameW) * 1000 : 204;
  const svgPocket    = buildPath(dockHalf);
  const svgBotPocket = bottomPocketPath(dockHalf);

  function onCmd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && cmd.trim()) { navigate("/assistant"); setCmd(""); }
  }

  return (
    /* ── OUTER DESKTOP ────────────────────────────────────────── */
    <div style={{
      position: "fixed", inset: 0,
      background: outerBg,
      display: "flex", alignItems: "stretch", justifyContent: "stretch",
      padding: "20px", boxSizing: "border-box", overflow: "hidden",
    }}>

      {/* ── THE FRAME ─────────────────────────────────────────── */}
      <div
        ref={frameRef}
        style={{
          flex: 1,
          background: frameBg,
          borderRadius: 32,
          boxShadow: frameElev,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",   /* anchor for absolute header overlay */
        }}
      >
        {/* Inner edge ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 32, zIndex: 100,
          boxShadow: isLight
            ? "inset 1px 1px 0 rgba(255,255,255,0.9), inset -1px -1px 0 rgba(160,168,188,0.4)"
            : "inset 1px 1px 0 rgba(255,255,255,0.06), inset -1px -1px 0 rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }} />

        {/* ══════════════════════════════════════════════════════
            WORKSPACE — flex:1, scrollable; starts at top.
            paddingTop clears the absolute header overlay.
        ══════════════════════════════════════════════════════ */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: TOTAL_H,
          paddingBottom: BOT_TOTAL_H,
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 1,
        }}>
          <style>{`::-webkit-scrollbar{display:none}`}</style>
          <div style={{ padding: `24px 32px ${BOT_TOTAL_H + 16}px` }}>
            {children}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            HEADER OVERLAY — absolute, floats above workspace.
            Wings are fully transparent — workspace scrolls behind.
            Only the center pocket SVG has a solid fill (island).
        ══════════════════════════════════════════════════════ */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: TOTAL_H, zIndex: 20,
          pointerEvents: "none",   /* let clicks fall through to workspace in wing zones */
        }}>

          {/* Pocket-only SVG with drop-shadow */}
          <svg
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: TOTAL_H,
              overflow: "visible",
              filter: isLight
                ? `drop-shadow(0 10px 28px ${fsdark}cc) drop-shadow(0 4px 10px ${fsdark}88)`
                : `drop-shadow(0 10px 28px ${fsdark}) drop-shadow(0 4px 10px rgba(0,0,0,0.9))`,
            }}
            viewBox={`0 0 1000 ${TOTAL_H}`}
            preserveAspectRatio="none"
          >
            <path d={svgPocket} fill={frameBg} />
          </svg>


          {/* Center logo */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: BAR_H,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <Link href="/" style={{ pointerEvents: "auto", display: "flex", alignItems: "center", cursor: "pointer" }}>
              <img
                src="/atreyu-logo.png"
                alt="ATREYU"
                style={{
                  height: 30,
                  width: "auto",
                  opacity: isLight ? 0.75 : 0.5,
                  filter: isLight ? "none" : "brightness(3) saturate(0.3)",
                  userSelect: "none",
                  display: "block",
                }}
              />
            </Link>
          </div>

          {/* Right wing — transparent, controls only */}
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: `calc(50% - ${DOCK_W / 2}px)`, height: BAR_H,
            display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px",
            pointerEvents: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="status-active" />
                <span style={{ fontFamily: "var(--app-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.3 }}>LIVE</span>
              </div>
              <Clock />
              <button onClick={toggleTheme} style={{
                width: 26, height: 26, borderRadius: 7,
                background: frameBg, boxShadow: raisedSm,
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isLight ? <Moon style={{ width: 11, height: 11, opacity: 0.45 }} /> : <Sun style={{ width: 11, height: 11, opacity: 0.45 }} />}
              </button>
            </div>
          </div>

          {/* Dock icons inside the pocket */}
          <div style={{
            position: "absolute",
            top: BAR_H, left: "50%", transform: "translateX(-50%)",
            width: DOCK_W, height: POCKET_H,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
            pointerEvents: "auto", zIndex: 2,
          }}>
            {navItems.map((item, idx) => {
              const isActive = location === item.url;
              const isHov    = hov === idx;
              const isAdj    = hov !== null && Math.abs(hov - idx) === 1;
              const scale    = 1;

              return (
                <Link key={item.url} href={item.url}>
                  <div
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      cursor: "pointer", position: "relative",
                      transform: `scale(${scale})`, transformOrigin: "center bottom",
                      transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                    onMouseEnter={() => setHov(idx)}
                    onMouseLeave={() => setHov(null)}
                  >
                    <div style={{
                      width: ICON_SZ, height: ICON_SZ, borderRadius: "28%",
                      background: frameBg,
                      boxShadow: isActive ? insetSm : raisedSm,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", overflow: "hidden",
                      transition: "box-shadow 0.2s ease",
                    }}>
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: "inherit",
                        background: item.bg,
                        opacity: isActive ? 0.22 : isHov ? 0.16 : 0.10,
                        transition: "opacity 0.2s",
                      }} />
                      {!isActive && (
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: "42%",
                          borderRadius: "inherit",
                          background: `linear-gradient(180deg, ${fslite}55 0%, transparent 100%)`,
                          pointerEvents: "none",
                        }} />
                      )}
                      <item.icon style={{
                        width: 19, height: 19, position: "relative",
                        color: isActive ? item.color : `${item.color}99`,
                        filter: isActive ? `drop-shadow(0 0 4px ${item.glow})` : "none",
                        transition: "color 0.2s, filter 0.2s",
                      }} />
                    </div>
                    <div style={{
                      marginTop: 3, width: 3, height: 3, borderRadius: "50%",
                      background: isActive ? item.color : "transparent",
                      boxShadow: isActive ? `0 0 5px ${item.glow}` : "none",
                      transition: "background 0.2s, box-shadow 0.2s",
                    }} />
                    {isHov && (
                      <div style={{
                        position: "absolute", bottom: "calc(100% + 10px)",
                        left: "50%", transform: "translateX(-50%)",
                        background: isLight ? `${fsdark}f0` : `${fslite}f0`,
                        color: isLight ? "#fff" : "#0f111a",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", padding: "3px 9px",
                        borderRadius: 7, whiteSpace: "nowrap",
                        pointerEvents: "none", boxShadow: raisedSm,
                      }}>
                        {item.title}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>{/* end header overlay */}

        {/* ══════════════════════════════════════════════════════
            BOTTOM COMMAND BAR — absolute overlay, inverted notch.
            Wings are transparent, pocket goes upward.
        ══════════════════════════════════════════════════════ */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: BOT_TOTAL_H, zIndex: 20,
          pointerEvents: "none",
        }}>
          {/* Inverted pocket SVG — shadow goes upward */}
          <svg
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: BOT_TOTAL_H,
              overflow: "visible",
              filter: isLight
                ? `drop-shadow(0 -10px 28px ${fsdark}cc) drop-shadow(0 -4px 10px ${fsdark}88)`
                : `drop-shadow(0 -10px 28px ${fsdark}) drop-shadow(0 -4px 10px rgba(0,0,0,0.9))`,
            }}
            viewBox={`0 0 1000 ${BOT_TOTAL_H}`}
            preserveAspectRatio="none"
          >
            <path d={svgBotPocket} fill={frameBg} />
          </svg>

          {/* Search input centered inside the upward pocket */}
          <div style={{
            position: "absolute",
            top: 0, left: "50%", transform: "translateX(-50%)",
            width: DOCK_W + 60, height: BOT_POCKET_H,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "auto", zIndex: 2,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 38, padding: "0 16px", borderRadius: 19,
              background: frameBg, boxShadow: insetMd,
              width: "100%",
            }}>
              <Search style={{ width: 13, height: 13, opacity: 0.3, flexShrink: 0, color: "var(--foreground,#1e2030)" }} />
              <input
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                onKeyDown={onCmd}
                placeholder="Ask ATREYU anything…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 13, fontFamily: "inherit",
                  color: "var(--foreground,#1e2030)", opacity: 0.75,
                }}
              />
              <kbd style={{
                fontFamily: "var(--app-font-mono)", fontSize: 9, letterSpacing: "0.10em",
                opacity: 0.22, background: "rgba(128,128,128,0.08)",
                border: "1px solid rgba(128,128,128,0.12)", borderRadius: 5, padding: "2px 6px",
              }}>⌘K</kbd>
            </div>
          </div>
        </div>

      </div>{/* end frame */}
    </div>
  );
}
