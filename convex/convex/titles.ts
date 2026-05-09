import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { titleTypeValidator } from "./schema";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * List all active (non-archived) titles for the User home screen.
 * Returns titles ordered by creation time (newest last).
 */
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

/**
 * List titles filtered by type for the Admin panel filter pills.
 * Pass type: undefined / null to get all active titles.
 */
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

/**
 * Get a single title by ID (used when loading the detail view or edit sheet).
 */
export const get = query({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    return await ctx.db.get(titleId);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new title entry (Admin "Publish new title" sheet → Publish button).
 */
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

/**
 * Rename a title (Admin "Edit series" sheet → Save button).
 */
export const rename = mutation({
  args: {
    titleId: v.id("titles"),
    name: v.string(),
  },
  handler: async (ctx, { titleId, name }) => {
    await ctx.db.patch(titleId, { name });
  },
});

/**
 * Soft-delete a title and its parts (Admin delete confirm sheet → Delete).
 * We archive the title rather than hard-delete so no orphaned part rows
 * remain visible, but data is preserved for recovery.
 */
export const archive = mutation({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    // Mark the title archived
    await ctx.db.patch(titleId, { archived: true });
    // Also soft-delete all child parts by deleting them outright
    // (parts have no independent value outside a title)
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_title", (q) => q.eq("titleId", titleId))
      .collect();
    await Promise.all(parts.map((p) => ctx.db.delete(p._id)));
  },
});

/**
 * Internal helper: recalculate and persist partCount + totalSize on a title.
 * Called by parts mutations after any insert/delete.
 */
export const _recalcStats = mutation({
  args: { titleId: v.id("titles") },
  handler: async (ctx, { titleId }) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_title", (q) => q.eq("titleId", titleId))
      .collect();
    await ctx.db.patch(titleId, { partCount: parts.length });
  },
});
