import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme";
import { AuthProvider, useAuth } from "@/contexts/auth";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import OnboardingPage from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Assistant from "@/pages/assistant";
import ClaudeCode from "@/pages/claude";
import ResearchLab from "@/pages/research";
import ContentStudio from "@/pages/content";
import ContentStudioAI from "@/pages/content-studio";
import Campaigns from "@/pages/campaigns";
import KnowledgeBase from "@/pages/knowledge";
import Automations from "@/pages/automations";
import Settings from "@/pages/settings";
import BrandKit from "@/pages/brand";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

/* ── Auth gate — redirects to login if not authenticated ── */
function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AERIS...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  /* Redirect to onboarding if not completed */
  if (!user.onboardingComplete) return <Redirect to="/onboarding" />;

  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard"      component={Dashboard}       />
        <Route path="/assistant"      component={Assistant}       />
        <Route path="/claude"         component={ClaudeCode}      />
        <Route path="/research"       component={ResearchLab}     />
        <Route path="/content"        component={ContentStudio}   />
        <Route path="/content-studio" component={ContentStudioAI} />
        <Route path="/campaigns"      component={Campaigns}       />
        <Route path="/knowledge"      component={KnowledgeBase}   />
        <Route path="/automations"    component={Automations}     />
        <Route path="/brand"          component={BrandKit}        />
        <Route path="/settings"       component={Settings}        />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/:rest*">
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
