import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight, ChevronLeft, Building2, Palette, Brain, Rocket,
  Check, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { label: "Company", icon: Building2 },
  { label: "Brand", icon: Palette },
  { label: "Knowledge", icon: Brain },
  { label: "Launch", icon: Rocket },
];

export default function OnboardingPage() {
  const { user, updateUser, token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  /* Form state */
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [tagline, setTagline] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [knowledgeText, setKnowledgeText] = useState("");
  const [audience, setAudience] = useState("");

  const canNext =
    (step === 0 && companyName.trim().length > 0) ||
    (step === 1) ||
    (step === 2) ||
    (step === 3);

  const handleComplete = async () => {
    setLoading(true);
    try {
      /* Save brand profile */
      if (companyName) {
        await fetch("/api/brand/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: companyName,
            tagline,
            industry,
            voiceDescription,
            primaryAudience: audience,
            colorPalette: { primary: primaryColor, accent: accentColor },
          }),
        });
      }

      /* Save knowledge if provided */
      if (knowledgeText.trim()) {
        await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: `${companyName} — Business Overview`,
            type: "note",
            content: knowledgeText,
            includeInContext: true,
          }),
        });
      }

      /* Mark onboarding complete */
      await updateUser({ onboardingComplete: true });
      toast({ title: "Welcome to AERIS!", description: "Your workspace is ready." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Setup error", description: err?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to AERIS{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Let's set up your autonomous marketing system in under 2 minutes.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    done ? "bg-primary text-primary-foreground" :
                    current ? "neu-raised-sm text-primary ring-2 ring-primary/30" :
                    "neu-raised-sm text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${current ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mb-5 mx-2 rounded-full ${done ? "bg-primary/60" : "bg-border/60"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="neu-card rounded-3xl p-8 space-y-6">
          {/* Step 0: Company */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Tell AERIS about your company</h2>
                <p className="text-sm text-muted-foreground">This helps AERIS create content that sounds like you.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Company / Brand Name *</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp" className="bg-transparent border-0 focus-visible:ring-0 shadow-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Industry</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={industry} onChange={e => setIndustry(e.target.value)}
                      placeholder="e.g. SaaS, E-commerce, Consulting" className="bg-transparent border-0 focus-visible:ring-0 shadow-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Tagline</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={tagline} onChange={e => setTagline(e.target.value)}
                      placeholder="e.g. Marketing on autopilot" className="bg-transparent border-0 focus-visible:ring-0 shadow-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Target Audience</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={audience} onChange={e => setAudience(e.target.value)}
                      placeholder="e.g. SaaS founders, D2C brands, marketing managers" className="bg-transparent border-0 focus-visible:ring-0 shadow-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Brand */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Define your brand voice and colors</h2>
                <p className="text-sm text-muted-foreground">AERIS uses this for every piece of content it creates.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Brand Voice</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Textarea value={voiceDescription} onChange={e => setVoiceDescription(e.target.value)}
                      placeholder="e.g. Professional but approachable. We use data and real numbers. Short sentences. No jargon."
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[80px] text-sm resize-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                      <span className="text-xs font-mono text-muted-foreground">{primaryColor}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                      <span className="text-xs font-mono text-muted-foreground">{accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Knowledge */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">Give AERIS your business context</h2>
                <p className="text-sm text-muted-foreground">
                  Paste anything AERIS should know — product details, USPs, team size, past wins. The more context, the better the output.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Business Knowledge (optional)</label>
                <div className="neu-inset-sm rounded-xl p-[2px]">
                  <Textarea value={knowledgeText} onChange={e => setKnowledgeText(e.target.value)}
                    placeholder={`e.g. We're a B2B SaaS company with 500+ customers. Our product helps marketing teams automate content creation. Founded in 2023. Team of 12. Our key differentiator is AI-powered competitor analysis...`}
                    className="bg-transparent border-0 focus-visible:ring-0 shadow-none min-h-[160px] text-sm resize-none" />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can always add more in the Knowledge Base later.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Launch */}
          {step === 3 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center neu-raised-lg">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">You're all set!</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  AERIS is configured for <strong>{companyName || "your company"}</strong>.
                  Your brand voice, colors, and business context will inform everything AERIS creates.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
                {[
                  { label: "Brand Profile", done: !!companyName },
                  { label: "Brand Voice", done: !!voiceDescription },
                  { label: "Brand Colors", done: true },
                  { label: "Business Knowledge", done: !!knowledgeText },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      item.done ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                    }`}>
                      <Check className="h-3 w-3" />
                    </div>
                    <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl neu-raised-sm text-sm font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all disabled:opacity-40"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {loading ? "Setting up..." : "Launch AERIS"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
