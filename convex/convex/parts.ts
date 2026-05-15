import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fileFormatValidator } from "./schema";
import { internal } from "./_generated/api";

export const listByTitle = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    return await ctx.db
      .query("parts")
      .withIndex("by_title_and_order", (q) => q.eq("titleId", titleId))
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { partId: v.id("parts") },
  handler: async (ctx, { partId }) => {
    return await ctx.db.get(partId);
  },
});

export const add = mutation({
  args: {
    titleId: v.id("titles"),
    label: v.string(),
    filename: v.string(),
    driveFileId: v.string(),
    driveUrl: v.string(),
    format: fileFormatValidator,
    size: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("parts")
      .withIndex("by_title", (q) => q.eq("titleId", args.titleId))
      .collect();
    const order = existing.length;

    const partId = await ctx.db.insert("parts", { ...args, order });

    await ctx.runMutation(internal.titles._recalcStats, {
      titleId: args.titleId,
    });

    return partId;
  },
});

export const update = mutation({
  args: {
    partId: v.id("parts"),
    label: v.optional(v.string()),
    filename: v.optional(v.string()),
    driveFileId: v.optional(v.string()),
    driveUrl: v.optional(v.string()),
    format: v.optional(fileFormatValidator),
    size: v.optional(v.string()),
  },
  handler: async (ctx, { partId, ...patch }) => {
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(partId, clean);
  },
});

export const remove = mutation({
  args: { partId: v.id("parts") },
  handler: async (ctx, { partId }) => {
    const part = await ctx.db.get(partId);
    if (!part) return;

    await ctx.db.delete(partId);

    const siblings = await ctx.db
      .query("parts")
      .withIndex("by_title_and_order", (q) => q.eq("titleId", part.titleId))
      .order("asc")
      .collect();

    await Promise.all(
      siblings.map((s, i) => ctx.db.patch(s._id, { order: i })),
    );

    await ctx.runMutation(internal.titles._recalcStats, {
      titleId: part.titleId,
    });
  },
});

export const reorder = mutation({
  args: {
    titleId: v.id("titles"),
    orderedPartIds: v.array(v.id("parts")),
  },
  handler: async (ctx, { orderedPartIds }) => {
    await Promise.all(
      orderedPartIds.map((id, i) => ctx.db.patch(id, { order: i })),
    );
  },
});