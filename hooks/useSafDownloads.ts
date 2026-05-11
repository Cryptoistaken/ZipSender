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
 * Delete a folder (and all its files) from the public Downloads/ZipSender/<subDir>/ via SAF.
 * Uses the stored SAF directoryUri to find and delete the title subfolder.
 * Safe to call if the folder doesn't exist — errors are swallowed.
 */
export async function deletePublicFolder(subDir: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  const dirUri = await loadSafUri();
  if (!dirUri) return;
  try {
    // Find the ZipSender parent dir
    const zipSenderEntries = await SAF.readDirectoryAsync(dirUri).catch(() => [] as string[]);
    const zipSenderUri = zipSenderEntries.find((e: string) => {
      const decoded = decodeURIComponent(e);
      return decoded.slice(decoded.lastIndexOf('/') + 1) === 'ZipSender';
    });
    if (!zipSenderUri) return;

    // Find the title subfolder
    const titleEntries = await SAF.readDirectoryAsync(zipSenderUri).catch(() => [] as string[]);
    const titleUri = titleEntries.find((e: string) => {
      const decoded = decodeURIComponent(e);
      return decoded.slice(decoded.lastIndexOf('/') + 1) === subDir;
    });
    if (!titleUri) return;

    // Delete all files inside the title folder first, then the folder itself
    const fileEntries = await SAF.readDirectoryAsync(titleUri).catch(() => [] as string[]);
    for (const fileUri of fileEntries) {
      try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch {}
    }
    try { await FileSystem.deleteAsync(titleUri, { idempotent: true }); } catch {}
  } catch (err) {
    console.warn('[SAF] deletePublicFolder failed:', err);
  }
}

/**
 * Ask the user to grant access to the public Downloads folder (once).
 * Pre-opens the picker at /storage/emulated/0/Download.
 * Returns the granted directoryUri, or null if denied.
 */
export async function requestDownloadsPermission(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const downloadsHint = SAF.getUriForDirectoryInRoot('Download');
    console.log(`${TAG} requestDownloadsPermission: hint URI = ${decodeURIComponent(downloadsHint)}`);
    const result = await SAF.requestDirectoryPermissionsAsync(downloadsHint);
    console.log(`${TAG} requestDirectoryPermissionsAsync result:`, JSON.stringify(result));
    if (!result.granted) {
      console.warn(`${TAG} Permission NOT granted by user`);
      return null;
    }
    console.log(`${TAG} Permission granted. directoryUri = ${decodeURIComponent(result.directoryUri)}`);
    await saveSafUri(result.directoryUri);
    return result.directoryUri;
  } catch (e) {
    console.error(`${TAG} requestDownloadsPermission threw:`, e);
    return null;
  }
}

export async function getOrRequestSafUri(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const cached = await loadSafUri();
  if (cached) {
    console.log(`${TAG} getOrRequestSafUri: using cached URI = ${decodeURIComponent(cached)}`);
    return cached;
  }
  console.log(`${TAG} getOrRequestSafUri: no cached URI, requesting permission`);
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
// ─── debug tag used across all SAF logs ──────────────────────────────────────
const TAG = '[SAF]';

/** Pretty-decode a SAF URI for logging */
function dbgUri(label: string, uri: string): void {
  console.log(`${TAG} ${label}:`);
  console.log(`  raw  : ${uri}`);
  console.log(`  dec  : ${decodeURIComponent(uri)}`);
}

/**
 * Resolve a SAF tree URI to its matching document URI.
 * SAF.makeDirectoryAsync / createFileAsync need a *document* URI as parent,
 * not the raw tree URI returned by requestDirectoryPermissionsAsync.
 * If the granted URI is already a document URI this is a no-op.
 */
function toDocumentUri(treeUri: string): string {
  // tree URI:     content://com.android.externalstorage.documents/tree/primary%3ADownload
  // document URI: content://com.android.externalstorage.documents/tree/primary%3ADownload/document/primary%3ADownload
  if (treeUri.includes('/document/')) {
    console.log(`${TAG} toDocumentUri: already a document URI`);
    return treeUri; // already resolved
  }
  const treeId = treeUri.split('/tree/')[1] ?? '';
  const documentUri = `${treeUri}/document/${treeId}`;
  console.log(`${TAG} toDocumentUri: converted tree → document`);
  console.log(`  tree : ${decodeURIComponent(treeUri)}`);
  console.log(`  doc  : ${decodeURIComponent(documentUri)}`);
  return documentUri;
}

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

  const rawDirUri = await getOrRequestSafUri();
  if (!rawDirUri) {
    console.warn(`${TAG} No SAF URI — permission not granted`);
    return null;
  }

  dbgUri('rawDirUri (from AsyncStorage)', rawDirUri);

  // Convert tree URI → document URI so makeDirectoryAsync / createFileAsync work
  const dirUri = toDocumentUri(rawDirUri);
  dbgUri('dirUri (document)', dirUri);

  // Verify the source file exists before trying to read it
  try {
    const srcInfo = await FileSystem.getInfoAsync(srcPath);
    console.log(`${TAG} srcFile exists: ${srcInfo.exists}, size: ${(srcInfo as any).size ?? 'n/a'}`);
    if (!srcInfo.exists) {
      console.error(`${TAG} Source file does not exist: ${srcPath}`);
      return null;
    }
  } catch (e) {
    console.error(`${TAG} Failed to stat srcPath:`, e);
    return null;
  }

  try {
    // Read source as base64
    console.log(`${TAG} Reading source file as base64…`);
    const base64 = await FileSystem.readAsStringAsync(srcPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`${TAG} base64 length: ${base64.length} chars`);

    // ── Directory helper ────────────────────────────────────────────────────
    // SAF.makeDirectoryAsync throws if the dir already exists,
    // so we catch and find it by name from readDirectoryAsync.
    const safGetOrCreateDir = async (parentUri: string, name: string): Promise<string> => {
      console.log(`${TAG} safGetOrCreateDir('${name}')`);
      dbgUri(`  parentUri`, parentUri);
      try {
        const newUri = await SAF.makeDirectoryAsync(parentUri, name);
        console.log(`${TAG}   → created new dir: ${decodeURIComponent(newUri)}`);
        return newUri;
      } catch (mkErr) {
        console.log(`${TAG}   makeDirectoryAsync threw (likely already exists):`, String(mkErr));
        // Dir already exists — find it by listing parent
        const entries = await SAF.readDirectoryAsync(parentUri).catch((le) => {
          console.error(`${TAG}   readDirectoryAsync failed:`, le);
          return [] as string[];
        });
        console.log(`${TAG}   listing parent — ${entries.length} entries:`);
        entries.forEach((e: string) => console.log(`${TAG}     ${decodeURIComponent(e)}`));

        const found = entries.find((e: string) => {
          const decoded = decodeURIComponent(e);
          const segment = decoded.slice(decoded.lastIndexOf('/') + 1);
          console.log(`${TAG}     match check: '${segment}' === '${name}' ? ${segment === name}`);
          return segment === name;
        });

        if (found) {
          console.log(`${TAG}   → found existing dir: ${decodeURIComponent(found)}`);
          return found;
        }
        console.error(`${TAG}   → could not find '${name}' in parent listing — falling back to parent`);
        return parentUri;
      }
    };

    console.log(`${TAG} Step 1: get/create ZipSender dir inside granted root`);
    const zipSenderDirUri = await safGetOrCreateDir(dirUri, 'ZipSender');
    dbgUri('zipSenderDirUri', zipSenderDirUri);

    console.log(`${TAG} Step 2: get/create title subdir '${subDir}'`);
    const titleDirUri = await safGetOrCreateDir(zipSenderDirUri, subDir);
    dbgUri('titleDirUri', titleDirUri);

    // ── Create and write the file ────────────────────────────────────────────
    const mime = mimeForExt(filename);
    const nameNoExt = nameWithoutExt(filename);
    console.log(`${TAG} Step 3: createFileAsync`);
    console.log(`${TAG}   nameNoExt: '${nameNoExt}', mime: '${mime}'`);
    dbgUri('  titleDirUri passed to createFileAsync', titleDirUri);

    const fileUri = await SAF.createFileAsync(titleDirUri, nameNoExt, mime);
    console.log(`${TAG}   → fileUri: ${decodeURIComponent(fileUri)}`);

    console.log(`${TAG} Step 4: writeAsStringAsync (base64)`);
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`${TAG} ✓ File written successfully`);
    console.log(`${TAG} ═══ copyToPublicDownloads DONE ═══`);

    return fileUri;
  } catch (err) {
    console.error(`${TAG} ✗ copyToPublicDownloads FAILED`);
    console.error(`${TAG}   error:`, err);
    console.error(`${TAG}   rawDirUri : ${decodeURIComponent(rawDirUri)}`);
    console.error(`${TAG}   dirUri    : ${decodeURIComponent(dirUri)}`);
    return null;
  }
}
