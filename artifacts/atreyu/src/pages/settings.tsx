import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon, User, BrainCircuit, Box, CreditCard,
  Save, Loader2, Eye, EyeOff, Check,
} from "lucide-react";

type Tab = "profile" | "ai" | "integrations" | "billing";

export default function Settings() {
  const { user, token, updateUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);

  /* ── Settings state (loaded from API) ── */
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  /* Profile form */
  const [workspaceName, setWorkspaceName] = useState("");
  const [userName, setUserName] = useState(user?.name ?? "");

  /* AI prefs */
  const [deepThink, setDeepThink] = useState(false);
  const [autoInject, setAutoInject] = useState(true);

  /* Integration keys (masked display) */
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  /* Load settings on mount */
  useEffect(() => {
    fetch("/api/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setWorkspaceName(data.workspace_name ?? "");
        setDeepThink(data.deep_think === "true");
        setAutoInject(data.auto_inject !== "false");
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, [token]);

  const saveSettings = async (updates: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        toast({ title: "Settings saved" });
      } else {
        throw new Error("Failed to save");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save settings", variant: "destructive" });
    }
    setSaving(false);
  };

  const saveProfile = async () => {
    await saveSettings({ workspace_name: workspaceName });
    if (userName !== user?.name) {
      await updateUser({ name: userName });
    }
    toast({ title: "Profile saved" });
  };

  const saveAIPrefs = () => saveSettings({ deep_think: String(deepThink), auto_inject: String(autoInject) });

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return key.slice(0, 4) + "•".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "ai", label: "AI Models", icon: BrainCircuit },
    { id: "integrations", label: "Integrations", icon: Box },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  const integrations = [
    { key: "apify_api_key", label: "Apify API Key", desc: "Powers research job scraping across 10+ platforms" },
    { key: "replicate_api_key", label: "Replicate API Key", desc: "FLUX Kontext — best style transfer from reference images (recommended)" },
    { key: "ideogram_api_key", label: "Ideogram API Key", desc: "AI image generation with readable text embedded in images" },
    { key: "higgsfield_api_key", label: "Higgsfield API Key", desc: "Photo and video generation" },
    { key: "meta_ads_token", label: "Meta Ads Access Token", desc: "Facebook/Instagram ad campaign publishing" },
    { key: "meta_ad_account_id", label: "Meta Ad Account ID", desc: "Your Meta Ads account identifier" },
    { key: "google_ads_developer_token", label: "Google Ads Developer Token", desc: "Google Ads campaign management" },
    { key: "mailchimp_api_key", label: "MailChimp API Key", desc: "Email campaign creation and sending" },
    { key: "mailchimp_server_prefix", label: "MailChimp Server Prefix", desc: "e.g. us14, us21 (from your API key)" },
    { key: "mailchimp_list_id", label: "MailChimp List/Audience ID", desc: "Default email list for campaigns" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          System Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure your workspace, AI preferences, and integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-3 space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === t.id ? "neu-inset text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="md:col-span-9 space-y-6">
          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div className="neu-card rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold">Profile Details</h2>
                <p className="text-sm text-muted-foreground">Update your personal information and workspace name.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Your Name</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={userName} onChange={(e) => setUserName(e.target.value)}
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Email Address</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={user?.email ?? ""} disabled className="bg-transparent border-0 focus-visible:ring-0 shadow-none opacity-50" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Workspace Name</label>
                  <div className="neu-inset-sm rounded-xl p-[2px]">
                    <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g. Acme Corp Marketing"
                      className="bg-transparent border-0 focus-visible:ring-0 shadow-none" />
                  </div>
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ── AI Tab ── */}
          {tab === "ai" && (
            <div className="neu-card rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold">AI Preferences</h2>
                <p className="text-sm text-muted-foreground">Configure default intelligence models and behavior.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl neu-inset-sm">
                  <div>
                    <h4 className="text-sm font-semibold">Always-On Deep Think</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Default to Claude Opus for all generation tasks. Uses more credits.</p>
                  </div>
                  <Switch checked={deepThink} onCheckedChange={setDeepThink} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl neu-inset-sm">
                  <div>
                    <h4 className="text-sm font-semibold">Auto-Inject Knowledge</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Automatically include Knowledge Base items in AI prompts.</p>
                  </div>
                  <Switch checked={autoInject} onCheckedChange={setAutoInject} />
                </div>
                <button onClick={saveAIPrefs} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ── Integrations Tab ── */}
          {tab === "integrations" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Integrations</h2>
                <p className="text-sm text-muted-foreground">Connect external services to power AERIS's capabilities.</p>
              </div>
              {integrations.map((intg) => (
                <div key={intg.key} className="neu-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">{intg.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{intg.desc}</p>
                    </div>
                    {settings[intg.key] && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-semibold">
                        <Check className="h-3 w-3" /> Connected
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 neu-inset-sm rounded-xl p-[2px] relative">
                      <Input
                        type={showKeys[intg.key] ? "text" : "password"}
                        value={settings[intg.key] ?? ""}
                        onChange={(e) => setSettings((s) => ({ ...s, [intg.key]: e.target.value }))}
                        placeholder={`Enter ${intg.label}`}
                        className="bg-transparent border-0 focus-visible:ring-0 shadow-none pr-10 text-xs font-mono"
                      />
                      <button type="button"
                        onClick={() => setShowKeys((s) => ({ ...s, [intg.key]: !s[intg.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showKeys[intg.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={() => saveSettings({ [intg.key]: settings[intg.key] ?? "" })}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex-shrink-0">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Billing Tab ── */}
          {tab === "billing" && (
            <div className="neu-card rounded-2xl p-6 space-y-5 border border-primary/20">
              <div>
                <h2 className="text-lg font-bold text-primary">Current Plan: Pro</h2>
                <p className="text-sm text-muted-foreground">You are on the top tier plan.</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Compute Credits</span>
                  <span className="font-semibold">850,000 / 1,000,000</span>
                </div>
                <div className="w-full rounded-full h-2.5 neu-inset-sm">
                  <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: "85%" }} />
                </div>
                <p className="text-xs text-muted-foreground">Credits reset monthly. Upgrade for unlimited usage.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
