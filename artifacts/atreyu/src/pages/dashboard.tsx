import { useGetDashboardStats } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Folder, Megaphone, FileText, Activity, TrendingUp, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "@/contexts/theme";

const chartData = [
  { name: "Mon", value: 12, secondary: 8  },
  { name: "Tue", value: 19, secondary: 14 },
  { name: "Wed", value: 16, secondary: 11 },
  { name: "Thu", value: 7,  secondary: 5  },
  { name: "Fri", value: 21, secondary: 17 },
  { name: "Sat", value: 11, secondary: 9  },
  { name: "Sun", value: 9,  secondary: 6  },
];

/* Neumorphic helpers — inline styles for reliability */
function useNeu() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const bg   = isLight ? "#e8ecf4" : "#0f111a";
  const dark = isLight ? "#bfc4d4" : "#090b12";
  const lite = isLight ? "#ffffff"  : "#191c2a";
  return {
    isLight, bg, dark, lite,
    raised:   `8px 8px 20px ${dark}, -8px -8px 20px ${lite}`,
    raisedSm: `4px 4px 10px ${dark}, -4px -4px 10px ${lite}`,
    raisedLg: `12px 12px 30px ${dark}, -12px -12px 30px ${lite}`,
    inset:    `inset 5px 5px 12px ${dark}, inset -5px -5px 12px ${lite}`,
    insetSm:  `inset 3px 3px 7px ${dark}, inset -3px -3px 7px ${lite}`,
  };
}

const accents = {
  blue:   { icon: Folder,   text: "#2563eb", label: "ACTIVE PROJECTS",    grad: "linear-gradient(135deg,#4f8ef7,#2563eb)" },
  cyan:   { icon: Megaphone, text: "#0ea5e9", label: "CAMPAIGNS",          grad: "linear-gradient(135deg,#5ac8fa,#0ea5e9)" },
  violet: { icon: FileText, text: "#7c3aed", label: "CONTENT ASSETS",      grad: "linear-gradient(135deg,#bf5af2,#7c3aed)" },
  green:  { icon: Activity, text: "#059669", label: "AUTOMATIONS ACTIVE",  grad: "linear-gradient(135deg,#30d158,#059669)" },
};

function StatCard({
  accentKey,
  value,
  delta,
}: {
  accentKey: keyof typeof accents;
  value: string | number;
  delta?: string;
}) {
  const n = useNeu();
  const a = accents[accentKey];
  const Icon = a.icon;

  return (
    <div
      className="relative rounded-2xl p-5 cursor-default"
      style={{ background: n.bg, boxShadow: n.inset }}
    >
      {/* Icon + delta row */}
      <div className="flex items-center justify-between mb-4">
        {/* Raised icon floats out of the inset card */}
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: n.bg, boxShadow: n.raisedSm }}
        >
          <Icon style={{ width: 17, height: 17, color: a.text, filter: `drop-shadow(0 0 3px ${a.text}70)` }} />
        </div>

        {delta && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
            style={{ background: n.bg, boxShadow: n.raisedSm }}>
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            <span className="hud-label text-emerald-500">{delta}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="data-value text-4xl font-black text-foreground mb-1.5">
        {value}
      </div>

      {/* Label */}
      <div className="hud-label text-foreground/38">{a.label}</div>

      {/* Subtle left accent bar */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full opacity-40"
        style={{ background: a.text }} />
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();
  const n = useNeu();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl mx-auto mb-4 animate-pulse"
            style={{ background: n.bg, boxShadow: n.raised }} />
          <p className="hud-label text-foreground/35">INITIALIZING SYSTEMS…</p>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return <div className="h-full flex items-center justify-center hud-label text-destructive">SYSTEM FAULT — UNABLE TO LOAD</div>;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="hud-label text-foreground/32 mb-1">COMMAND CENTER</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Marketing Universe</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: n.bg, boxShadow: n.insetSm }}>
          <div className="status-active" />
          <span className="hud-label text-foreground/38">ALL SYSTEMS NOMINAL</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard accentKey="blue"   value={stats.totalProjects}      delta="+12%" />
        <StatCard accentKey="cyan"   value={stats.totalCampaigns}     delta="+8%"  />
        <StatCard accentKey="violet" value={stats.totalContentAssets}              />
        <StatCard accentKey="green"  value={`${stats.activeAutomations}/${stats.totalAutomations}`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Velocity chart */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: n.bg, boxShadow: n.raised }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="hud-label text-foreground/32 mb-0.5">EXECUTION VELOCITY</p>
              <h3 className="text-base font-bold text-foreground">Weekly Task Output</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl"
              style={{ background: n.bg, boxShadow: n.insetSm }}>
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="hud-label text-primary">+24.3%</span>
            </div>
          </div>
          <div className="h-[200px]">
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
                <CartesianGrid
                  strokeDasharray="3 3" vertical={false}
                  stroke={n.isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}
                />
                <XAxis dataKey="name" stroke="transparent"
                  tick={{ fill: n.isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--app-font-mono)" }} />
                <YAxis stroke="transparent"
                  tick={{ fill: n.isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "var(--app-font-mono)" }} />
                <Tooltip
                  contentStyle={{
                    background: n.bg, border: "none",
                    borderRadius: 12, fontSize: 11,
                    fontFamily: "var(--app-font-mono)",
                    boxShadow: n.raised,
                  }}
                  labelStyle={{ color: n.isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}
                />
                <Area type="monotone" dataKey="value"     stroke="#2563eb" strokeWidth={2} fill="url(#grad1)" dot={false} />
                <Area type="monotone" dataKey="secondary" stroke="#06b6d4" strokeWidth={2} fill="url(#grad2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl p-5"
          style={{ background: n.bg, boxShadow: n.raised }}>
          <p className="hud-label text-foreground/32 mb-0.5">SIGNAL FEED</p>
          <h3 className="text-base font-bold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-2.5">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, i) => (
                <div key={i}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-default"
                  style={{ background: n.bg, boxShadow: n.insetSm }}>
                  <div className="mt-0.5 h-2 w-2 rounded-full shrink-0 bg-primary"
                    style={{ boxShadow: "0 0 6px rgba(37,99,235,0.5)" }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{activity.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="hud-label text-foreground/30">{activity.type}</span>
                      <span className="hud-label text-foreground/20">·</span>
                      <span className="hud-label text-foreground/30">
                        {format(new Date(activity.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 hud-label text-foreground/28">NO SIGNALS DETECTED</div>
            )}
          </div>
        </div>
      </div>

      {/* System status */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "AI INFERENCE",  val: "98.7%",  color: "#059669" },
          { label: "DATA PIPELINE", val: "ACTIVE", color: "#059669" },
          { label: "AUTOMATIONS",   val: "ARMED",  color: "#059669" },
        ].map((item) => (
          <div key={item.label}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: n.bg, boxShadow: n.insetSm }}>
            <span className="hud-label text-foreground/35">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <div className="status-active" />
              <span className="hud-label" style={{ color: item.color }}>{item.val}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
