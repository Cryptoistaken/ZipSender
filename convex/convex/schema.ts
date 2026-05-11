import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const titleTypeValidator = v.union(
  v.literal("movie"),
  v.literal("series"),
);

export const fileFormatValidator = v.union(
  v.literal("zip"),
  v.literal("video"),
);

export default defineSchema({
  titles: defineTable({
    name: v.string(),
    type: titleTypeValidator,
    partCount: v.number(),
    totalSize: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  })
    .index("by_type", ["type"])
    .index("by_archived", ["archived"]),

  parts: defineTable({
    titleId: v.id("titles"),
    label: v.string(),
    filename: v.string(),
    driveFileId: v.string(),
    driveUrl: v.string(),
    format: fileFormatValidator,
    size: v.optional(v.string()),
    order: v.number(),
  })
    .index("by_title", ["titleId"])
    .index("by_title_and_order", ["titleId", "order"]),
});