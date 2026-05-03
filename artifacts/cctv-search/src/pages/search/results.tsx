import { useEffect, useState } from "react";
import { useSearchFrames } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search as SearchIcon, Filter, Play, Crosshair } from "lucide-react";
import { Link } from "wouter";

export default function SearchResults() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  const searchMutation = useSearchFrames();

  useEffect(() => {
    if (activeQuery) {
      searchMutation.mutate({ data: { query: activeQuery, limit: 50 } });
    }
  }, [activeQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && query !== activeQuery) {
      setActiveQuery(query);
      window.history.replaceState(null, "", `/search/results?q=${encodeURIComponent(query)}`);
    }
  };

  const results = searchMutation.data?.results || [];
  const isSearching = searchMutation.isPending;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 flex flex-col h-[calc(100vh-2rem)] animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between shrink-0">
        <div className="flex items-center gap-4 w-full md:max-w-2xl">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link href="/search">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <form onSubmit={handleSearch} className="flex-1 relative flex items-center">
            <SearchIcon className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-card border-border/50 h-12 font-mono text-sm focus-visible:ring-primary shadow-sm"
              placeholder="Search footage..."
              data-testid="input-search-results"
            />
            <Button
              type="submit"
              className="absolute right-1 h-10 font-mono tracking-widest text-xs"
              disabled={isSearching}
              data-testid="button-update-search"
            >
              UPDATE
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground uppercase tracking-widest shrink-0">
          <Filter className="w-4 h-4" />
          <span>{searchMutation.data ? searchMutation.data.totalMatches : 0} Traces Found</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 relative rounded-lg">
        {isSearching ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <div className="font-mono text-primary tracking-widest animate-pulse uppercase">Tracing footage...</div>
          </div>
        ) : searchMutation.isError ? (
          <div className="h-full flex items-center justify-center border border-dashed border-destructive/50 rounded-lg bg-destructive/5">
            <div className="text-center">
              <Crosshair className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-destructive">Search Failed</h3>
              <p className="text-sm text-destructive/80 font-mono mt-1">Unable to execute query against index.</p>
            </div>
          </div>
        ) : results.length === 0 && activeQuery ? (
          <div className="h-full flex items-center justify-center border border-dashed border-border/50 rounded-lg bg-card/30">
            <div className="text-center">
              <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium">No Matches Found</h3>
              <p className="text-sm text-muted-foreground font-mono mt-1">Try broadening your search parameters.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
            {results.map((result, i) => (
              <Card
                key={`${result.frame.id}-${i}`}
                className="bg-card border-border/50 overflow-hidden flex flex-col group hover:border-primary/50 transition-colors duration-300"
                data-testid={`card-result-${result.frame.id}`}
              >
                <div className="aspect-video bg-black relative flex items-center justify-center border-b border-border/50 overflow-hidden">
                  <img
                    src={`/api/storage${result.frame.objectPath.startsWith("/") ? result.frame.objectPath : `/${result.frame.objectPath}`}`}
                    alt={`Frame at ${result.frame.timestampSeconds}s`}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur text-foreground font-mono text-[10px] border-border">
                      {formatTime(result.frame.timestampSeconds)}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary/90 text-primary-foreground font-mono text-[10px]">
                      {Math.round(result.relevanceScore * 100)}% MATCH
                    </Badge>
                  </div>
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-sm">
                    <Button variant="secondary" size="sm" className="gap-2 font-mono text-xs" asChild>
                      <Link href={`/videos/${result.video.id}`}>
                        <Play className="w-3 h-3" />
                        JUMP TO SOURCE
                      </Link>
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <span className="truncate">{result.video.name}</span>
                  </div>
                  <div className="text-sm leading-relaxed text-foreground/90">
                    <span className="font-bold text-primary mr-2">REASON:</span>
                    {result.matchReason}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
