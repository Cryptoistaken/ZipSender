/**
 * useSafDownloads.ts
 */

import * as FileSystem from 'expo-file-system';

const TAG = '[Downloads]';

function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim();
}

function titleDir(titleName: string): string {
  const base = FileSystem.documentDirectory ?? '';
  return `${base}ZipSender/${sanitizeName(titleName)}/`;
}

export async function deletePublicFolder(titleName: string): Promise<void> {
  const folder = titleDir(titleName);
  console.log(`${TAG} deleteFolder → ${folder}`);
  try {
    const info = await FileSystem.getInfoAsync(folder);
    if (!info.exists) {
      console.log(`${TAG} folder does not exist, nothing to delete`);
      return;
    }
    await FileSystem.deleteAsync(folder, { idempotent: true });
    console.log(`${TAG} ✓ folder deleted`);
  } catch (e: any) {
    console.error(`${TAG} deleteFolder failed: ${e?.message ?? String(e)}`);
  }
}

export async function clearSafUri(): Promise<void> {}
export async function getOrRequestSafUri(): Promise<string | null> { return null; }
export async function loadSafUri(): Promise<string | null> { return null; }
export async function copyToPublicDownloads(
  _srcPath: string,
  _filename: string,
  _subDir: string,
): Promise<string | null> { return null; }