import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, MessageSquare, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Command,
  Search, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

const navItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard, color: "#2563eb", glow: "rgba(79,142,247,0.5)",  bg: "linear-gradient(145deg,#5a9bff,#1d55d6)" },
  { title: "Assistant",   url: "/assistant",   icon: MessageSquare,   color: "#16a34a", glow: "rgba(52,199,89,0.5)",   bg: "linear-gradient(145deg,#41e07a,#0f8f3a)" },
  { title: "Research",    url: "/research",    icon: Microscope,      color: "#0ea5e9", glow: "rgba(90,200,250,0.5)",  bg: "linear-gradient(145deg,#62d0ff,#0683c4)" },
  { title: "Content",     url: "/content",     icon: PenTool,         color: "#d97706", glow: "rgba(255,159,10,0.5)",  bg: "linear-gradient(145deg,#ffb733,#b86200)" },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone,       color: "#dc2626", glow: "rgba(255,80,80,0.5)",   bg: "linear-gradient(145deg,#ff6b6b,#b91c1c)" },
  { title: "Knowledge",   url: "/knowledge",   icon: Library,         color: "#7c3aed", glow: "rgba(167,100,255,0.5)", bg: "linear-gradient(145deg,#c474ff,#6220c4)" },
  { title: "Automations", url: "/automations", icon: Zap,             color: "#059669", glow: "rgba(48,209,88,0.5)",   bg: "linear-gradient(145deg,#3de87a,#047349)" },
  { title: "Settings",    url: "/settings",    icon: Settings,        color: "#6b7280", glow: "rgba(150,150,160,0.4)", bg: "linear-gradient(145deg,#a8b0be,#555f6d)" },
];

/* ─── Geometry constants ─────────────────────────────────── */
const BAR_H       = 40;   /* flat header band height */
const POCKET_H    = 68;   /* how far dock dips below header */
const TOTAL_H     = BAR_H + POCKET_H;
const DOCK_W      = 440;  /* dock pocket width */
const OUTER_R     = 36;   /* outer concave radius (flat→wall transition) */
const INNER_R     = 22;   /* dock bottom corner radius */
const ICON_SZ     = 40;   /* icon squircle size */

/* Build the unified sculpted path in a 1000×TOTAL_H coordinate space */
function buildPath(totalH: number) {
  const hw  = DOCK_W / 2;       /* half dock width, in 1000-unit space */
  const cx  = 500;               /* center x */
  const or  = OUTER_R;
  const ir  = INNER_R;

  /* The shape:
     ┌──────────────────────────────────────────────┐  y=0 (top)
     │             flat header band                 │
     └─────╮                         ╭─────────────┘  y=BAR_H
           │  dock walls (concave    │
           │   transition curves)    │
           ╰───────────────────────╯    y=TOTAL_H (dock bottom, convex corners)
  */
  return [
    `M 0 0`,
    `L 1000 0`,
    `L 1000 ${BAR_H}`,
    /* ── right side: flat → concave curve into dock wall ── */
    `L ${cx + hw + or} ${BAR_H}`,
    `Q ${cx + hw} ${BAR_H} ${cx + hw} ${BAR_H + or}`,
    /* ── dock right wall → convex bottom-right corner ────── */
    `L ${cx + hw} ${totalH - ir}`,
    `Q ${cx + hw} ${totalH} ${cx + hw - ir} ${totalH}`,
    /* ── dock bottom ─────────────────────────────────────── */
    `L ${cx - hw + ir} ${totalH}`,
    /* ── convex bottom-left corner ───────────────────────── */
    `Q ${cx - hw} ${totalH} ${cx - hw} ${totalH - ir}`,
    /* ── dock left wall → concave curve back to flat ──────── */
    `L ${cx - hw} ${BAR_H + or}`,
    `Q ${cx - hw} ${BAR_H} ${cx - hw - or} ${BAR_H}`,
    `L 0 ${BAR_H}`,
    `Z`,
  ].join(" ");
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "var(--app-font-mono)", fontSize: 10, letterSpacing: "0.10em", opacity: 0.4 }}>
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [commandQuery, setCommandQuery] = useState("");
  const [hoveredIdx, setHoveredIdx]     = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(1280);

  const isLight = theme === "light";

  /* Track actual container width so the SVG scales correctly */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setVw(e.contentRect.width));
    ro.observe(el);
    setVw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* ── neumorphic palette ───────────────────────────────── */
  const neuBg     = isLight ? "#e8ecf4" : "#0f111a";
  const sdark     = isLight ? "#bfc4d4" : "#090b12";
  const slite     = isLight ? "#ffffff"  : "#191c2a";

  const raisedSm  = `4px 4px 10px ${sdark}, -4px -4px 10px ${slite}`;
  const raisedLg  = `10px 10px 26px ${sdark}, -10px -10px 26px ${slite}`;
  const insetSm   = `inset 3px 3px 7px ${sdark}, inset -3px -3px 7px ${slite}`;

  /* ── SVG path for sculpted header ────────────────────── */
  const svgPath = buildPath(TOTAL_H);

  /* Real-pixel dock pocket width = DOCK_W / 1000 * vw */
  const dockPxW    = (DOCK_W / 1000) * vw;
  const dockLeft   = (vw - dockPxW) / 2;

  function handleCommandKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && commandQuery.trim()) {
      navigate("/assistant");
      setCommandQuery("");
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col min-h-screen w-full overflow-hidden select-none"
      style={{ background: neuBg, color: "var(--foreground)" }}
    >
      {/* ── subtle background tints ─────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{
          position: "absolute", inset: 0,
          background: isLight
            ? "radial-gradient(ellipse 80% 40% at 50% -5%,rgba(37,99,235,0.06),transparent)"
            : "radial-gradient(ellipse 80% 40% at 50% -5%,rgba(59,130,246,0.10),transparent)",
        }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: isLight ? 0.02 : 0.04 }}>
          <defs>
            <pattern id="dp" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill={isLight ? "#000" : "#fff"} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dp)" />
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SCULPTED HEADER — single SVG surface, molded center dock
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="relative shrink-0"
        style={{ height: TOTAL_H, zIndex: 50 }}
      >
        {/* The sculpted SVG shape — provides the surface + shadow */}
        <svg
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: "100%",
            height: TOTAL_H,
            overflow: "visible",
            /* Neumorphic shadow on the sculpted form */
            filter: isLight
              ? `drop-shadow(4px 6px 14px ${sdark}) drop-shadow(-2px -2px 6px ${slite})`
              : `drop-shadow(4px 6px 14px ${sdark}) drop-shadow(-1px -1px 4px ${slite})`,
          }}
          viewBox={`0 0 1000 ${TOTAL_H}`}
          preserveAspectRatio="none"
        >
          <path d={svgPath} fill={neuBg} />

          {/* Top highlight line — gives the header a lit-top-edge feel */}
          <line
            x1="0" y1="0" x2="1000" y2="0"
            stroke={slite}
            strokeWidth="1.5"
            strokeOpacity={isLight ? 0.8 : 0.25}
          />
        </svg>

        {/* ── Brand bar content (z above SVG) ───────────────── */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: BAR_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            zIndex: 2,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              height: 24, width: 24, borderRadius: 8,
              background: neuBg,
              boxShadow: raisedSm,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Command style={{ width: 13, height: 13, color: "var(--primary)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", opacity: 0.85, textTransform: "uppercase" }}>ATREYU</span>
              <span style={{ fontFamily: "var(--app-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.28 }}>MARKETING OS</span>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="status-active" />
              <span style={{ fontFamily: "var(--app-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.32 }}>LIVE</span>
            </div>
            <Clock />
            <button
              onClick={toggleTheme}
              style={{
                height: 24, width: 24, borderRadius: 7,
                background: neuBg,
                boxShadow: raisedSm,
                border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--foreground)",
              }}
            >
              {isLight ? <Moon style={{ width: 11, height: 11, opacity: 0.5 }} /> : <Sun style={{ width: 11, height: 11, opacity: 0.5 }} />}
            </button>
          </div>
        </div>

        {/* ── Dock icons — centered in the pocket ───────────── */}
        <div
          style={{
            position: "absolute",
            top: BAR_H,
            left: dockLeft,
            width: dockPxW,
            height: POCKET_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            zIndex: 3,
          }}
        >
          {navItems.map((item, idx) => {
            const isActive  = location === item.url;
            const isHovered = hoveredIdx === idx;
            const isAdj     = hoveredIdx !== null && Math.abs(hoveredIdx - idx) === 1;

            const scale = isHovered ? 1.25 : isAdj ? 1.10 : 1;

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
                  title={item.title}
                >
                  {/* Squircle icon */}
                  <div style={{
                    width: ICON_SZ,
                    height: ICON_SZ,
                    borderRadius: "28%",
                    background: neuBg,
                    /* Active = inset (pressed), inactive = raised */
                    boxShadow: isActive ? insetSm : raisedSm,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    transition: "box-shadow 0.2s ease",
                  }}>
                    {/* Gradient color overlay */}
                    <div style={{
                      position: "absolute", inset: 0,
                      borderRadius: "inherit",
                      background: item.bg,
                      opacity: isActive ? 0.22 : 0.12,
                      transition: "opacity 0.2s ease",
                    }} />
                    {/* Top gloss (raised state only) */}
                    {!isActive && (
                      <div style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, height: "42%",
                        borderRadius: "inherit",
                        background: `linear-gradient(180deg, ${slite}60 0%, transparent 100%)`,
                        pointerEvents: "none",
                      }} />
                    )}
                    <item.icon style={{
                      width: 18, height: 18,
                      position: "relative",
                      color: isActive ? item.color : `${item.color}aa`,
                      filter: isActive ? `drop-shadow(0 0 4px ${item.glow})` : "none",
                      transition: "color 0.2s, filter 0.2s",
                    }} />
                  </div>

                  {/* Active dot */}
                  <div style={{
                    marginTop: 4,
                    width: 3, height: 3,
                    borderRadius: "50%",
                    background: isActive ? item.color : "transparent",
                    boxShadow: isActive ? `0 0 5px ${item.glow}` : "none",
                    transition: "background 0.2s, box-shadow 0.2s",
                  }} />

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div style={{
                      position: "absolute",
                      bottom: "calc(100% + 10px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: isLight ? `${sdark}ee` : `${slite}ee`,
                      color: isLight ? "#fff" : "#0f111a",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 9px",
                      borderRadius: 7,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
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

      {/* ── Content window ───────────────────────────────────── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 20px 88px",
        }}
      >
        <div style={{
          width: "100%",
          maxWidth: 1400,
          flex: 1,
          borderRadius: 20,
          background: neuBg,
          boxShadow: raisedLg,
          overflow: "hidden",
          height: `calc(100vh - ${TOTAL_H}px - 100px)`,
        }}>
          <div style={{ height: "100%", overflowY: "auto" }}>
            <div style={{ padding: "28px 32px" }}>{children}</div>
          </div>
        </div>
      </main>

      {/* ── Bottom command bar ───────────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        padding: "0 24px 20px",
      }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 44, padding: "0 16px",
            borderRadius: 22,
            background: neuBg,
            boxShadow: insetSm,
          }}>
            <Search style={{ width: 14, height: 14, opacity: 0.28, flexShrink: 0 }} />
            <input
              type="text"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={handleCommandKey}
              placeholder="Ask ATREYU anything…"
              style={{
                flex: 1, background: "transparent",
                border: "none", outline: "none",
                fontSize: 13, color: "var(--foreground)",
                fontFamily: "inherit",
                opacity: 0.8,
              }}
            />
            <kbd style={{
              fontFamily: "var(--app-font-mono)",
              fontSize: 9, letterSpacing: "0.10em",
              opacity: 0.22,
              background: "rgba(128,128,128,0.08)",
              border: "1px solid rgba(128,128,128,0.12)",
              borderRadius: 5,
              padding: "2px 6px",
            }}>⌘K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
