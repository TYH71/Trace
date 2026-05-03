import { useGetVideoStats, useListVideos, Video } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video as VideoIcon, Database, Layers, Search, ArrowRight, Activity, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetVideoStats();
  const { data: videos, isLoading: isVideosLoading } = useListVideos();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search/results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getStatusBadge = (status: Video["status"]) => {
    switch (status) {
      case "indexed": return <Badge variant="default" className="bg-primary text-primary-foreground font-mono">INDEXED</Badge>;
      case "indexing": return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 font-mono animate-pulse border border-yellow-500/30">INDEXING</Badge>;
      case "pending": return <Badge variant="outline" className="font-mono text-muted-foreground">PENDING</Badge>;
      case "failed": return <Badge variant="destructive" className="font-mono">FAILED</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground font-mono text-sm">System metrics and recent activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Footage</CardTitle>
            <VideoIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-foreground">
              {isStatsLoading ? "..." : stats?.totalVideos.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Indexed</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-primary">
              {isStatsLoading ? "..." : stats?.indexedVideos.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Processing</CardTitle>
            <Activity className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-yellow-500">
              {isStatsLoading ? "..." : stats?.pendingVideos.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Frames Analyzed</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-foreground">
              {isStatsLoading ? "..." : stats?.totalFrames.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-card border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="divide-y divide-border/50">
              {isVideosLoading ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm animate-pulse">Loading...</div>
              ) : videos?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">No footage ingested yet.</div>
              ) : (
                videos?.slice(0, 5).map(video => (
                  <div key={video.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                        {video.thumbnailObjectPath ? (
                          <img
                            src={`/api/storage${video.thumbnailObjectPath}`}
                            alt={video.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <VideoIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Link href={`/videos/${video.id}`} className="font-medium hover:text-primary transition-colors truncate max-w-[240px] block">
                          {video.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(video.status)}
                      <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/videos/${video.id}`}>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {videos && videos.length > 0 && (
              <div className="p-4 border-t border-border/50 bg-muted/10">
                <Button variant="outline" className="w-full font-mono text-xs tracking-wider" asChild>
                  <Link href="/videos">VIEW FULL ARCHIVE</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          <div className="relative z-10 p-6 flex flex-col h-full justify-between gap-6">
            <div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Quick Search</h2>
              <p className="text-sm text-muted-foreground">
                Describe what you're looking for and TRACE will scan every indexed frame to find it.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <Input
                placeholder="e.g. 'person in red jacket running'"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-background border-border/50 focus-visible:ring-primary h-12 font-mono text-sm"
                data-testid="input-quick-search"
              />
              <Button type="submit" size="lg" className="w-full font-mono tracking-widest font-bold" data-testid="button-quick-search">
                TRACE IT
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
