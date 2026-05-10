# ZipSender — Complete Design Reference

> **Every value in this file is extracted directly from the prototype source code. Zero guessing.**
> Use as the single source of truth when building any screen or component.
>
> **Revision note (v3):** Cross-verified against `app.html` line-by-line. Corrections applied: `.card-sub` letter-spacing fixed (0.02em → 0.01em); Section 6.5 added (ghost button, separator, legacy done-row, card-level progress bar, dl-item thumbnail, card image strip); view-toggle pill fully documented; multi-part card stack structure clarified; dl-item badge row/info structure expanded. **v3 corrections:** `.page-sub` and `.admin-sub` letter-spacing documented (0.02em); `done-pill` entrance animation added (fadeUp 0.3s cubic-bezier); `done-row-new` animation documented; `field-select` appearance:none noted; card badge-row gap corrected (8px, not inside card-img when image strip present); hero overlay terminal color corrected (#000, not a variable); `dl-item` margin-bottom corrected to 8px in spacing table; `extracting-wrap` right-side icon clarified; `storage-bar-used` border-radius corrected (999px 0 0 999px).

---

## 1. App Overview

**ZipSender** is a mobile-first file-sharing app. Two roles:

- **User:** Browses a catalog of videos/zip files, downloads them, views download history.
- **Admin:** Manages the catalog — adds/edits/deletes titles and their file parts.

Target shell: `390 × 844px` (iPhone-sized). Screens fill 100% of the shell.

**Secret admin unlock:** Tapping the storage widget 20 times within 4 seconds reveals the User/Admin toggle pill. This is the only way to access the admin view in the prototype.

**View toggle pill (`.view-toggle`):**
```css
position: absolute; top: 11px; left: 16px; z-index: 200;
display: none; /* revealed: display: flex */
background: rgba(0,0,0,0.72);
backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
border: 1px solid var(--cream20);
border-radius: 999px;
padding: 3px; gap: 2px;
/* .revealed: animation: fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both */
```
Each button inside: `padding: 4px 14px; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: --cream50; background: transparent; border: none; font-family: Almarai; transition: all 0.2s; white-space: nowrap`
Active button: `background: var(--cream); color: var(--black)`

---

## 2. Design Tokens

### 2.1 CSS Custom Properties (exact source values)

```css
:root {
  --cream:   #e1e0cc;
  --cream80: rgba(225, 224, 204, 0.8);
  --cream50: rgba(225, 224, 204, 0.5);
  --cream30: rgba(225, 224, 204, 0.3);
  --cream20: rgba(225, 224, 204, 0.2);
  --cream10: rgba(225, 224, 204, 0.08);
  --cream05: rgba(225, 224, 204, 0.04);
  --black:   #000000;
  --surface: #101010;
  --card:    #181818;
  --card2:   #1e1e1e;
  --success: var(--cream);   /* alias */
  --error:   var(--cream50); /* alias */
}
```

**Key rules:**
- No red. No blue. Only cream on dark.
- Destructive actions use `--cream20` bg + `--cream30` border — never a danger color.
- Icons are `--cream` (primary) or `--cream50` (secondary/muted).

### 2.2 Typography

**Fonts loaded via Google Fonts:**
```html
<link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet" />
```

| Role | Family | Weight | Size | Letter-spacing | Notes |
|---|---|---|---|---|---|
| Global UI | Almarai | — | — | — | All UI text |
| `.serif` accent | Instrument Serif | 400 italic | — | — | Accent words only: *"videos"*, *"Panel"* |
| `.hero-title` | Almarai | 800 | 26px | -0.05em | line-height: 1 |
| `.page-title`, `.admin-title` | Almarai | 800 | 22px | -0.05em | — |
| `.sheet-title` | Almarai | 800 | 15px | -0.03em | — |
| `.empty-title` | Almarai | 800 | 15px | -0.03em | — |
| Confirm sheet title (inline) | Almarai | 800 | 16px | -0.03em | — |
| `.card-title` | Almarai | 800 | 14px | -0.03em | — |
| `.series-title` | Almarai | 800 | 13px | -0.03em | overflow: ellipsis |
| `.dl-item-title` | Almarai | 700 | 13px | -0.02em | overflow: ellipsis |
| `.btn-dl` | Almarai | 800 | 12px | -0.01em | — |
| `.done-pill-label` | Almarai | 800 | 12px | -0.02em | line-height: 1.2 |
| `.done-label` | Almarai | 700 | 12px | — | — |
| `.field-input` | Almarai | 400 | 12px | — | — |
| `.btn-primary`, `.btn-cancel`, `.btn-confirm-destruct` | Almarai | 700 | 13px | — | — |
| `.type-btn` | Almarai | 700 | 12px | — | — |
| `.card-sub` | Almarai | 300 | 11px | 0.01em | color: --cream50 |
| `.page-sub` | Almarai | 300 | 11px | 0.02em | color: --cream50 |
| `.admin-sub` | Almarai | 300 | 11px | 0.02em | color: --cream50 |
| `.sheet-sub` | Almarai | — | 11px | — | color: --cream50 |
| `.dl-progress-pill-label` | Almarai | 700 | 11px | — | — |
| `.dl-progress-pill-pct` | Almarai | 800 | 11px | -0.02em | color: --cream |
| `.empty-sub` | Almarai | 300 | 12px | — | line-height: 1.6 |
| Confirm sheet body | Almarai | 300 | 12px | — | color: --cream50, line-height: 1.6 |
| `.series-sub` | Almarai | 300 | 10px | — | color: --cream50, margin-top: 1px |
| `.dl-item-sub` | Almarai | 300 | 10px | — | color: --cream50 |
| `.storage-legend-text` | Almarai | 300 | 10px | 0.01em | — |
| `.storage-legend-value` | Almarai | 700 | 10px | — | color: --cream80, margin-left: 1px |
| `.part-meta` | Almarai | 300 | 10px | — | color: --cream50, margin-top: 1px |
| `.parsed-size` | Almarai | — | 10px | — | color: --cream50 |
| `.done-path` | Almarai | — | 10px | — | color: --cream50 |
| `.part-name` | Almarai | 700 | 11px | -0.01em | overflow: ellipsis |
| `.parsed-name` | Almarai | 700 | 11px | — | flex: 1, ellipsis |
| `.add-part-label` | Almarai | 700 | 11px | 0.01em | color: --cream |
| `.url-fmt-btn` | Almarai | 700 | 10px | — | — |
| `.done-pill-view` | Almarai | 800 | 10px | 0.02em | — |
| `.done-pill-file` | Almarai | 300 | 9px | 0.02em | color: --cream30, ellipsis |
| `.dl-progress-pill-filename` | Almarai | 300 | 9px | 0.03em | color: --cream30, ellipsis |
| `.field-label` | Almarai | 700 | 9px | 0.1em | UPPERCASE, color: --cream50 |
| `.storage-label` | Almarai | 700 | 9px | 0.14em | UPPERCASE, color: --cream50 |
| `.storage-total` | Almarai | 700 | 11px | -0.01em | color: --cream |
| `.badge` | Almarai | 700 | 8px | 0.1em | UPPERCASE |
| `.hero-label` | Almarai | 700 | 8px | 0.18em | UPPERCASE, color: --cream50, margin-bottom: 3px |
| `.nav-label` | Almarai | 700 | 8px | 0.08em | UPPERCASE, margin-top: 3px |
| `.filter-pill` | Almarai | 700 | 9px | 0.1em | UPPERCASE |

### 2.3 Border Radius (exact values)

| Element | Radius |
|---|---|
| App shell | 44px |
| Cards (`.card`) | 22px |
| Bottom nav (`.bottom-nav`) | 22px |
| Series groups (`.series-group`) | 20px |
| Storage widget (`.storage-widget`) | 20px |
| Bottom sheet panel (`.sheet`) | 24px 24px 0 0 |
| Input fields (`.field-input`, `.field-select`) | 11px |
| Sheet action buttons | 11px |
| URL rows (`.url-row`) | 11px |
| Download list items (`.dl-item`) | 18px |
| Series type icon box | 12px |
| Icon action buttons (`.icon-btn`) | 9px |
| Part icon boxes (`.part-icon`) | 7px |
| Part action buttons (`.part-btn`) | 7px |
| URL format buttons (`.url-fmt-btn`) | 7px |
| Type toggle buttons (`.type-btn`) | 10px |
| Confirm/delete icon box (inline) | 14px |
| Empty state icon box (`.empty-icon`) | 18px |
| All pill buttons (`.btn-dl`, filter pills, done-pill-view, nav) | 999px |
| Progress pills (`.dl-progress-pill`, `.extracting-wrap`, `.done-pill`) | 999px |
| Download list open/delete buttons (`.dl-item-open`) | 10px |
| Done pill check circle, cancel button, FAB | 50% (circle) |
| Badges | 999px |
| Storage bar | 999px |
| Progress track | 999px |
| Sheet drag handle | 2px |
| Nav dot | 50% |

### 2.4 Spacing

| Element | Padding / Margin |
|---|---|
| Scroll area | `14px 16px 20px` |
| Card body | `13px 15px 15px` |
| Series header row | `12px 13px` |
| Part row | `9px 13px 9px 16px` |
| Add-part row | `9px 13px 10px 16px` |
| Input field | `10px 12px` |
| Sheet | `0 16px 28px` |
| Confirm sheets | `padding-bottom: 32px` |
| Bottom nav | padding `9px 8px 10px`, margin `0 14px 18px` |
| Admin header | `10px 16px 14px` |
| Page header | `10px 18px 14px` |
| Storage widget | padding `14px 16px 13px`, margin `0 16px 14px` |
| Filter pill | `5px 14px` |
| Series group margin-bottom | `10px` |
| Card margin-bottom | `10px` |
| Download list item | `12px 13px` (padding); margin-bottom `8px` |
| FAB | `bottom: 10px; right: 16px` |
| Status bar | `14px 20px 0` (right-aligned) |
| Status bar height | `42px` |
| Hero strip height | `168px` |

---

## 3. Global Atmosphere

### 3.1 Background

```css
body { background: #101010; }
body::before {
  content: ""; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 40% at 50% 0%,   rgba(225,224,204,0.05) 0%, transparent 65%),
    radial-gradient(ellipse 40% 30% at 80% 100%, rgba(225,224,204,0.02) 0%, transparent 60%);
}
```

The shell has the same gradient stack on top of `#101010`.

### 3.2 Film Grain / Noise

A `<div class="noise">` — `position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.7; mix-blend-mode: overlay`. SVG fractal noise: `baseFrequency: 0.9`, `numOctaves: 4`, `stitchTiles: stitch`.

Hero strip also has grain via `::after`: `opacity: 0.18; mix-blend-mode: overlay`.

### 3.3 Shell Box Shadow

```css
box-shadow:
  0 60px 120px rgba(0,0,0,0.95),
  0 20px 40px rgba(0,0,0,0.7),
  0 0 0 1px rgba(255,255,255,0.07),
  inset 0 1px 0 rgba(255,255,255,0.04);
```

### 3.4 Scrollbar

```css
::-webkit-scrollbar { display: none; }
```
All scrollable containers: `overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; min-height: 0`.

---

## 4. Screen Layouts

Every screen: `display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 0`. Only `.screen.active { display: flex }` is visible.

### 4.1 User — Home

```
[Status bar — 42px, right icons only]
[Hero strip — 168px]
[.scroll — flex: 1, overflow-y: auto]
  → Content cards (fadeUp staggered)
[.bottom-nav]
```

**Hero strip:**
- `<video autoplay loop muted playsinline>` or `<img>`, `object-fit: cover`
- Gradient overlay: `linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, #000 100%)` — terminal value is literal `#000`, not a CSS variable
- Text: `position: absolute; bottom: 16px; left: 18px; right: 18px`
  - Label: "ZIPSENDER" — 8px, 700, 0.18em, uppercase, `--cream50`, margin-bottom 3px
  - Title: "Your " (Almarai 800) + "videos" (Instrument Serif italic) — 26px, 800, -0.05em, line-height 1

**Content cards (`.card`):**
- `--card2` bg, `1px solid --cream10` border (hover: `--cream20`), radius 22px, margin-bottom 10px, overflow hidden
- Optional image strip: see Section 6.5 `.card-img` — 88px tall, fade gradient to `#212121`, badges overlaid inside
- Card body padding: `13px 15px 15px`
- Badge row: `display: flex; align-items: center; gap: 8px; margin-bottom: 4px` — lives inside `.card-body` when no image strip is present; lives inside `.card-img-badges` (bottom: 10px; left: 14px; gap: 6px) when a `.card-img` strip is present
- Title: 14px, 800, -0.03em, margin-bottom 2px, color `--cream`
- Sub: 11px, 300, `--cream50`, **letter-spacing 0.01em**, margin-bottom 12px
- Download action(s) below sub

### 4.2 User — Downloads

```
[Status bar — 42px]
[.page-header — padding: 10px 18px 14px]
[.storage-widget]
[empty state OR .scroll list]
[.bottom-nav]
```

**Empty state (`.empty-state`):**
- `flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 24px; text-align: center`
- Icon box (`.empty-icon`): 58×58px, radius 18px, `--cream10` bg, `--cream20` border, margin-bottom 4px
  - Icon: `solar:download-linear`, `--cream50`, width 26
- Title "Nothing here yet": 15px, 800, -0.03em
- Sub: 12px, 300, `--cream50`, line-height 1.6

**Download list item (`.dl-item`):**
- `--card2` bg, `1px solid --cream10` border (hover `--cream20`), radius 18px, padding `12px 13px`, margin-bottom **8px**, gap 12px, `transition: border-color 0.18s`
- Optional thumb: 48×48px, radius 10px, `object-fit: cover`, flex-shrink 0
- Info block (`.dl-item-info`): `flex: 1; min-width: 0`
  - Badge row (`.dl-item-badge`): `display: flex; gap: 5px; margin-bottom: 4px`
  - Title (`.dl-item-title`): 13px, 700, -0.02em, ellipsis, margin-bottom 2px
  - Sub (`.dl-item-sub`): 10px, 300, `--cream50`
- Sub format: "Downloads/ZipSender · X GB"
- Right: two `.dl-item-open` buttons side by side (`gap: 6px; flex-shrink: 0`)
  - 34×34px, radius 10px, `--cream10` bg, `--cream20` border, hover bg `--cream20`, `transition: background 0.15s`
  - Open: `solar:folder-open-linear`, `--cream`, w15
  - Delete: `solar:trash-bin-trash-linear`, `--cream50`, w15
- Delete animates out: `opacity: 0; transform: translateX(12px); transition: opacity 0.2s, transform 0.2s`, removed after 200ms

### 4.3 Bottom Navigation (`.bottom-nav`)

```css
background: rgba(10, 10, 10, 0.92);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid var(--cream10);
border-radius: 22px;
margin: 0 14px 18px;
display: flex; padding: 9px 8px 10px;
flex-shrink: 0;
box-shadow: 0 -1px 0 rgba(255,255,255,0.03);
```

Each nav button (`.nav-btn`):
- `flex: 1; flex-direction: column; align-items: center; padding: 3px 0; background: none; border: none; font-family: Almarai; transition: opacity 0.15s`
- Icon width: 21
- Label (`.nav-label`): 8px, 700, 0.08em, uppercase, margin-top 3px
- Active indicator (`.nav-dot`): 3×3px, `border-radius: 50%`, `--cream` bg, `margin: 4px auto 0`

Active state: icon + label = `--cream`, dot shown. Inactive: `--cream50`, no dot.

Nav icons: Home → `solar:home-linear`, Downloads → `solar:download-linear`

### 4.4 Admin Screen

```
[Status bar — 42px]
[.admin-header — padding: 10px 16px 14px]
  title: "Admin " + <serif>Panel</serif>   → 22px, 800, -0.05em, --cream, margin-bottom 2px
  sub: "ZipSender · Manage your catalog"  → 11px, 300, --cream50, letter-spacing 0.02em, margin-bottom 14px
  [.filter-row]
[.scroll — id="admin-scroll", flex: 1, overflow-y: auto]
  → series groups
  → 70px spacer div
[.fab-wrap (height: 0, position: relative)]
  → .fab (position: absolute, bottom: 10px, right: 16px)
```

**Filter row (`.filter-row`):**
`display: flex; gap: 6px; margin-bottom: 14px; overflow-x: auto; padding-bottom: 2px; flex-shrink: 0`

Filter pills — exactly 3: **All / ZIP / MP4**

```css
.filter-pill {
  padding: 5px 14px; border-radius: 999px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  border: 1px solid var(--cream20); cursor: pointer; white-space: nowrap;
  flex-shrink: 0; font-family: Almarai; transition: all 0.18s;
  background: transparent; color: var(--cream50);
}
.filter-pill.active { background: var(--cream); color: var(--black); border-color: var(--cream); }
.filter-pill:hover:not(.active) { background: var(--cream10); color: var(--cream80); }
```

**FAB (`.fab`):**
```css
position: absolute; bottom: 10px; right: 16px;
width: 48px; height: 48px; border-radius: 50%;
background: var(--cream); border: none; cursor: pointer;
box-shadow: 0 4px 18px rgba(222,219,200,0.3);
transition: transform 0.15s, box-shadow 0.15s;
/* hover: scale(1.06), shadow 0 6px 24px rgba(222,219,200,0.4) */
/* active: scale(0.96) */
```
Icon: `solar:add-linear`, `--black`, width 22

---

## 5. Series Groups (Admin)

### Group Container
```css
margin-bottom: 10px;
background: var(--card2); border: 1px solid var(--cream10);
border-radius: 20px; overflow: hidden; transition: border-color 0.18s;
/* hover: border-color -> --cream20 */
```

### Header Row
`display: flex; align-items: center; gap: 11px; padding: 12px 13px`

**Type icon box:**
40×40px, radius 12px, `--cream10` bg, `--cream20` border
- Series: `solar:playlist-linear`, `--cream50`, w16
- Movie: `solar:videocamera-record-linear`, `--cream50`, w16

**Series info (`.series-info`):** `flex: 1; min-width: 0`
- Badges row: `display: flex; gap: 5px; margin-bottom: 4px`
- Title: 13px, 800, -0.03em, ellipsis, `--cream`
- Sub: 10px, 300, `--cream50`, margin-top 1px (e.g. "2 files · 7.6 GB total")

**Action buttons (`.series-actions`):** `display: flex; gap: 5px; flex-shrink: 0`

Each `.icon-btn`:
```css
width: 30px; height: 30px; border-radius: 9px;
background: var(--cream10); border: 1px solid var(--cream20);
cursor: pointer; display: flex; align-items: center; justify-content: center;
transition: background 0.15s, border-color 0.15s;
/* hover: bg --cream20, border --cream30 */
```
- Add: `solar:add-circle-linear`, `--cream`, w14
- Edit: `solar:pen-linear`, `--cream`, w13
- Delete: `solar:trash-bin-trash-linear`, `--cream50`, w13

### Part List
`border-top: 1px solid var(--cream10)`

**Part row:**
```css
display: flex; align-items: center; gap: 10px;
padding: 9px 13px 9px 16px; transition: background 0.15s;
/* hover: background: --cream05 */
/* + .part-row: border-top: 1px solid --cream10 */
```

**Part icon box:**
26×26px, radius 7px, `--cream10` bg, `--cream20` border
- ZIP: `solar:zip-file-linear`, `--cream50`, w13
- Video: `solar:video-frame-play-linear`, `--cream50`, w13

**Part info:** `flex: 1; min-width: 0`
- Name: 11px, 700, -0.01em, ellipsis
- Meta: 10px, `--cream50`, 300, margin-top 1px

**Part action buttons (`.part-btn`):**
```css
width: 26px; height: 26px; border-radius: 7px;
background: var(--cream10); border: 1px solid transparent;
cursor: pointer; display: flex; align-items: center; justify-content: center;
transition: background 0.15s, border-color 0.15s;
/* hover: bg --cream20, border --cream30 */
```
- Edit: `solar:pen-linear`, `--cream50`, w11
- Delete: `solar:trash-bin-trash-linear`, `--cream50`, w11

**Add-another row:**
```css
display: flex; align-items: center; gap: 8px;
padding: 9px 13px 10px 16px;
border-top: 1px solid var(--cream10);
cursor: pointer; opacity: 0.55;
transition: opacity 0.18s, background 0.18s;
/* hover: opacity: 1; background: --cream05 */
```
- Icon: `solar:add-linear` in a `.part-icon` box, `--cream50`, w12
- Label: "Add another file…" or "Add another part…" — 11px, 700, 0.01em, `--cream`

---

## 6. Badges

`font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 999px; padding: 3px 9px; font-family: Almarai`

| Class | Background | Text | Border |
|---|---|---|---|
| `.badge-zip` | `--cream10` | `--cream80` | `1px solid --cream20` |
| `.badge-mp4` | `--cream20` | `--cream` | `1px solid --cream30` |
| `.badge-movie` | `--cream10` | `--cream80` | `1px solid --cream20` |
| `.badge-series` | `transparent` | `--cream50` | `1px solid --cream20` |

Inside sheets (smaller): `font-size: 8px; padding: 2px 6px` (inline override).

---

## 6.5 Additional Components (from source)

### Ghost Button (`.btn-ghost`)
Secondary/alternative pill button, used where a lighter-weight action is needed.
```css
background: var(--cream10);
color: var(--cream80);
border-radius: 999px;
padding: 7px 14px;
font-family: Almarai; font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
border: 1px solid var(--cream20);
cursor: pointer;
transition: background 0.15s, border-color 0.15s;
/* hover: background: var(--cream20) */
```

### Separator (`.sep`)
Simple horizontal rule between content areas inside sheets or lists.
```css
border-top: 1px solid var(--cream10);
```

### Legacy Done Row (`.done-row`) — kept for reference
Older-style done state that may appear in content cards as a fallback.
```css
.done-row     { display: flex; align-items: center; gap: 10px; }
.done-icon    { width: 30px; height: 30px; border-radius: 50%;
                background: var(--cream10); border: 1px solid var(--cream20);
                display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.done-label   { font-size: 12px; font-weight: 700; color: var(--cream); }
.done-path    { font-size: 10px; color: var(--cream50); }
/* .done-row-new variant: animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; gap: 9px; padding: 0 */
```
> The modern replacement is `.done-pill` (Section 7 State 4). Use `.done-pill` for new screens.

### Progress Row (`.prog-row`) — card-level progress bar
Compact progress bar used inside card bodies (not the full-width pill).
```css
.prog-row    { display: flex; justify-content: space-between; margin-bottom: 7px; }
.prog-label  { font-size: 11px; color: var(--cream50); }
.prog-pct    { font-size: 11px; font-weight: 700; color: var(--cream); }
.prog-track  { background: var(--cream10); border-radius: 999px; height: 3px; overflow: hidden; }
.prog-fill   { background: var(--cream); height: 100%; border-radius: 999px; transition: width 0.3s; }
```

### Download List Item Thumbnail (`.dl-item-thumb`)
Optional image/thumbnail inside a `.dl-item` on the Downloads screen.
```css
width: 48px; height: 48px;
border-radius: 10px;
object-fit: cover;
flex-shrink: 0;
```

### Card Image Strip (`.card-img`)
Optional image area at the top of a `.card`, above `.card-body`. Not all cards use this.
```css
.card-img        { height: 88px; overflow: hidden; position: relative; }
.card-img img    { width: 100%; height: 100%; object-fit: cover; }
.card-img-fade   {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 20%, #212121 100%);
}
.card-img-badges {
  position: absolute; bottom: 10px; left: 14px;
  display: flex; gap: 6px;
}
```
When the image strip is present, badges live inside it (`card-img-badges`), not inside `card-body`.

---

## 7. Download State Machine

States: **idle → downloading → extracting (ZIP only) → done**. Cancel returns to idle.

### State 1: Idle — `.btn-dl`
```css
width: 100%; display: flex; align-items: center; justify-content: space-between;
background: var(--cream); color: var(--black);
border-radius: 999px; padding: 9px 9px 9px 20px;
font-family: Almarai; font-size: 12px; font-weight: 800; letter-spacing: -0.01em;
border: none; cursor: pointer;
transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
box-shadow: 0 2px 12px rgba(225,224,204,0.2);
/* hover: box-shadow: 0 4px 20px rgba(225,224,204,0.3) */
/* active: opacity: 0.85; transform: scale(0.98) */
```
Right circle (`.btn-dl-circle`): 30×30px, `border-radius: 50%`, `--black` bg
- Icon: `solar:download-minimalistic-linear`, `--cream`, w15

### State 2: Downloading — `.dl-progress-pill`
```css
width: 100%; display: flex; align-items: center; justify-content: space-between;
background: #1c1c1c; border: 1px solid #2e2e2e;
border-radius: 999px; padding: 9px 9px 9px 18px; gap: 10px;
animation: fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both;
```

Left (`.dl-progress-pill-left`): `flex: 1; min-width: 0; flex-direction: column; gap: 5px`
- Top row: label + percentage
  - Label: 11px, 700, `--cream80`. Includes spinning `solar:cloud-download-linear` icon (`--cream50`, w13, `animation: spin 2s linear infinite`)
  - Percentage: 11px, 800, `--cream`, -0.02em tracking
- Track (`.dl-progress-pill-track`): `width: 100%; height: 3px; background: #2e2e2e; border-radius: 999px; overflow: hidden`
  - Animated fill (`.prog-fill-animated`):
    ```css
    background: linear-gradient(90deg, var(--cream) 0%, rgba(255,255,255,0.95) 40%, var(--cream) 100%);
    background-size: 200px 100%;
    animation: progressShimmer 1.2s linear infinite;
    height: 100%; border-radius: 999px; transition: width 0.12s ease-out;
    ```
- Filename: 9px, 300, `--cream30`, 0.03em, ellipsis

Right — Cancel (`.btn-dl-cancel`):
```css
width: 34px; height: 34px; border-radius: 50%;
background: #2a2a2a; border: 1px solid #3a3a3a; cursor: pointer;
transition: background 0.18s, border-color 0.18s, transform 0.12s;
/* hover: bg rgba(225,224,204,0.12); border rgba(225,224,204,0.3) */
/* active: scale(0.92) */
```
Icon: `solar:close-circle-linear`, `--cream50`, w16

Progress speed: `p += Math.random() * 9 + 3` every 120ms. Transition to extracting 300ms after 100%.

### State 3: Extracting — `.extracting-wrap`
```css
display: flex; align-items: center; gap: 10px;
padding: 10px 14px 10px 18px;
background: #1c1c1c; border: 1px solid #2e2e2e; border-radius: 999px;
animation: fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both;
```
- Left icon: `solar:archive-linear`, `--cream50`, w15, `animation: spin 1.5s linear infinite`
- "Extracting…": 12px, 700, `--cream80`, `flex: 1`
- Dots (`.extracting-dots span`): 3×(4×4px, `border-radius: 50%`, `--cream50`), `animation: dlPulse 1s ease-in-out infinite`, delays: 0s / 0.2s / 0.4s
- Right circle: 34×34px, radius 50%, `#2a2a2a` bg, `1px solid #3a3a3a`, contains `solar:archive-linear` `--cream50` w15 (static, not spinning — only the left icon spins)

ZIP only. Skipped for video/mp4. Duration: 1500ms then → done.

### State 4: Done — `.done-pill`
```css
width: 100%; display: flex; align-items: center; gap: 10px;
background: var(--cream10); border: 1px solid var(--cream20);
border-radius: 999px; padding: 9px 9px 9px 12px;
animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
```
- Check circle (`.done-pill-check`): 34×34px, radius 50%, `--cream20` bg, `--cream30` border
  - Icon: `solar:check-circle-bold`, `--cream`, w16
- Body (`.done-pill-body`): `flex: 1; min-width: 0; flex-direction: column; gap: 1px`
  - "Downloaded": 12px, 800, `--cream`, -0.02em, line-height 1.2
  - Filename: 9px, 300, `--cream30`, 0.02em, ellipsis
- View button (`.done-pill-view`):
  ```css
  background: var(--cream); color: var(--black); border: none;
  border-radius: 999px; padding: 6px 13px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.02em;
  cursor: pointer; display: flex; align-items: center; gap: 4px;
  flex-shrink: 0; transition: opacity 0.15s;
  /* hover: opacity: 0.85 */
  ```
  Icon: `solar:arrow-right-linear`, `transform: rotate(-45deg)`, w9

Clicking "View" navigates user to Downloads tab by clicking the nav button.

---

## 8. Bottom Sheets (Slide-Up Drawers)

### Backdrop (`.sheet-backdrop`)
```css
display: none; position: absolute; inset: 0; z-index: 300;
background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
/* .open: display: flex; align-items: flex-end; */
```
Clicking backdrop closes sheet. Clicking sheet panel stops propagation.

### Panel (`.sheet`)
```css
width: 100%; background: #1a1a1a;
border-radius: 24px 24px 0 0; border-top: 1px solid var(--cream20);
padding: 0 16px 28px; max-height: 90%; overflow-y: auto;
transform: translateY(100%);
transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
/* .open: transform: translateY(0) — triggered via double rAF */
```

### Drag handle: `width: 36px; height: 4px; border-radius: 2px; background: var(--cream20); margin: 10px auto 14px`

### Sheet title: `font-size: 15px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 14px`

### Sheet sub-label: `font-size: 11px; color: var(--cream50); margin-top: -10px; margin-bottom: 14px`

### Field label: `display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cream50); margin-bottom: 5px`

### Text input:
```css
width: 100%; background: var(--cream10); border: 1px solid var(--cream20);
border-radius: 11px; padding: 10px 12px;
font-family: Almarai; font-size: 12px; color: var(--cream); outline: none;
transition: border-color 0.15s;
/* placeholder: --cream50; focus border: --cream50 */
```

### Select / Dropdown (`.field-select`):
Same visual as `.field-input` but with `appearance: none; cursor: pointer` — no native OS arrow; custom styling assumed in real build.

### Button row: `display: flex; gap: 8px; margin-top: 14px`

**Primary:** `flex: 1; background: var(--cream); color: var(--black); border: none; border-radius: 11px; padding: 11px; font-family: Almarai; font-size: 13px; font-weight: 700; cursor: pointer`

**Cancel:** `background: var(--cream10); color: var(--cream80); border: none; border-radius: 11px; padding: 11px 18px; font-family: Almarai; font-size: 13px; font-weight: 700; cursor: pointer`

**Destructive confirm:**
```css
flex: 1; background: var(--cream20); color: var(--cream);
border: 1px solid var(--cream30); border-radius: 11px; padding: 11px;
font-family: Almarai; font-size: 13px; font-weight: 700; cursor: pointer;
transition: background 0.15s, border-color 0.15s;
/* hover: bg --cream30; border --cream50 */
```

### Type toggle buttons (`.type-btn`):
```css
display: flex; align-items: center; justify-content: center; flex: 1;
padding: 8px 14px; border-radius: 10px;
font-size: 12px; font-weight: 700; font-family: Almarai;
border: 1px solid var(--cream20);
background: var(--cream10); color: var(--cream50);
cursor: pointer; transition: all 0.15s;
/* .active: background: --cream; color: --black; border-color: --cream */
```
Row wrapper (`.type-btn-row`): `display: flex; gap: 7px`
Icons inside: inline `<iconify-icon style="margin-right: 5px">` before label text.

### URL rows (`.url-row`):
```css
background: var(--cream05); border: 1px solid var(--cream10);
border-radius: 11px; padding: 10px; margin-bottom: 8px;
/* dynamic rows animate in: animation: fadeUp 0.3s ease both */
```

Header row: `display: flex; align-items: center; gap: 7px; margin-bottom: 8px`

Format buttons (`.url-fmt-btn`):
```css
display: flex; align-items: center; gap: 4px;
padding: 4px 10px; border-radius: 7px;
font-size: 10px; font-weight: 700; font-family: Almarai;
border: 1px solid var(--cream20); background: var(--cream10); color: var(--cream50);
cursor: pointer; transition: all 0.15s;
/* .active: bg --cream; color --black; border --cream */
```

Remove button (`.url-row-remove`): `margin-left: auto; background: none; border: none; cursor: pointer; opacity: 0.5; padding: 2px`. Hover: `opacity: 1`. Icon: `solar:close-circle-linear`, `--cream50`, w15.

Add URL button (`.add-url-btn`):
```css
display: flex; align-items: center; justify-content: center;
width: 100%; padding: 9px; border-radius: 10px;
border: 1px dashed var(--cream20); background: transparent;
color: var(--cream50); font-size: 11px; font-weight: 700; font-family: Almarai;
cursor: pointer; transition: all 0.15s; margin-top: 2px;
/* hover: border --cream50; color --cream */
```
Icon: `solar:add-linear`, w12, `style="margin-right: 4px"`

Parsed preview (`.parsed-preview`):
```css
display: none; /* .show: display: flex */
align-items: center; gap: 8px;
background: var(--cream05); border: 1px solid var(--cream10);
border-radius: 10px; padding: 10px 12px; margin-top: 6px;
```
Contains: file icon (`--cream50`, w14) + filename span + size span.

### The 6 Sheets

| Sheet ID | Title | Primary CTA |
|---|---|---|
| `sheet-add-series` | "Publish new title" | "Publish" |
| `sheet-add-part` | "Add file" (sub: "to [series]") | "Add file" |
| `sheet-edit-series` | "Edit series" | "Save" |
| `sheet-confirm-delete` | "Delete this title?" | "Delete" (destructive) |
| `sheet-confirm-part` | "Remove this file?" | "Remove" (destructive) |
| `sheet-confirm-dl-delete` | "Delete from device?" | "Delete" (destructive) |

**Add Series contents:** Title input → Movie/Series type toggle → URL list (dynamic) → "Add file URL" dashed button

**Add Part contents:** Format toggle (ZIP/Video) → Google Drive URL input (placeholder: "https://drive.google.com/file/d/…") → parsed preview

**Confirm sheet anatomy:** 44×44 icon box (radius 14px, `--cream10` bg, `--cream20` border, margin-bottom 14px, icon `--cream50` w20) → title 16px 800 -0.03em `--cream` mb 6px → body 12px 300 `--cream50` line-height 1.6 mb 20px → Cancel + action button row.

Icons per confirm sheet:
- Delete series: `solar:trash-bin-trash-linear`
- Remove part: `solar:file-remove-linear`
- Delete downloaded: `solar:trash-bin-minimalistic-linear`

---

## 9. Storage Widget (`.storage-widget`)

```css
margin: 0 16px 14px;
background: var(--card2); border: 1px solid var(--cream10);
border-radius: 20px; padding: 14px 16px 13px;
flex-shrink: 0; position: relative; overflow: hidden;
/* ::before (glow, pointer-events: none): */
/* background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(225,224,204,0.04) 0%, transparent 65%) */
```

Top row: `display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px`
- Label: `solar:server-square-linear` icon (`--cream50`, w13) + "STORAGE" (9px, 700, 0.14em, uppercase, `--cream50`)
- Total: 11px, 700, -0.01em, `--cream`

Bar (`.storage-bar`): `height: 6px; border-radius: 999px; background: --cream10; overflow: hidden; display: flex; margin-bottom: 10px`
- Fill: `background: --cream; height: 100%; border-radius: 999px 0 0 999px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1)` — note: only left corners are rounded; right end is flush (0 0) to meet the empty track
- Fill `::after` (divider): `position: absolute; right: 0; top: 0; bottom: 0; width: 1px; background: rgba(0,0,0,0.3)`
- Animates in: rAF + 120ms setTimeout

Legend: `display: flex; gap: 14px`
- Item: `display: flex; align-items: center; gap: 5px`
- Dot: 6×6px circle
  - Used: `background: --cream`
  - Free: `background: --cream20; border: 1px solid --cream30`
- Text: 10px, 300, `--cream50`, 0.01em
- Value: 10px, 700, `--cream80`, margin-left 1px

Data: `navigator.storage.estimate()`. Fallback: 64 GB total, 38.4 GB used.

Secret: 20 taps within 4-second window → reveals view toggle, widget border flashes to `--cream30` for 400ms.

---

## 10. All Animations

### `fadeUp`
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Timings used: `0.3s ease` (cards, new items), `0.2s cubic-bezier(0.16,1,0.3,1)` (download states), `0.3s cubic-bezier(0.16,1,0.3,1)` (done pill), `0.22s cubic-bezier(0.16,1,0.3,1)` (cancel-back button), `0.25s cubic-bezier(0.16,1,0.3,1)` (view toggle reveal)

Stagger delays: `.fu`=0s, `.fu1`=0.05s, `.fu2`=0.1s, `.fu3`=0.15s, `.fu4`=0.2s

### `spin`
```css
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }
/* Inline variants: 2s (download icon), 1.5s (extract icon) */
```

### `progressShimmer`
```css
@keyframes progressShimmer {
  0%   { background-position: -200px 0; }
  100% { background-position:  200px 0; }
}
/* Used as: animation: progressShimmer 1.2s linear infinite */
/* background-size: 200px 100% */
/* Gradient: linear-gradient(90deg, --cream 0%, rgba(255,255,255,0.95) 40%, --cream 100%) */
```

### `dlPulse`
```css
@keyframes dlPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
/* Dots: animation: dlPulse 1s ease-in-out infinite; delays: 0s, 0.2s, 0.4s */
```

### `dlArrow` (defined, decorative)
```css
@keyframes dlArrow {
  0%   { transform: translateY(-4px); opacity: 0; }
  60%  { transform: translateY(2px);  opacity: 1; }
  100% { transform: translateY(4px);  opacity: 0; }
}
```

### `dlCompleteScale` (defined, decorative)
```css
@keyframes dlCompleteScale {
  0%   { transform: scale(0.8); opacity: 0; }
  60%  { transform: scale(1.1); }
  100% { transform: scale(1);   opacity: 1; }
}
```

### `dlFillGlow` (defined, decorative)
```css
@keyframes dlFillGlow {
  0%   { box-shadow: none; }
  100% { box-shadow: 0 0 8px rgba(225,224,204,0.6); }
}
```

### Sheet slide-up: `transform: translateY(100%) → translateY(0)` via `transition: 0.28s cubic-bezier(0.4,0,0.2,1)`. Triggered via double `requestAnimationFrame`.

### Delete/dismiss (JS inline):
- Series: `opacity: 0; transform: scale(0.97)` → removed after 200ms
- Part row: same
- Download list item: `opacity: 0; transform: translateX(12px)` → removed after 200ms

---

## 11. Interaction States

| Element | Hover | Active |
|---|---|---|
| `.btn-dl` | shadow `0 4px 20px rgba(225,224,204,0.3)` | `scale(0.98)`, `opacity: 0.85` |
| `.btn-dl-cancel` | bg `rgba(225,224,204,0.12)`, border `rgba(225,224,204,0.3)` | `scale(0.92)` |
| `.fab` | `scale(1.06)`, shadow `0 6px 24px rgba(222,219,200,0.4)` | `scale(0.96)` |
| `.card` | border `--cream20` | — |
| `.series-group` | border `--cream20` | — |
| `.dl-item` | border `--cream20` | — |
| `.part-row` | bg `--cream05` | — |
| `.add-part-row` | `opacity: 1`, bg `--cream05` | — |
| `.icon-btn` | bg `--cream20`, border `--cream30` | — |
| `.part-btn` | bg `--cream20`, border `--cream30` | — |
| `.filter-pill` (inactive) | bg `--cream10`, text `--cream80` | — |
| `.type-btn` / `.url-fmt-btn` (inactive) | — | — |
| `.url-row-remove` | `opacity: 1` | — |
| `.add-url-btn` | border `--cream50`, text `--cream` | — |
| `.dl-item-open` | bg `--cream20` | — |
| `.done-pill-view` | `opacity: 0.85` | — |
| `.btn-confirm-destruct` | bg `--cream30`, border `--cream50` | — |
| `.field-input` | — | focus: border `--cream50` |
| Storage widget (20 taps) | — | border `--cream30` for 400ms |

Transition durations: `0.15s` (most), `0.18s` (series-group, part-row, add-part-row, icon-btn), `0.2s` (deletes).

---

## 12. Icon Reference

CDN: `https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js`

| Usage | Icon name | Size |
|---|---|---|
| Download button | `solar:download-minimalistic-linear` | 15 |
| Downloading spinner | `solar:cloud-download-linear` | 13 |
| Cancel download | `solar:close-circle-linear` | 16 |
| Extracting | `solar:archive-linear` | 15 |
| Check / done | `solar:check-circle-bold` | 16 |
| View arrow (rotated -45°) | `solar:arrow-right-linear` | 9 |
| ZIP file icon | `solar:zip-file-linear` | 13–14 |
| Video file icon | `solar:video-frame-play-linear` | 13 |
| Movie/camera (type icon) | `solar:videocamera-record-linear` | 16 |
| Series/playlist (type icon) | `solar:playlist-linear` | 16 |
| Edit pen (series) | `solar:pen-linear` | 13 |
| Edit pen (part) | `solar:pen-linear` | 11 |
| Delete (series) | `solar:trash-bin-trash-linear` | 13 |
| Delete (part) | `solar:trash-bin-trash-linear` | 11 |
| Delete (download list) | `solar:trash-bin-trash-linear` | 15 |
| Delete confirm (series) | `solar:trash-bin-trash-linear` | 20 |
| Delete confirm (downloaded) | `solar:trash-bin-minimalistic-linear` | 20 |
| Remove file confirm | `solar:file-remove-linear` | 20 |
| Add circle (series action) | `solar:add-circle-linear` | 14 |
| Add linear (FAB, rows) | `solar:add-linear` | 22/12 |
| Remove URL row | `solar:close-circle-linear` | 15 |
| Open folder | `solar:folder-open-linear` | 15 |
| Nav Home | `solar:home-linear` | 21 |
| Nav Downloads | `solar:download-linear` | 21 |
| Empty downloads | `solar:download-linear` | 26 |
| Storage | `solar:server-square-linear` | 13 |
| Status signal | `solar:signal-linear` | 13 |
| Status wifi | `solar:wifi-linear` | 13 |
| Status battery | `solar:battery-full-linear` | 17 |

---

## 13. Build Checklist

### User — Home
- [ ] Status bar (right icons only)
- [ ] Hero strip: 168px, video/img cover, gradient overlay, grain `::after`, bottom-left label+title with serif accent
- [ ] Content cards: `--card2`, 22px radius, badge row, title, sub, download area, `fadeUp` stagger
- [ ] Multi-part cards: stacked download buttons in a `flex-direction: column; gap: 7px` wrapper — each part gets its own `.btn-dl`
- [ ] Download button (`.btn-dl`): cream pill, black circle + icon right
- [ ] Progress pill: dark bg, shimmer track, cancel circle
- [ ] Extracting: spinning icon, "Extracting…" text, 3 pulsing dots, right icon box
- [ ] Done pill: check circle, label+filename, "View" button → navigates to downloads tab

### User — Downloads
- [ ] Page header: "Downloads" title + "Saved to your device" sub
- [ ] Storage widget: top row, animated bar, legend dots + text, 20-tap secret
- [ ] Empty state: icon box 58×58 r18, title, sub
- [ ] Download list items: badge + title + path/size + open/delete buttons
- [ ] Delete: confirm sheet → slide-out animation on item

### Bottom Nav
- [ ] Frosted glass pill (`rgba(10,10,10,0.92)`, blur 20px, radius 22px)
- [ ] Two tabs: Home + Downloads
- [ ] Active: `--cream` icon + label + `.nav-dot`. Inactive: `--cream50`, no dot

### Admin
- [ ] Status bar
- [ ] Admin header: "Admin" + italic "Panel", sub, filter pills (All/ZIP/MP4 — 3 only)
- [ ] Series groups with type icon, title/sub, 3 action buttons
- [ ] Part list with file rows, per-row edit/delete, add-another row
- [ ] FAB outside scroll, bottom-right

### Sheets (6)
- [ ] Backdrop blur + close on backdrop tap
- [ ] Slide-up via double rAF
- [ ] Drag handle
- [ ] Add Series: title → Movie/Series toggle (with icons) → URL rows → Add URL btn → Publish/Cancel
- [ ] Add Part: ZIP/Video format toggle → Google Drive URL → parsed preview → Add file/Cancel
- [ ] Edit Series: title input → Save/Cancel
- [ ] Delete Series confirm: icon box + title + body + Cancel/Delete
- [ ] Remove Part confirm: icon box + title + body + Cancel/Remove
- [ ] Delete Downloaded confirm: icon box + title + body + Cancel/Delete

---

## 14. Design Tone

> **Dark. Premium. Cinematic.**
>
> Cream on charcoal — warm, not cold. Nothing is pure white. Nothing is red.
> Weight 800 headings paired with weight 300 subtitles. Every new element enters from below. Every deletion fades and shrinks. Buttons push down physically. The background breathes with soft radial glows and film grain.
> The entire palette is one color in twelve opacities — yet it feels complete.

---

*Complete line-by-line read of ZipSender prototype HTML. All pixel values, colors, timings, and icon names are exact matches from the source. Revision: cross-checked and corrected against `app.html`.*
