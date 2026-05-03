import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { videosTable } from "./videos";

export const framesTable = pgTable("frames", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videosTable.id, { onDelete: "cascade" }),
  timestampSeconds: real("timestamp_seconds").notNull(),
  objectPath: text("object_path").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFrameSchema = createInsertSchema(framesTable).omit({ id: true, createdAt: true });
export type InsertFrame = z.infer<typeof insertFrameSchema>;
export type Frame = typeof framesTable.$inferSelect;
