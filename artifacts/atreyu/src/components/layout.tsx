import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Bot, Microscope, PenTool,
  Megaphone, Library, Zap, Settings, Search, Sun, Moon, Palette, Code2,
} from "lucide-react";
import { useTheme } from "@/contexts/theme";

const navItems = [
  { title: "Dashboard",    url: "/dashboard",   icon: LayoutDashboard, color: "#2563eb", glow: "rgba(79,142,247,0.6)",  bg: "linear-gradient(145deg,#5a9bff,#1d55d6)" },
  { title: "Agent Studio", url: "/claude",      icon: Bot,             color: "#e67e41", glow: "rgba(230,126,65,0.6)",  bg: "linear-gradient(145deg,#f5a97f,#e67e41)" },
  { title: "Code Studio",  url: "/codestudio",  icon: Code2,           color: "#7c3aed", glow: "rgba(124,58,237,0.35)", bg: "linear-gradient(135deg,#7c3aed,#5b21b6)" },
  { title: "Research",     url: "/research",    icon: Microscope,      color: "#0ea5e9", glow: "rgba(90,200,250,0.6)",  bg: "linear-gradient(145deg,#62d0ff,#0683c4)" },
  { title: "Content",     url: "/content",     icon: PenTool,         color: "#d97706", glow: "rgba(255,159,10,0.6)",  bg: "linear-gradient(145deg,#ffb733,#b86200)" },
  { title: "Campaigns",   url: "/campaigns",   icon: Megaphone,       color: "#dc2626", glow: "rgba(255,80,80,0.6)",   bg: "linear-gradient(145deg,#ff6b6b,#b91c1c)" },
  { title: "Knowledge",   url: "/knowledge",   icon: Library,         color: "#7c3aed", glow: "rgba(167,100,255,0.6)", bg: "linear-gradient(145deg,#c474ff,#6220c4)" },
  { title: "Automations", url: "/automations", icon: Zap,             color: "#059669", glow: "rgba(48,209,88,0.6)",   bg: "linear-gradient(145deg,#3de87a,#047349)" },
  { title: "Brand Kit",   url: "/brand",       icon: Palette,         color: "#ec4899", glow: "rgba(236,72,153,0.6)", bg: "linear-gradient(145deg,#f472b6,#be185d)" },
  { title: "Settings",    url: "/settings",    icon: Settings,        color: "#6b7280", glow: "rgba(150,150,160,0.5)", bg: "linear-gradient(145deg,#a8b0be,#555f6d)" },
];

/* ─────────────────────────────────────────────────────────────
   GEOMETRY
───────────────────────────────────────────────────────────── */
const BAR_H    = 72;
const POCKET_H = 68;
const TOTAL_H  = BAR_H + POCKET_H;
const OUTER_R  = 40;   /* concave join radius */
const INNER_R  = 22;   /* dock bottom corner radius */
const ICON_SZ  = 42;
const ICON_GAP = 14;   /* gap between dock icons */
const DOCK_PAD = 28;   /* padding on each side inside the pocket */

/* DOCK_W is derived from icon count so it always expands when icons are added */
const DOCK_W = navItems.length * ICON_SZ + (navItems.length - 1) * ICON_GAP + DOCK_PAD * 2;

/* ── Bottom command bar geometry (mirror of top, pocket goes UP) */
const BOT_BAR_H        = 16;   /* thin full-width strip at very bottom */
const BOT_MIN_INPUT_H  = 46;   /* single-line textarea height */
const BOT_GAP          = 18;   /* uniform gap on all 4 sides: top, bottom, left, right */
const BOT_V_PAD        = BOT_GAP + 2;  /* pocket SVG padding — 20px so botTotalH = 102 → (102-66)/2 = 18 */
const BOT_MIN_POCKET_H = BOT_MIN_INPUT_H + BOT_V_PAD * 2;   /* 86 */
const BOT_PILL_W       = 560;  /* pill width */
const BOT_DOCK_W       = BOT_PILL_W + BOT_GAP * 2;  /* 596 — exactly 18px each side */
const BOT_PILL_R       = 20;   /* pill border-radius — notch inner corners match this */

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
/* irX/irY: compensated corner radii — irX accounts for non-uniform SVG scaleX (frameW/1000)
   so the quadratic Bézier corner looks circular in screen pixels.
   orX/orY: same compensation for the concave wing join radius. */
function bottomPocketPath(
  dockHalf: number, botPocketH: number, botTotalH: number,
  irX: number, irY: number, orX: number, orY: number,
) {
  const cx = 500;
  const barY = botPocketH;
  const totalY = botTotalH;
  return [
    `M 0 ${totalY}`,                                          /* bottom-left */
    `L 1000 ${totalY}`,                                        /* bottom-right */
    `L 1000 ${barY}`,                                          /* up right edge */
    /* right concave join into pocket (orX horizontal, orY vertical) */
    `L ${cx + dockHalf + orX} ${barY}`,
    `Q ${cx + dockHalf} ${barY} ${cx + dockHalf} ${barY - orY}`,
    /* up right wall */
    `L ${cx + dockHalf} ${irY}`,
    /* top-right corner — irX horizontal sweep, irY vertical rise */
    `Q ${cx + dockHalf} 0 ${cx + dockHalf - irX} 0`,
    /* top of pocket */
    `L ${cx - dockHalf + irX} 0`,
    /* top-left corner */
    `Q ${cx - dockHalf} 0 ${cx - dockHalf} ${irY}`,
    /* down left wall */
    `L ${cx - dockHalf} ${barY - orY}`,
    /* left concave join */
    `Q ${cx - dockHalf} ${barY} ${cx - dockHalf - orX} ${barY}`,
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
  const [inputH, setInputH]       = useState(21);  /* natural single-line textarea height */
  const frameRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [frameW, setFrameW]       = useState(1200);

  /* ── Dynamic bottom bar geometry based on textarea content ── */
  const botPocketH = Math.max(BOT_MIN_POCKET_H, inputH + BOT_V_PAD * 2);
  const botTotalH  = BOT_BAR_H + botPocketH;

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    const h = el.scrollHeight;   /* no forced minimum — pocket floor handles it */
    el.style.height = `${h}px`;
    setInputH(h);
  }

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
  const dockHalf     = frameW > 0 ? (DOCK_W     / 2 / frameW) * 1000 : 204;
  const botDockHalf  = frameW > 0 ? (BOT_DOCK_W / 2 / frameW) * 1000 : 267;
  /* Concentric corners: notch corner radius = pill radius + uniform gap.
     Both arcs share the same center point — the notch is just the outer arc.
     irX compensates for non-uniform SVG scaleX (frameW/1000) so the arc is circular in px. */
  const botCornerPx = BOT_PILL_R + BOT_GAP;              /* 20 + 18 = 38px */
  const botIrX = frameW > 0 ? (botCornerPx * 1000) / frameW : botCornerPx;
  const botIrY = botCornerPx;
  const botOrX = frameW > 0 ? (26 * 1000) / frameW : 26;
  const botOrY = 26;
  const svgPocket    = buildPath(dockHalf);
  const svgBotPocket = bottomPocketPath(botDockHalf, botPocketH, botTotalH, botIrX, botIrY, botOrX, botOrY);

  function onCmd(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && cmd.trim()) {
      e.preventDefault();
      navigate("/assistant");
      setCmd("");
      setInputH(BOT_MIN_INPUT_H);
      if (textareaRef.current) textareaRef.current.style.height = `${BOT_MIN_INPUT_H}px`;
    }
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
          paddingBottom: botTotalH,
          scrollbarWidth: "none",
          position: "relative",
          zIndex: 1,
        }}>
          <style>{`::-webkit-scrollbar{display:none}`}</style>
          <div style={{ padding: `24px 32px ${botTotalH + 16}px` }}>
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

          {/* Pocket-only SVG — neumorphic raised with highlight */}
          <svg
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: TOTAL_H,
              overflow: "visible",
              filter: isLight
                ? `drop-shadow(4px 4px 12px ${fsdark}cc) drop-shadow(-3px -3px 8px ${fslite})`
                : `drop-shadow(4px 4px 12px ${fsdark}) drop-shadow(-3px -3px 8px ${fslite}44)`,
            }}
            viewBox={`0 0 1000 ${TOTAL_H}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="topNotchGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={fslite} stopOpacity="0.55" />
                <stop offset="42%"  stopColor={fslite} stopOpacity="0"    />
              </linearGradient>
            </defs>
            <path d={svgPocket} fill={frameBg} />
            <path d={svgPocket} fill="url(#topNotchGrad)" style={{ pointerEvents: "none" }} />
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
            display: "flex", alignItems: "center", justifyContent: "center", gap: ICON_GAP,
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
                      marginTop: 4,
                      width: isActive ? ICON_SZ : 0,
                      height: 2.5,
                      borderRadius: 2,
                      background: isActive ? item.color : "transparent",
                      boxShadow: isActive ? `0 0 6px ${item.glow}, 0 0 12px ${item.glow}` : "none",
                      transition: "width 0.28s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, box-shadow 0.2s",
                      overflow: "hidden",
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
          height: botTotalH,
          transition: "height 0.18s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 20, pointerEvents: "none",
        }}>
          {/* Inverted pocket SVG — neumorphic raised with highlight */}
          <svg
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              overflow: "visible",
              filter: isLight
                ? `drop-shadow(4px 4px 12px ${fsdark}cc) drop-shadow(-3px -3px 8px ${fslite})`
                : `drop-shadow(4px 4px 12px ${fsdark}) drop-shadow(-3px -3px 8px ${fslite}44)`,
            }}
            viewBox={`0 0 1000 ${botTotalH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="botNotchGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={fslite} stopOpacity="0.55" />
                <stop offset="42%"  stopColor={fslite} stopOpacity="0"    />
              </linearGradient>
            </defs>
            <path d={svgBotPocket} fill={frameBg} />
            <path d={svgBotPocket} fill="url(#botNotchGrad)" style={{ pointerEvents: "none" }} />
          </svg>

          {/* Input container — centered across FULL overlay (pocket + bar) for optical balance */}
          <div style={{
            position: "absolute",
            top: 0, bottom: 0,
            left: "50%", transform: "translateX(-50%)",
            width: BOT_PILL_W,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "auto", zIndex: 2,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 16px", minHeight: 66, borderRadius: 20,
              background: frameBg,
              boxShadow: insetSm,
              width: "100%", position: "relative", overflow: "hidden",
              transition: "box-shadow 0.2s ease",
            }}>
              <Search style={{
                width: 14, height: 14, opacity: 0.35, flexShrink: 0,
                color: "var(--foreground,#1e2030)",
                position: "relative", zIndex: 1,
              }} />
              <textarea
                ref={textareaRef}
                value={cmd}
                rows={1}
                onChange={e => { setCmd(e.target.value); autoGrow(e.target); }}
                onKeyDown={onCmd}
                placeholder="Ask ATREYU anything…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 13, fontFamily: "inherit", lineHeight: "1.55",
                  color: "var(--foreground,#1e2030)", opacity: 0.8,
                  resize: "none", overflow: "hidden",
                  height: inputH,
                  position: "relative", zIndex: 1,
                }}
              />
              <kbd style={{
                fontFamily: "var(--app-font-mono)", fontSize: 9, letterSpacing: "0.10em",
                opacity: 0.28, background: "rgba(128,128,128,0.08)",
                border: "1px solid rgba(128,128,128,0.15)", borderRadius: 5,
                padding: "2px 6px", flexShrink: 0,
                position: "relative", zIndex: 1,
              }}>⌘K</kbd>
            </div>
          </div>
        </div>

      </div>{/* end frame */}
    </div>
  );
}
