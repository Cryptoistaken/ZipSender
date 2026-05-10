# Google Drive Download Logic Reference

Extracted from `zipsender-bot` — only the parts relevant to an Android app backend. No Telegram, no bot logic.

---

## 1. Extracting the File ID from a GDrive URL

A Google Drive share link can come in several formats. The file ID is always a 25+ character alphanumeric string.

**Regex:**
```
/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/
```

**Formats it matches:**
```
https://drive.google.com/file/d/FILE_ID/view
https://drive.google.com/open?id=FILE_ID
https://drive.usercontent.google.com/download?id=FILE_ID&export=download
```

**Usage (JS):**
```js
function extractGDriveId(url) {
  const match = url.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/)
  return match ? match[1] : null
}
```

---

## 2. Fetching File Metadata (Name + Size) Without Downloading

When you hit the direct download URL for a large file, Google returns an HTML warning page instead of the file. That page contains the file name and size in a readable anchor tag — you can parse it without downloading anything.

**Probe URL:**
```
https://drive.usercontent.google.com/download?id=FILE_ID&export=download
```

**What Google returns for large files (HTML snippet):**
```html
<span class="uc-name-size">
  <a href="/open?id=FILE_ID">1-8 True.Beauty.S01.720p.10bit.WEB-DL.HIN-KOR.x265.zip</a>
  (3.8G)
</span>
```

**Parsing strategy (JS regex on the HTML body):**
```js
async function fetchGDriveMeta(fileId) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow',
  })
  const html = await res.text()

  // File name: inside the <a> tag within uc-name-size
  const nameMatch = html.match(/class="uc-name-size"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s)
  // File size: the (X.XG) or (X.X MB) after the anchor
  const sizeMatch = html.match(/\((\d+(?:\.\d+)?\s*(?:G|M|K|GB|MB|KB))\)/)

  return {
    fileName: nameMatch ? nameMatch[1].trim() : null,
    fileSize: sizeMatch ? sizeMatch[1].trim() : null,
  }
}
```

**Notes:**
- For small files (< ~100 MB) Google may redirect straight to the file — in that case the `Content-Disposition` header contains the filename and `Content-Length` has the size.
- For large files the HTML warning page is reliably present and contains both name and size.
- No auth required for publicly shared files.

**Convex action version (runs server-side with `fetch`):**
```js
// convex/actions/gdrive.js
export const fetchMeta = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const fileId = extractGDriveId(url)
    if (!fileId) throw new Error('invalid gdrive url')
    return await fetchGDriveMeta(fileId)
  },
})
```

---

## 3. Direct Download URL (Bypassing the Virus Warning)

The `confirm=t` parameter skips the virus-scan warning form. Append it to get the actual file stream.

```
https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t
```

Also set `User-Agent: Mozilla/5.0` — without it some proxies return errors.

For very large files Google also checks a `uuid` token (generated server-side and embedded in the warning HTML form). If `confirm=t` stops working in the future, extract the `uuid` field too:

```html
<input type="hidden" name="uuid" value="f9c8f84a-1773-4835-95af-56805b0ca567">
```

Then build:
```
https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t&uuid=UUID_VALUE
```

---

## 4. File Type Detection (ZIP vs Video)

After downloading, detect by magic bytes (first 12 bytes of the file), not by extension.

| Type | Magic bytes |
|------|-------------|
| ZIP  | `50 4B` (first 2 bytes) |
| MKV / WebM | `1A 45 DF A3` |
| AVI  | `52 49 46 46` |
| MP4  | bytes 4–7 = `66 74 79 70` (`ftyp`) |

**Also check `Content-Type` header** — for video files Google often sends the correct MIME type before you even read the body:

```
video/mp4  → .mp4
video/x-matroska → .mkv
video/x-msvideo → .avi
video/quicktime → .mov
video/webm → .webm
video/x-m4v → .m4v
```

ZIP files always come as `application/zip` or `application/octet-stream`.

---

## 5. AI-Powered File Name Cleaning

Raw video filenames from archives are messy. Use an LLM to normalize them.

**Prompt (system):**
```
You are a file name cleaner. The user gives you a numbered list of messy video file names.
Normalize each name by:
- Replacing dots and underscores with spaces
- Keeping show/movie title, episode info (e.g. S01E03), and resolution (e.g. 720p)
- Removing: x265, x264, HEVC, 10bit, 8bit, WEB-DL, WEBRip, BluRay, HDRip, HDTV,
  AAC, AC3, language codes (HIN, KOR, ENG, etc), ESub, YIFY, YTS, and similar tags
- Keeping the original file extension
- Output clean names like: True Beauty S01E03 720p.mkv

Return only a JSON array of the cleaned names in the same order.
No markdown, no backticks, no explanation.
```

**Model used in original:** `llama-3.3-70b-versatile` via Groq (free tier)
**Fallback:** if JSON parse fails, return original names unchanged

**Input format:**
```
1. True.Beauty.S01E01.720p.10bit.WEB-DL.HIN-KOR.x265.mkv
2. True.Beauty.S01E02.720p.10bit.WEB-DL.HIN-KOR.x265.mkv
```

**Expected output:**
```json
["True Beauty S01E01 720p.mkv", "True Beauty S01E02 720p.mkv"]
```

---

## 6. Data Model (for Convex)

```js
// Series (parent)
{
  _id,
  title: string,         // series name (from AI or admin input)
  createdAt: number,
}

// ZipFile (child, many per series)
{
  _id,
  seriesId: Id<'series'>,
  gdriveUrl: string,     // original URL posted by admin
  fileId: string,        // extracted GDrive file ID
  fileName: string,      // extracted from GDrive HTML (AI-cleaned optional)
  fileSize: string,      // e.g. "3.8G"
  addedAt: number,
}
```

---

## 7. Key Error Cases to Handle

| Situation | What happens | Fix |
|-----------|-------------|-----|
| File not publicly shared | Redirect to accounts.google.com login | Check if final URL contains `accounts.google.com` |
| File deleted from Drive | 404 or empty HTML | Check response status |
| Small file (no warning page) | Direct file stream, no HTML | Fall back to `Content-Disposition` header parsing |
| Invalid URL | regex returns null | Show error before making any request |
| Rate limited by Google | 429 or redirect loop | Add retry with exponential backoff |

---

## 8. Supported Video Extensions

```js
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']
```
