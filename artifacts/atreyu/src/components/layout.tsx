import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Command,
  Search, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

const navItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard, color: "#4f8ef7", glow: "rgba(79,142,247,0.45)",  bg: "linear-gradient(135deg,#4f8ef7,#2563eb)" },
  { title: "Assistant",   url: "/assistant",   icon: MessageSquare,   color: "#34c759", glow: "rgba(52,199,89,0.45)",   bg: "linear-gradient(135deg,#34c759,#16a34a)" },
  { title: "Research",    url: "/research",    icon: Microscope,      color: "#5ac8fa", glow: "rgba(90,200,250,0.45)",  bg: "linear-gradient(135deg,#5ac8fa,#0ea5e9)" },
  { title: "Content",     url: "/content",     icon: PenTool,         color: "#ff9f0a", glow: "rgba(255,159,10,0.45)",  bg: "linear-gradient(135deg,#ff9f0a,#f59e0b)" },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone,       color: "#ff6b6b", glow: "rgba(255,107,107,0.45)", bg: "linear-gradient(135deg,#ff6b6b,#ef4444)" },
  { title: "Knowledge",   url: "/knowledge",   icon: Library,         color: "#bf5af2", glow: "rgba(191,90,242,0.45)",  bg: "linear-gradient(135deg,#bf5af2,#9333ea)" },
  { title: "Automations", url: "/automations", icon: Zap,             color: "#30d158", glow: "rgba(48,209,88,0.45)",   bg: "linear-gradient(135deg,#30d158,#22c55e)" },
  { title: "Settings",    url: "/settings",    icon: Settings,        color: "#98989d", glow: "rgba(152,152,157,0.35)", bg: "linear-gradient(135deg,#8e8e93,#6b7280)" },
];

/* Dock icon size */
const ICON = 40;
const DOCK_H = 60;
/* How far the dock protrudes below the brand bar */
const DOCK_OVERHANG = 32;

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

  const panelBg = isLight ? "rgba(232,236,244,0.88)" : "rgba(14,16,24,0.90)";
  const panelShadow = isLight
    ? "10px 10px 30px rgba(170,178,210,0.65), -6px -6px 20px rgba(255,255,255,0.80)"
    : "8px 8px 22px rgba(6,8,14,0.90), -4px -4px 14px rgba(22,26,40,0.60)";

  const barBg = isLight ? "rgba(220,225,237,0.92)" : "rgba(10,12,20,0.90)";

  const dockBg = isLight
    ? "rgba(255,255,255,0.55)"
    : "rgba(255,255,255,0.07)";
  const dockBorder = isLight
    ? "1px solid rgba(255,255,255,0.85)"
    : "1px solid rgba(255,255,255,0.12)";
  const dockShadow = isLight
    ? "0 8px 32px rgba(140,152,200,0.28), 0 2px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(180,188,220,0.25) inset"
    : "0 8px 32px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.08) inset";

  function handleCommandKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && commandQuery.trim()) {
      navigate("/assistant");
      setCommandQuery("");
    }
  }

  /* Brand bar height */
  const BRAND_H = 36;

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden select-none"
      style={{ background: "var(--neu-bg)" }}
    >
      {/* ── Background decoration ───────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: isLight
              ? "radial-gradient(ellipse 80% 50% at 50% -5%,rgba(37,99,235,0.07),transparent)"
              : "radial-gradient(ellipse 80% 50% at 50% -10%,rgba(59,130,246,0.12),transparent)",
          }}
        />
        <div className="absolute inset-0"
          style={{
            background: isLight
              ? "radial-gradient(ellipse 50% 40% at 85% 90%,rgba(6,182,212,0.05),transparent)"
              : "radial-gradient(ellipse 50% 40% at 85% 90%,rgba(6,182,212,0.08),transparent)",
          }}
        />
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: isLight ? 0.025 : 0.04 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ── Brand bar (fixed, z=50) ──────────────────────────── */}
      <div
        className="relative z-50 flex items-center justify-between px-5 shrink-0"
        style={{
          height: BRAND_H,
          background: barBg,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: isLight
            ? "1px solid rgba(191,196,212,0.45)"
            : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-5 w-5 rounded-md flex items-center justify-center"
            style={{ boxShadow: "var(--neu-raised-sm)", background: "var(--neu-bg)" }}>
            <Command className="h-3 w-3 text-primary" />
          </div>
          <div className="flex flex-col leading-none gap-px">
            <span className="text-[10px] font-black tracking-[0.22em] text-foreground/90 uppercase">ATREYU</span>
            <span className="hud-label text-foreground/30">MARKETING OS</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            <div className="status-active" />
            <span className="hud-label text-foreground/35">LIVE</span>
          </div>
          <Clock />
          <button
            onClick={toggleTheme}
            className="h-6 w-6 rounded-md flex items-center justify-center cursor-pointer transition-all"
            title="Toggle theme"
            style={{ boxShadow: "var(--neu-raised-sm)", background: "var(--neu-bg)" }}
          >
            {isLight
              ? <Moon className="h-3 w-3 text-foreground/50" />
              : <Sun  className="h-3 w-3 text-foreground/50" />}
          </button>
        </div>
      </div>

      {/* ── Centered icon dock — hangs below brand bar ──────── */}
      {/*  z-50 so it floats above the window panel            */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none"
        style={{ top: BRAND_H - 4, zIndex: 50 }}
      >
        <div
          className="pointer-events-auto flex items-center gap-1.5 px-3"
          style={{
            height: DOCK_H,
            borderRadius: 9999,
            background: dockBg,
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: dockBorder,
            boxShadow: dockShadow,
          }}
        >
          {navItems.map((item, idx) => {
            const isActive = location === item.url;
            const isHovered = hoveredIdx === idx;
            /* macOS-style magnification: hovered=1.28x, adjacent=1.12x, active=1.08x */
            const scale = isActive
              ? 1.06
              : isHovered
                ? 1.28
                : hoveredIdx !== null && Math.abs(hoveredIdx - idx) === 1
                  ? 1.12
                  : 1;

            return (
              <Link key={item.url} href={item.url}>
                <div
                  className="relative flex flex-col items-center cursor-pointer"
                  style={{
                    width: ICON,
                    transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: `scale(${scale})`,
                    transformOrigin: "bottom center",
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: ICON,
                      height: ICON,
                      borderRadius: "30%",          /* macOS squircle */
                      background: item.bg,
                      boxShadow: isActive
                        ? `0 4px 18px ${item.glow}, 0 1px 0 rgba(255,255,255,0.25) inset`
                        : `0 3px 10px ${item.glow.replace("0.45","0.22")}, 0 1px 0 rgba(255,255,255,0.25) inset`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Glossy highlight */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0,
                      height: "45%",
                      background: "linear-gradient(180deg,rgba(255,255,255,0.35) 0%,rgba(255,255,255,0) 100%)",
                      borderRadius: "inherit",
                      pointerEvents: "none",
                    }} />
                    <item.icon style={{ width: 20, height: 20, color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
                  </div>

                  {/* Active dot indicator */}
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      bottom: -6,
                      width: 4, height: 4,
                      borderRadius: "50%",
                      background: item.color,
                      boxShadow: `0 0 6px ${item.glow}`,
                    }} />
                  )}

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: isLight ? "rgba(30,35,55,0.88)" : "rgba(220,224,240,0.92)",
                        color: isLight ? "#fff" : "#111",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                        backdropFilter: "blur(8px)",
                        pointerEvents: "none",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}
                    >
                      {item.title}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Main content window ──────────────────────────────── */}
      <main
        className="relative flex-1 flex flex-col items-center px-4 pb-20"
        style={{
          zIndex: 10,
          paddingTop: DOCK_H - 4 + 8,   /* clear the overhanging dock */
        }}
      >
        <div
          className="w-full max-w-[1400px] flex flex-col overflow-hidden"
          style={{
            height: `calc(100vh - ${BRAND_H}px - ${DOCK_H - 4 + 8}px - 80px)`,
            background: panelBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: panelShadow,
            borderRadius: 20,
          }}
        >
          <div className="flex-1 overflow-auto">
            <div className="h-full p-6 md:p-8">{children}</div>
          </div>
        </div>
      </main>

      {/* ── Bottom command bar ───────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-5">
        <div className="w-full max-w-md">
          <div
            className="flex items-center gap-2 h-11 px-4 rounded-2xl"
            style={{ background: "var(--neu-bg)", boxShadow: "var(--neu-inset)" }}
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
