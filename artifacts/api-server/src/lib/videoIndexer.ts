import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openai } from "@workspace/integrations-openai-ai-server";
import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import { ObjectStorageService } from "./objectStorage";
import { db, videosTable, framesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const objectStorageService = new ObjectStorageService();

const FRAME_INTERVAL_SECONDS = 2;

async function downloadVideoToTemp(objectPath: string): Promise<string> {
  const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
  const response = await objectStorageService.downloadObject(objectFile);
  const ext = objectPath.includes(".mov") ? ".mov" : ".mp4";
  const tmpFile = path.join(os.tmpdir(), `cctv_video_${Date.now()}${ext}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(tmpFile, Buffer.from(buffer));
  return tmpFile;
}

async function extractFrames(
  videoPath: string,
  outputDir: string,
  intervalSeconds: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pattern = path.join(outputDir, "frame_%05d.jpg");
    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=1/${intervalSeconds}`,
        "-q:v 2",
        "-frames:v 500",
      ])
      .output(pattern)
      .on("end", () => {
        const files = fs
          .readdirSync(outputDir)
          .filter((f) => f.endsWith(".jpg"))
          .sort()
          .map((f) => path.join(outputDir, f));
        resolve(files);
      })
      .on("error", reject)
      .run();
  });
}

async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

async function uploadFrameToStorage(framePath: string): Promise<string> {
  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

  const fileBuffer = fs.readFileSync(framePath);
  const response = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload frame: ${response.statusText}`);
  }

  return objectPath;
}

async function analyzeFrameWithAI(framePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(framePath);
  const base64Image = fileBuffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Describe this CCTV surveillance frame in detail. Focus on: people (clothing, appearance, actions), vehicles (type, color, make), objects, location features, and any notable events or activities. Be specific and factual. Keep it concise but comprehensive.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  const finishReason = response.choices[0]?.finish_reason;

  logger.info(
    { framePath, finishReason, contentLength: content?.length ?? 0, contentPreview: content?.slice(0, 100) },
    "AI frame analysis response"
  );

  if (!content || content.trim() === "") {
    logger.warn({ framePath, finishReason, fullResponse: JSON.stringify(response.choices[0]) }, "Empty content from AI vision");
    return "Frame analyzed — no description generated.";
  }

  return content;
}

export async function indexVideo(videoId: number): Promise<void> {
  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.id, videoId));

  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  let tmpVideoPath: string | null = null;
  let tmpDir: string | null = null;

  try {
    // Delete any previously indexed frames so re-indexing starts clean
    await db.delete(framesTable).where(eq(framesTable.videoId, videoId));

    await db
      .update(videosTable)
      .set({ status: "indexing", totalFrames: null, indexedFrames: 0, errorMessage: null })
      .where(eq(videosTable.id, videoId));

    logger.info({ videoId }, "Downloading video for indexing");
    tmpVideoPath = await downloadVideoToTemp(video.objectPath);

    const duration = await getVideoDuration(tmpVideoPath);
    const estimatedFrames = Math.floor(duration / FRAME_INTERVAL_SECONDS);

    await db
      .update(videosTable)
      .set({
        durationSeconds: duration,
        totalFrames: estimatedFrames,
        indexedFrames: 0,
      })
      .where(eq(videosTable.id, videoId));

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cctv_frames_"));
    logger.info({ videoId, duration, estimatedFrames }, "Extracting frames");

    const framePaths = await extractFrames(
      tmpVideoPath,
      tmpDir,
      FRAME_INTERVAL_SECONDS
    );

    const actualFrameCount = framePaths.length;
    await db
      .update(videosTable)
      .set({ totalFrames: actualFrameCount })
      .where(eq(videosTable.id, videoId));

    logger.info({ videoId, frameCount: actualFrameCount }, "Analyzing frames");

    let indexedCount = 0;

    await batchProcess(
      framePaths.map((fp, i) => ({ framePath: fp, index: i })),
      async ({ framePath, index }) => {
        const timestampSeconds = index * FRAME_INTERVAL_SECONDS;

        const [framObjectPath, description] = await Promise.all([
          uploadFrameToStorage(framePath),
          analyzeFrameWithAI(framePath),
        ]);

        await db.insert(framesTable).values({
          videoId,
          timestampSeconds,
          objectPath: framObjectPath,
          description,
        });

        indexedCount++;
        await db
          .update(videosTable)
          .set({ indexedFrames: indexedCount })
          .where(eq(videosTable.id, videoId));

        logger.info(
          { videoId, frameIndex: index, timestampSeconds },
          "Frame indexed"
        );
      },
      { concurrency: 3, retries: 3 }
    );

    await db
      .update(videosTable)
      .set({ status: "indexed", indexedFrames: indexedCount })
      .where(eq(videosTable.id, videoId));

    logger.info({ videoId, indexedCount }, "Video indexing complete");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ videoId, err: error }, "Video indexing failed");

    await db
      .update(videosTable)
      .set({ status: "failed", errorMessage })
      .where(eq(videosTable.id, videoId));
  } finally {
    if (tmpVideoPath && fs.existsSync(tmpVideoPath)) {
      fs.unlinkSync(tmpVideoPath);
    }
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
