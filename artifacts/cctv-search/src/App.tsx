import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import VideosList from "@/pages/videos";
import VideoDetail from "@/pages/videos/[id]";
import Search from "@/pages/search";
import SearchResults from "@/pages/search/results";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ThemeSetter() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return null;
}

function Router() {
  return (
    <div className="flex h-screen overflow-hidden w-full selection:bg-primary/30">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-background focus:outline-none">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/videos" component={VideosList} />
          <Route path="/videos/:id" component={VideoDetail} />
          <Route path="/search" component={Search} />
          <Route path="/search/results" component={SearchResults} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <ThemeSetter />
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
