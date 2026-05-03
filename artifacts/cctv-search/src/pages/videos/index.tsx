import { useListVideos, useDeleteVideo, useIndexVideo, getListVideosQueryKey, useCreateVideo } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Video as VideoIcon, RefreshCw, Plus, Play, Database } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { FootageUploader } from "@/components/FootageUploader";

export default function VideosList() {
  const { data: videos, isLoading } = useListVideos();
  const deleteVideo = useDeleteVideo();
  const indexVideo = useIndexVideo();
  const createVideo = useCreateVideo();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleDelete = async (id: number) => {
    try {
      await deleteVideo.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      toast({ title: "Video Deleted", description: "The footage has been removed from the system." });
    } catch {
      toast({ title: "Error", description: "Failed to delete footage.", variant: "destructive" });
    }
  };

  const handleIndex = async (id: number) => {
    try {
      await indexVideo.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      toast({ title: "Indexing Started", description: "The AI is now analyzing the footage." });
    } catch {
      toast({ title: "Error", description: "Failed to start indexing.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "indexed": return <Badge variant="default" className="bg-primary text-primary-foreground font-mono text-[10px]">INDEXED</Badge>;
      case "indexing": return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 font-mono text-[10px] animate-pulse border border-yellow-500/30">INDEXING</Badge>;
      case "pending": return <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">PENDING</Badge>;
      case "failed": return <Badge variant="destructive" className="font-mono text-[10px]">FAILED</Badge>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
          <p className="text-muted-foreground font-mono text-sm">Manage and index footage assets</p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={(open) => {
          setIsUploadOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button className="font-mono font-bold tracking-widest gap-2" data-testid="button-upload-video">
              <Plus className="w-4 h-4" />
              INGEST FOOTAGE
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg border-border/50 bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-widest text-primary">Ingest New Footage</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Upload CCTV video files up to 2 GB. Optionally auto-index with AI after upload.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              <FootageUploader
                onGetUploadUrl={async (file) => {
                  return customFetch<{ uploadURL: string; objectPath: string }>(
                    "/api/storage/uploads/request-url",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: file.name,
                        size: file.size,
                        contentType: file.type || "video/mp4",
                      }),
                    }
                  );
                }}
                onUploadComplete={async (file, objectPath, autoIndex) => {
                  const video = await createVideo.mutateAsync({
                    data: {
                      name: file.name,
                      objectPath,
                    },
                  });
                  if (autoIndex) {
                    await indexVideo.mutateAsync({ id: video.id });
                  }
                  queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
                  toast({
                    title: "Footage Ingested",
                    description: autoIndex
                      ? "Upload complete. AI indexing has started."
                      : "Upload complete. Use the index button to analyse with AI.",
                  });
                  setTimeout(() => setIsUploadOpen(false), 1200);
                }}
                onCancel={() => setIsUploadOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground font-mono animate-pulse">Loading footage databank...</div>
        ) : videos?.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-lg bg-card/50">
            <VideoIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Archive Empty</h3>
            <p className="text-sm text-muted-foreground font-mono mt-1 mb-4">No footage has been ingested yet.</p>
            <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="font-mono text-xs">
              INGEST FIRST FILE
            </Button>
          </div>
        ) : (
          videos?.map(video => (
            <Card key={video.id} className="bg-card border-border/50 overflow-hidden group flex flex-col">
              <div className="aspect-video bg-muted/20 relative flex items-center justify-center border-b border-border/50 overflow-hidden">
                {video.thumbnailObjectPath ? (
                  <img
                    src={`/api/storage${video.thumbnailObjectPath}`}
                    alt={`Preview of ${video.name}`}
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-70 transition-opacity duration-300"
                    loading="lazy"
                  />
                ) : (
                  <VideoIcon className="w-12 h-12 text-muted-foreground/30" />
                )}
                {video.status === "indexed" ? (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="secondary" size="sm" className="gap-2 font-mono text-xs shadow-lg" asChild>
                      <Link href={`/videos/${video.id}`}>
                        <Play className="w-3 h-3" />
                        VIEW INTEL
                      </Link>
                    </Button>
                  </div>
                ) : null}
                {video.status === "indexing" ? (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                      <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Analysing...</span>
                    </div>
                  </div>
                ) : null}
                <div className="absolute top-2 right-2 z-20">
                  {getStatusBadge(video.status)}
                </div>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-bold truncate text-foreground" title={video.name}>{video.name}</h3>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    Ingested {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                    <Database className="w-3 h-3" />
                    {video.totalFrames !== null ? `${video.totalFrames} frames` : "No data"}
                  </div>

                  <div className="flex gap-2">
                    {video.status === "pending" || video.status === "failed" ? (
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 rounded"
                        onClick={() => handleIndex(video.id)}
                        disabled={indexVideo.isPending}
                        data-testid={`button-index-video-${video.id}`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${indexVideo.isPending ? "animate-spin" : ""}`} />
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 rounded text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      onClick={() => handleDelete(video.id)}
                      disabled={deleteVideo.isPending}
                      data-testid={`button-delete-video-${video.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
