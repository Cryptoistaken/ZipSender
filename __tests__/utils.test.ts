// __tests__/utils.test.ts
// Unit tests for the core logic functions in ZipSender.
// These run in CI after every debug APK build.

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

function parseFileId(raw: string): string {
  if (!raw.includes('/') && !raw.includes('?')) return raw;
  return raw.match(DRIVE_ID_RE)?.[1] ?? raw;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function detectFormat(mimeType: string, name: string): 'zip' | 'video' {
  const isZip =
    mimeType === 'application/zip' ||
    mimeType === 'application/x-zip-compressed' ||
    name?.toLowerCase().endsWith('.zip');
  return isZip ? 'zip' : 'video';
}

// ── Drive URL parsing ─────────────────────────────────────────────────────────

describe('parseFileId', () => {
  test('bare ID passes through', () => {
    const id = 'abc123XYZdef456GHIjkl789MN';
    expect(parseFileId(id)).toBe(id);
  });

  test('extracts ID from /file/d/ URL', () => {
    const url = 'https://drive.google.com/file/d/1Ai8or3NYOlij2SP_kSomeID1234/view?usp=sharing';
    expect(parseFileId(url)).toBe('1Ai8or3NYOlij2SP_kSomeID1234');
  });

  test('extracts ID from ?id= URL', () => {
    const url = 'https://drive.google.com/open?id=1KofP4gyJcNQvNkSomeLongID567';
    expect(parseFileId(url)).toBe('1KofP4gyJcNQvNkSomeLongID567');
  });

  test('returns raw string when no match', () => {
    expect(parseFileId('https://example.com/file')).toBe('https://example.com/file');
  });
});

// ── Format detection (the main bug) ──────────────────────────────────────────

describe('detectFormat', () => {
  test('zip mimeType → zip', () => {
    expect(detectFormat('application/zip', 'movie.zip')).toBe('zip');
  });

  test('x-zip-compressed mimeType → zip', () => {
    expect(detectFormat('application/x-zip-compressed', 'archive.zip')).toBe('zip');
  });

  test('.zip extension fallback → zip', () => {
    expect(detectFormat('application/octet-stream', 'Series.S01.zip')).toBe('zip');
  });

  test('video/mp4 → video', () => {
    expect(detectFormat('video/mp4', 'movie.mp4')).toBe('video');
  });

  test('video/x-matroska → video', () => {
    expect(detectFormat('video/x-matroska', 'movie.mkv')).toBe('video');
  });

  test('octet-stream with .mkv name → video', () => {
    expect(detectFormat('application/octet-stream', 'True.Beauty.S01E01.mkv')).toBe('video');
  });
});

// ── formatBytes ───────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  test('GB range', () => {
    expect(formatBytes(3.8 * 1024 * 1024 * 1024)).toBe('3.8 GB');
  });

  test('MB range', () => {
    expect(formatBytes(512 * 1024 * 1024)).toBe('512.0 MB');
  });

  test('KB range', () => {
    expect(formatBytes(2048)).toBe('2 KB');
  });
});
