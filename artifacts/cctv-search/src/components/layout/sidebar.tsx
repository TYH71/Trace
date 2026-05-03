import { Link, useLocation } from "wouter";
import { Home, Video, Search, Activity, Database, ScanSearch } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();

  const isMatching = (path: string, current: string) => {
    if (path === "/" && current !== "/") return false;
    return current.startsWith(path);
  };

  return (
    <Sidebar className="border-r border-border/50 bg-card">
      <SidebarHeader className="p-4 border-b border-border/50 flex flex-row items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground shrink-0">
          <ScanSearch className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-foreground uppercase tracking-[0.2em]">TRACE</span>
          <span className="text-[10px] text-primary uppercase font-mono tracking-widest">Vision Intelligence</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/" data-testid="link-dashboard">
                    <Home className="w-4 h-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isMatching("/search", location)}>
                  <Link href="/search" data-testid="link-search">
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isMatching("/videos", location) && !isMatching("/search", location)}>
                  <Link href="/videos" data-testid="link-videos">
                    <Video className="w-4 h-4" />
                    <span>Archive</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto mb-4">
          <SidebarGroupLabel className="text-xs font-mono text-muted-foreground uppercase tracking-widest">System Status</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-70 pointer-events-none">
                  <div>
                    <Database className="w-4 h-4 text-green-500" />
                    <span>Data Node Active</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-70 pointer-events-none">
                  <div>
                    <Activity className="w-4 h-4 text-primary" />
                    <span>Indexing Service OK</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
