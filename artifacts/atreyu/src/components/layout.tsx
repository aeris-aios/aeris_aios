import { Link, useLocation, useRouter } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Microscope,
  PenTool,
  Megaphone,
  Library,
  Zap,
  Settings,
  Command,
  ChevronRight,
  Minus,
  Square,
  X,
  Search,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { title: "Assistant", url: "/assistant", icon: MessageSquare, shortcut: "A" },
  { title: "Research", url: "/research", icon: Microscope, shortcut: "R" },
  { title: "Content", url: "/content", icon: PenTool, shortcut: "C" },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone, shortcut: "P" },
  { title: "Knowledge", url: "/knowledge", icon: Library, shortcut: "K" },
  { title: "Automations", url: "/automations", icon: Zap, shortcut: "Z" },
  { title: "Settings", url: "/settings", icon: Settings, shortcut: "S" },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-[11px] text-white/50 tabular-nums">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [commandQuery, setCommandQuery] = useState("");

  const currentPage = navItems.find((n) => n.url === location);

  function handleCommandKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && commandQuery.trim()) {
      navigate("/assistant");
      setCommandQuery("");
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen w-full overflow-hidden dark select-none">
      {/* ── Desktop wallpaper ───────────────────────────────── */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(99,102,241,0.06),transparent)]" />
        {/* Subtle grain overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* ── Menu bar ────────────────────────────────────────── */}
      <header className="relative z-50 flex items-center justify-between h-9 px-5 bg-black/40 backdrop-blur-2xl border-b border-white/[0.06]">
        {/* Left: logo */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Command className="h-3 w-3 text-blue-400" />
          </div>
          <span className="text-[12px] font-semibold text-white/80 tracking-widest uppercase">ATREYU</span>
        </div>

        {/* Center: dock tabs */}
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <button
                  title={item.title}
                  className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:block">{item.title}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right: status + clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-white/40 hidden md:block">All systems operational</span>
          </div>
          <Clock />
        </div>
      </header>

      {/* ── Main desktop area ───────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start p-4 pt-3 pb-20 overflow-hidden">
        {/* Floating window */}
        <div className="w-full max-w-7xl h-full flex flex-col" style={{ maxHeight: "calc(100vh - 36px - 80px)" }}>
          {/* Window chrome */}
          <div className="flex items-center gap-3 px-4 h-9 bg-[#1c1c22]/80 backdrop-blur-xl rounded-t-2xl border border-white/[0.08] border-b-0">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57] hover:opacity-80 transition-opacity cursor-pointer" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e] hover:opacity-80 transition-opacity cursor-pointer" />
              <div className="h-3 w-3 rounded-full bg-[#28c840] hover:opacity-80 transition-opacity cursor-pointer" />
            </div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/30">
              <span className="text-white/50 font-medium">ATREYU</span>
              {currentPage && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-white/60 font-medium">{currentPage.title}</span>
                </>
              )}
            </div>
          </div>

          {/* Window content */}
          <div className="flex-1 bg-[#111118]/90 backdrop-blur-xl rounded-b-2xl border border-white/[0.08] border-t-0 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom command bar ──────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-end justify-between px-6 pb-5">
        {/* Left: mini app icons */}
        <div className="flex items-center gap-2">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <button
                  title={item.title}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                      : "bg-white/5 border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-white/10 hover:border-white/15"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              </Link>
            );
          })}
        </div>

        {/* Center: command input */}
        <div className="flex-1 max-w-md mx-6">
          <div className="flex items-center gap-2 bg-white/[0.07] backdrop-blur-2xl border border-white/[0.12] rounded-2xl px-4 h-11 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
            <input
              type="text"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={handleCommandKey}
              placeholder="Ask ATREYU anything…"
              className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/25 outline-none caret-blue-400"
            />
            <div className="flex items-center gap-1">
              <kbd className="text-[10px] text-white/20 bg-white/5 rounded px-1 py-0.5 border border-white/[0.08] font-mono">⌘</kbd>
              <kbd className="text-[10px] text-white/20 bg-white/5 rounded px-1 py-0.5 border border-white/[0.08] font-mono">↵</kbd>
            </div>
          </div>
        </div>

        {/* Right: more app icons */}
        <div className="flex items-center gap-2">
          {navItems.slice(4).map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.url} href={item.url}>
                <button
                  title={item.title}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                      : "bg-white/5 border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-white/10 hover:border-white/15"
                  }`}
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
