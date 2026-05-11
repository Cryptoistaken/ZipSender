import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import { Doc } from '../convex/_generated/dataModel';
import { useDownloadsStore, ExtractedFile } from '../store/downloads';
import { copyToPublicDownloads, getOrRequestSafUri } from '../hooks/useSafDownloads';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

type DlState = 'idle' | 'downloading' | 'extracting' | 'done' | 'error';

interface Props {
  part: Doc<'parts'>;
  titleName: string;
}

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];

function parseDriveId(raw: string): string {
  if (!raw.includes('/') && !raw.includes('?')) return raw;
  return raw.match(DRIVE_ID_RE)?.[1] ?? raw;
}

function buildDriveUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim();
}

// Download location: private app documents directory (always writable, no permissions needed).
// Files are stored at: <app-documents>/ZipSender/<TitleName>/
// expo-file-system cannot write to public /Download on Android 10+ without SAF.
function titleDir(titleName: string): string {
  const base = FileSystem.documentDirectory ?? '';
  return `${base}ZipSender/${sanitizeName(titleName)}/`;
}

function buildFilename(part: Doc<'parts'>): string {
  if (part.filename && part.filename !== 'file' && !part.filename.startsWith('drive_')) {
    return part.filename;
  }
  const fileId = parseDriveId(part.driveFileId || part.driveUrl || '');
  const ext = part.format === 'zip' ? '.zip' : '.mp4';
  return `${fileId.slice(0, 16)}${ext}`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function scanVideoFiles(dir: string): Promise<ExtractedFile[]> {
  try {
    const entries = await FileSystem.readDirectoryAsync(dir);
    const results: ExtractedFile[] = [];
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        const filePath = dir + entry;
        const info = await FileSystem.getInfoAsync(filePath, { size: true });
        const size = info.exists ? info.size : 0;
        results.push({ filename: entry, filePath, size });
      }
    }
    return results.sort((a, b) => a.filename.localeCompare(b.filename));
  } catch {
    return [];
  }
}

// ── Animated extracting dots ─────────────────────────────────────────────────
function AnimatedDots() {
  const dotsRef = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]);
  const dots = dotsRef.current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dots[0], { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dots[1], { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dots[2], { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.parallel(
          dots.map((d) => Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }))
        ),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [dots]);

  return (
    <View style={styles.dotsRow}>
      {dots.map((anim, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DownloadButton({ part, titleName }: Props) {
  const items = useDownloadsStore((s) => s.items);
  const addDownload = useDownloadsStore((s) => s.add);

  const alreadyDownloaded = items.some((i) => i.id === part._id);
  const [state, setState] = useState<DlState>(alreadyDownloaded ? 'done' : 'idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const downloadResumable = useRef<FileSystem.DownloadResumable | null>(null);

  useEffect(() => {
    const downloaded = items.some((i) => i.id === part._id);
    if (!downloaded && state === 'done') setState('idle');
    if (downloaded && state === 'idle') setState('done');
  }, [items, part._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state === 'downloading') {
      Animated.loop(
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
  }, [state, shimmerAnim]);

  const startDownload = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;

    // ── Request SAF permission for public Downloads folder (once) ──────────
    // This shows the folder-picker dialog the very first time, pre-opened at
    // the Download folder. The granted URI is cached in AsyncStorage so the
    // dialog never appears again. We fire this BEFORE setState so the UI
    // doesn't flicker if the user cancels the picker.
    await getOrRequestSafUri();

    setState('downloading');
    setProgress(0);
    setErrorMsg('');

    try {
      const rawId = part.driveFileId || part.driveUrl || '';
      const fileId = parseDriveId(rawId);
      if (!fileId || fileId.length < 10) throw new Error('Invalid Drive file ID');

      const downloadUrl = buildDriveUrl(fileId);
      const filename = buildFilename(part);
      const folder = titleDir(titleName);

      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
      const destPath = folder + filename;

      const existing = await FileSystem.getInfoAsync(destPath);
      if (existing.exists) await FileSystem.deleteAsync(destPath, { idempotent: true });

      downloadResumable.current = FileSystem.createDownloadResumable(
        downloadUrl,
        destPath,
        { headers: { 'User-Agent': 'Mozilla/5.0' } },
        (dp: FileSystem.DownloadProgressData) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = dp;
          if (totalBytesExpectedToWrite > 0) {
            setProgress(Math.min(Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100), 99));
          }
        },
      );

      const result = await downloadResumable.current.downloadAsync();
      if (!result?.uri) throw new Error('Download failed — no URI returned');
      setProgress(100);

      let actualFormat = part.format;

      try {
        const headRes = await fetch(downloadUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow',
        });
        const mime = headRes.headers.get('content-type') ?? '';
        if (mime.includes('zip')) actualFormat = 'zip';
        else if (mime.startsWith('video/')) actualFormat = 'video';
      } catch { /* fall back to stored format */ }

      const fl = filename.toLowerCase();
      if (fl.endsWith('.zip')) actualFormat = 'zip';
      else if (VIDEO_EXTENSIONS.some((e) => fl.endsWith(e))) actualFormat = 'video';

      let extractedFiles: ExtractedFile[] = [];

      let publicFolderUri: string | undefined;

      if (actualFormat === 'zip') {
        setState('extracting');
        const extractDir = folder + 'extracted/';
        await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
        // react-native-zip-archive requires plain paths — strip file:// from BOTH source and dest
        const srcPath = result.uri.replace(/^file:\/\//, '');
        const destDir = extractDir.replace(/^file:\/\//, '');
        await unzip(srcPath, destDir);
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        extractedFiles = await scanVideoFiles(extractDir);

        // Copy each extracted video into public Downloads/ZipSender/<title>/
        for (const f of extractedFiles) {
          const safUri = await copyToPublicDownloads(f.filePath, f.filename, sanitizeName(titleName));
          if (safUri && !publicFolderUri) {
            // Derive the parent folder SAF URI by stripping the file segment
            publicFolderUri = safUri.replace(/\/[^/]+$/, '');
          }
        }
      } else {
        const info = await FileSystem.getInfoAsync(destPath, { size: true });
        const fileSize = info.exists ? info.size : 0;
        extractedFiles = [{ filename, filePath: destPath, size: fileSize }];

        // Copy the single video into public Downloads/ZipSender/<title>/
        const safUri = await copyToPublicDownloads(destPath, filename, sanitizeName(titleName));
        if (safUri) {
          publicFolderUri = safUri.replace(/\/[^/]+$/, '');
        }
      }

      const totalBytes = extractedFiles.reduce((s, f) => s + f.size, 0);
      addDownload({
        id: part._id,
        titleName,
        filename,
        folderPath: folder,
        publicFolderUri,
        size: part.size ?? (totalBytes > 0 ? formatBytes(totalBytes) : '—'),
        format: actualFormat === 'zip' ? 'zip' : 'video',
        downloadedAt: Date.now(),
        extractedFiles,
      });

      setState('done');
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.code === 'ERR_TASK_CANCELLED') {
        setState('idle');
        return;
      }
      const msg = err?.message ?? 'Download failed';
      setErrorMsg(msg.slice(0, 50));
      setState('error');
    }
  }, [state, part, titleName, addDownload]);

  const cancelDownload = useCallback(async () => {
    try { await downloadResumable.current?.cancelAsync(); } catch {}
    downloadResumable.current = null;
    setState('idle');
    setProgress(0);
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });
  const displayLabel = part.label && part.label !== 'file' && !part.label.startsWith('drive_')
    ? part.label
    : buildFilename(part);

  // ── State: idle / error ───────────────────────────────────────────────────
  if (state === 'idle' || state === 'error') {
    return (
      <TouchableOpacity
        style={[styles.idlePill, state === 'error' && styles.errorPill]}
        onPress={startDownload}
        activeOpacity={0.85}
      >
        <Text style={[styles.idleLabel, state === 'error' && styles.errorLabel]} numberOfLines={1}>
          {state === 'error' ? `Retry — ${errorMsg}` : displayLabel}
        </Text>
        <View style={[styles.idleCircle, state === 'error' && styles.errorCircle]}>
          <MaterialCommunityIcons
            name={state === 'error' ? 'refresh' : 'arrow-down'}
            size={14}
            color={state === 'error' ? Colors.cream50 : Colors.surface}
          />
        </View>
      </TouchableOpacity>
    );
  }

  // ── State: downloading ────────────────────────────────────────────────────
  if (state === 'downloading') {
    return (
      <View style={styles.progressPill}>
        <View
          style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: 'hidden' }]}
          pointerEvents="none"
        >
          <View style={{ width: `${progress}%`, height: '100%', backgroundColor: Colors.cream20 }} />
          <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}>
            <LinearGradient
              colors={['transparent', Colors.cream30, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={styles.progressLeft}>
          <MaterialCommunityIcons name="cloud-download-outline" size={13} color={Colors.cream50} />
        </View>
        <View style={styles.progressMid}>
          <Text style={styles.progressPct}>{progress}%</Text>
          <Text style={styles.progressFilename} numberOfLines={1}>{displayLabel}</Text>
        </View>
        <TouchableOpacity onPress={cancelDownload} style={styles.cancelCircle} activeOpacity={0.7}>
          <MaterialCommunityIcons name="close" size={12} color={Colors.cream50} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── State: extracting ─────────────────────────────────────────────────────
  if (state === 'extracting') {
    return (
      <View style={styles.extractingPill}>
        <Animated.View>
          <MaterialCommunityIcons name="archive-arrow-down-outline" size={15} color={Colors.cream50} />
        </Animated.View>
        <Text style={styles.extractingLabel}>Extracting…</Text>
        <AnimatedDots />
        <View style={styles.extractingIconBox}>
          <MaterialCommunityIcons name="archive-outline" size={15} color={Colors.cream50} />
        </View>
      </View>
    );
  }

  // ── State: done ───────────────────────────────────────────────────────────
  return (
    <View style={styles.donePill}>
      <View style={styles.doneCheck}>
        <MaterialCommunityIcons name="check-circle" size={16} color={Colors.cream} />
      </View>
      <View style={styles.doneBody}>
        <Text style={styles.doneTitle}>Downloaded</Text>
        <Text style={styles.doneFile} numberOfLines={1}>{displayLabel}</Text>
      </View>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => router.push('/(user)/downloads')}
        activeOpacity={0.85}
      >
        <Text style={styles.viewBtnText}>View</Text>
        <MaterialCommunityIcons name="arrow-top-right" size={9} color={Colors.surface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── idle / error pill — matches .btn-dl ──────────────────────────────────
  idlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 9,
    paddingVertical: 9,
    minHeight: 48,
    shadowColor: Colors.cream,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  errorPill: {
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
    shadowOpacity: 0,
    elevation: 0,
  },
  idleLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.black,
    flex: 1,
    letterSpacing: -0.01 * 12,
    marginRight: 8,
  },
  errorLabel: { color: Colors.cream50 },
  idleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCircle: { backgroundColor: Colors.cream20 },

  // ── progress pill — matches .dl-progress-pill ────────────────────────────
  progressPill: {
    height: 48,
    borderRadius: 999,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
  },
  progressLeft: {
    width: 24,
    alignItems: 'center',
  },
  progressMid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressPct: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.cream,
    letterSpacing: -0.02 * 11,
    minWidth: 30,
  },
  progressFilename: {
    fontFamily: Fonts.light,
    fontSize: 9,
    color: Colors.cream30,
    letterSpacing: 0.03 * 9,
    flex: 1,
  },
  cancelCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── extracting pill — matches .extracting-wrap ───────────────────────────
  extractingPill: {
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  extractingLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream80,
    flex: 1,
  },
  extractingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cream50,
  },

  // ── done pill — matches .done-pill ───────────────────────────────────────
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    borderRadius: 999,
    padding: 9,
    paddingLeft: 12,
    minHeight: 48,
  },
  doneCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.cream20,
    borderWidth: 1,
    borderColor: Colors.cream30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doneBody: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  doneTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.cream,
    letterSpacing: -0.02 * 12,
    lineHeight: 14,
  },
  doneFile: {
    fontFamily: Fonts.light,
    fontSize: 9,
    color: Colors.cream30,
    letterSpacing: 0.02 * 9,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.cream,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    flexShrink: 0,
  },
  viewBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: 10,
    color: Colors.surface,
    letterSpacing: 0.02 * 10,
  },
});
