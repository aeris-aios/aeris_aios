import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Assistant from "@/pages/assistant";
import ClaudeCode from "@/pages/claude";
import ResearchLab from "@/pages/research";
import ContentStudio from "@/pages/content";
import Campaigns from "@/pages/campaigns";
import KnowledgeBase from "@/pages/knowledge";
import Automations from "@/pages/automations";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/:rest*">
        <AppLayout>
          <Switch>
            <Route path="/dashboard"   component={Dashboard}    />
            <Route path="/assistant"   component={Assistant}    />
            <Route path="/claude"      component={ClaudeCode}   />
            <Route path="/research"    component={ResearchLab}  />
            <Route path="/content"     component={ContentStudio}/>
            <Route path="/campaigns"   component={Campaigns}    />
            <Route path="/knowledge"   component={KnowledgeBase}/>
            <Route path="/automations" component={Automations}  />
            <Route path="/settings"    component={Settings}     />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
