import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, LayoutDashboard, Bot, FlaskConical, Pen,
  Megaphone, BarChart2, Zap, Settings, BrainCircuit,
  Globe, Activity, Cpu, Sparkles, ChevronRight,
} from "lucide-react";

/* ── Neumorphic palette (light only) ─────────────────────────── */
const BG      = "#e8ecf4";
const DARK    = "#b0b7ca";
const LITE    = "#ffffff";
const FG      = "#1e2030";
const SUB     = "rgba(30,32,48,0.45)";
const ACCENT  = "#3b5bdb";

const raised   = `6px 6px 16px ${DARK}, -6px -6px 16px ${LITE}`;
const raisedSm = `3px 3px 8px ${DARK}, -3px -3px 8px ${LITE}`;
const raisedLg = `10px 10px 28px ${DARK}cc, -10px -10px 28px ${LITE}`;
const inset    = `inset 5px 5px 12px ${DARK}, inset -5px -5px 12px ${LITE}`;
const insetSm  = `inset 3px 3px 7px ${DARK}, inset -3px -3px 7px ${LITE}`;

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as any },
});

const MODULES = [
  { icon: LayoutDashboard, label: "Dashboard",    color: "#3b5bdb" },
  { icon: Bot,             label: "Agent Studio", color: "#e67e41" },
  { icon: FlaskConical,    label: "Research",     color: "#12b886" },
  { icon: Pen,             label: "Content",      color: "#f59f00" },
  { icon: Megaphone,       label: "Campaigns",    color: "#e03131" },
  { icon: BarChart2,       label: "Analytics",    color: "#7048e8" },
  { icon: Zap,             label: "Automations",  color: "#2fb344" },
  { icon: Settings,        label: "Settings",     color: "#868e96" },
];

const FEATURES = [
  {
    icon: BrainCircuit,
    color: "#3b5bdb",
    title: "Deep Think AI",
    body: "Switch between Haiku, Sonnet, and Opus for the right balance of speed and strategic depth on every task.",
  },
  {
    icon: Globe,
    color: "#12b886",
    title: "Autonomous Research",
    body: "Deploy agents to scrape competitors, reviews, and social signals autonomously — results waiting when you return.",
  },
  {
    icon: Cpu,
    color: "#e67e41",
    title: "Agent Studio",
    body: "Ingest GitHub repos as live context and run parallel AI agents with real-time streaming output.",
  },
  {
    icon: Activity,
    color: "#e03131",
    title: "Campaign Ops",
    body: "Manage entire marketing workflows from brief to final assets — all orchestrated in one centralized hub.",
  },
  {
    icon: Sparkles,
    color: "#f59f00",
    title: "Content Synthesis",
    body: "Generate high-converting copy across every channel with a single prompt and contextual brand parameters.",
  },
  {
    icon: Zap,
    color: "#2fb344",
    title: "Automations Engine",
    body: "Wire up triggers, conditions, and AI actions without code. Run recurring tasks while you focus on strategy.",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: BG, color: FG, fontFamily: "Inter, sans-serif" }}>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 64,
        background: BG,
        boxShadow: `0 4px 20px ${DARK}88, 0 1px 0 ${LITE}`,
      }}>
        {/* Logo */}
        <img src="/atreyu-logo.png" alt="ATREYU" style={{ height: 22, opacity: 0.8 }} />

        {/* Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/dashboard">
            <button style={{
              padding: "8px 20px", borderRadius: 10,
              background: BG, boxShadow: raisedSm,
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, color: SUB,
              transition: "box-shadow 0.15s",
            }}>
              Sign In
            </button>
          </Link>
          <Link href="/dashboard">
            <button style={{
              padding: "9px 22px", borderRadius: 10,
              background: ACCENT,
              boxShadow: `4px 4px 12px ${DARK}, -2px -2px 8px ${LITE}`,
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "#fff",
              display: "flex", alignItems: "center", gap: 6,
              transition: "opacity 0.15s",
            }}>
              Launch App <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 820, margin: "0 auto",
        padding: "100px 32px 80px",
        textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Badge */}
        <motion.div {...fade(0)} style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "6px 18px", borderRadius: 999,
          background: BG, boxShadow: raisedSm,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.10em",
          textTransform: "uppercase" as const, color: ACCENT,
          marginBottom: 40,
        }}>
          <Sparkles style={{ width: 12, height: 12 }} />
          Autonomous Tactical Resource & Execution
        </motion.div>

        {/* Headline */}
        <motion.h1 {...fade(0.08)} style={{
          fontSize: "clamp(38px, 6vw, 68px)",
          fontWeight: 800, lineHeight: 1.08,
          letterSpacing: "-0.03em",
          color: FG, marginBottom: 24,
        }}>
          Your Universe's<br />
          <span style={{ color: ACCENT }}>Marketing</span> Operating System
        </motion.h1>

        {/* Subhead */}
        <motion.p {...fade(0.16)} style={{
          fontSize: 18, lineHeight: 1.65,
          color: SUB, maxWidth: 580,
          marginBottom: 44,
        }}>
          Unify research, content generation, and autonomous campaigns in one
          cinematic interface. Powered by Anthropic's most advanced reasoning models.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fade(0.22)} style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/dashboard">
            <button style={{
              padding: "14px 34px", borderRadius: 14,
              background: BG, boxShadow: raisedLg,
              border: "none", cursor: "pointer",
              fontSize: 15, fontWeight: 700, color: ACCENT,
              display: "flex", alignItems: "center", gap: 8,
              transition: "box-shadow 0.18s",
            }}>
              Enter Workspace <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          </Link>
          <Link href="/dashboard">
            <button style={{
              padding: "14px 24px", borderRadius: 14,
              background: BG, boxShadow: raisedSm,
              border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 500, color: SUB,
            }}>
              Sign in free
            </button>
          </Link>
        </motion.div>
      </section>

      {/* ── Module Dock Preview ──────────────────────────────────── */}
      <section style={{ padding: "0 32px 80px", display: "flex", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: BG, borderRadius: 28,
            boxShadow: raisedLg,
            padding: "28px 40px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: SUB, marginBottom: 0 }}>
            8 Integrated Modules
          </p>
          <div style={{ display: "flex", gap: 18 }}>
            {MODULES.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05, duration: 0.4 }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: "28%",
                  background: BG, boxShadow: raisedSm,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "inherit",
                    background: m.color, opacity: 0.12,
                  }} />
                  <m.icon style={{ width: 20, height: 20, color: m.color, position: "relative", zIndex: 1 }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", color: SUB, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>
                  {m.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Feature Grid ────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 100px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: ACCENT, marginBottom: 12 }}>
            Everything in one OS
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.025em", color: FG }}>
            Built for serious marketing teams
          </h2>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
        }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.55 }}
              style={{
                background: BG,
                boxShadow: inset,
                borderRadius: 20,
                padding: "32px 28px",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: BG, boxShadow: raisedSm,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", inset: 0, background: f.color, opacity: 0.12, borderRadius: "inherit" }} />
                <f.icon style={{ width: 20, height: 20, color: f.color, position: "relative", zIndex: 1 }} />
              </div>
              {/* 3px accent bar */}
              <div style={{
                width: 28, height: 3, borderRadius: 2,
                background: f.color, opacity: 0.6,
                marginBottom: 16,
              }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: FG, marginBottom: 10 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: SUB }}>
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section style={{ padding: "0 32px 120px", display: "flex", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          style={{
            background: BG, boxShadow: raisedLg,
            borderRadius: 28, padding: "64px 80px",
            textAlign: "center", maxWidth: 680, width: "100%",
          }}
        >
          <img src="/atreyu-logo.png" alt="ATREYU" style={{ height: 28, opacity: 0.7, marginBottom: 28 }} />
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em", color: FG, marginBottom: 16 }}>
            Ready to run your marketing universe?
          </h2>
          <p style={{ fontSize: 15, color: SUB, marginBottom: 36, lineHeight: 1.6 }}>
            No setup required. Enter the workspace and start building campaigns,
            running agents, and generating content in minutes.
          </p>
          <Link href="/dashboard">
            <button style={{
              padding: "15px 40px", borderRadius: 14,
              background: ACCENT,
              boxShadow: `4px 4px 14px ${DARK}, -2px -2px 8px ${LITE}`,
              border: "none", cursor: "pointer",
              fontSize: 15, fontWeight: 700, color: "#fff",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              Enter Workspace <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${DARK}55`,
        padding: "24px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <img src="/atreyu-logo.png" alt="ATREYU" style={{ height: 16, opacity: 0.35 }} />
        <span style={{ fontSize: 11, color: SUB, opacity: 0.6 }}>
          © 2026 ATREYU. AI-Powered Marketing OS.
        </span>
      </footer>

    </div>
  );
}
