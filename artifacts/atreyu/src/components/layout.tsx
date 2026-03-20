import { Link, useLocation } from "wouter";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, MessageSquare, Microscope, PenTool, Megaphone, Library, Zap, Settings, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Assistant", url: "/assistant", icon: MessageSquare },
  { title: "Research Lab", url: "/research", icon: Microscope },
  { title: "Content Studio", url: "/content", icon: PenTool },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Knowledge Base", url: "/knowledge", icon: Library },
  { title: "Automations", url: "/automations", icon: Zap },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background dark">
        <Sidebar className="border-r border-white/5 bg-black/40 backdrop-blur-xl">
          <SidebarHeader className="p-4 flex flex-row items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Command className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-widest uppercase">ATREYU</h2>
              <p className="text-[10px] text-muted-foreground leading-tight tracking-tight">MARKETING OS</p>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu className="gap-2 px-2">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.url}
                      className="rounded-xl px-3 py-5 transition-all duration-200"
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`h-4 w-4 ${location === item.url ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${location === item.url ? "text-foreground" : "text-muted-foreground"}`}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-white/5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"} className="rounded-xl px-3 py-5">
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 bg-background/60 backdrop-blur-md px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="ml-auto flex items-center gap-4">
              <Button variant="ghost" size="sm" className="hidden md:flex gap-2 border border-white/10 rounded-full px-4 text-xs font-medium bg-white/5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="mx-auto max-w-6xl w-full h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
