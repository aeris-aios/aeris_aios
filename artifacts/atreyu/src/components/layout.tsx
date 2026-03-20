import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, MessageSquare, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Command, Search, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

/* ─────────────────────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────────────────────── */
const navItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard, color: "#2563eb", glow: "rgba(79,142,247,0.55)",  bg: "linear-gradient(145deg,#5a9bff,#1d55d6)" },
  { title: "Assistant",   url: "/assistant",   icon: MessageSquare,   color: "#16a34a", glow: "rgba(52,199,89,0.55)",   bg: "linear-gradient(145deg,#41e07a,#0f8f3a)" },
  { title: "Research",    url: "/research",    icon: Microscope,      color: "#0ea5e9", glow: "rgba(90,200,250,0.55)",  bg: "linear-gradient(145deg,#62d0ff,#0683c4)" },
  { title: "Content",     url: "/content",     icon: PenTool,         color: "#d97706", glow: "rgba(255,159,10,0.55)",  bg: "linear-gradient(145deg,#ffb733,#b86200)" },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone,       color: "#dc2626", glow: "rgba(255,80,80,0.55)",   bg: "linear-gradient(145deg,#ff6b6b,#b91c1c)" },
  { title: "Knowledge",   url: "/knowledge",   icon: Library,         color: "#7c3aed", glow: "rgba(167,100,255,0.55)", bg: "linear-gradient(145deg,#c474ff,#6220c4)" },
  { title: "Automations", url: "/automations", icon: Zap,             color: "#059669", glow: "rgba(48,209,88,0.55)",   bg: "linear-gradient(145deg,#3de87a,#047349)" },
  { title: "Settings",    url: "/settings",    icon: Settings,        color: "#6b7280", glow: "rgba(150,150,160,0.4)",  bg: "linear-gradient(145deg,#a8b0be,#555f6d)" },
];

/* ─────────────────────────────────────────────────────────────
   DOCK GEOMETRY
───────────────────────────────────────────────────────────── */
const BAR_H      = 40;   /* flat header band height          */
const POCKET_H   = 66;   /* dock pocket depth below header   */
const TOTAL_H    = BAR_H + POCKET_H;
const DOCK_W_PX  = 436;  /* dock pocket width in real px     */
const OUTER_R    = 38;   /* concave radius (flat → wall)     */
const INNER_R    = 20;   /* dock bottom corner radius        */
const ICON_SZ    = 40;   /* squircle icon size               */

/* Build SVG path in a 1000 × TOTAL_H coordinate space        */
function buildDockPath() {
  const hw  = 218; /* DOCK_W_PX/2 mapped to 1000-unit space ≈ 1000 * (DOCK_W_PX/2) / vw
                      we approximate as a fixed ratio; SVG preserveAspectRatio=none handles scaling */
  /* We'll use percent-based viewBox, so dock half-width in 0-1000 is calculated per render */
  return (dockHalf: number) => {
    const cx = 500;
    const or = OUTER_R;
    const ir = INNER_R;
    return [
      `M 0 0`,
      `L 1000 0`,
      `L 1000 ${BAR_H}`,
      /* right concave transition: flat → dock wall */
      `L ${cx + dockHalf + or} ${BAR_H}`,
      `Q ${cx + dockHalf} ${BAR_H} ${cx + dockHalf} ${BAR_H + or}`,
      /* right dock wall → bottom-right corner */
      `L ${cx + dockHalf} ${TOTAL_H - ir}`,
      `Q ${cx + dockHalf} ${TOTAL_H} ${cx + dockHalf - ir} ${TOTAL_H}`,
      /* dock bottom */
      `L ${cx - dockHalf + ir} ${TOTAL_H}`,
      /* bottom-left corner */
      `Q ${cx - dockHalf} ${TOTAL_H} ${cx - dockHalf} ${TOTAL_H - ir}`,
      /* left dock wall → concave back to flat */
      `L ${cx - dockHalf} ${BAR_H + or}`,
      `Q ${cx - dockHalf} ${BAR_H} ${cx - dockHalf - or} ${BAR_H}`,
      `L 0 ${BAR_H}`,
      `Z`,
    ].join(" ");
  };
}

const getPath = buildDockPath();

/* ─────────────────────────────────────────────────────────────
   CLOCK
───────────────────────────────────────────────────────────── */
function Clock({ mono }: { mono: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.10em", opacity: 0.38 }}>
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   APP LAYOUT
───────────────────────────────────────────────────────────── */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [cmdQuery, setCmdQuery]       = useState("");
  const [hoveredIdx, setHoveredIdx]   = useState<number | null>(null);
  const frameRef   = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW]           = useState(1100);

  const isLight = theme === "light";

  /* Observe the frame's actual pixel width so dock geometry is accurate */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrameW(e.contentRect.width));
    ro.observe(el);
    setFrameW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* ── Neumorphic palette ─────────────────────────────────── */
  const neuBg  = isLight ? "#e8ecf4" : "#0f111a";
  const sdark  = isLight ? "#bfc4d4" : "#090b12";
  const slite  = isLight ? "#ffffff"  : "#191c2a";
  const mono   = "var(--app-font-mono, 'SF Mono', monospace)";

  const raised    = `8px 8px 20px ${sdark}, -8px -8px 20px ${slite}`;
  const raisedSm  = `4px 4px 10px ${sdark}, -4px -4px 10px ${slite}`;
  const raisedXl  = `16px 16px 40px ${sdark}, -16px -16px 40px ${slite}`;
  const insetSm   = `inset 3px 3px 7px ${sdark}, inset -3px -3px 7px ${slite}`;
  const insetMd   = `inset 5px 5px 12px ${sdark}, inset -5px -5px 12px ${slite}`;

  /* Dock half-width in SVG's 0–1000 coordinate space */
  const dockHalfSvg = frameW > 0 ? (DOCK_W_PX / 2 / frameW) * 1000 : 200;
  const svgPath = getPath(dockHalfSvg);

  function handleCmd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && cmdQuery.trim()) {
      navigate("/assistant");
      setCmdQuery("");
    }
  }

  /* Outer page ambient background */
  const outerBg = isLight
    ? "radial-gradient(ellipse 120% 80% at 50% 0%, #dde3f0 0%, #cdd4e2 100%)"
    : "radial-gradient(ellipse 120% 80% at 50% 0%, #0a0c14 0%, #070810 100%)";

  return (
    /* ── OUTER PAGE ─────────────────────────────────────────── */
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: outerBg,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "18px 18px 18px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ── THE FRAME — sculpted neumorphic OS window ────────── */}
      <div
        ref={frameRef}
        style={{
          flex: 1,
          maxWidth: 1440,
          borderRadius: 32,
          background: neuBg,
          boxShadow: raisedXl,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",        /* frame does NOT scroll */
          position: "relative",
        }}
      >
        {/* ══════════════════════════════════════════════════════
            SCULPTED HEADER + DOCK
            Single SVG surface fused to the top of the frame.
        ══════════════════════════════════════════════════════ */}
        <div
          style={{
            position: "relative",
            height: TOTAL_H,
            flexShrink: 0,
          }}
        >
          {/* SVG sculpted surface */}
          <svg
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%",
              height: TOTAL_H,
              overflow: "visible",
              filter: isLight
                ? `drop-shadow(0 6px 16px ${sdark}99) drop-shadow(0 -1px 2px ${slite})`
                : `drop-shadow(0 6px 16px ${sdark}) drop-shadow(0 -1px 2px ${slite}44)`,
            }}
            viewBox={`0 0 1000 ${TOTAL_H}`}
            preserveAspectRatio="none"
          >
            {/* Main surface fill */}
            <path d={svgPath} fill={neuBg} />
            {/* Top highlight edge */}
            <line x1="0" y1="0.5" x2="1000" y2="0.5"
              stroke={slite} strokeWidth="1.2"
              strokeOpacity={isLight ? 0.9 : 0.18}
            />
          </svg>

          {/* ── Brand bar ──────────────────────────────────────── */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: BAR_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            zIndex: 2,
          }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8,
                background: neuBg, boxShadow: raisedSm,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Command style={{ width: 13, height: 13, color: "var(--primary, #2563eb)" }} />
              </div>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.82 }}>
                  ATREYU
                </div>
                <div style={{ fontFamily: mono, fontSize: 7.5, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.28, marginTop: 2 }}>
                  MARKETING OS
                </div>
              </div>
            </div>

            {/* Right: status + clock + theme */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="status-active" />
                <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.3 }}>LIVE</span>
              </div>
              <Clock mono={mono} />
              <button
                onClick={toggleTheme}
                style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: neuBg, boxShadow: raisedSm,
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--foreground)",
                }}
              >
                {isLight
                  ? <Moon style={{ width: 11, height: 11, opacity: 0.45 }} />
                  : <Sun  style={{ width: 11, height: 11, opacity: 0.45 }} />}
              </button>
            </div>
          </div>

          {/* ── Dock icons inside the pocket ─────────────────── */}
          <div style={{
            position: "absolute",
            top: BAR_H,
            left: "50%",
            transform: "translateX(-50%)",
            width: DOCK_W_PX,
            height: POCKET_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            zIndex: 3,
          }}>
            {navItems.map((item, idx) => {
              const isActive  = location === item.url;
              const isHov     = hoveredIdx === idx;
              const isAdj     = hoveredIdx !== null && Math.abs(hoveredIdx - idx) === 1;
              const scale     = isHov ? 1.26 : isAdj ? 1.10 : 1;

              return (
                <Link key={item.url} href={item.url}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      transform: `scale(${scale})`,
                      transformOrigin: "center bottom",
                      transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Squircle button */}
                    <div style={{
                      width: ICON_SZ, height: ICON_SZ,
                      borderRadius: "28%",
                      background: neuBg,
                      boxShadow: isActive ? insetSm : raisedSm,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", overflow: "hidden",
                      transition: "box-shadow 0.2s ease",
                    }}>
                      {/* Color gradient tint */}
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: "inherit",
                        background: item.bg,
                        opacity: isActive ? 0.22 : isHov ? 0.16 : 0.10,
                        transition: "opacity 0.2s",
                      }} />
                      {/* Gloss highlight on raised state */}
                      {!isActive && (
                        <div style={{
                          position: "absolute",
                          top: 0, left: 0, right: 0, height: "42%",
                          borderRadius: "inherit",
                          background: `linear-gradient(180deg, ${slite}55 0%, transparent 100%)`,
                          pointerEvents: "none",
                        }} />
                      )}
                      <item.icon style={{
                        width: 18, height: 18, position: "relative",
                        color: isActive ? item.color : `${item.color}99`,
                        filter: isActive ? `drop-shadow(0 0 4px ${item.glow})` : "none",
                        transition: "color 0.2s, filter 0.2s",
                      }} />
                    </div>

                    {/* Active dot */}
                    <div style={{
                      marginTop: 3,
                      width: 3, height: 3, borderRadius: "50%",
                      background: isActive ? item.color : "transparent",
                      boxShadow: isActive ? `0 0 5px ${item.glow}` : "none",
                      transition: "background 0.2s, box-shadow 0.2s",
                    }} />

                    {/* Tooltip */}
                    {isHov && (
                      <div style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        left: "50%", transform: "translateX(-50%)",
                        background: isLight ? `${sdark}f0` : `${slite}f0`,
                        color: isLight ? "#fff" : "#0f111a",
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        padding: "3px 9px", borderRadius: 7,
                        whiteSpace: "nowrap", pointerEvents: "none",
                        boxShadow: raisedSm,
                      }}>
                        {item.title}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            INNER WORKSPACE — scrolls independently inside frame
        ══════════════════════════════════════════════════════ */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            /* Inset shadow gives the workspace the feeling of being
               recessed inside the frame — "looking into the system" */
            boxShadow: insetMd,
            position: "relative",
            borderRadius: "0 0 32px 32px",
          }}
        >
          {/* Inner content area */}
          <div style={{ padding: "28px 32px 32px" }}>
            {children}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            BOTTOM COMMAND BAR — docked inside the frame
        ══════════════════════════════════════════════════════ */}
        <div style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          padding: "10px 24px 14px",
          background: neuBg,
          borderTop: isLight
            ? `1px solid ${sdark}25`
            : `1px solid ${slite}0f`,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 40, padding: "0 16px",
            borderRadius: 20,
            background: neuBg,
            boxShadow: insetMd,
            width: "100%",
            maxWidth: 520,
          }}>
            <Search style={{ width: 13, height: 13, opacity: 0.28, flexShrink: 0, color: "var(--foreground)" }} />
            <input
              type="text"
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              onKeyDown={handleCmd}
              placeholder="Ask ATREYU anything…"
              style={{
                flex: 1, background: "transparent",
                border: "none", outline: "none",
                fontSize: 13, fontFamily: "inherit",
                color: "var(--foreground)", opacity: 0.75,
              }}
            />
            <kbd style={{
              fontFamily: mono, fontSize: 9, letterSpacing: "0.10em",
              opacity: 0.22, background: "rgba(128,128,128,0.08)",
              border: "1px solid rgba(128,128,128,0.12)",
              borderRadius: 5, padding: "2px 6px",
            }}>⌘K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
