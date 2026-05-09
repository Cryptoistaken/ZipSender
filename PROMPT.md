# ZipSender — React Native + Expo + TypeScript app

## What you already have (in the zip)
- `prototype/app.html` — full interactive HTML/CSS/JS prototype. This is the **design & UX source of truth**.
- `convex/` — ready-to-use Convex backend with:
  - `convex/schema.ts` — two tables: `titles` and `parts`
  - `convex/titles.ts` — queries: `list`, `listByType`, `get` · mutations: `create`, `rename`, `archive`, `_recalcStats`
  - `convex/parts.ts` — queries: `listByTitle`, `get` · mutations: `add`, `update`, `remove`, `reorder`
  - `convex/package.json` + `convex.json` — config stubs (fill in your team slug + deployment URL)
- `Scripts/index.js` — the Node.js Telegram bot (NOT used in the app — just context for the domain)

---

## What to build

A **React Native + Expo + TypeScript** mobile app called **ZipSender**.  
Match the `prototype/app.html` design pixel-for-pixel. Use the color tokens from the prototype CSS (below).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51+ (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| Backend | Convex (`convex` npm package) — import from `../convex/_generated/api` |
| Styling | StyleSheet (NO NativeWind / Tailwind) |
| Icons | `@expo/vector-icons` — use **MaterialCommunityIcons** as the closest match to the Solar icon set used in the prototype |
| Fonts | `expo-font` with **Almarai** (weights 300, 400, 700, 800) from Google Fonts via `@expo-google-fonts/almarai` |

---

## Design tokens  (straight from the prototype CSS)

```
--cream:      #e1e0cc
--cream80:    rgba(225,224,204,0.8)
--cream50:    rgba(225,224,204,0.5)
--cream30:    rgba(225,224,204,0.3)
--cream20:    rgba(225,224,204,0.2)
--cream10:    rgba(225,224,204,0.08)
--cream05:    rgba(225,224,204,0.04)
--black:      #000000
--surface:    #101010
--card:       #181818
--card2:      #1e1e1e
```

---

## App structure (Expo Router)

```
app/
  _layout.tsx          — ConvexProvider wrapper + font loader
  (user)/
    _layout.tsx        — Bottom tab navigator: Home | Downloads
    index.tsx          — Home screen (user catalog)
    downloads.tsx      — Downloads screen
  (admin)/
    _layout.tsx        — Stack header "Admin Panel"
    index.tsx          — Admin catalog list
```

**How admin is reached:** No nav link. From the Downloads screen, tapping the Storage widget 20 times (within 4 seconds) reveals a hidden "Admin" button — exactly as in the prototype.

---

## Screen-by-screen spec

### Home screen `(user)/index.tsx`

Data: `useQuery(api.titles.list)` → for each title, `useQuery(api.parts.listByTitle, { titleId })`

Render a vertical scroll of **TitleCard** components. Each card:
- Badges row: type badge (Movie / Series) + format badge (ZIP / Video) — derived from the title's type and its parts' formats
- Title name (bold, `--cream`)
- Subtitle: episode/part info + total size (e.g. "Ep 1–8 & 9–16 · 2 parts · 7.6 GB")
- One **DownloadButton** per part, stacked vertically if multiple parts

**DownloadButton states** (local component state — no Convex involved):
1. `idle` — cream pill: label + download icon circle
2. `downloading` — progress pill with shimmer bar, percentage, filename, cancel button
3. `extracting` — (ZIP only) extracting pill with spinning icon + 3 animated dots
4. `done` — done pill: check icon + "Downloaded" label + "View →" button

Progress is simulated (random increments every 120ms, same as prototype).  
"View" button navigates to the Downloads tab.

### Downloads screen `(user)/downloads.tsx`

- **Storage widget** at the top — reads `expo-file-system`'s `getFreeDiskStorageAsync` + `getTotalDiskCapacityAsync`; falls back to 64 GB / 60% if unavailable. The 20-tap secret unlocks admin.
- **Empty state** if no completed downloads.
- **Downloaded item list** — each row: format badge, title, "Downloads/ZipSender · size", folder-open icon button, trash icon button (with confirm sheet).
- Completed downloads live in a Zustand store (or React context) — they are **not** persisted to Convex (they represent on-device files).

### Admin screen `(admin)/index.tsx`

Data: `useQuery(api.titles.listByType, { type: filterValue })`  
For each title, `useQuery(api.parts.listByTitle, { titleId })`

UI elements:
- **Filter pills** row: All / ZIP / MP4 — filter by parts' format
- **SeriesGroup** card per title:
  - Type icon (playlist for series, video camera for movie)
  - Badges + title name + subtitle ("2 files · 7.6 GB")
  - Action buttons: Add Part (+), Edit (pen), Delete (trash)
  - Collapsible **PartList**: one PartRow per part (filename, size, edit, delete)
  - "Add another file…" row at the bottom
- **FAB** (+) bottom-right → opens AddSeriesSheet

**Sheets (bottom slide-up modals using `@gorhom/bottom-sheet`):**

| Sheet | Triggers | Calls |
|---|---|---|
| AddSeriesSheet | FAB tap | `api.titles.create` then `api.parts.add` for each URL row |
| AddPartSheet | "+ Add Part" button | `api.parts.add` |
| EditSeriesSheet | Pen icon | `api.titles.rename` |
| ConfirmDeleteSeriesSheet | Trash icon on series | `api.titles.archive` |
| ConfirmDeletePartSheet | Trash icon on part row | `api.parts.remove` |

**AddSeriesSheet fields:**
- Title text input
- Movie / Series type toggle
- Dynamic URL rows (each with ZIP / Video format toggle + Drive URL input + parsed filename preview)
- "Add file URL" dashed button
- Cancel / Publish

**AddPartSheet fields:**
- ZIP / Video format toggle
- Google Drive URL input with filename preview (extract file ID with `/d/([a-zA-Z0-9_-]{25,})/` regex)
- Cancel / Add file

---

## Convex integration details

```ts
// app/_layout.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
```

```ts
// .env
EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Import API:
```ts
import { api } from "../../convex/_generated/api";
// useQuery(api.titles.list)
// useMutation(api.titles.create)
// etc.
```

The `convex/_generated/` folder is **not** shared in this zip — run `npx convex dev` once in the `convex/` directory to generate it before starting the app.

---

## File structure to create

```
app/
  _layout.tsx
  (user)/
    _layout.tsx
    index.tsx
    downloads.tsx
  (admin)/
    _layout.tsx
    index.tsx
components/
  TitleCard.tsx
  DownloadButton.tsx
  SeriesGroup.tsx
  PartRow.tsx
  StorageWidget.tsx
  sheets/
    AddSeriesSheet.tsx
    AddPartSheet.tsx
    EditSeriesSheet.tsx
    ConfirmDeleteSheet.tsx
store/
  downloads.ts          — Zustand store for completed downloads
constants/
  colors.ts             — all --cream* tokens as a typed object
  fonts.ts              — font family name constants
hooks/
  useSecretAdminTap.ts  — 20-tap counter logic
```

---

## Key implementation notes

1. **No browser storage** — use Zustand with AsyncStorage for the downloads store.
2. **Fonts** — wrap everything in `<useFonts>` from `expo-font`; show a `SplashScreen` until loaded.
3. **Shimmer bar** — animate with `Animated.loop(Animated.timing(...))` on a gradient view (`expo-linear-gradient`).
4. **Noise overlay** — use a semi-transparent SVG/PNG noise texture via `expo-image` or skip if unavailable on device.
5. **Video hero strip** on Home — use `expo-video` or `expo-av` with the CloudFront URL from the prototype: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4` (autoplay, loop, muted).
6. **Drive file ID parsing** — extract with `/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/`.
7. **Admin filter pills** — "ZIP" means the title has at least one `zip` format part; "MP4" means at least one `video` format part. Filter on the client after fetching all titles + their parts.

---

## Dependencies to install

```bash
npx expo install convex expo-font @expo-google-fonts/almarai expo-router \
  expo-file-system expo-linear-gradient expo-video \
  @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated \
  zustand @react-native-async-storage/async-storage
```

---

## GitHub Actions — APK build workflow

Create `.github/workflows/build-apk.yml`. This workflow builds a **debug APK** (no EAS account or keystore needed) using a local Gradle build inside the GitHub Actions runner. It triggers on every push to `main` and also has a manual `workflow_dispatch` trigger so the user can kick it off any time from the GitHub UI.

### How it works

Because this is an Expo managed-workflow app we cannot run `expo build` (deprecated) and we don't want to require an EAS account. Instead the workflow:

1. Checks out the repo
2. Sets up Node + installs JS deps
3. Writes the `.env` file from GitHub Secrets so `EXPO_PUBLIC_CONVEX_URL` is baked in at build time
4. Runs `npx expo prebuild --platform android --clean` to generate the native `android/` folder
5. Builds the debug APK with `./gradlew assembleDebug` inside `android/`
6. Uploads the APK as a workflow artifact so the user can download it from the Actions tab

### File to create: `.github/workflows/build-apk.yml`

```yaml
name: Build Android APK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build debug APK
    runs-on: ubuntu-latest

    steps:
      # ── 1. Checkout ────────────────────────────────────────────────────────
      - name: Checkout repository
        uses: actions/checkout@v4

      # ── 2. Node setup ──────────────────────────────────────────────────────
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      # ── 3. Java (Gradle needs JDK 17) ──────────────────────────────────────
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      # ── 4. Install JS dependencies ─────────────────────────────────────────
      - name: Install dependencies
        run: npm ci

      # ── 5. Write .env so Convex URL is available during prebuild ───────────
      - name: Create .env
        run: |
          echo "EXPO_PUBLIC_CONVEX_URL=${{ secrets.EXPO_PUBLIC_CONVEX_URL }}" >> .env

      # ── 6. Expo prebuild → generates android/ ──────────────────────────────
      - name: Expo prebuild (Android)
        run: npx expo prebuild --platform android --clean --no-install
        env:
          EXPO_PUBLIC_CONVEX_URL: ${{ secrets.EXPO_PUBLIC_CONVEX_URL }}

      # ── 7. Cache Gradle dependencies ───────────────────────────────────────
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ hashFiles('android/**/*.gradle*', 'android/gradle/wrapper/gradle-wrapper.properties') }}
          restore-keys: gradle-

      # ── 8. Make gradlew executable ─────────────────────────────────────────
      - name: Make gradlew executable
        run: chmod +x android/gradlew

      # ── 9. Build debug APK ─────────────────────────────────────────────────
      - name: Build debug APK
        working-directory: android
        run: ./gradlew assembleDebug --no-daemon
        env:
          EXPO_PUBLIC_CONVEX_URL: ${{ secrets.EXPO_PUBLIC_CONVEX_URL }}

      # ── 10. Upload APK artifact ────────────────────────────────────────────
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: zipsender-debug-${{ github.run_number }}
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 14
```

### GitHub Secret to add

Go to **GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|---|---|
| `EXPO_PUBLIC_CONVEX_URL` | `https://<your-deployment>.convex.cloud` |

### How to download the APK

1. Push to `main` (or click **Run workflow** on the Actions tab)
2. Wait ~5–8 minutes for the build to finish
3. Click the completed workflow run → scroll to **Artifacts** → download `zipsender-debug-<run_number>.zip`
4. Unzip it — you get `app-debug.apk`
5. Enable **Install unknown apps** on your Android device and sideload it

### Also add to `app.json` / `app.config.ts`

Make sure these Android fields are present so prebuild generates a valid `android/` folder:

```json
{
  "expo": {
    "name": "ZipSender",
    "slug": "zipsender",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "android": {
      "package": "com.zipsender.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#101010"
      }
    },
    "plugins": [
      "expo-router",
      "expo-font"
    ]
  }
}
```
