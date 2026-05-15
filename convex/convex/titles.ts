import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { titleTypeValidator } from "./schema";
import { parseSizeBytes, formatBytes } from "./util";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("titles")
      .filter((q) => q.neq(q.field("archived"), true))
      .order("desc")
      .collect();
  },
});

export const listByType = query({
  args: {
    type: v.optional(titleTypeValidator),
  },
  handler: async (ctx, { type }) => {
    if (type) {
      return await ctx.db
        .query("titles")
        .withIndex("by_type", (q) => q.eq("type", type))
        .filter((q) => q.neq(q.field("archived"), true))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("titles")
      .filter((q) => q.neq(q.field("archived"), true))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    return await ctx.db.get(titleId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: titleTypeValidator,
    totalSize: v.optional(v.string()),
  },
  handler: async (ctx, { name, type, totalSize }) => {
    return await ctx.db.insert("titles", {
      name,
      type,
      partCount: 0,
      totalSize,
      archived: false,
    });
  },
});

export const rename = mutation({
  args: {
    titleId: v.id("titles"),
    name: v.string(),
  },
  handler: async (ctx, { titleId, name }) => {
    await ctx.db.patch(titleId, { name });
  },
});

export const archive = mutation({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    await ctx.db.patch(titleId, { archived: true });
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_title", (q) => q.eq("titleId", titleId))
      .collect();
    await Promise.all(parts.map((p) => ctx.db.delete(p._id)));
  },
});

export const _recalcStats = internalMutation({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_title", (q) => q.eq("titleId", titleId))
      .collect();
    const totalBytes = parts.reduce((s, p) => s + parseSizeBytes(p.size), 0);
    await ctx.db.patch(titleId, {
      partCount: parts.length,
      totalSize: totalBytes > 0 ? formatBytes(totalBytes) : undefined,
    });
  },
});