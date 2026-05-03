import { Router, type IRouter } from "express";
import { db, videosTable, framesTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  CreateVideoBody,
  GetVideoParams,
  DeleteVideoParams,
  IndexVideoParams,
  GetIndexStatusParams,
  GetVideoResponse,
  GetIndexStatusResponse,
  ListVideosResponse,
  GetVideoStatsResponse,
  IndexVideoResponse,
} from "@workspace/api-zod";
import { indexVideo } from "../lib/videoIndexer";

const router: IRouter = Router();

type VideoRow = typeof videosTable.$inferSelect;
type VideoWithThumbnail = VideoRow & { thumbnailObjectPath: string | null };

function serializeVideo(v: VideoRow | VideoWithThumbnail) {
  return {
    ...v,
    thumbnailObjectPath: ("thumbnailObjectPath" in v ? v.thumbnailObjectPath : null) ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

router.get("/videos", async (req, res): Promise<void> => {
  const [videos, thumbnails] = await Promise.all([
    db.select().from(videosTable).orderBy(videosTable.createdAt),
    db
      .selectDistinctOn([framesTable.videoId], {
        videoId: framesTable.videoId,
        objectPath: framesTable.objectPath,
      })
      .from(framesTable)
      .orderBy(framesTable.videoId, framesTable.timestampSeconds),
  ]);

  const thumbnailMap = new Map(thumbnails.map((t) => [t.videoId, t.objectPath]));

  res.json(
    ListVideosResponse.parse(
      videos.map((v) =>
        serializeVideo({ ...v, thumbnailObjectPath: thumbnailMap.get(v.id) ?? null })
      )
    )
  );
});

router.get("/videos/stats", async (req, res): Promise<void> => {
  const [stats] = await db
    .select({ totalVideos: count(videosTable.id) })
    .from(videosTable);

  const [indexedStats] = await db
    .select({ indexedVideos: count(videosTable.id) })
    .from(videosTable)
    .where(eq(videosTable.status, "indexed"));

  const [pendingStats] = await db
    .select({ pendingVideos: count(videosTable.id) })
    .from(videosTable)
    .where(sql`${videosTable.status} IN ('pending', 'indexing')`);

  const [frameStats] = await db
    .select({ totalFrames: count(framesTable.id) })
    .from(framesTable);

  res.json(
    GetVideoStatsResponse.parse({
      totalVideos: stats?.totalVideos ?? 0,
      indexedVideos: indexedStats?.indexedVideos ?? 0,
      pendingVideos: pendingStats?.pendingVideos ?? 0,
      totalFrames: frameStats?.totalFrames ?? 0,
    })
  );
});

router.post("/videos", async (req, res): Promise<void> => {
  const parsed = CreateVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [video] = await db
    .insert(videosTable)
    .values({
      name: parsed.data.name,
      objectPath: parsed.data.objectPath,
      durationSeconds: parsed.data.durationSeconds ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(GetVideoResponse.parse(serializeVideo(video)));
});

router.get("/videos/:id", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.id, params.data.id));

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  res.json(GetVideoResponse.parse(serializeVideo(video)));
});

router.delete("/videos/:id", async (req, res): Promise<void> => {
  const params = DeleteVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [video] = await db
    .delete(videosTable)
    .where(eq(videosTable.id, params.data.id))
    .returning();

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/videos/:id/index", async (req, res): Promise<void> => {
  const params = IndexVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.id, params.data.id));

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  indexVideo(params.data.id).catch((err) => {
    req.log.error({ err, videoId: params.data.id }, "Background indexing failed");
  });

  res.json(
    IndexVideoResponse.parse({
      videoId: video.id,
      status: "indexing",
      totalFrames: null,
      indexedFrames: null,
      errorMessage: null,
    })
  );
});

router.get("/videos/:id/index-status", async (req, res): Promise<void> => {
  const params = GetIndexStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.id, params.data.id));

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  res.json(
    GetIndexStatusResponse.parse({
      videoId: video.id,
      status: video.status,
      totalFrames: video.totalFrames,
      indexedFrames: video.indexedFrames,
      errorMessage: video.errorMessage,
    })
  );
});

export default router;
