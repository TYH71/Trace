import { useState } from "react";
import { useLocation } from "wouter";
import { useGetSearchHistory } from "@workspace/api-client-react";
import { Search as SearchIcon, History, ScanSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default function Search() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const { data: history, isLoading } = useGetSearchHistory();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/search/results?q=${encodeURIComponent(query)}`);
    }
  };

  const handleHistoryClick = (pastQuery: string) => {
    setLocation(`/search/results?q=${encodeURIComponent(pastQuery)}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]">
            <ScanSearch className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Trace Search</h1>
          <p className="text-muted-foreground font-mono max-w-xl mx-auto">
            Describe what you're looking for. TRACE will find it across every indexed frame.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-primary/20 shadow-2xl shadow-black/50 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <CardContent className="p-2 sm:p-4">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <SearchIcon className="absolute left-4 w-6 h-6 text-primary/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. 'person in a red jacket near the exit'"
                className="w-full pl-14 pr-32 h-16 bg-transparent border-none text-lg font-mono placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-global-search"
                autoFocus
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 font-mono tracking-widest font-bold"
                data-testid="button-global-search"
              >
                TRACE
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="max-w-xl mx-auto pt-8">
          <div className="flex items-center gap-2 mb-4 text-xs font-mono text-muted-foreground uppercase tracking-widest px-2">
            <History className="w-3.5 h-3.5" />
            Recent Queries
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center text-muted-foreground font-mono text-sm py-4 animate-pulse">Loading history...</div>
            ) : !history || history.length === 0 ? (
              <div className="text-center text-muted-foreground/50 font-mono text-sm py-4 border border-dashed border-border/50 rounded bg-card/20">No recent queries</div>
            ) : (
              history.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item.query)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 hover:border-primary/30 transition-all group text-left"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <SearchIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="text-sm font-medium truncate">{item.query}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs font-mono text-muted-foreground">
                    <span className="text-primary font-bold">{item.resultCount} traces</span>
                    <span className="opacity-50">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
