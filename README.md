# ZipSender

A React Native + Expo + TypeScript mobile app for browsing and downloading media from Google Drive.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51 (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| Backend | Convex |
| Styling | StyleSheet (no NativeWind) |
| Icons | `@expo/vector-icons` — MaterialCommunityIcons |
| Fonts | Almarai via `@expo-google-fonts/almarai` |

## Project structure

```
ZipSender/
├── app/
│   ├── _layout.tsx              Root layout — ConvexProvider + fonts
│   ├── (user)/
│   │   ├── _layout.tsx          Bottom tabs: Home | Downloads
│   │   ├── index.tsx            Home — title catalog
│   │   └── downloads.tsx        Downloads — completed files + secret admin tap
│   └── (admin)/
│       ├── _layout.tsx          Stack header
│       └── index.tsx            Admin panel — manage titles and parts
├── components/
│   ├── TitleCard.tsx            Home screen card
│   ├── DownloadButton.tsx       idle → downloading → extracting → done
│   ├── SeriesGroup.tsx          Admin collapsible title card
│   ├── StorageWidget.tsx        Disk usage + 20-tap secret
│   ├── PartRow.tsx              Admin part row
│   └── sheets/
│       ├── AddSeriesSheet.tsx
│       ├── AddPartSheet.tsx
│       ├── EditSeriesSheet.tsx
│       └── ConfirmDeleteSheet.tsx
├── store/
│   └── downloads.ts             Zustand + AsyncStorage
├── constants/
│   ├── colors.ts                Design tokens
│   └── fonts.ts                 Font family name constants
├── hooks/
│   └── useSecretAdminTap.ts     20-tap / 4s window logic
└── convex/                      Backend (deploy separately)
    └── convex/
        ├── schema.ts
        ├── titles.ts
        └── parts.ts
```

## Setup

### 1. Deploy the Convex backend

```bash
cd convex
npm install
npx convex dev
```

Copy the deployment URL from the output.

### 2. Configure the app

Edit `.env`:

```
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Also update `convex/.env.local` with the same URL and your team slug.

### 3. Install and run

```bash
npm install
npx expo start
```

## Admin access

From the **Downloads** tab, tap the Storage widget **20 times within 4 seconds**. An "Admin Panel" button will appear.

## Building an APK

Push to `main` or trigger the **Build Android APK** workflow manually from GitHub Actions. The debug APK will be available as a downloadable artifact for 14 days.

**Required secret:** Add `EXPO_PUBLIC_CONVEX_URL` to your repo's GitHub secrets before running the workflow.
