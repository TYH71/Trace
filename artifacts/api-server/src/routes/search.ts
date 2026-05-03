import { Router, type IRouter } from "express";
import { db, framesTable, videosTable, searchHistoryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  SearchFramesBody,
  SearchFramesResponse,
  GetSearchHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type VideoRow = typeof videosTable.$inferSelect;
type FrameRow = typeof framesTable.$inferSelect;

function serializeVideo(v: VideoRow) {
  return { ...v, createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString(), thumbnailObjectPath: null };
}

function serializeFrame(f: FrameRow) {
  return { ...f, createdAt: f.createdAt.toISOString() };
}

async function semanticSearch(
  query: string,
  videoId: number | null | undefined,
  limit: number
): Promise<Array<{
  frame: FrameRow;
  video: VideoRow;
  relevanceScore: number;
  matchReason: string;
}>> {
  let frames;

  if (videoId) {
    frames = await db
      .select({ frame: framesTable, video: videosTable })
      .from(framesTable)
      .innerJoin(videosTable, eq(framesTable.videoId, videosTable.id))
      .where(eq(framesTable.videoId, videoId))
      .orderBy(framesTable.timestampSeconds);
  } else {
    frames = await db
      .select({ frame: framesTable, video: videosTable })
      .from(framesTable)
      .innerJoin(videosTable, eq(framesTable.videoId, videosTable.id))
      .where(eq(videosTable.status, "indexed"))
      .orderBy(framesTable.timestampSeconds)
      .limit(150);
  }

  if (frames.length === 0) return [];

  const frameDescriptions = frames
    .map((f, i) => {
      const desc = (f.frame.description ?? "").slice(0, 300);
      return `[${i}] Video: "${f.video.name}", Time: ${f.frame.timestampSeconds}s\nDescription: ${desc}`;
    })
    .join("\n---\n");

  const systemPrompt = `You are a CCTV footage search assistant. Given a search query and a list of indexed frame descriptions, return the most relevant frames in JSON format.

For each relevant match, include:
- index (the [N] number from the frame list)
- relevanceScore (0.0 to 1.0, where 1.0 is a perfect match)
- matchReason (brief explanation of why it matches)

Return a JSON object with a "matches" array. Include only frames with relevanceScore >= 0.3. Return at most ${limit} results, ordered by relevance. If nothing matches, return {"matches": []}.`;

  const aiResponse = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 2048,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Search query: "${query}"\n\nFrame descriptions:\n${frameDescriptions}\n\nReturn JSON with the most relevant frames.` },
    ],
    response_format: { type: "json_object" },
  });

  const content = aiResponse.choices[0]?.message?.content ?? "{}";
  let parsed: { matches?: Array<{ index: number; relevanceScore: number; matchReason: string }> };

  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  return (parsed.matches ?? [])
    .filter((m) => m.index >= 0 && m.index < frames.length)
    .map((m) => ({
      frame: frames[m.index].frame,
      video: frames[m.index].video,
      relevanceScore: m.relevanceScore,
      matchReason: m.matchReason,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

router.post("/search", async (req, res): Promise<void> => {
  const parsed = SearchFramesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, videoId, limit = 20 } = parsed.data;
  const effectiveLimit = limit ?? 20;

  try {
    const results = await semanticSearch(query, videoId, effectiveLimit);

    await db.insert(searchHistoryTable).values({ query, resultCount: results.length });

    res.json(
      SearchFramesResponse.parse({
        query,
        results: results.map((r) => ({
          frame: serializeFrame(r.frame),
          video: serializeVideo(r.video),
          relevanceScore: r.relevanceScore,
          matchReason: r.matchReason,
        })),
        totalMatches: results.length,
      })
    );
  } catch (error) {
    req.log.error({ err: error }, "Search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/search/history", async (req, res): Promise<void> => {
  const history = await db
    .select()
    .from(searchHistoryTable)
    .orderBy(sql`${searchHistoryTable.createdAt} DESC`)
    .limit(20);

  res.json(
    GetSearchHistoryResponse.parse(
      history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))
    )
  );
});

export default router;
