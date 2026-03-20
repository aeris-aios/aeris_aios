import { useState } from "react";
import { PenTool, Wand2, Download, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSSE } from "@/hooks/use-sse";
import ReactMarkdown from "react-markdown";
import { useCreateContentAsset } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function ContentStudio() {
  const [formData, setFormData] = useState({
    type: "ad_copy",
    platform: "Meta",
    tone: "Persuasive & Direct",
    audience: "",
    context: "",
    model: "sonnet"
  });

  const { stream, data: generatedText, isStreaming } = useSSE();
  const { mutate: saveAsset, isPending: isSaving } = useCreateContentAsset();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!formData.context.trim()) return;
    await stream('/api/content/generate', formData);
  };

  const handleSave = () => {
    if (!generatedText) return;
    saveAsset({
      data: {
        title: `Generated ${formData.type} - ${new Date().toLocaleDateString()}`,
        type: formData.type,
        content: generatedText,
        platform: formData.platform,
        tone: formData.tone
      }
    }, {
      onSuccess: () => {
        toast({ title: "Asset saved", description: "Content has been saved to your workspace." });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <PenTool className="h-8 w-8 text-primary" />
          Content Studio
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">Synthesize high-converting copy across all channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls */}
        <Card className="lg:col-span-4 glass-panel border-white/5 bg-white/5 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Synthesis Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Asset Type</label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger className="bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white">
                  <SelectItem value="ad_copy">Ad Copy</SelectItem>
                  <SelectItem value="email">Email Sequence</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="social">Social Media Post</SelectItem>
                  <SelectItem value="headline">Headlines & Hooks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Platform</label>
              <Input 
                value={formData.platform}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                placeholder="Meta, LinkedIn, Google..."
                className="bg-black/40 border-white/10" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tone of Voice</label>
              <Input 
                value={formData.tone}
                onChange={(e) => setFormData({...formData, tone: e.target.value})}
                placeholder="Persuasive, technical, witty..."
                className="bg-black/40 border-white/10" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Audience</label>
              <Input 
                value={formData.audience}
                onChange={(e) => setFormData({...formData, audience: e.target.value})}
                placeholder="SaaS Founders, D2C Marketers..."
                className="bg-black/40 border-white/10" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Context / Brief</label>
              <Textarea 
                value={formData.context}
                onChange={(e) => setFormData({...formData, context: e.target.value})}
                placeholder="Product details, unique selling points, offers..."
                className="bg-black/40 border-white/10 min-h-[120px]" 
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isStreaming || !formData.context.trim()} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,150,255,0.3)]"
            >
              <Wand2 className={`h-4 w-4 mr-2 ${isStreaming ? 'animate-spin' : ''}`} />
              {isStreaming ? "Synthesizing..." : "Generate Content"}
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="lg:col-span-8 glass-panel border-white/5 bg-black/40 flex flex-col min-h-[600px]">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
            <CardTitle className="text-lg">Generated Output</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!generatedText || isStreaming} className="bg-transparent border-white/10 hover:bg-white/10">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <Button onClick={handleSave} size="sm" disabled={!generatedText || isStreaming || isSaving} className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30">
                <Save className="h-4 w-4 mr-2" /> Save Asset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-8 overflow-y-auto">
            {generatedText ? (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{generatedText}</ReactMarkdown>
                {isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse align-middle" />}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Wand2 className="h-16 w-16 mb-4" />
                <p>Configure parameters and generate content.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
