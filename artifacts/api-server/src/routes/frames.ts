import { Router, type IRouter } from "express";
import { db, framesTable, videosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListFramesParams, ListFramesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type FrameRow = typeof framesTable.$inferSelect;

function serializeFrame(f: FrameRow) {
  return {
    ...f,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/videos/:id/frames", async (req, res): Promise<void> => {
  const params = ListFramesParams.safeParse(req.params);
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

  const frames = await db
    .select()
    .from(framesTable)
    .where(eq(framesTable.videoId, params.data.id))
    .orderBy(framesTable.timestampSeconds);

  res.json(ListFramesResponse.parse(frames.map(serializeFrame)));
});

export default router;
