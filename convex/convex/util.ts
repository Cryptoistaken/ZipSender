/**
 * Shared utilities for Convex functions.
 */

const SIZE_RE = /^([\d.]+)\s*(GB|MB|KB)$/i;

export function parseSizeBytes(size: string | undefined): number {
  if (!size) return 0;
  const match = size.match(SIZE_RE);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return num * 1024 * 1024 * 1024;
  if (unit === "MB") return num * 1024 * 1024;
  if (unit === "KB") return num * 1024;
  return 0;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
