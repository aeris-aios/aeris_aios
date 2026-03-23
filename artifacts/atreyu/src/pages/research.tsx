import { useState, useMemo } from "react";
import { useListResearchJobs, useDeleteResearchJob, useGetResearchJobResults } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Microscope, Trash2, ChevronRight, FileText, TrendingUp, Target,
  Star, Search, MessageCircle, Award, Globe, Rocket,
  CheckCircle2, Loader2, Clock, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTheme } from "@/contexts/theme";

/* ─── Neumorphic hook ─────────────────────────────────────── */
function useNeu() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const bg   = isLight ? "#e8ecf4" : "#0f111a";
  const dark = isLight ? "#bfc4d4" : "#090b12";
  const lite = isLight ? "#ffffff" : "#191c2a";
  return {
    isLight, bg, dark, lite,
    raised:   `8px 8px 20px ${dark}, -8px -8px 20px ${lite}`,
    raisedSm: `4px 4px 10px ${dark}, -4px -4px 10px ${lite}`,
    raisedLg: `12px 12px 30px ${dark}, -12px -12px 30px ${lite}`,
    inset:    `inset 5px 5px 12px ${dark}, inset -5px -5px 12px ${lite}`,
    insetSm:  `inset 3px 3px 7px ${dark}, inset -3px -3px 7px ${lite}`,
  };
}

/* ─── Platform SVG Logos ──────────────────────────────────── */
function PlatformLogo({ id, size = 16 }: { id: string; size?: number }) {
  const s = size;
  switch (id) {
    case "instagram":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" stroke="white" strokeWidth="2"/>
          <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="2"/>
          <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
        </svg>
      );
    case "tiktok":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
        </svg>
      );
    case "twitter":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case "linkedin":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      );
    case "youtube":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
          <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="#FF0000"/>
        </svg>
      );
    case "facebook":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
        </svg>
      );
    case "reddit":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <circle cx="12" cy="12" r="10" fill="none"/>
          <path d="M22 12a10 10 0 11-20 0 10 10 0 0120 0zm-7.5-1.5A1.5 1.5 0 0013 12a7.5 7.5 0 00-7.5 0 1.5 1.5 0 001.5 1.5c.4 0 .7-.1 1-.3.7 1.5 2.4 2.3 4 2a3.7 3.7 0 002.5-1 1.5 1.5 0 001 .3A1.5 1.5 0 0017 13a1.5 1.5 0 00-2.5-1.5zM12 5.5a1.5 1.5 0 000 3 1.5 1.5 0 000-3zm-2 9a1 1 0 002 0 1 1 0 00-2 0zm4 0a1 1 0 002 0 1 1 0 00-2 0z"/>
        </svg>
      );
    case "trustpilot":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="white">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
        </svg>
      );
    case "g2":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <text x="2" y="18" fontSize="14" fontWeight="bold" fill="white" fontFamily="Arial">G2</text>
        </svg>
      );
    case "google":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    default:
      return <Globe width={s} height={s} color="white" />;
  }
}

/* ─── Data ────────────────────────────────────────────────── */
const INTENTS = [
  { id: "trending",   label: "Trending Content",  desc: "Discover what is going viral right now",         icon: TrendingUp,   color: "#f97316", platforms: ["instagram","tiktok","twitter","youtube","reddit","google"] },
  { id: "competitor", label: "Competitor Intel",   desc: "Analyze competitors across social channels",      icon: Target,       color: "#ef4444", platforms: ["instagram","tiktok","twitter","linkedin","facebook"] },
  { id: "reviews",    label: "Review Mining",      desc: "Collect customer reviews and sentiment signals",  icon: Star,         color: "#eab308", platforms: ["trustpilot","g2","google"] },
  { id: "search",     label: "Search Trends",      desc: "Monitor keywords, rankings and SERP data",        icon: Search,       color: "#3b82f6", platforms: ["google"] },
  { id: "community",  label: "Community Pulse",    desc: "Listen to organic discussions and forums",        icon: MessageCircle,color: "#8b5cf6", platforms: ["reddit","twitter"] },
  { id: "influencer", label: "Influencer Radar",   desc: "Find creators and thought leaders in your niche", icon: Award,        color: "#ec4899", platforms: ["instagram","tiktok","youtube","twitter"] },
];

const ALL_PLATFORMS = [
  { id: "instagram", label: "Instagram",   color: "#C13584", bg: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" },
  { id: "tiktok",    label: "TikTok",      color: "#010101", bg: "#010101" },
  { id: "twitter",   label: "Twitter / X", color: "#000000", bg: "#000000" },
  { id: "linkedin",  label: "LinkedIn",    color: "#0077B5", bg: "#0077B5" },
  { id: "youtube",   label: "YouTube",     color: "#FF0000", bg: "#FF0000" },
  { id: "facebook",  label: "Facebook",    color: "#1877F2", bg: "#1877F2" },
  { id: "reddit",    label: "Reddit",      color: "#FF4500", bg: "#FF4500" },
  { id: "trustpilot",label: "Trustpilot",  color: "#00B67A", bg: "#00B67A" },
  { id: "g2",        label: "G2",          color: "#FF492C", bg: "#FF492C" },
  { id: "google",    label: "Google",      color: "#4285F4", bg: "#ffffff" },
];

function PlatformBadge({ platformId, size = "sm" }: { platformId: string; size?: "sm" | "md" | "lg" }) {
  const p = ALL_PLATFORMS.find(x => x.id === platformId);
  if (!p) return null;
  const dim = size === "sm" ? 26 : size === "md" ? 32 : 40;
  const iconSz = size === "sm" ? 13 : size === "md" ? 16 : 20;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: dim, height: dim, background: p.bg }}
      title={p.label}
    >
      <PlatformLogo id={p.id} size={iconSz} />
    </span>
  );
}

interface WizardState {
  intent: string;
  platforms: string[];
  title: string;
  keywords: string;
}

/* ─── Status badge ────────────────────────────────────────── */
function StatusPill({ status, n }: { status: string; n: ReturnType<typeof useNeu> }) {
  const cfg = {
    completed: { color: "#10b981", label: "Completed", Icon: CheckCircle2 },
    running:   { color: "#3b82f6", label: "Running",   Icon: Loader2 },
    failed:    { color: "#ef4444", label: "Failed",    Icon: XCircle },
    pending:   { color: "#f59e0b", label: "Pending",   Icon: Clock },
  }[status] ?? { color: "#6b7280", label: status, Icon: Clock };

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: n.bg,
        boxShadow: n.raisedSm,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
      }}
    >
      <cfg.Icon className={`w-3 h-3 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function ResearchLab() {
  const n = useNeu();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>({ intent: "", platforms: [], title: "", keywords: "" });
  const [viewResultsId, setViewResultsId] = useState<number | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [justLaunched, setJustLaunched] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useListResearchJobs({
    query: {
      refetchInterval: (query) => {
        const data = query.state.data as Array<{ status: string }> | undefined;
        return data?.some(j => j.status === "pending" || j.status === "running") ? 3000 : false;
      },
    },
  });

  const { mutate: deleteJob } = useDeleteResearchJob();

  const { data: results, isLoading: loadingResults } = useGetResearchJobResults(
    viewResultsId || 0,
    { query: { enabled: !!viewResultsId } }
  );

  const createJobMutation = useMutation({
    mutationFn: async (payload: WizardState) => {
      const res = await fetch("/api/research/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          sourceType: payload.intent,
          targets: payload.keywords,
          scrapeTemplate: JSON.stringify({ platforms: payload.platforms }),
        }),
      });
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/jobs"] });
      setWizardOpen(false);
      resetWizard();
      if (data?.id) {
        setJustLaunched(data.id);
        setTimeout(() => setJustLaunched(null), 6000);
      }
    },
    onError: () => setLaunchError("Something went wrong. Please try again."),
  });

  const resetWizard = () => {
    setStep(1);
    setWizard({ intent: "", platforms: [], title: "", keywords: "" });
  };

  const selectedIntent = INTENTS.find(i => i.id === wizard.intent);
  const availablePlatforms = useMemo(
    () => selectedIntent ? ALL_PLATFORMS.filter(p => selectedIntent.platforms.includes(p.id)) : ALL_PLATFORMS,
    [selectedIntent]
  );

  const togglePlatform = (id: string) =>
    setWizard(prev => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter(p => p !== id)
        : [...prev.platforms, id],
    }));

  const autoTitle = () => {
    if (!wizard.intent || wizard.platforms.length === 0) return "";
    const intentLabel = INTENTS.find(i => i.id === wizard.intent)?.label || "";
    const platformLabels = wizard.platforms.slice(0, 2).map(p => ALL_PLATFORMS.find(x => x.id === p)?.label || p).join(" + ");
    const suffix = wizard.platforms.length > 2 ? ` +${wizard.platforms.length - 2}` : "";
    return `${intentLabel} — ${platformLabels}${suffix}`;
  };

  const handleStepForward = () => {
    if (step === 1 && wizard.intent) setStep(2);
    else if (step === 2 && wizard.platforms.length > 0) {
      if (!wizard.title) setWizard(prev => ({ ...prev, title: autoTitle() }));
      setStep(3);
    }
  };

  const handleLaunch = () => {
    setLaunchError(null);
    if (!wizard.keywords.trim()) {
      setLaunchError("Please enter at least one keyword, hashtag, or URL.");
      return;
    }
    createJobMutation.mutate({ ...wizard, title: wizard.title || autoTitle() });
  };

  const getJobPlatforms = (job: any): string[] => {
    try { return JSON.parse(job.scrapeTemplate || "{}").platforms || []; }
    catch { return []; }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        style={{ background: n.bg, boxShadow: n.raised }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: n.bg,
              boxShadow: `${n.raisedSm}, 0 0 18px rgba(14,165,233,0.25)`,
            }}
          >
            <Microscope className="w-6 h-6" style={{ color: "#0ea5e9", filter: "drop-shadow(0 0 6px rgba(14,165,233,0.6))" }} />
          </div>
          <div>
            <p className="hud-label mb-0.5">AERIS INTELLIGENCE</p>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Research Lab</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Deploy autonomous agents to gather market intelligence across the web and social platforms.</p>
          </div>
        </div>
        <button
          onClick={() => { resetWizard(); setWizardOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg,#62d0ff,#0683c4)",
            boxShadow: `${n.raisedSm}, 0 0 20px rgba(14,165,233,0.35)`,
          }}
        >
          <Rocket className="w-4 h-4" />
          New Research Job
        </button>
      </div>

      {/* ── Job grid ───────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: n.bg, boxShadow: n.inset }} />
          ))}
        </div>
      ) : !jobs?.length ? (
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center"
          style={{ background: n.bg, boxShadow: n.inset }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: n.bg, boxShadow: n.raised }}
          >
            <Globe className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-1">No research jobs yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Deploy your first agent to scrape and analyze data across social platforms, review sites, and the web.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {jobs.map(job => {
            const platforms = getJobPlatforms(job);
            const intentMeta = INTENTS.find(i => i.id === job.sourceType);
            const IntentIcon = intentMeta?.icon || Globe;
            const isNew = justLaunched === job.id;
            return (
              <div
                key={job.id}
                className="rounded-2xl overflow-hidden flex flex-col group transition-all"
                style={{
                  background: n.bg,
                  boxShadow: isNew
                    ? `${n.raised}, 0 0 0 2px ${intentMeta?.color || "#0ea5e9"}50, 0 0 24px ${intentMeta?.color || "#0ea5e9"}30`
                    : n.raised,
                }}
              >
                {/* Card top stripe */}
                <div className="h-1 w-full" style={{ background: intentMeta?.color ? `linear-gradient(90deg, ${intentMeta.color}, ${intentMeta.color}80)` : "hsl(var(--primary))" }} />

                <div className="p-5 flex-1 flex flex-col gap-3">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: n.bg, boxShadow: n.raisedSm }}
                      >
                        <IntentIcon className="w-4 h-4" style={{ color: intentMeta?.color || "currentColor" }} />
                      </div>
                      <StatusPill status={job.status} n={n} />
                    </div>
                    <button
                      onClick={() => deleteJob({ id: job.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/research/jobs"] }) })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive"
                      style={{ background: n.bg, boxShadow: n.raisedSm }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title + meta */}
                  <div>
                    <h3 className="font-bold text-sm text-foreground leading-snug">{job.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="hud-label" style={{ color: intentMeta?.color }}>{intentMeta?.label || job.sourceType}</span>
                      <span className="hud-label">•</span>
                      <span className="hud-label">{format(new Date(job.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {/* Platform badges */}
                  {platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map(p => <PlatformBadge key={p} platformId={p} size="md" />)}
                    </div>
                  )}

                  {/* Keywords inset */}
                  <div
                    className="rounded-xl px-3 py-2 text-xs text-muted-foreground font-mono line-clamp-2"
                    style={{ background: n.bg, boxShadow: n.insetSm }}
                  >
                    {job.targets}
                  </div>

                  {/* View Intelligence */}
                  <Dialog
                    open={viewResultsId === job.id}
                    onOpenChange={(open) => setViewResultsId(open ? job.id : null)}
                  >
                    <button
                      onClick={() => job.status === "completed" && setViewResultsId(job.id)}
                      disabled={job.status !== "completed"}
                      className="mt-auto w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: n.bg,
                        boxShadow: job.status === "completed" ? n.raisedSm : n.insetSm,
                        color: job.status === "completed" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      <span>View Intelligence</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <DialogContent
                      className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-2xl border-0"
                      style={{ background: n.bg, boxShadow: n.raisedLg }}
                    >
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                          <FileText className="h-5 w-5" style={{ color: intentMeta?.color || "#0ea5e9" }} />
                          Intelligence Report: {job.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 space-y-3">
                        {loadingResults ? (
                          <div className="text-center py-10 hud-label animate-pulse">Compiling findings…</div>
                        ) : results?.length ? (
                          results.map((r, i) => (
                            <div
                              key={i}
                              className="rounded-xl p-4"
                              style={{ background: n.bg, boxShadow: n.insetSm }}
                            >
                              {r.title && <h4 className="font-semibold text-sm mb-2 text-foreground">{r.title}</h4>}
                              {r.url && (
                                <a href={r.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs mb-2 block truncate hover:underline"
                                  style={{ color: intentMeta?.color || "#0ea5e9" }}
                                >
                                  {r.url}
                                </a>
                              )}
                              <p className="text-sm text-muted-foreground leading-relaxed">{r.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 hud-label">No intelligence recovered.</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Wizard Dialog ───────────────────────────────────── */}
      <Dialog open={wizardOpen} onOpenChange={(open) => { if (!open) resetWizard(); setWizardOpen(open); }}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden border-0 rounded-2xl"
          style={{ background: n.bg, boxShadow: n.raisedLg }}
        >
          {/* Wizard header */}
          <div className="px-6 py-4 border-b border-border/30">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: n.bg, boxShadow: n.raisedSm }}
              >
                <Rocket className="w-4 h-4" style={{ color: "#0ea5e9" }} />
              </div>
              New Research Job
            </DialogTitle>
            {/* Step progress */}
            <div className="flex items-center gap-3 mt-4">
              {[1, 2, 3].map(s => {
                const done = step > s;
                const active = step === s;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: n.bg,
                        boxShadow: active ? `${n.raisedSm}, 0 0 12px rgba(14,165,233,0.4)` : n.insetSm,
                        color: done ? "#10b981" : active ? "#0ea5e9" : "hsl(var(--muted-foreground))",
                        border: active ? "1px solid rgba(14,165,233,0.3)" : done ? "1px solid rgba(16,185,129,0.3)" : "none",
                      }}
                    >
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className="h-px w-10 transition-all"
                        style={{ background: step > s ? "#10b981" : "hsl(var(--border))" }}
                      />
                    )}
                  </div>
                );
              })}
              <span className="hud-label ml-2">
                {step === 1 && "Choose your research goal"}
                {step === 2 && "Select platforms to scrape"}
                {step === 3 && "Configure and launch"}
              </span>
            </div>
          </div>

          {/* Wizard body */}
          <div className="px-6 py-5 min-h-[360px]">

            {/* Step 1 — Intent */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {INTENTS.map(intent => {
                  const Icon = intent.icon;
                  const selected = wizard.intent === intent.id;
                  return (
                    <button
                      key={intent.id}
                      onClick={() => setWizard(prev => ({ ...prev, intent: intent.id, platforms: [] }))}
                      className="relative text-left p-4 rounded-xl transition-all active:scale-95"
                      style={{
                        background: n.bg,
                        boxShadow: selected
                          ? `${n.inset}, 0 0 0 1.5px ${intent.color}60, 0 0 16px ${intent.color}20`
                          : n.raised,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          background: n.bg,
                          boxShadow: selected ? n.insetSm : n.raisedSm,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: intent.color, filter: selected ? `drop-shadow(0 0 4px ${intent.color})` : "none" }} />
                      </div>
                      <p className="font-bold text-sm text-foreground">{intent.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{intent.desc}</p>
                      {selected && (
                        <div
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: intent.color }}
                        >
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2 — Platforms */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="hud-label">
                  Available for{" "}
                  <span style={{ color: selectedIntent?.color }}>{selectedIntent?.label}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {availablePlatforms.map(platform => {
                    const selected = wizard.platforms.includes(platform.id);
                    return (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
                        style={{
                          background: n.bg,
                          boxShadow: selected ? n.insetSm : n.raisedSm,
                          color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                          border: selected ? `1px solid ${platform.color}40` : "1px solid transparent",
                        }}
                      >
                        <PlatformBadge platformId={platform.id} size="sm" />
                        {platform.label}
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 ml-1" style={{ color: platform.color }} />}
                      </button>
                    );
                  })}
                </div>

                {wizard.platforms.length > 0 && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: n.bg, boxShadow: n.insetSm }}
                  >
                    <p className="hud-label mb-2">Selected platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {wizard.platforms.map(p => {
                        const meta = ALL_PLATFORMS.find(x => x.id === p);
                        return (
                          <span
                            key={p}
                            className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1"
                            style={{ background: n.bg, boxShadow: n.raisedSm, color: "hsl(var(--foreground))" }}
                          >
                            <PlatformBadge platformId={p} size="sm" />
                            {meta?.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Config */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Job Title</label>
                  <Input
                    value={wizard.title || autoTitle()}
                    onChange={e => setWizard(prev => ({ ...prev, title: e.target.value }))}
                    className="border-0 rounded-xl"
                    style={{ background: n.bg, boxShadow: n.insetSm }}
                    placeholder="Auto-generated from intent + platforms"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    {wizard.intent === "competitor" ? "Competitor Handles / URLs" :
                     wizard.intent === "reviews" ? "Brand Name or Product URL" :
                     "Keywords, Hashtags, or URLs"}
                  </label>
                  <Textarea
                    value={wizard.keywords}
                    onChange={e => setWizard(prev => ({ ...prev, keywords: e.target.value }))}
                    className="border-0 rounded-xl font-mono text-sm min-h-[90px]"
                    style={{ background: n.bg, boxShadow: n.insetSm }}
                    placeholder={
                      wizard.intent === "competitor" ? "@competitor, competitor.com" :
                      wizard.intent === "reviews" ? "Brand Name, product-url.com" :
                      "#keyword, keyword2, brand.com"
                    }
                  />
                </div>

                {launchError && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                    style={{ background: n.bg, boxShadow: n.insetSm, color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {launchError}
                  </div>
                )}

                {/* Platform summary */}
                <div className="flex flex-wrap gap-1.5">
                  {wizard.platforms.map(p => <PlatformBadge key={p} platformId={p} size="sm" />)}
                </div>
              </div>
            )}
          </div>

          {/* Wizard footer */}
          <div
            className="px-6 py-4 flex justify-between items-center border-t border-border/30"
          >
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : setWizardOpen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground transition-all"
              style={{ background: n.bg, boxShadow: n.raisedSm }}
            >
              {step > 1 ? "Back" : "Cancel"}
            </button>

            {step < 3 ? (
              <button
                onClick={handleStepForward}
                disabled={(step === 1 && !wizard.intent) || (step === 2 && wizard.platforms.length === 0)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg,#62d0ff,#0683c4)",
                  boxShadow: n.raisedSm,
                }}
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={createJobMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg,#62d0ff,#0683c4)",
                  boxShadow: `${n.raisedSm}, 0 0 20px rgba(14,165,233,0.35)`,
                }}
              >
                {createJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {createJobMutation.isPending ? "Launching…" : "Launch Agent"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
