/**
 * useSafDownloads — saves extracted video files to the public media store.
 *
 * WHY WE SWITCHED FROM SAF:
 *  Android 11+ blocks SAF write access on the root Download folder with
 *  "Can't use this folder, to protect your privacy". Even when the user
 *  picks a subfolder, the tree URI it returns is not directly writable via
 *  expo-file-system's createSAFFileAsync on many devices/OEMs.
 *
 * NEW STRATEGY — expo-media-library (MediaStore API):
 *  - No folder picker dialog needed at all.
 *  - createAssetAsync() saves a file from app-private storage into the
 *    device's public media store (visible in Gallery, Files app, etc).
 *  - Files are organised into album "ZipSender/<titleName>".
 *  - deleteAssetsAsync() removes them cleanly (system dialog on Android 11+).
 *  - We persist MediaLibrary asset IDs in AsyncStorage keyed by sanitized
 *    title name so we can delete them later.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

const TAG = '[MediaLib]';
const ASSET_IDS_KEY = 'zipsender_asset_ids_v1'; // { [sanitizedTitle]: string[] }

// ── Permission ────────────────────────────────────────────────────────────────

/** Request MediaLibrary permission. Returns true if granted. */
export async function requestMediaPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const { status } = await MediaLibrary.requestPermissionsAsync();
  console.log(`${TAG} requestPermissionsAsync → ${status}`);
  return status === 'granted';
}

/** Ensure permission is granted (request if not yet). */
export async function ensureMediaPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const { status } = await MediaLibrary.getPermissionsAsync();
  console.log(`${TAG} existing permission status → ${status}`);
  if (status === 'granted') return true;
  return requestMediaPermission();
}

// ── Asset ID store ────────────────────────────────────────────────────────────

async function loadAssetIds(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(ASSET_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAssetIds(map: Record<string, string[]>): Promise<void> {
  try {
    await AsyncStorage.setItem(ASSET_IDS_KEY, JSON.stringify(map));
  } catch {}
}

async function addAssetId(title: string, assetId: string): Promise<void> {
  const map = await loadAssetIds();
  map[title] = [...(map[title] ?? []), assetId];
  await saveAssetIds(map);
  console.log(`${TAG} stored assetId ${assetId} for title '${title}'`);
}

async function popAssetIds(title: string): Promise<string[]> {
  const map = await loadAssetIds();
  const ids = map[title] ?? [];
  delete map[title];
  await saveAssetIds(map);
  console.log(`${TAG} popped ${ids.length} assetId(s) for title '${title}'`);
  return ids;
}

// ── Legacy SAF stubs (kept so existing call-sites compile without changes) ────
// These are intentional no-ops — the real work is now done by MediaLibrary.
export async function clearSafUri(): Promise<void> {}
export async function getOrRequestSafUri(): Promise<string | null> { return null; }
export async function loadSafUri(): Promise<string | null> { return null; }

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Save a single video file from documentDirectory into the public media store.
 * Album: "ZipSender/<subDir>" (appears in Gallery > Albums and Files app).
 *
 * Returns the MediaLibrary asset URI (content://media/...) or null on failure.
 */
export async function copyToPublicDownloads(
  srcPath: string,
  filename: string,
  subDir: string,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  console.log(`${TAG} ═══ copyToPublicDownloads START ═══`);
  console.log(`${TAG} srcPath : ${srcPath}`);
  console.log(`${TAG} filename: ${filename}`);
  console.log(`${TAG} subDir  : ${subDir}`);

  // 1. Permission check
  const hasPermission = await ensureMediaPermission();
  if (!hasPermission) {
    console.error(`${TAG} MediaLibrary permission denied — cannot save to public storage`);
    return null;
  }

  // 2. Verify source file exists
  try {
    const info = await FileSystem.getInfoAsync(srcPath);
    console.log(`${TAG} src exists: ${info.exists}, size: ${(info as any).size ?? 'n/a'}`);
    if (!info.exists) {
      console.error(`${TAG} Source file not found: ${srcPath}`);
      return null;
    }
  } catch (e) {
    console.error(`${TAG} getInfoAsync failed:`, e);
    return null;
  }

  try {
    // 3. Create MediaLibrary asset from the private file
    // createAssetAsync accepts a file:// URI
    const localUri = srcPath.startsWith('file://') ? srcPath : `file://${srcPath}`;
    console.log(`${TAG} createAssetAsync → ${localUri}`);
    const asset = await MediaLibrary.createAssetAsync(localUri);
    console.log(`${TAG} asset created: id=${asset.id} uri=${asset.uri} filename=${asset.filename}`);

    // 4. Organise into album "ZipSender/<subDir>"
    const albumName = `ZipSender/${subDir}`;
    console.log(`${TAG} looking up album '${albumName}'`);
    let album = await MediaLibrary.getAlbumAsync(albumName);
    if (album) {
      console.log(`${TAG} album found (id=${album.id}), adding asset`);
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      console.log(`${TAG} album not found, creating with asset`);
      album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
      console.log(`${TAG} album created: id=${album?.id}`);
    }

    // 5. Persist asset ID for later deletion
    await addAssetId(subDir, asset.id);

    console.log(`${TAG} ✓ copyToPublicDownloads DONE → ${asset.uri}`);
    return asset.uri;
  } catch (err) {
    console.error(`${TAG} ✗ copyToPublicDownloads FAILED:`, err);
    return null;
  }
}

/**
 * Delete all public media assets for a given title from the device.
 * On Android 11+ this triggers a one-time system confirmation dialog.
 */
export async function deletePublicFolder(subDir: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  console.log(`${TAG} deletePublicFolder('${subDir}')`);

  const ids = await popAssetIds(subDir);
  if (ids.length === 0) {
    console.log(`${TAG} no stored asset IDs for '${subDir}' — nothing to delete from media store`);
    return;
  }

  try {
    console.log(`${TAG} deleting ${ids.length} asset(s): [${ids.join(', ')}]`);
    await MediaLibrary.deleteAssetsAsync(ids);
    console.log(`${TAG} ✓ assets deleted from media store`);
  } catch (err) {
    console.error(`${TAG} deleteAssetsAsync failed:`, err);
  }
}
