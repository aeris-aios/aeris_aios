import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Command,
  Search, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

const navItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard, color: "#2563eb", bg: "linear-gradient(135deg,#4f8ef7,#2563eb)" },
  { title: "Assistant",   url: "/assistant",   icon: MessageSquare,   color: "#16a34a", bg: "linear-gradient(135deg,#34c759,#16a34a)" },
  { title: "Research",    url: "/research",    icon: Microscope,      color: "#0ea5e9", bg: "linear-gradient(135deg,#5ac8fa,#0ea5e9)" },
  { title: "Content",     url: "/content",     icon: PenTool,         color: "#d97706", bg: "linear-gradient(135deg,#ff9f0a,#d97706)" },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone,       color: "#dc2626", bg: "linear-gradient(135deg,#ff6b6b,#dc2626)" },
  { title: "Knowledge",   url: "/knowledge",   icon: Library,         color: "#7c3aed", bg: "linear-gradient(135deg,#bf5af2,#7c3aed)" },
  { title: "Automations", url: "/automations", icon: Zap,             color: "#059669", bg: "linear-gradient(135deg,#30d158,#059669)" },
  { title: "Settings",    url: "/settings",    icon: Settings,        color: "#6b7280", bg: "linear-gradient(135deg,#9ca3af,#6b7280)" },
];

const ICON_SIZE  = 44;
const SHELF_H    = 72; /* dock row height */
const BRAND_H    = 38;

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hud-label text-foreground/40 tabular-nums">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [commandQuery, setCommandQuery] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isLight = theme === "light";

  /* ── Neumorphic colour values ──────────────────────────── */
  /* These must match the --neu-* CSS vars exactly           */
  const neuBg          = isLight ? "#e8ecf4" : "#0f111a";
  const shadowDark     = isLight ? "#bfc4d4" : "#090b12";
  const shadowLight    = isLight ? "#ffffff"  : "#191c2a";

  /* Raised (convex) shadow — used for the shelf */
  const raisedLg  = `12px 12px 30px ${shadowDark}, -12px -12px 30px ${shadowLight}`;
  const raisedSm  = `4px 4px 10px ${shadowDark}, -4px -4px 10px ${shadowLight}`;
  /* Inset (concave) shadow — used for pressed icons */
  const insetSm   = `inset 5px 5px 12px ${shadowDark}, inset -5px -5px 12px ${shadowLight}`;

  /* Content window surface */
  const panelShadow = `10px 10px 28px ${shadowDark}, -6px -6px 18px ${shadowLight}`;

  function handleCommandKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && commandQuery.trim()) {
      navigate("/assistant");
      setCommandQuery("");
    }
  }

  const HEADER_TOTAL = BRAND_H + SHELF_H;

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden select-none"
      style={{ background: neuBg }}
    >
      {/* ── Background tints & dot grid ─────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: isLight
            ? "radial-gradient(ellipse 80% 45% at 50% -5%, rgba(37,99,235,0.06), transparent)"
            : "radial-gradient(ellipse 80% 45% at 50% -5%, rgba(59,130,246,0.10), transparent)",
        }} />
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: isLight ? 0.022 : 0.04 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════
          UNIFIED NEUMORPHIC HEADER SHELF
          — brand bar + dock row share one raised surface.
          No border, no glass: pure neumorphic extrusion.
      ══════════════════════════════════════════════════════ */}
      <div
        className="relative shrink-0"
        style={{
          zIndex: 50,
          height: HEADER_TOTAL,
          background: neuBg,
          /* Raised shadow for the whole shelf */
          boxShadow: raisedLg,
          /* Subtle bottom divider line using a gradient */
          borderBottom: isLight
            ? `1px solid ${shadowDark}55`
            : `1px solid ${shadowLight}22`,
        }}
      >
        {/* ── Brand row ──────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6"
          style={{
            height: BRAND_H,
            borderBottom: isLight
              ? `1px solid ${shadowDark}33`
              : `1px solid ${shadowLight}15`,
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center"
              style={{ boxShadow: raisedSm, background: neuBg }}
            >
              <Command className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col leading-none gap-px">
              <span className="text-[10px] font-black tracking-[0.22em] text-foreground/85 uppercase">ATREYU</span>
              <span className="hud-label text-foreground/30">MARKETING OS</span>
            </div>
          </div>

          {/* Right: status + clock + theme */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5">
              <div className="status-active" />
              <span className="hud-label text-foreground/35">LIVE</span>
            </div>
            <Clock />
            <button
              onClick={toggleTheme}
              className="h-6 w-6 rounded-md flex items-center justify-center cursor-pointer"
              title="Toggle theme"
              style={{ boxShadow: raisedSm, background: neuBg }}
            >
              {isLight
                ? <Moon className="h-3 w-3 text-foreground/50" />
                : <Sun  className="h-3 w-3 text-foreground/50" />}
            </button>
          </div>
        </div>

        {/* ── Dock row — icon buttons centered in the shelf ──── */}
        <div
          className="flex items-center justify-center gap-3"
          style={{ height: SHELF_H }}
        >
          {navItems.map((item, idx) => {
            const isActive = location === item.url;
            const isHovered = hoveredIdx === idx;

            /* Magnification: active=still, hover=1.22x, adjacent=1.10x */
            const scale = isHovered
              ? 1.22
              : (hoveredIdx !== null && Math.abs(hoveredIdx - idx) === 1)
                ? 1.10
                : 1;

            return (
              <Link key={item.url} href={item.url}>
                <div
                  className="relative flex flex-col items-center cursor-pointer"
                  style={{
                    transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  title={item.title}
                >
                  {/* Icon button — neumorphic raised (inactive) / inset (active) */}
                  <div
                    style={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      borderRadius: "28%",             /* squircle */
                      background: isActive
                        ? neuBg                        /* inset uses same bg */
                        : neuBg,
                      boxShadow: isActive ? insetSm : raisedSm,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                      transition: "box-shadow 0.2s ease",
                    }}
                  >
                    {/* Colored gradient overlay — full opacity when active, subtle when not */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "inherit",
                      background: item.bg,
                      opacity: isActive ? 0.18 : 0.10,
                      transition: "opacity 0.2s ease",
                    }} />
                    {/* Top gloss on raised state */}
                    {!isActive && (
                      <div style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, height: "40%",
                        borderRadius: "inherit",
                        background: `linear-gradient(180deg, ${shadowLight}55 0%, transparent 100%)`,
                        pointerEvents: "none",
                      }} />
                    )}
                    {/* Icon */}
                    <item.icon
                      style={{
                        width: 20, height: 20,
                        color: isActive ? item.color : `${item.color}bb`,
                        position: "relative",
                        filter: isActive
                          ? `drop-shadow(0 0 4px ${item.color}80)`
                          : "none",
                        transition: "color 0.2s ease, filter 0.2s ease",
                      }}
                    />
                  </div>

                  {/* Active indicator dot */}
                  <div style={{
                    marginTop: 4,
                    height: 3,
                    width: 3,
                    borderRadius: "50%",
                    background: isActive ? item.color : "transparent",
                    boxShadow: isActive ? `0 0 5px ${item.color}` : "none",
                    transition: "background 0.2s ease, box-shadow 0.2s ease",
                  }} />

                  {/* Tooltip */}
                  {isHovered && (
                    <div style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: isLight ? `${shadowDark}ee` : `${shadowLight}ee`,
                      color: isLight ? "#fff" : "#0f111a",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: 6,
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
        className="relative flex-1 flex flex-col items-center px-5 pb-20 pt-4"
        style={{ zIndex: 10 }}
      >
        <div
          className="w-full max-w-[1400px] flex flex-col overflow-hidden rounded-2xl"
          style={{
            height: `calc(100vh - ${HEADER_TOTAL}px - 80px - 16px)`,
            background: neuBg,
            boxShadow: panelShadow,
          }}
        >
          <div className="flex-1 overflow-auto">
            <div className="h-full p-6 md:p-8">{children}</div>
          </div>
        </div>
      </main>

      {/* ── Bottom command bar ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-5">
        <div className="w-full max-w-[480px]">
          <div
            className="flex items-center gap-2 h-11 px-4 rounded-2xl"
            style={{ background: neuBg, boxShadow: insetSm }}
          >
            <Search className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
            <input
              type="text"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={handleCommandKey}
              placeholder="Ask ATREYU anything…"
              className="flex-1 bg-transparent text-[13px] text-foreground/80 placeholder:text-foreground/25 outline-none caret-primary"
            />
            <kbd className="hud-label text-foreground/25 bg-foreground/5 rounded px-1.5 py-0.5 border border-foreground/10">⌘K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
