import { useState, useMemo } from "react";
import { useListResearchJobs, useDeleteResearchJob, useGetResearchJobResults } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Microscope, Trash2, ChevronRight, FileText, TrendingUp, Target,
  Star, Search, MessageCircle, Award, Globe, ArrowLeft, ArrowRight, Rocket,
  CheckCircle2, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";

const INTENTS = [
  {
    id: "trending",
    label: "Trending Content",
    desc: "Discover what is going viral in your industry right now",
    icon: TrendingUp,
    color: "#f97316",
    platforms: ["instagram", "tiktok", "twitter", "youtube", "reddit", "google"],
  },
  {
    id: "competitor",
    label: "Competitor Intel",
    desc: "Analyze competitors across social channels",
    icon: Target,
    color: "#ef4444",
    platforms: ["instagram", "tiktok", "twitter", "linkedin", "facebook"],
  },
  {
    id: "reviews",
    label: "Review Mining",
    desc: "Collect customer reviews and sentiment signals",
    icon: Star,
    color: "#eab308",
    platforms: ["trustpilot", "g2", "google"],
  },
  {
    id: "search",
    label: "Search Trends",
    desc: "Monitor keywords, rankings and SERP data",
    icon: Search,
    color: "#3b82f6",
    platforms: ["google"],
  },
  {
    id: "community",
    label: "Community Pulse",
    desc: "Listen to organic discussions and forums",
    icon: MessageCircle,
    color: "#8b5cf6",
    platforms: ["reddit", "twitter"],
  },
  {
    id: "influencer",
    label: "Influencer Radar",
    desc: "Find creators and thought leaders in your niche",
    icon: Award,
    color: "#ec4899",
    platforms: ["instagram", "tiktok", "youtube", "twitter"],
  },
];

const ALL_PLATFORMS = [
  { id: "instagram", label: "Instagram", abbr: "Ig", color: "#E1306C", group: "social" },
  { id: "tiktok", label: "TikTok", abbr: "Tk", color: "#010101", group: "social" },
  { id: "twitter", label: "Twitter / X", abbr: "X", color: "#1DA1F2", group: "social" },
  { id: "linkedin", label: "LinkedIn", abbr: "Li", color: "#0077B5", group: "social" },
  { id: "youtube", label: "YouTube", abbr: "Yt", color: "#FF0000", group: "social" },
  { id: "facebook", label: "Facebook", abbr: "Fb", color: "#1877F2", group: "social" },
  { id: "reddit", label: "Reddit", abbr: "Rd", color: "#FF4500", group: "community" },
  { id: "trustpilot", label: "Trustpilot", abbr: "Tp", color: "#00B67A", group: "reviews" },
  { id: "g2", label: "G2", abbr: "G2", color: "#FF492C", group: "reviews" },
  { id: "google", label: "Google", abbr: "Gs", color: "#4285F4", group: "search" },
];

function PlatformBadge({ platformId, size = "sm" }: { platformId: string; size?: "sm" | "md" }) {
  const p = ALL_PLATFORMS.find(x => x.id === platformId);
  if (!p) return null;
  const sz = size === "sm" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center ${sz} rounded-full font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: p.color }}
      title={p.label}
    >
      {p.abbr}
    </span>
  );
}

function StepDot({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          done ? "bg-emerald-500 text-white" :
          active ? "bg-primary text-primary-foreground" :
          "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
    </div>
  );
}

interface WizardState {
  intent: string;
  platforms: string[];
  title: string;
  keywords: string;
}

export default function ResearchLab() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>({
    intent: "",
    platforms: [],
    title: "",
    keywords: "",
  });
  const [viewResultsId, setViewResultsId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useListResearchJobs();
  const { mutate: deleteJob } = useDeleteResearchJob();

  const { data: results, isLoading: loadingResults } = useGetResearchJobResults(viewResultsId || 0, {
    query: { enabled: !!viewResultsId },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/jobs"] });
      setWizardOpen(false);
      resetWizard();
    },
  });

  const resetWizard = () => {
    setStep(1);
    setWizard({ intent: "", platforms: [], title: "", keywords: "" });
  };

  const selectedIntent = INTENTS.find(i => i.id === wizard.intent);
  const availablePlatforms = useMemo(
    () => selectedIntent
      ? ALL_PLATFORMS.filter(p => selectedIntent.platforms.includes(p.id))
      : ALL_PLATFORMS,
    [selectedIntent]
  );

  const togglePlatform = (id: string) => {
    setWizard(prev => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter(p => p !== id)
        : [...prev.platforms, id],
    }));
  };

  const autoTitle = () => {
    if (!wizard.intent || wizard.platforms.length === 0) return "";
    const intentLabel = INTENTS.find(i => i.id === wizard.intent)?.label || "";
    const platformLabels = wizard.platforms.slice(0, 2).map(p => ALL_PLATFORMS.find(x => x.id === p)?.label || p).join(" + ");
    const suffix = wizard.platforms.length > 2 ? ` +${wizard.platforms.length - 2}` : "";
    return `${intentLabel} — ${platformLabels}${suffix}`;
  };

  const handleStepForward = () => {
    if (step === 1 && wizard.intent) {
      setStep(2);
    } else if (step === 2 && wizard.platforms.length > 0) {
      if (!wizard.title) {
        setWizard(prev => ({ ...prev, title: autoTitle() }));
      }
      setStep(3);
    }
  };

  const handleLaunch = () => {
    if (!wizard.keywords.trim()) return;
    const finalTitle = wizard.title || autoTitle();
    createJobMutation.mutate({ ...wizard, title: finalTitle });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "running": return "bg-primary/20 text-primary border-primary/30";
      case "failed": return "bg-destructive/20 text-destructive border-destructive/30";
      default: return "bg-muted text-foreground/70 border-white/20";
    }
  };

  const getJobPlatforms = (job: any): string[] => {
    try {
      const parsed = JSON.parse(job.scrapeTemplate || "{}");
      return parsed.platforms || [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Microscope className="h-8 w-8 text-primary" />
            Research Lab
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Deploy autonomous agents to gather market intelligence across the web and social platforms.
          </p>
        </div>
        <Button
          onClick={() => { resetWizard(); setWizardOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Rocket className="w-4 h-4" />
          New Research Job
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-52 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : !jobs?.length ? (
        <Card className="rounded-2xl border border-border bg-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No active research jobs</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Deploy your first agent to scrape and analyze data across social platforms, review sites, and the web.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobs.map(job => {
            const platforms = getJobPlatforms(job);
            const intentMeta = INTENTS.find(i => i.id === job.sourceType);
            const IntentIcon = intentMeta?.icon || Globe;
            return (
              <Card
                key={job.id}
                className="rounded-2xl border border-border bg-card flex flex-col group hover:border-primary/30 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: intentMeta?.color ? `${intentMeta.color}22` : undefined }}
                      >
                        <IntentIcon className="w-4 h-4" style={{ color: intentMeta?.color || "currentColor" }} />
                      </div>
                      <Badge variant="outline" className={`capitalize text-xs ${getStatusColor(job.status)}`}>
                        {job.status === "running" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {job.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deleteJob({ id: job.id }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/research/jobs"] }),
                        });
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-base mt-2 leading-snug">{job.title}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-2 mt-1">
                    <span className="uppercase tracking-wider font-medium" style={{ color: intentMeta?.color }}>
                      {intentMeta?.label || job.sourceType}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(job.createdAt), "MMM d, yyyy")}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end gap-3">
                  {platforms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {platforms.map(p => <PlatformBadge key={p} platformId={p} size="md" />)}
                    </div>
                  )}
                  <div className="bg-muted/60 p-3 rounded-lg text-xs text-muted-foreground line-clamp-2 font-mono border border-border">
                    {job.targets}
                  </div>
                  <Dialog
                    open={viewResultsId === job.id}
                    onOpenChange={(open) => setViewResultsId(open ? job.id : null)}
                  >
                    <button
                      onClick={() => setViewResultsId(job.id)}
                      disabled={job.status !== "completed"}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted hover:text-foreground text-sm text-muted-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>View Intelligence</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-popover">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Intelligence Report: {job.title}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        {loadingResults ? (
                          <div className="text-center py-8 text-muted-foreground animate-pulse">
                            Compiling findings...
                          </div>
                        ) : results?.length ? (
                          results.map((r, i) => (
                            <div key={i} className="bg-muted/50 border border-border rounded-xl p-5">
                              <div className="flex items-start gap-3 mb-2">
                                {r.title && <h4 className="font-semibold text-sm flex-1">{r.title}</h4>}
                              </div>
                              {r.url && (
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-xs hover:underline mb-3 block truncate"
                                >
                                  {r.url}
                                </a>
                              )}
                              <p className="text-sm text-foreground/70 leading-relaxed">{r.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No intelligence recovered.
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={wizardOpen} onOpenChange={(open) => { if (!open) resetWizard(); setWizardOpen(open); }}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border bg-popover p-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              New Research Job
            </DialogTitle>
            <div className="flex items-center gap-3 mt-3">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <StepDot step={s} current={step} />
                  {s < 3 && (
                    <div className={`h-px w-12 transition-colors ${step > s ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {step === 1 && "Choose your research goal"}
                {step === 2 && "Select platforms to scrape"}
                {step === 3 && "Configure and launch"}
              </span>
            </div>
          </div>

          <div className="px-6 py-5 min-h-[360px]">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {INTENTS.map(intent => {
                  const Icon = intent.icon;
                  const selected = wizard.intent === intent.id;
                  return (
                    <button
                      key={intent.id}
                      onClick={() => setWizard(prev => ({ ...prev, intent: intent.id, platforms: [] }))}
                      className={`relative text-left p-4 rounded-xl border transition-all group ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${intent.color}22` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: intent.color }} />
                      </div>
                      <p className="font-semibold text-sm text-foreground">{intent.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{intent.desc}</p>
                      {selected && (
                        <div
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: intent.color }}
                        >
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
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
                          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border/80"
                          }`}
                        >
                          <span
                            className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: platform.color }}
                          >
                            {platform.abbr}
                          </span>
                          {platform.label}
                          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {wizard.platforms.length > 0 && (
                  <div className="bg-muted/40 rounded-xl p-4 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Selected platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {wizard.platforms.map(p => {
                        const meta = ALL_PLATFORMS.find(x => x.id === p);
                        return (
                          <span
                            key={p}
                            className="flex items-center gap-1.5 text-xs bg-muted rounded-lg px-2.5 py-1 border border-border"
                          >
                            <span
                              className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
                              style={{ backgroundColor: meta?.color }}
                            >
                              {meta?.abbr}
                            </span>
                            {meta?.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Job Title</label>
                  <Input
                    value={wizard.title || autoTitle()}
                    onChange={e => setWizard(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-muted/50 border-border"
                    placeholder="Auto-generated from intent + platforms"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {wizard.intent === "competitor"
                      ? "Competitor handles, usernames, or URLs"
                      : wizard.intent === "reviews"
                      ? "Product page URLs or company names"
                      : wizard.intent === "search"
                      ? "Keywords to search"
                      : "Keywords, hashtags, or topics"}
                  </label>
                  <Textarea
                    value={wizard.keywords}
                    onChange={e => setWizard(prev => ({ ...prev, keywords: e.target.value }))}
                    className="bg-muted/50 border-border min-h-[110px] font-mono text-sm"
                    placeholder={
                      wizard.intent === "competitor"
                        ? "@competitor1, @competitor2 or https://competitor.com"
                        : wizard.intent === "reviews"
                        ? "https://www.trustpilot.com/review/yourcompetitor.com"
                        : wizard.intent === "influencer"
                        ? "#yourindustry, marketing, SaaS growth"
                        : "#trending, industry keyword, topic"
                    }
                  />
                  <p className="text-xs text-muted-foreground">Separate multiple entries with commas</p>
                </div>

                <div className="bg-muted/40 rounded-xl p-4 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Research summary</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="capitalize gap-1.5">
                      {(() => {
                        const Icon = selectedIntent?.icon || Globe;
                        return <Icon className="w-3 h-3" style={{ color: selectedIntent?.color }} />;
                      })()}
                      {selectedIntent?.label}
                    </Badge>
                    {wizard.platforms.map(p => (
                      <span
                        key={p}
                        className="flex items-center gap-1 bg-muted border border-border rounded-md px-2 py-0.5"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full text-[7px] font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: ALL_PLATFORMS.find(x => x.id === p)?.color }}
                        >
                          {ALL_PLATFORMS.find(x => x.id === p)?.abbr}
                        </span>
                        {ALL_PLATFORMS.find(x => x.id === p)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border px-6 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                if (step > 1) setStep(s => s - 1);
                else { setWizardOpen(false); resetWizard(); }
              }}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            {step < 3 ? (
              <Button
                onClick={handleStepForward}
                disabled={step === 1 ? !wizard.intent : wizard.platforms.length === 0}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleLaunch}
                disabled={!wizard.keywords.trim() || createJobMutation.isPending}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {createJobMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Initializing...</>
                ) : (
                  <><Rocket className="w-4 h-4" /> Deploy Agent</>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
