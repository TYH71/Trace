import { useRef, useState, useCallback } from "react";
import { Upload, FileVideo, X, CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];

type UploadState = "idle" | "dragging" | "selected" | "uploading" | "success" | "error";

interface FootageUploaderProps {
  onGetUploadUrl: (file: File) => Promise<{ uploadURL: string; objectPath: string }>;
  onUploadComplete: (file: File, objectPath: string, autoIndex: boolean) => Promise<void>;
  onCancel?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    return `Unsupported format. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is 2 GB.`;
  }
  return null;
}

export function FootageUploader({ onGetUploadUrl, onUploadComplete, onCancel }: FootageUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoIndex, setAutoIndex] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const selectFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      setState("error");
      return;
    }
    setSelectedFile(file);
    setError(null);
    setState("selected");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }, [selectFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("dragging");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState("idle");
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = "";
  }, [selectFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setState("uploading");
    setProgress(0);
    setError(null);

    try {
      const { uploadURL, objectPath } = await onGetUploadUrl(selectedFile);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));

        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", selectedFile.type || "application/octet-stream");
        xhr.send(selectedFile);
      });

      setProgress(100);
      setState("success");
      await onUploadComplete(selectedFile, objectPath, autoIndex);
    } catch (err) {
      if (err instanceof Error && err.message === "Upload cancelled") return;
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  }, [selectedFile, autoIndex, onGetUploadUrl, onUploadComplete]);

  const handleCancel = useCallback(() => {
    xhrRef.current?.abort();
    setSelectedFile(null);
    setProgress(0);
    setError(null);
    setState("idle");
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setProgress(0);
    setError(null);
    setState("idle");
  }, []);

  if (state === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="font-mono font-bold text-primary uppercase tracking-widest text-sm">Footage Ingested</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">{selectedFile?.name}</p>
          {autoIndex && (
            <p className="text-xs text-primary/70 font-mono mt-2 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" />
              AI indexing queued
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={handleFileInput}
      />

      {state === "uploading" ? (
        <div className="border border-border/50 rounded-lg p-6 bg-card/50 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile?.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{formatBytes(selectedFile?.size ?? 0)}</p>
            </div>
            <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Uploading</span>
              <span className="text-xs font-mono text-primary font-bold">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200 ease-out shadow-[0_0_8px_rgba(var(--primary),0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              {formatBytes(((selectedFile?.size ?? 0) * progress) / 100)} / {formatBytes(selectedFile?.size ?? 0)}
            </p>
          </div>
        </div>
      ) : state === "selected" ? (
        <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <FileVideo className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile?.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{formatBytes(selectedFile?.size ?? 0)}</p>
          </div>
          <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200",
            state === "dragging"
              ? "border-primary bg-primary/10 scale-[1.01]"
              : state === "error"
              ? "border-destructive/50 bg-destructive/5"
              : "border-border/50 bg-muted/5 hover:border-primary/40 hover:bg-primary/5"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center border transition-colors",
            state === "dragging" ? "bg-primary/20 border-primary/40" : state === "error" ? "bg-destructive/10 border-destructive/30" : "bg-muted/20 border-border/50"
          )}>
            {state === "error"
              ? <AlertCircle className="w-7 h-7 text-destructive" />
              : <Upload className={cn("w-7 h-7", state === "dragging" ? "text-primary" : "text-muted-foreground")} />
            }
          </div>

          {state === "error" ? (
            <div className="text-center">
              <p className="text-sm font-mono font-bold text-destructive uppercase tracking-wide">Invalid File</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <p className="text-xs text-primary mt-2">Click to choose another file</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-mono font-bold text-foreground">
                {state === "dragging" ? "Release to load footage" : "Drop footage here"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">or <span className="text-primary underline underline-offset-2">browse files</span></p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-3 uppercase tracking-widest">
                {ACCEPTED_EXTENSIONS.join(" · ")} · up to 2 GB
              </p>
            </div>
          )}
        </div>
      )}

      {state !== "uploading" && (
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <div
            onClick={() => setAutoIndex(v => !v)}
            className={cn(
              "w-9 h-5 rounded-full border transition-colors relative shrink-0",
              autoIndex ? "bg-primary border-primary" : "bg-muted/30 border-border/50"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full transition-all",
              autoIndex ? "left-[calc(100%-18px)] bg-primary-foreground" : "left-0.5 bg-muted-foreground/50"
            )} />
          </div>
          <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
            Auto-index with AI after upload
          </span>
          {autoIndex && <Zap className="w-3 h-3 text-primary" />}
        </label>
      )}

      <div className="flex gap-2 pt-1">
        {state === "selected" && (
          <Button onClick={handleUpload} className="flex-1 font-mono font-bold tracking-widest gap-2">
            <Upload className="w-4 h-4" />
            BEGIN INGEST
          </Button>
        )}
        {state === "idle" || state === "error" ? (
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="flex-1 font-mono tracking-widest gap-2"
          >
            <FileVideo className="w-4 h-4" />
            BROWSE FILES
          </Button>
        ) : null}
        {onCancel && state !== "uploading" && (
          <Button variant="ghost" onClick={onCancel} className="font-mono text-xs text-muted-foreground">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
