import { useGetVideo, useListFrames, useGetIndexStatus, getGetVideoQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Database, Play, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function VideoDetail() {
  const { id } = useParams();
  const videoId = parseInt(id || "0", 10);
  
  const { data: video, isLoading: isVideoLoading } = useGetVideo(videoId, { 
    query: { enabled: !!videoId, queryKey: getGetVideoQueryKey(videoId) } 
  });
  
  const { data: frames, isLoading: isFramesLoading } = useListFrames(videoId, {
    query: { enabled: !!videoId }
  });

  const { data: indexStatus } = useGetIndexStatus(videoId, {
    query: { 
      enabled: !!videoId && video?.status === "indexing",
      refetchInterval: (query) => {
        // Stop refetching if status is indexed or failed
        if (query.state.data?.status === 'indexed' || query.state.data?.status === 'failed') return false;
        return 3000; // Refetch every 3 seconds while indexing
      }
    }
  });

  if (isVideoLoading) {
    return <div className="p-8 text-center text-muted-foreground font-mono animate-pulse">Loading intel package...</div>;
  }

  if (!video) {
    return <div className="p-8 text-center text-destructive font-mono">Footage not found or access denied.</div>;
  }

  const isIndexing = video.status === "indexing" || indexStatus?.status === "indexing";
  const progressPercent = indexStatus?.totalFrames && indexStatus?.indexedFrames 
    ? (indexStatus.indexedFrames / indexStatus.totalFrames) * 100 
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/videos">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {video.name}
            {video.status === "indexed" && <Badge className="bg-primary text-primary-foreground font-mono text-[10px]">INDEXED</Badge>}
            {video.status === "indexing" && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 font-mono text-[10px] animate-pulse border-yellow-500/30">INDEXING</Badge>}
            {video.status === "pending" && <Badge variant="outline" className="font-mono text-[10px]">PENDING</Badge>}
            {video.status === "failed" && <Badge variant="destructive" className="font-mono text-[10px]">FAILED</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1 flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Ingested {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
            <span className="flex items-center gap-1.5"><Database className="w-3 h-3" /> {video.totalFrames || 0} Frames</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border/50 overflow-hidden">
            <div className="aspect-video bg-black relative flex items-center justify-center">
              {/* Fallback to placeholder if real video URL isn't playing well natively without full storage token */}
              <video 
                src={`/api/storage${video.objectPath}`} 
                controls 
                className="w-full h-full object-contain"
                poster="/placeholder-poster.jpg"
              >
                <div className="text-muted-foreground font-mono text-sm flex flex-col items-center gap-2">
                  <Play className="w-8 h-8 opacity-50" />
                  Preview unavailable
                </div>
              </video>
            </div>
          </Card>

          {isIndexing && (
            <Card className="bg-card border-border/50 border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-yellow-500 uppercase tracking-widest flex items-center justify-between">
                  <span>AI Analysis in Progress</span>
                  <span>{Math.round(progressPercent)}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercent} className="h-2 bg-muted">
                  <div className="h-full bg-yellow-500 transition-all" style={{ width: `${progressPercent}%` }} />
                </Progress>
                <p className="text-xs text-muted-foreground font-mono mt-3">
                  Extracting and indexing keyframes. Do not close this system.
                </p>
              </CardContent>
            </Card>
          )}

          {video.status === "failed" && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-destructive">Indexing Failed</h4>
                  <p className="text-sm text-destructive/80 font-mono mt-1">{video.errorMessage || "An unknown error occurred during analysis."}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border/50 h-full max-h-[800px] flex flex-col">
            <CardHeader className="border-b border-border/50 bg-muted/20 py-4">
              <CardTitle className="text-sm font-mono uppercase tracking-widest">Extracted Frames</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {isFramesLoading ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-xs animate-pulse">Loading frame data...</div>
              ) : !frames || frames.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-xs">
                  {video.status === "pending" ? "Awaiting indexing." : "No frames extracted."}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {frames.map((frame) => (
                    <div key={frame.id} className="p-4 hover:bg-muted/10 transition-colors group cursor-pointer">
                      <div className="flex gap-4">
                        <div className="w-24 h-16 bg-muted/30 rounded overflow-hidden relative shrink-0">
                          <img 
                            src={`/api/storage${frame.objectPath.startsWith('/') ? frame.objectPath : `/${frame.objectPath}`}`} 
                            alt={`Frame at ${frame.timestampSeconds}s`}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            onError={(e) => {
                                // fallback logic
                                e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[9px] font-mono text-white">
                            {formatTime(frame.timestampSeconds)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
                            {frame.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
