import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Command,
  Search, Sun, Moon, Circle,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

const navItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard },
  { title: "Assistant",   url: "/assistant",   icon: MessageSquare   },
  { title: "Research",    url: "/research",    icon: Microscope      },
  { title: "Content",     url: "/content",     icon: PenTool         },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone       },
  { title: "Knowledge",   url: "/knowledge",   icon: Library         },
  { title: "Automations", url: "/automations", icon: Zap             },
  { title: "Settings",    url: "/settings",    icon: Settings        },
];

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

  const isLight = theme === "light";

  /* Panel surface — shared between active tab + window */
  const panelBg    = isLight ? "rgba(232,236,244,0.96)" : "rgba(14,16,24,0.95)";
  const panelShadow = isLight
    ? "10px 10px 28px rgba(180,186,210,0.75), -6px -6px 18px rgba(255,255,255,0.85)"
    : "8px 8px 20px rgba(7,9,14,0.9),  -4px -4px 12px rgba(22,25,38,0.7)";

  const barBg = isLight ? "rgba(222,226,238,0.9)" : "rgba(10,12,20,0.88)";
  const tabInactiveBg = isLight ? "rgba(210,215,230,0.6)" : "rgba(20,23,35,0.6)";

  function handleCommandKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && commandQuery.trim()) {
      navigate("/assistant");
      setCommandQuery("");
    }
  }

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden select-none"
      style={{ background: "var(--neu-bg)" }}
    >
      {/* ── Background decoration ──────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: isLight
              ? "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(37,99,235,0.07) 0%, transparent 70%)"
              : "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 70%)",
          }} />
        <div className="absolute inset-0"
          style={{
            background: isLight
              ? "radial-gradient(ellipse 50% 40% at 85% 90%, rgba(6,182,212,0.05) 0%, transparent 70%)"
              : "radial-gradient(ellipse 50% 40% at 85% 90%, rgba(6,182,212,0.08) 0%, transparent 70%)",
          }} />
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: isLight ? 0.025 : 0.04 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ────────────────────────────────────────────────────────
          HEADER — two-row design:
            Row 1: thin brand bar (logo + status + toggle)
            Row 2: tab strip where active tab extends DOWN into window
          overflow:visible is key so active tab can protrude below
      ──────────────────────────────────────────────────────── */}
      <div className="relative z-50" style={{ overflow: "visible" }}>

        {/* ── Row 1: brand strip ────────────────────────────── */}
        <div
          className="flex items-center justify-between h-9 px-5"
          style={{
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

        {/* ── Row 2: tab strip with extended active tab ──────── */}
        <div
          className="relative flex items-end px-4 gap-1"
          style={{
            height: 38,
            background: barBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            overflow: "visible",
          }}
        >

          {/* Tab items */}
          {navItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                {isActive ? (
                  /* ── ACTIVE TAB: extends downward, connected to window ── */
                  <button
                    className="relative flex items-center gap-1.5 px-4 cursor-pointer transition-all duration-200"
                    style={{
                      /* Taller than the strip so it protrudes below */
                      height: 50,
                      /* Aligned to sit on the bottom of the strip */
                      alignSelf: "flex-end",
                      /* Rounded only on top */
                      borderRadius: "12px 12px 0 0",
                      /* Same surface as the window panel — creates the merge effect */
                      background: panelBg,
                      /* Active tab shadow — sides only, no bottom so it blends in */
                      boxShadow: isLight
                        ? "-4px -4px 12px rgba(255,255,255,0.9), 4px 0 10px rgba(180,186,210,0.4), -2px 0 10px rgba(180,186,210,0.3)"
                        : "-3px -3px 10px rgba(22,25,38,0.6), 3px 0 8px rgba(7,9,14,0.5)",
                      /* Sits above the tab strip and above the window edge */
                      position: "relative",
                      zIndex: 20,
                      /* Small top border accent */
                      borderTop: `2px solid hsl(var(--primary) / 0.6)`,
                      color: "hsl(var(--primary))",
                      fontSize: "12px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <item.icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span className="hidden lg:block">{item.title}</span>

                    {/* Left corner mask — fills the gap between tab curve and the bar */}
                    <span
                      className="absolute pointer-events-none"
                      style={{
                        bottom: 0, left: -10,
                        width: 10, height: 10,
                        background: panelBg,
                        WebkitMaskImage: "radial-gradient(circle at 100% 0%, transparent 70%, black 70%)",
                        maskImage: "radial-gradient(circle at 100% 0%, transparent 70%, black 70%)",
                      }}
                    />
                    {/* Right corner mask */}
                    <span
                      className="absolute pointer-events-none"
                      style={{
                        bottom: 0, right: -10,
                        width: 10, height: 10,
                        background: panelBg,
                        WebkitMaskImage: "radial-gradient(circle at 0% 0%, transparent 70%, black 70%)",
                        maskImage: "radial-gradient(circle at 0% 0%, transparent 70%, black 70%)",
                      }}
                    />
                  </button>
                ) : (
                  /* ── INACTIVE TAB ────────────────────────────────────── */
                  <button
                    className="relative flex items-center gap-1.5 px-3 cursor-pointer transition-all duration-200 rounded-t-lg"
                    style={{
                      height: 30,
                      alignSelf: "flex-end",
                      background: tabInactiveBg,
                      color: "hsl(var(--muted-foreground))",
                      fontSize: "12px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      borderTop: isLight
                        ? "1px solid rgba(191,196,212,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                      borderLeft: isLight
                        ? "1px solid rgba(191,196,212,0.3)"
                        : "1px solid rgba(255,255,255,0.04)",
                      borderRight: isLight
                        ? "1px solid rgba(191,196,212,0.3)"
                        : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <item.icon style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.6 }} />
                    <span className="hidden lg:block">{item.title}</span>
                  </button>
                )}
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
          /* Negative top margin so the window slides up under the extended active tab */
          marginTop: -2,
        }}
      >
        <div
          className="w-full max-w-[1400px] flex flex-col overflow-hidden"
          style={{
            height: "calc(100vh - 47px - 80px)",
            background: panelBg,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: panelShadow,
            borderRadius: "0 16px 16px 16px",
          }}
        >
          {/* Window inner content */}
          <div className="flex-1 overflow-auto">
            <div className="h-full p-6 md:p-8">{children}</div>
          </div>
        </div>
      </main>

      {/* ── Bottom dock + command bar ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-end justify-between px-6 pb-4">
        {/* Left dock */}
        <div className="flex items-center gap-2">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <button
                  title={item.title}
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
                  style={isActive ? {
                    background: "var(--neu-bg)",
                    boxShadow: "var(--neu-inset-sm)",
                    color: "hsl(var(--primary))",
                  } : {
                    background: "var(--neu-bg)",
                    boxShadow: "var(--neu-raised-sm)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </Link>
            );
          })}
        </div>

        {/* Center command bar */}
        <div className="flex-1 max-w-md mx-6">
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

        {/* Right dock */}
        <div className="flex items-center gap-2">
          {navItems.slice(4).map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <button
                  title={item.title}
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
                  style={isActive ? {
                    background: "var(--neu-bg)",
                    boxShadow: "var(--neu-inset-sm)",
                    color: "hsl(var(--primary))",
                  } : {
                    background: "var(--neu-bg)",
                    boxShadow: "var(--neu-raised-sm)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
