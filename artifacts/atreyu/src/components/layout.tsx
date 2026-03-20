import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageSquare, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Command, ChevronRight,
  Search, Sun, Moon,
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
    <span className="hud-label text-foreground/40">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [commandQuery, setCommandQuery] = useState("");

  const currentPage = navItems.find((n) => n.url === location);

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
      {/* ── Desktop wallpaper tint ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.10),transparent)]
                                           bg-[radial-gradient(ellipse_80%_50%_at_50%_-5%,rgba(37,99,235,0.06),transparent)]" />
        <div className="absolute inset-0 dark:bg-[radial-gradient(ellipse_50%_40%_at_85%_90%,rgba(6,182,212,0.06),transparent)]
                                           bg-[radial-gradient(ellipse_50%_40%_at_85%_90%,rgba(6,182,212,0.04),transparent)]" />
        {/* Subtle dot grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* ── Menu bar ────────────────────────────────────────── */}
      <header
        className="relative z-50 flex items-center justify-between h-10 px-5"
        style={{
          background: theme === "light"
            ? "rgba(232,236,244,0.85)"
            : "rgba(15,17,26,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: theme === "light"
            ? "0 2px 0 rgba(255,255,255,0.8), 0 1px 0 rgba(191,196,212,0.5)"
            : "0 1px 0 rgba(25,28,42,0.8)",
          borderBottom: theme === "light"
            ? "1px solid rgba(191,196,212,0.4)"
            : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Left: logo */}
        <div className="flex items-center gap-2.5 min-w-[120px]">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center"
            style={{ boxShadow: "var(--neu-raised-sm)", background: "var(--neu-bg)" }}>
            <Command className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">ATREYU</span>
            <span className="hud-label text-foreground/30">MARKETING OS</span>
          </div>
        </div>

        {/* Center: module tabs */}
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <button
                  title={item.title}
                  className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-medium transition-all duration-150 cursor-pointer"
                  style={isActive ? {
                    background: "var(--neu-bg)",
                    boxShadow: "var(--neu-inset-sm)",
                    color: "hsl(var(--primary))",
                  } : {
                    color: "hsl(var(--muted-foreground))",
                    background: "transparent",
                  }}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden lg:block">{item.title}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right: status + clock + theme toggle */}
        <div className="flex items-center gap-3 min-w-[120px] justify-end">
          <div className="hidden md:flex items-center gap-1.5">
            <div className="status-active" />
            <span className="hud-label text-foreground/35">LIVE</span>
          </div>
          <Clock />
          <button
            onClick={toggleTheme}
            className="h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer"
            title="Toggle theme"
            style={{ boxShadow: "var(--neu-raised-sm)", background: "var(--neu-bg)" }}
          >
            {theme === "light"
              ? <Moon className="h-3.5 w-3.5 text-foreground/50" />
              : <Sun  className="h-3.5 w-3.5 text-foreground/50" />}
          </button>
        </div>
      </header>

      {/* ── Desktop content area ─────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center pt-3 pb-20 px-4 overflow-hidden">
        <div className="w-full max-w-[1400px] flex flex-col" style={{ height: "calc(100vh - 40px - 80px)" }}>

          {/* Window chrome */}
          <div className="flex items-center gap-3 px-4 h-9 rounded-t-2xl"
            style={{
              background: theme === "light"
                ? "rgba(220,225,236,0.9)"
                : "rgba(19,22,33,0.9)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: theme === "light"
                ? "6px 6px 0 rgba(191,196,212,0.6), -6px -6px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(191,196,212,0.2)"
                : "4px 4px 0 rgba(9,11,18,0.8), -4px -4px 0 rgba(25,28,42,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
            }}>
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57] cursor-pointer hover:brightness-110 transition-all" style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3)" }} />
              <div className="h-3 w-3 rounded-full bg-[#febc2e] cursor-pointer hover:brightness-110 transition-all" style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3)" }} />
              <div className="h-3 w-3 rounded-full bg-[#28c840] cursor-pointer hover:brightness-110 transition-all" style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3)" }} />
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <span className="hud-label text-foreground/40">ATREYU</span>
              {currentPage && (
                <>
                  <ChevronRight className="h-3 w-3 text-foreground/25" />
                  <span className="hud-label text-primary/70">{currentPage.title.toUpperCase()}</span>
                </>
              )}
            </div>

            {/* Corner accent */}
            <div className="ml-auto flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-accent/40" />
            </div>
          </div>

          {/* Window content */}
          <div
            className="flex-1 rounded-b-2xl overflow-auto"
            style={{
              background: theme === "light"
                ? "rgba(232,236,244,0.8)"
                : "rgba(13,15,22,0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: theme === "light"
                ? "8px 8px 20px rgba(191,196,212,0.7), -4px -4px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(191,196,212,0.2)"
                : "6px 6px 16px rgba(9,11,18,0.9), -4px -4px 4px rgba(25,28,42,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <div className="h-full p-6 md:p-8">{children}</div>
          </div>
        </div>
      </main>

      {/* ── Bottom command / dock bar ────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-end justify-between px-6 pb-4">
        {/* Left dock icons */}
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
            style={{
              background: "var(--neu-bg)",
              boxShadow: "var(--neu-inset)",
            }}
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
            <div className="flex items-center gap-1">
              <kbd className="hud-label text-foreground/25 bg-foreground/5 rounded px-1.5 py-0.5 border border-foreground/10">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right dock icons */}
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
