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

export const getFileMeta = action({
  args: { driveUrl: v.string() },
  handler: async (_ctx, { driveUrl }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY not set in Convex env");

    const fileId = parseFileId(driveUrl);
    if (!fileId || fileId.length < 10) throw new Error("Invalid Drive URL");

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,size,mimeType&key=${apiKey}`
    );
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);

    const data = await res.json();

    const isZip =
      data.mimeType === "application/zip" ||
      data.mimeType === "application/x-zip-compressed" ||
      (data.name as string)?.toLowerCase().endsWith(".zip");

    return {
      fileId,
      name: data.name as string,
      size: data.size ? formatBytes(Number(data.size)) : null,
      mimeType: data.mimeType as string,
      format: isZip ? "zip" : "video",
    };
  },
});
