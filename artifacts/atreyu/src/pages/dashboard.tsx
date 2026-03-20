import { useGetDashboardStats } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Folder, Megaphone, FileText, Activity, TrendingUp, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "@/contexts/theme";

const chartData = [
  { name: "Mon", value: 12, secondary: 8 },
  { name: "Tue", value: 19, secondary: 14 },
  { name: "Wed", value: 16, secondary: 11 },
  { name: "Thu", value: 7,  secondary: 5  },
  { name: "Fri", value: 21, secondary: 17 },
  { name: "Sat", value: 11, secondary: 9  },
  { name: "Sun", value: 9,  secondary: 6  },
];

function StatCard({
  label, value, icon: Icon, accent = "blue", delta,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "blue" | "cyan" | "violet" | "green";
  delta?: string;
}) {
  const { theme } = useTheme();
  const colors = {
    blue:   { bg: "rgba(37,99,235,0.10)",   text: "hsl(var(--primary))",  glow: "rgba(37,99,235,0.15)"  },
    cyan:   { bg: "rgba(6,182,212,0.10)",   text: "hsl(var(--accent))",   glow: "rgba(6,182,212,0.15)"  },
    violet: { bg: "rgba(124,58,237,0.10)",  text: "#7c3aed",              glow: "rgba(124,58,237,0.15)" },
    green:  { bg: "rgba(16,185,129,0.10)",  text: "#10b981",              glow: "rgba(16,185,129,0.15)" },
  };
  const c = colors[accent];

  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden fut-clip-tr transition-all duration-300 hover:scale-[1.01] group cursor-default"
      style={{ boxShadow: `var(--neu-raised), 0 0 0 1px ${c.glow}`, background: "var(--neu-bg)" }}
    >
      {/* Corner notch accent */}
      <div
        className="absolute top-0 right-0 w-3.5 h-3.5"
        style={{ background: c.text, clipPath: "polygon(100% 0, 0 0, 100% 100%)", opacity: 0.7 }}
      />
      {/* Subtle tint overlay */}
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity"
        style={{ background: `linear-gradient(135deg, ${c.bg}, transparent)` }} />

      <div className="relative z-10">
        {/* Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: c.bg, boxShadow: `0 0 16px ${c.glow}` }}>
            <Icon className="h-4.5 w-4.5" style={{ color: c.text, width: 18, height: 18 }} />
          </div>
          {delta && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
              style={{ background: "rgba(16,185,129,0.1)", boxShadow: "var(--neu-inset-sm)" }}>
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="hud-label text-emerald-500">{delta}</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="data-value text-4xl font-black text-foreground mb-1.5" style={{ fontFamily: "var(--app-font-mono)" }}>
          {value}
        </div>

        {/* Label */}
        <div className="hud-label text-foreground/40">{label}</div>

        {/* Bottom stripe */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl opacity-60"
          style={{ background: `linear-gradient(90deg, ${c.text}00, ${c.text}, ${c.text}00)` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();
  const { theme } = useTheme();

  const isDark = theme === "dark";
  const gridColor   = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const axisColor   = isDark ? "rgba(255,255,255,0.3)"  : "rgba(0,0,0,0.35)";
  const tooltipBg   = isDark ? "#1a1d2a" : "#edf0f7";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(191,196,212,0.6)";

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl mx-auto mb-4 animate-pulse" style={{ boxShadow: "var(--neu-raised)", background: "var(--neu-bg)" }} />
          <p className="hud-label text-foreground/40">INITIALIZING SYSTEMS…</p>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return <div className="h-full flex items-center justify-center text-destructive hud-label">SYSTEM FAULT — UNABLE TO LOAD</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-4">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="hud-label text-foreground/35 mb-1">COMMAND CENTER</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Marketing Universe</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ boxShadow: "var(--neu-inset-sm)", background: "var(--neu-bg)" }}>
          <div className="status-active" />
          <span className="hud-label text-foreground/40">ALL SYSTEMS NOMINAL</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="ACTIVE PROJECTS"   value={stats.totalProjects}      icon={Folder}   accent="blue"   delta="+12%" />
        <StatCard label="CAMPAIGNS"          value={stats.totalCampaigns}     icon={Megaphone} accent="cyan"  delta="+8%"  />
        <StatCard label="CONTENT ASSETS"     value={stats.totalContentAssets} icon={FileText}  accent="violet" />
        <StatCard
          label="AUTOMATIONS ACTIVE"
          value={`${stats.activeAutomations}/${stats.totalAutomations}`}
          icon={Activity}
          accent="green"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Execution velocity */}
        <div className="lg:col-span-2 rounded-2xl p-5 fut-clip-tr fut-grid"
          style={{ boxShadow: "var(--neu-raised)", background: "var(--neu-bg)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="hud-label text-foreground/35 mb-0.5">EXECUTION VELOCITY</p>
              <h3 className="text-base font-bold text-foreground">Weekly Task Output</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="hud-label text-primary">+24.3%</span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke="transparent" tick={{ fill: axisColor, fontSize: 10, fontFamily: "var(--app-font-mono)", textAnchor: "middle" }} />
                <YAxis stroke="transparent" tick={{ fill: axisColor, fontSize: 10, fontFamily: "var(--app-font-mono)" }} />
                <Tooltip
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 10, fontSize: 11, fontFamily: "var(--app-font-mono)" }}
                  labelStyle={{ color: axisColor }}
                />
                <Area type="monotone" dataKey="value"     stroke="#2563eb" strokeWidth={2} fill="url(#grad1)" dot={false} />
                <Area type="monotone" dataKey="secondary" stroke="#06b6d4" strokeWidth={2} fill="url(#grad2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl p-5" style={{ boxShadow: "var(--neu-raised)", background: "var(--neu-bg)" }}>
          <p className="hud-label text-foreground/35 mb-0.5">SIGNAL FEED</p>
          <h3 className="text-base font-bold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, i) => (
                <div key={i}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all cursor-default"
                  style={{ boxShadow: "var(--neu-inset-sm)", background: "var(--neu-bg)" }}>
                  <div className="mt-0.5 h-2 w-2 rounded-full shrink-0 bg-primary"
                    style={{ boxShadow: "0 0 8px rgba(37,99,235,0.5)" }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{activity.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="hud-label text-foreground/30">{activity.type}</span>
                      <span className="hud-label text-foreground/20">·</span>
                      <span className="hud-label text-foreground/30">{format(new Date(activity.createdAt), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 hud-label text-foreground/30">NO SIGNALS DETECTED</div>
            )}
          </div>
        </div>
      </div>

      {/* System status row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "AI INFERENCE",  val: "98.7%",  ok: true  },
          { label: "DATA PIPELINE", val: "ACTIVE", ok: true  },
          { label: "AUTOMATIONS",   val: "ARMED",  ok: true  },
        ].map((item) => (
          <div key={item.label}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ boxShadow: "var(--neu-inset-sm)", background: "var(--neu-bg)" }}>
            <span className="hud-label text-foreground/35">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <div className={item.ok ? "status-active" : "h-1.5 w-1.5 rounded-full bg-destructive"} />
              <span className="hud-label text-emerald-500">{item.val}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
