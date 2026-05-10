import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fileFormatValidator } from "./schema";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get all parts for a title, ordered by their display order.
 * Used by User home cards and Admin part-list rows.
 */
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

/**
 * Get a single part (needed when building the download URL on-device).
 */
export const get = query({
  args: { partId: v.id("parts") },
  handler: async (ctx, { partId }) => {
    return await ctx.db.get(partId);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Add a file to an existing title.
 * Used by:
 *  - "Add file URL" rows inside the "Publish new title" sheet
 *  - "Add file" (add-part) sheet
 */
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
    // Determine next order index
    const existing = await ctx.db
      .query("parts")
      .withIndex("by_title", (q) => q.eq("titleId", args.titleId))
      .collect();
    const order = existing.length;

    const partId = await ctx.db.insert("parts", { ...args, order });

    // Update partCount on the parent title
    const title = await ctx.db.get(args.titleId);
    if (title) {
      await ctx.db.patch(args.titleId, { partCount: order + 1 });
    }

    return partId;
  },
});

/**
 * Update label / filename / driveUrl / size of an existing part
 * (Admin "Edit part" — future screen).
 */
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
    // Strip undefined fields so we don't accidentally null them out
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, val]) => val !== undefined),
    );
    await ctx.db.patch(partId, clean);
  },
});

/**
 * Remove a part from a title (Admin part-row delete → confirm sheet → Remove).
 * After deletion we re-sequence the remaining parts' order values.
 */
export const remove = mutation({
  args: { partId: v.id("parts") },
  handler: async (ctx, { partId }) => {
    const part = await ctx.db.get(partId);
    if (!part) return;

    await ctx.db.delete(partId);

    // Re-sequence siblings so order is contiguous
    const siblings = await ctx.db
      .query("parts")
      .withIndex("by_title_and_order", (q) => q.eq("titleId", part.titleId))
      .order("asc")
      .collect();

    await Promise.all(
      siblings.map((s, i) => ctx.db.patch(s._id, { order: i })),
    );

    // Update parent partCount
    const title = await ctx.db.get(part.titleId);
    if (title) {
      await ctx.db.patch(part.titleId, { partCount: siblings.length });
    }
  },
});

/**
 * Reorder parts within a title (drag-and-drop — future feature).
 * Pass the full ordered array of part IDs.
 */
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
