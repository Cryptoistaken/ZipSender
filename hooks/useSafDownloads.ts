/**
 * useSafDownloads — manages the one-time SAF permission for the public
 * Downloads folder and exposes a helper to copy a file there.
 *
 * Strategy (Android 10+ scoped storage):
 *  - expo-file-system CANNOT create directories or write directly to
 *    /storage/emulated/0/Download without a SAF grant.
 *  - We ask once, pre-opening the picker at the Download folder.
 *  - The granted directoryUri is persisted in AsyncStorage so we never
 *    ask again (the OS keeps the grant across restarts).
 *  - copyToPublicDownloads() reads the file as base64 from documentDirectory
 *    and writes it into the SAF-granted folder via createFileAsync +
 *    writeAsStringAsync.  Subdirectory = "ZipSender/<titleName>/".
 *
 * Note: react-native-zip-archive's unzip() only accepts plain file:// paths,
 * so we always extract into documentDirectory first, then copy here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const { StorageAccessFramework: SAF } = FileSystem;

const STORAGE_KEY = 'zipsender_saf_downloads_uri_v1';

// MIME type lookup by extension
function mimeForExt(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  return 'application/octet-stream';
}

// Strip extension for SAF createFileAsync (it appends the extension from MIME)
function nameWithoutExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

/** Load the cached SAF directory URI, or null if not yet granted */
export async function loadSafUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist a SAF directory URI */
async function saveSafUri(uri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, uri);
  } catch {}
}

/** Clear the cached SAF URI (call if the grant was revoked) */
export async function clearSafUri(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Ask the user to grant access to the public Downloads folder (once).
 * Pre-opens the picker at /storage/emulated/0/Download.
 * Returns the granted directoryUri, or null if denied.
 */
export async function requestDownloadsPermission(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    // Pre-point picker at the Downloads folder
    const downloadsHint = SAF.getUriForDirectoryInRoot('Download');
    const result = await SAF.requestDirectoryPermissionsAsync(downloadsHint);
    if (!result.granted) return null;
    await saveSafUri(result.directoryUri);
    return result.directoryUri;
  } catch {
    return null;
  }
}

/**
 * Get or request the SAF Downloads directory URI.
 * Returns null if the user denies or we're not on Android.
 */
export async function getOrRequestSafUri(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const cached = await loadSafUri();
  if (cached) return cached;
  return requestDownloadsPermission();
}

/**
 * Copy a single file from documentDirectory into the public Downloads/ZipSender/<subDir>/ folder.
 * - srcPath: plain file:// path inside documentDirectory
 * - filename: the final filename including extension
 * - subDir: folder name inside ZipSender/ (typically the title name)
 *
 * Returns the SAF URI of the created file, or null on failure.
 */
export async function copyToPublicDownloads(
  srcPath: string,
  filename: string,
  subDir: string,
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  const dirUri = await getOrRequestSafUri();
  if (!dirUri) return null;

  try {
    // Read source as base64
    const base64 = await FileSystem.readAsStringAsync(srcPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Create ZipSender sub-directory inside the granted Downloads folder.
    // SAF makeDirectoryAsync is safe to call even if the dir already exists
    // (it returns the existing URI).  We nest: Downloads/ZipSender/<subDir>/
    let zipSenderDirUri: string;
    try {
      zipSenderDirUri = await SAF.makeDirectoryAsync(dirUri, 'ZipSender');
    } catch {
      // Directory likely already exists — reconstruct its URI.
      // SAF doesn't expose a "getOrCreate" API, so we list and find it.
      const entries = await SAF.readDirectoryAsync(dirUri).catch(() => []);
      const found = entries.find((e) => e.includes('ZipSender'));
      zipSenderDirUri = found ?? dirUri;
    }

    let titleDirUri: string;
    try {
      titleDirUri = await SAF.makeDirectoryAsync(zipSenderDirUri, subDir);
    } catch {
      const entries = await SAF.readDirectoryAsync(zipSenderDirUri).catch(() => []);
      const found = entries.find((e) => e.includes(encodeURIComponent(subDir)) || e.includes(subDir));
      titleDirUri = found ?? zipSenderDirUri;
    }

    // Create the file and write base64 content
    const mime = mimeForExt(filename);
    const nameNoExt = nameWithoutExt(filename);
    const fileUri = await SAF.createFileAsync(titleDirUri, nameNoExt, mime);
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;
  } catch (err) {
    console.warn('[SAF] copyToPublicDownloads failed:', err);
    return null;
  }
}
