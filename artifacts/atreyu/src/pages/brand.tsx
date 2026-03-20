import { useState, useEffect, useRef } from "react";
import { Palette, Upload, FileText, Image, Trash2, Sparkles, CheckCircle2, Loader2, Building2, Tag, Users, Star, Swords, Brush, Globe, Factory, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/* ─────────────── Types ─────────────── */
interface BrandProfile {
  id?: number;
  name: string;
  tagline: string;
  description: string;
  voiceDescription: string;
  primaryAudience: string;
  usps: string;
  competitors: string;
  styleNotes: string;
  colorPalette: { primary: string; secondary: string; accent: string };
  websiteUrl: string;
  industry: string;
}

interface BrandAsset { id: number; name: string; type: string; objectPath: string; mimeType: string; }
interface StyleExample { id: number; name: string; fileType: string; objectPath: string; mimeType: string; analysisResult: string | null; }

/* ─────────────── Color swatch ─────────────── */
function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#6366f1"}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#6366f1"
          className="bg-muted/60 border-border font-mono text-sm h-9"
        />
      </div>
    </div>
  );
}

/* ─────────────── File drop zone ─────────────── */
function DropZone({ accept, label, onFiles, disabled }: {
  accept: string; label: string; onFiles: (files: File[]) => void; disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) onFiles(Array.from(e.dataTransfer.files)); }}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none ${
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">or drag and drop</p>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden"
        onChange={e => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ""; }}
      />
    </div>
  );
}

/* ─────────────── Upload logic ─────────────── */
async function uploadFile(file: File): Promise<string> {
  const resUrl = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  const { uploadURL, objectPath } = await resUrl.json();
  await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return objectPath as string;
}

/* ─────────────── Tabs ─────────────── */
const TABS = [
  { id: "identity", label: "Brand Identity", icon: Building2 },
  { id: "assets",   label: "Brand Assets",   icon: Palette },
  { id: "examples", label: "Style Examples", icon: Image },
] as const;
type Tab = typeof TABS[number]["id"];

/* ═══════════════════════════════════════════════════ */
export default function BrandKit() {
  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const { toast } = useToast();

  /* ── Identity state ── */
  const [profile, setProfile] = useState<BrandProfile>({
    name: "", tagline: "", description: "", voiceDescription: "",
    primaryAudience: "", usps: "", competitors: "", styleNotes: "",
    colorPalette: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#06b6d4" },
    websiteUrl: "", industry: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  /* ── Assets state ── */
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  /* ── Examples state ── */
  const [examples, setExamples] = useState<StyleExample[]>([]);
  const [uploadingExample, setUploadingExample] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  /* ── Load data ── */
  useEffect(() => {
    fetch("/api/brand/profile").then(r => r.json()).then(p => {
      if (p) {
        setProfile({
          name: p.name ?? "",
          tagline: p.tagline ?? "",
          description: p.description ?? "",
          voiceDescription: p.voiceDescription ?? "",
          primaryAudience: p.primaryAudience ?? "",
          usps: p.usps ?? "",
          competitors: p.competitors ?? "",
          styleNotes: p.styleNotes ?? "",
          colorPalette: p.colorPalette ?? { primary: "#6366f1", secondary: "#8b5cf6", accent: "#06b6d4" },
          websiteUrl: p.websiteUrl ?? "",
          industry: p.industry ?? "",
        });
      }
      setProfileLoaded(true);
    }).catch(() => setProfileLoaded(true));

    fetch("/api/brand/assets").then(r => r.json()).then(setAssets).catch(() => {});
    fetch("/api/brand/examples").then(r => r.json()).then(setExamples).catch(() => {});
  }, []);

  /* ── Save profile ── */
  const saveProfile = async () => {
    if (!profile.name.trim()) { toast({ title: "Brand name is required", variant: "destructive" }); return; }
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Brand profile saved", description: "Claude will now use this identity for all content generation." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  /* ── Upload asset ── */
  const handleAssetUpload = async (files: File[], assetType: "logo" | "font") => {
    setUploadingAsset(true);
    try {
      for (const file of files) {
        const objectPath = await uploadFile(file);
        const res = await fetch("/api/brand/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, type: assetType, objectPath, mimeType: file.type, fileSize: file.size }),
        });
        const asset = await res.json();
        setAssets(prev => [...prev, asset]);
      }
      toast({ title: `${files.length} ${assetType}${files.length > 1 ? "s" : ""} uploaded` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingAsset(false);
    }
  };

  const deleteAsset = async (id: number) => {
    await fetch(`/api/brand/assets/${id}`, { method: "DELETE" });
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  /* ── Upload style example ── */
  const handleExampleUpload = async (files: File[]) => {
    setUploadingExample(true);
    try {
      for (const file of files) {
        const objectPath = await uploadFile(file);
        const fileType = file.type.startsWith("image/") ? "image" : "document";
        const res = await fetch("/api/brand/examples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, fileType, objectPath, mimeType: file.type }),
        });
        const example = await res.json();
        setExamples(prev => [...prev, example]);
      }
      toast({ title: `${files.length} example${files.length > 1 ? "s" : ""} uploaded`, description: "Click Analyze to extract style DNA." });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingExample(false);
    }
  };

  /* ── Analyze style example ── */
  const analyzeExample = async (id: number) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/brand/examples/${id}/analyze`, { method: "POST" });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let analysis = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) analysis += data.content;
              if (data.done) {
                setExamples(prev => prev.map(e => e.id === id ? { ...e, analysisResult: analysis } : e));
              }
            } catch {}
          }
        }
      }
      toast({ title: "Style analysis complete", description: "Claude will now match this aesthetic in content generation." });
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzingId(null);
    }
  };

  const deleteExample = async (id: number) => {
    await fetch(`/api/brand/examples/${id}`, { method: "DELETE" });
    setExamples(prev => prev.filter(e => e.id !== id));
  };

  const logos = assets.filter(a => a.type === "logo");
  const fonts = assets.filter(a => a.type === "font");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Palette className="h-8 w-8 text-primary" />
            Brand Kit
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your brand's creative DNA — Claude uses everything here to generate perfectly on-brand content.
          </p>
        </div>
        {activeTab === "identity" && (
          <Button
            onClick={saveProfile}
            disabled={isSavingProfile || !profileLoaded}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,150,255,0.3)]"
          >
            {isSavingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Save Brand Profile
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── IDENTITY TAB ── */}
      {activeTab === "identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Core Identity */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Core Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Brand Name *" icon={<Tag className="h-3.5 w-3.5" />}>
                <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Acme Marketing Co." className="bg-muted/60 border-border" />
              </Field>
              <Field label="Tagline / Positioning Statement">
                <Input value={profile.tagline} onChange={e => setProfile(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. The OS for modern marketing teams" className="bg-muted/60 border-border" />
              </Field>
              <Field label="Industry" icon={<Factory className="h-3.5 w-3.5" />}>
                <Input value={profile.industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))}
                  placeholder="e.g. SaaS / B2B Technology" className="bg-muted/60 border-border" />
              </Field>
              <Field label="Website" icon={<Globe className="h-3.5 w-3.5" />}>
                <Input value={profile.websiteUrl} onChange={e => setProfile(p => ({ ...p, websiteUrl: e.target.value }))}
                  placeholder="https://yoursite.com" className="bg-muted/60 border-border" />
              </Field>
              <Field label="Brand Description">
                <Textarea value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does your brand do, stand for, and why does it exist?"
                  className="bg-muted/60 border-border min-h-[100px]" />
              </Field>
            </CardContent>
          </Card>

          {/* Voice & Audience */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brush className="h-4 w-4 text-primary" /> Voice & Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Brand Voice & Tone" icon={<Brush className="h-3.5 w-3.5" />}>
                <Textarea value={profile.voiceDescription} onChange={e => setProfile(p => ({ ...p, voiceDescription: e.target.value }))}
                  placeholder="e.g. Confident but approachable. We speak like a brilliant friend, not a corporation. Direct, witty, never jargon-heavy."
                  className="bg-muted/60 border-border min-h-[100px]" />
              </Field>
              <Field label="Primary Target Audience" icon={<Users className="h-3.5 w-3.5" />}>
                <Textarea value={profile.primaryAudience} onChange={e => setProfile(p => ({ ...p, primaryAudience: e.target.value }))}
                  placeholder="e.g. Marketing directors at Series A–C SaaS companies, 28–45, data-driven, pressed for time, skeptical of hype."
                  className="bg-muted/60 border-border min-h-[80px]" />
              </Field>
              <Field label="Unique Selling Points / Differentiators" icon={<Star className="h-3.5 w-3.5" />}>
                <Textarea value={profile.usps} onChange={e => setProfile(p => ({ ...p, usps: e.target.value }))}
                  placeholder="List your key USPs, one per line. These become the backbone of every piece of content."
                  className="bg-muted/60 border-border min-h-[80px]" />
              </Field>
              <Field label="Key Competitors" icon={<Swords className="h-3.5 w-3.5" />}>
                <Input value={profile.competitors} onChange={e => setProfile(p => ({ ...p, competitors: e.target.value }))}
                  placeholder="e.g. HubSpot, Marketo, Monday.com" className="bg-muted/60 border-border" />
              </Field>
              <Field label="Style & Aesthetic Notes">
                <Textarea value={profile.styleNotes} onChange={e => setProfile(p => ({ ...p, styleNotes: e.target.value }))}
                  placeholder="Any specific style rules: sentence length, formatting preferences, words to avoid, required disclaimers..."
                  className="bg-muted/60 border-border min-h-[80px]" />
              </Field>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card className="rounded-2xl border border-border bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Brand Colors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <ColorSwatch label="Primary" value={profile.colorPalette.primary}
                  onChange={v => setProfile(p => ({ ...p, colorPalette: { ...p.colorPalette, primary: v } }))} />
                <ColorSwatch label="Secondary" value={profile.colorPalette.secondary}
                  onChange={v => setProfile(p => ({ ...p, colorPalette: { ...p.colorPalette, secondary: v } }))} />
                <ColorSwatch label="Accent" value={profile.colorPalette.accent}
                  onChange={v => setProfile(p => ({ ...p, colorPalette: { ...p.colorPalette, accent: v } }))} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ASSETS TAB ── */}
      {activeTab === "assets" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logos */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" /> Logos & Imagery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DropZone
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                label="Upload logos, wordmarks, icons (PNG, SVG, JPG)"
                onFiles={files => handleAssetUpload(files, "logo")}
                disabled={uploadingAsset}
              />
              {uploadingAsset && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</div>}
              {logos.length === 0 && !uploadingAsset && (
                <p className="text-xs text-muted-foreground text-center py-2">No logos uploaded yet</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {logos.map(asset => (
                  <div key={asset.id} className="relative group rounded-xl border border-border bg-muted/30 overflow-hidden">
                    <img
                      src={`/api/storage${asset.objectPath}`}
                      alt={asset.name}
                      className="w-full h-24 object-contain p-3"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="p-2 border-t border-border bg-muted/50">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                    </div>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-md p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fonts */}
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Font Families
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DropZone
                accept=".ttf,.woff,.woff2,.otf,font/ttf,font/woff,font/woff2,font/otf"
                label="Upload brand fonts (TTF, WOFF, WOFF2, OTF)"
                onFiles={files => handleAssetUpload(files, "font")}
                disabled={uploadingAsset}
              />
              {fonts.length === 0 && !uploadingAsset && (
                <p className="text-xs text-muted-foreground text-center py-2">No fonts uploaded yet</p>
              )}
              <div className="space-y-2">
                {fonts.map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground uppercase">{asset.mimeType?.split("/").pop() ?? "font"}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteAsset(asset.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── EXAMPLES TAB ── */}
      {activeTab === "examples" && (
        <div className="space-y-6">
          <Card className="rounded-2xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Upload Style Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload images of your best-performing ads, social posts, or emails — plus any text documents of copy you love.
                ATREYU will analyze each one with Claude Vision to extract your aesthetic DNA, then replicate that style in everything it generates.
              </p>
              <DropZone
                accept="image/*,.pdf,.txt,.md,.doc,.docx"
                label="Drop images (PNG, JPG, WebP) or documents (PDF, TXT, DOC)"
                onFiles={handleExampleUpload}
                disabled={uploadingExample}
              />
              {uploadingExample && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</div>}
            </CardContent>
          </Card>

          {examples.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {examples.map(ex => (
                <Card key={ex.id} className="rounded-2xl border border-border bg-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {ex.fileType === "image"
                          ? <Image className="h-4 w-4 text-primary shrink-0" />
                          : <FileText className="h-4 w-4 text-primary shrink-0" />}
                        <span className="text-sm font-medium truncate">{ex.name}</span>
                      </div>
                      <button onClick={() => deleteExample(ex.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {ex.fileType === "image" && (
                      <div className="rounded-lg overflow-hidden border border-border bg-muted/30 h-32">
                        <img src={`/api/storage${ex.objectPath}`} alt={ex.name} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {ex.analysisResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Style DNA extracted
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 max-h-28 overflow-y-auto leading-relaxed">
                          {ex.analysisResult.slice(0, 400)}{ex.analysisResult.length > 400 ? "…" : ""}
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => analyzeExample(ex.id)}
                        disabled={analyzingId === ex.id}
                        size="sm"
                        className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                      >
                        {analyzingId === ex.id
                          ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Analyzing style DNA…</>
                          : <><Sparkles className="h-3.5 w-3.5 mr-2" /> Extract Style DNA</>}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {examples.length === 0 && !uploadingExample && (
            <div className="text-center py-16 text-muted-foreground opacity-50">
              <Image className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm">Upload your first style example to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Helper ─────────────── */
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}
