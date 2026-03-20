import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, CreditCard, Box, User, BrainCircuit } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          System Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">Configure your workspace and AI preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-3 space-y-2">
          <Button variant="ghost" className="w-full justify-start bg-white/10 text-white">
            <User className="mr-2 h-4 w-4" /> Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white">
            <BrainCircuit className="mr-2 h-4 w-4" /> AI Models
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white">
            <Box className="mr-2 h-4 w-4" /> Integrations
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white">
            <CreditCard className="mr-2 h-4 w-4" /> Billing
          </Button>
        </div>

        <div className="md:col-span-9 space-y-6">
          <Card className="glass-panel border-white/5 bg-white/5">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Update your personal information and workspace name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Workspace Name</label>
                <Input defaultValue="Acme Corp Marketing" className="bg-black/40 border-white/10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Email Address</label>
                <Input defaultValue="admin@acmecorp.com" disabled className="bg-black/40 border-white/10 opacity-50" />
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 bg-white/5">
            <CardHeader>
              <CardTitle>AI Preferences</CardTitle>
              <CardDescription>Configure default intelligence models.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border border-white/10 bg-black/40 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <h4 className="font-medium text-white">Always-On Deep Think</h4>
                  <p className="text-sm text-muted-foreground">Default to Claude 3.5 Opus for all generation tasks. Uses more credits.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between border border-white/10 bg-black/40 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <h4 className="font-medium text-white">Auto-Inject Knowledge</h4>
                  <p className="text-sm text-muted-foreground">Automatically append relevant Knowledge Base items to prompt contexts.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-primary/20 bg-primary/5 shadow-[0_0_30px_rgba(0,150,255,0.05)]">
            <CardHeader>
              <CardTitle className="text-primary">Current Plan: Pro</CardTitle>
              <CardDescription>You are on the top tier plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AI Compute Credits</span>
                  <span className="text-white font-medium">850,000 / 1,000,000</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: "85%" }}></div>
                </div>
                <Button variant="outline" className="bg-transparent border-white/10 mt-4">Manage Subscription</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
