import { action } from "./_generated/server";
import { v } from "convex/values";

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

function parseFileId(raw: string): string {
  if (!raw.includes("/") && !raw.includes("?")) return raw;
  return raw.match(DRIVE_ID_RE)?.[1] ?? raw;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * Fetch Google Drive file metadata without an API key.
 * Strategy (from gdrive-logic.md):
 *   1. Hit the usercontent download probe URL — for large files Google returns
 *      an HTML warning page that contains the filename and size.
 *   2. For small files Google redirects straight to the stream; fall back to
 *      Content-Disposition / Content-Length headers.
 *   3. Detect ZIP vs video by filename extension / Content-Type.
 */
export const getFileMeta = action({
  args: { driveUrl: v.string() },
  handler: async (_ctx, { driveUrl }) => {
    const fileId = parseFileId(driveUrl);
    if (!fileId || fileId.length < 10) throw new Error("Invalid Drive URL");

    const probeUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    const res = await fetch(probeUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    let fileName: string | null = null;
    let fileSize: string | null = null;
    const mimeType: string | null = res.headers.get("content-type");

    const ct = mimeType?.toLowerCase() ?? "";
    if (ct.includes("text/html")) {
      // Large file — Google returns HTML warning page with name + size
      const html = await res.text();
      const nameMatch = html.match(
        /class="uc-name-size"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s
      );
      if (nameMatch) fileName = nameMatch[1].trim();
      const sizeMatch = html.match(/\((\d+(?:\.\d+)?\s*(?:G|M|K|GB|MB|KB))\)/);
      if (sizeMatch) fileSize = sizeMatch[1].trim();
    } else {
      // Small file — direct stream, parse headers
      const disposition = res.headers.get("content-disposition") ?? "";
      const nameFromHeader = disposition.match(/filename[^;=\n]*=([^;\n]*)/)?.[1];
      if (nameFromHeader) fileName = nameFromHeader.replace(/['"]/g, "").trim();
      const contentLength = res.headers.get("content-length");
      if (contentLength) fileSize = formatBytes(Number(contentLength));
    }

    const nameLower = (fileName ?? "").toLowerCase();
    const isZip =
      nameLower.endsWith(".zip") ||
      mimeType === "application/zip" ||
      mimeType === "application/x-zip-compressed";

    return {
      fileId,
      name: fileName ?? null,
      size: fileSize ?? null,
      mimeType: mimeType ?? null,
      format: isZip ? "zip" : "video",
    };
  },
});
