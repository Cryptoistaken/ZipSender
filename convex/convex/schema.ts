import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Shared validators (exported for reuse in mutations/queries) ───────────────

export const titleTypeValidator = v.union(
  v.literal("movie"),
  v.literal("series"),
);

export const fileFormatValidator = v.union(
  v.literal("zip"),
  v.literal("video"),
);

// ─── Schema ───────────────────────────────────────────────────────────────────

export default defineSchema({
  /**
   * titles — the top-level catalog entries shown on the User home screen
   * and managed in the Admin panel.
   *
   * Examples from prototype:
   *   "True Beauty Season 1"  (series, has multiple zip parts)
   *   "Goblin (2016)"         (movie,  single video file)
   *   "Vincenzo Season 1"     (series, single zip)
   *   "Business Proposal"     (movie,  single video file)
   */
  titles: defineTable({
    /** Display name, e.g. "True Beauty Season 1" */
    name: v.string(),
    /** movie | series */
    type: titleTypeValidator,
    /** Cached count of parts for the subtitle line "2 files · 7.6 GB" */
    partCount: v.number(),
    /** Cached total size string, e.g. "7.6 GB" */
    totalSize: v.optional(v.string()),
    /** Soft-delete flag so admin can hide without destroying data */
    archived: v.optional(v.boolean()),
  })
    .index("by_type", ["type"])
    .index("by_archived", ["archived"]),

  /**
   * parts — each individual downloadable file that belongs to a title.
   *
   * A title with 2 ZIP parts (Ep 1-8 and Ep 9-16) has 2 part rows.
   * A movie with a single .mkv has 1 part row.
   */
  parts: defineTable({
    /** Parent title */
    titleId: v.id("titles"),
    /** Human-readable label shown on the download button,
     *  e.g. "Ep 1–8 · ZIP · 3.8 GB" */
    label: v.string(),
    /** Actual filename that will appear once downloaded,
     *  e.g. "1-8 True.Beauty.S01.720p.zip" */
    filename: v.string(),
    /** Google Drive file ID extracted from the share URL */
    driveFileId: v.string(),
    /** Full original Drive URL stored for reference */
    driveUrl: v.string(),
    /** zip | video */
    format: fileFormatValidator,
    /** Human-readable size string e.g. "3.8 GB" */
    size: v.optional(v.string()),
    /** Display order within a title (0-based) */
    order: v.number(),
  })
    .index("by_title", ["titleId"])
    .index("by_title_and_order", ["titleId", "order"]),
});
