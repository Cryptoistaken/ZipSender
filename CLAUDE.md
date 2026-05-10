# CLAUDE.md — ZipSender

## What is this

ZipSender is an Android-first React Native (Expo) app for distributing video content. An admin uploads Google Drive links (ZIP or raw video); users browse a catalog, download files, and watch them on-device. Files are fetched from Google Drive using the usercontent download URL — no API key required.

Two interfaces:
- **User** — browsable catalog with hero strip, download buttons per file, and a downloads manager
- **Admin** — hidden behind a 20-tap secret on the storage widget; full CRUD for titles and parts via bottom sheets

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 52 / React Native 0.76 |
| Router | expo-router v4 (file-based, typed routes) |
| Backend | Convex (separate project inside `convex/`) |
| State | Zustand + AsyncStorage persistence |
| File system | `expo-file-system/legacy` + SAF for public Downloads |
| ZIP extraction | `react-native-zip-archive` |
| Bottom sheets | `@gorhom/bottom-sheet` v4 |
| Video | `expo-video` (`useVideoPlayer` + `VideoView`) |
| Fonts | Almarai (300/400/700/800) + Instrument Serif italic |
| Icons | `@expo/vector-icons` MaterialCommunityIcons |

Language: TypeScript (strict). No Expo Go — requires a dev build or `expo run:android`.

---

## Project structure

```
ZipSender/
├── app/
│   ├── _layout.tsx              root layout — ConvexProvider, fonts, permissions
│   ├── index.tsx                redirects to /(user)
│   ├── (user)/
│   │   ├── _layout.tsx          floating tab bar (Home + Downloads)
│   │   ├── index.tsx            catalog home screen with HeroStrip + TitleCards
│   │   └── downloads.tsx        downloads manager — DlCard list, delete modal
│   └── (admin)/
│       ├── _layout.tsx          Stack wrapper
│       └── index.tsx            admin panel — SeriesGroup list, filter pills, FAB, bottom sheet
├── components/
│   ├── TitleCard.tsx            user-facing card: image strip + badges + download buttons
│   ├── DownloadButton.tsx       idle / downloading / extracting / done states
│   ├── SeriesGroup.tsx          admin title row with collapsible part list
│   ├── PartRow.tsx              single part row inside SeriesGroup
│   ├── StorageWidget.tsx        disk usage bar + secret admin tap target
│   └── sheets/
│       ├── AddSeriesSheet.tsx   create title + add N file URLs in one flow
│       ├── AddPartSheet.tsx     add a single part to an existing title
│       ├── EditSeriesSheet.tsx  rename a title
│       └── ConfirmDeleteSheet.tsx  soft-delete title or hard-delete part
├── convex/
│   └── convex/                  Convex project root (separate package.json)
│       ├── schema.ts            titles + parts tables
│       ├── titles.ts            queries + mutations (list, create, rename, archive)
│       ├── parts.ts             queries + mutations (listByTitle, add, update, remove, reorder)
│       └── drive.ts             getFileMeta action — probes Drive usercontent URL for name/size/format
├── store/
│   └── downloads.ts             Zustand store — DownloadedItem[], persisted via AsyncStorage
├── hooks/
│   ├── useSafDownloads.ts       SAF permission + copyToPublicDownloads()
│   └── useSecretAdminTap.ts     20-tap-in-4s detector + AsyncStorage persistence
└── constants/
    ├── colors.ts                cream-on-dark palette (12 tokens)
    └── fonts.ts                 Almarai + Instrument Serif name constants
```

---

## Convex backend

**Deployment:** `https://majestic-fennec-666.eu-west-1.convex.cloud` (hardcoded in `_layout.tsx` — no `.env` needed on the app side).

**Tables:**

`titles` — name, type (`movie|series`), partCount (cached), totalSize (cached string), archived (soft-delete flag)

`parts` — titleId, label, filename, driveFileId, driveUrl, format (`zip|video`), size (string), order (int)

**Key rules:**
- Always use the generated `api` object from `convex/_generated/api` for typed calls — never `anyApi`
- `_recalcStats` in `titles.ts` is `internalMutation` — not callable from the client
- `titles.archive` soft-deletes (sets `archived: true` and deletes child parts) — it does NOT hard-delete the title row
- `parts.remove` re-sequences siblings after deletion so `order` stays contiguous

---

## Download flow

1. User taps a `DownloadButton` → SAF permission requested (once, cached in AsyncStorage)
2. `FileSystem.createDownloadResumable` fetches from `drive.usercontent.google.com/download?id=...&export=download&confirm=t`
3. File saved to `<documentDirectory>/ZipSender/<TitleName>/<filename>`
4. **ZIP:** extracted via `react-native-zip-archive` into `extracted/` subfolder → each video copied to public Downloads via SAF
5. **Video:** copied directly to public Downloads via SAF
6. `useDownloadsStore.add()` records the item (persisted)

**Important:** Files live in `documentDirectory` (app-private). SAF copies them to public Downloads so they survive uninstall and are accessible in the Files app. The "Open Folder" button opens the system Files app — it cannot deep-link into app-private storage.

---

## File system rules

Always import as:
```ts
import * as FileSystem from 'expo-file-system/legacy'
```
Never `from 'expo-file-system'` — `StorageAccessFramework` is in the legacy module and the plain import path is deprecated from SDK 55+.

When calling `FileSystem.getInfoAsync(path, { size: true })`, narrow the type using the discriminated union — `FileSystemFileInfo` does not exist in SDK 52, use `FileInfo` directly:
```ts
const info = await FileSystem.getInfoAsync(path, { size: true })
const size = info.exists ? info.size : 0
```
The `exists: true` branch of `FileInfo` already includes `size: number` — no cast needed.

When passing paths to `react-native-zip-archive`'s `unzip()`, strip the `file://` prefix:
```ts
await unzip(uri.replace(/^file:\/\//, ''), destDir)
```

---

## SAF (Storage Access Framework)

`hooks/useSafDownloads.ts` manages Android scoped storage access.

- `getOrRequestSafUri()` — returns cached grant or triggers the folder picker (pre-pointed at Downloads)
- `copyToPublicDownloads(srcPath, filename, subDir)` — reads file as base64, writes to `Downloads/ZipSender/<subDir>/` via SAF
- Directory creation uses `safGetOrCreateDir(parentUri, name)` which decodes percent-encoded URI tails before matching — handles title names with special characters

Never use `e.includes(name)` to match SAF URIs — decode first:
```ts
const tail = e.split('%3A').pop() ?? e.split('/').pop() ?? ''
return decodeURIComponent(tail) === name
```

---

## Admin panel

- Accessed via 20 taps within 4 seconds on `StorageWidget` in the Downloads tab
- Unlock state persisted in AsyncStorage (`zipsender-admin-unlocked`)
- Bottom sheet controlled via `@gorhom/bottom-sheet` ref — two callbacks:
  - `closeSheet()` — called by sheet content buttons; calls `ref.current?.close()` imperatively
  - `handleSheetClose()` — passed to `onClose` prop; only resets `sheet` state (no `.close()` call to avoid double-close)
- Filter pills (`all / zip / video`) filter by part format client-side — `api.titles.listByType` filters by title type (`movie|series`) which is a different dimension

---

## Downloads store (`store/downloads.ts`)

```ts
interface DownloadedItem {
  id: Id<'parts'>       // typed — not plain string
  titleName: string
  filename: string
  folderPath: string    // includes file:// prefix on Android
  size: string          // human-readable
  format: 'zip' | 'video'
  downloadedAt: number
  extractedFiles?: ExtractedFile[]  // optional — old persisted data may not have this
}
```

Always access `extractedFiles` with `?? []` fallback:
```ts
item.extractedFiles ?? []
```

---

## Design tokens

**Colors** (`constants/colors.ts`) — cream `#e1e0cc` on dark `#101010`. No pure white.

| Token | Value |
|---|---|
| `cream` | `#e1e0cc` |
| `cream80/50/30/20/10/05` | rgba at named opacity |
| `surface` | `#101010` |
| `card` | `#181818` |
| `card2` | `#1e1e1e` |
| `black` | `#000000` |

**Fonts** (`constants/fonts.ts`) — always reference via `Fonts.*`:

| Key | Family |
|---|---|
| `light` | `Almarai_300Light` |
| `regular` | `Almarai_400Regular` |
| `bold` | `Almarai_700Bold` |
| `extraBold` | `Almarai_800ExtraBold` |
| `serifItalic` | `InstrumentSerif_400Regular_Italic` |

---

## Coding rules

- No inline comments, no `console.log` outside debug
- Single quotes, no semicolons (JS style) — TypeScript files follow same convention
- Functional components only, `StyleSheet.create()` for all styles
- No TypeScript `as any` casts — narrow union types properly
- Use `useCallback` for all handlers passed as props or used in `useEffect` deps
- `Id<'tableName'>` from Convex for all ID fields — not plain `string`

---

## First-launch permission flow

All permissions are requested once on first launch, guarded by `AsyncStorage` key `zipsender-perms-asked-v1`. After the flag is set, `requestAllPermissions()` returns immediately on every subsequent launch.

Sequence (Android only):

1. **MediaLibrary** — `MediaLibrary.requestPermissionsAsync(false, ['video', 'audio', 'photo'])`
   - `writeOnly: false` → read + write
   - `granularPermissions: ['video', 'audio', 'photo']` → maps to `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `READ_MEDIA_IMAGES` on Android 13+ (API 33+); ignored / falls back to `READ/WRITE_EXTERNAL_STORAGE` on older Android
   - If permanently denied (`canAskAgain === false`) → shows alert with "Open Settings" → `Linking.openSettings()`
   - If denied but can ask again → continues, shows a combined rationale alert at the end

2. **MANAGE_EXTERNAL_STORAGE** — `IntentLauncher.startActivityAsync('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION', { data: 'package:com.zipsender.app' })`
   - Required on Android 11+ (API 30+) to access files outside the app sandbox
   - Cannot be requested via `requestPermissionsAsync` — must send user to system settings
   - Shown only if step 1 was granted; user sees a rationale alert first ("Tap Allow on the next screen")
   - If the device doesn't support this intent (API < 30) the `startActivityAsync` throws and is silently caught

The `ensureAppDir()` call runs alongside permissions to create `<documentDirectory>/ZipSender/` immediately — it does not depend on any permission.

---

## Bug fixes applied (session log)

All 20 issues from the initial audit were fixed, plus 4 TypeScript errors from `npx tsc --noEmit` resolved in a follow-up pass:

**TypeScript errors fixed (follow-up pass)**
21. `expo-file-system/legacy` subpath types missing — created `types/expo-file-system-legacy.d.ts` shim that re-exports from `expo-file-system`; fixes `app/(user)/downloads.tsx`, `app/_layout.tsx`, `components/DownloadButton.tsx`, `hooks/useSafDownloads.ts` (TS2307 ×4)
22. `api.drive` missing from app-level generated API — added `drive` import to `convex/_generated/api.d.ts`; fixes `AddPartSheet.tsx` + `AddSeriesSheet.tsx` (TS2339 ×2)
23. `dp` implicit `any` in `DownloadButton.tsx` line 180 — annotated as `FileSystem.DownloadProgressData` (TS7006)
24. `e` implicit `any` in `useSafDownloads.ts` line 136 — annotated as `string` in the `entries.find()` callback; was cascading from unresolved `SAF.readDirectoryAsync` type (fixed by shim in #21) (TS7006)
25. `FileSystemFileInfo` does not exist in `expo-file-system` SDK 52 — replaced both casts in `DownloadButton.tsx` with clean `info.exists ? info.size : 0` using the `FileInfo` discriminated union directly (TS2694 ×2)

All 20 issues from the initial audit were fixed:

**Critical**
1. `expo-file-system` → `expo-file-system/legacy` in `_layout.tsx`, `downloads.tsx`, `DownloadButton.tsx`, `useSafDownloads.ts`
2. `anyApi.drive.getFileMeta` → `api.drive.getFileMeta` in `AddSeriesSheet.tsx` + `AddPartSheet.tsx`; removed `anyApi` import
3. `openFolder()` — removed invalid `VIEW_DOWNLOADS` intent; primary is now `MAIN` + `APP_FILES`, fallback is `content://downloads/public_downloads`
4. SAF directory fallback — replaced fragile `e.includes(name)` with `safGetOrCreateDir()` helper that decodes percent-encoded URI tails
5. `(info as any).size` → properly narrowed via `info.exists && 'size' in info` + cast to `FileSystemFileInfo`

**High**
6. HeroStrip `p.pause()` removed — video now autoplay loops muted
7. `BottomSheet` `onClose` split: `closeSheet` (imperative, for buttons) vs `handleSheetClose` (state-only, for `onClose` prop)
8. `_recalcStats` changed from `mutation` to `internalMutation` in `titles.ts`
9. `([, v])` → `([, val])` in `parts.ts` `update` mutation filter to stop shadowing the `v` validator import
10. `marginHorizontal: 16` removed from `StorageWidget` style — was double-padding with parent scroll padding

**Medium**
11. `DownloadedItem.id` typed as `Id<'parts'>` (was `string`); `remove()` updated to match
12. `ConfirmDeleteSheet` copy changed from "permanently removed" to "hidden from the catalog" (reflects soft-delete reality)
13. `extractedFiles` made optional (`ExtractedFile[]` → `ExtractedFile[]?`) to handle old persisted data safely
14. `parts` variable in `extractFilename()` renamed to `segments` (`AddSeriesSheet.tsx`)
15. `HeroStrip` `SafeAreaView` already uses `edges={['top']}` — confirmed correct for notch safety

**Low**
16. `openFolder()` intent order fixed — `APP_FILES` first (correct), `content://downloads/public_downloads` as fallback
17. Admin format filter is correctly client-side — `listByType` filters by title type, not part format (different dimension, not a bug)
18. `unzip(result.uri, ...)` → `unzip(result.uri.replace(/^file:\/\//, ''), ...)` to strip `file://` prefix
19. `app.json` `intentFilters` action `"VIEW"` is fine — Expo config plugin prepends the namespace automatically
20. `tsconfig.json` `exclude` changed from `["convex", "convex/convex"]` to `["convex/node_modules", "convex/convex/_generated"]` so the app can type-check against generated Convex types while still excluding the Convex project's own compiler config
