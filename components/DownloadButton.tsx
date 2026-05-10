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
import * as MediaLibrary from 'expo-media-library';
import { unzip } from 'react-native-zip-archive';
import { Doc } from '../convex/_generated/dataModel';
import { useDownloadsStore, ExtractedFile } from '../store/downloads';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

type DlState = 'idle' | 'downloading' | 'extracting' | 'done' | 'error';

interface Props {
  part: Doc<'parts'>;
  titleName: string;
}

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

function parseDriveId(raw: string): string {
  if (!raw.includes('/') && !raw.includes('?')) return raw;
  return raw.match(DRIVE_ID_RE)?.[1] ?? raw;
}

function buildDriveUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];

function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim();
}

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
        results.push({ filename: entry, filePath, size: (info as any).size ?? 0 });
      }
    }
    return results.sort((a, b) => a.filename.localeCompare(b.filename));
  } catch {
    return [];
  }
}

async function saveToMediaLibrary(filePaths: string[]): Promise<void> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return;
    for (const fp of filePaths) {
      try { await MediaLibrary.createAssetAsync(fp); } catch { /* skip */ }
    }
  } catch { /* permission denied */ }
}

function AnimatedDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
      ))}
    </View>
  );
}

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
  }, [items, part._id]);

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
        (dp) => {
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
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name&key=${process.env.EXPO_PUBLIC_GOOGLE_API_KEY}`
        );
        if (metaRes.ok) {
          const meta = await metaRes.json();
          const mime: string = meta.mimeType ?? '';
          const isZip =
            mime === 'application/zip' ||
            mime === 'application/x-zip-compressed' ||
            (meta.name as string)?.toLowerCase().endsWith('.zip');
          actualFormat = isZip ? 'zip' : 'video';
        }
      } catch { /* fall back to stored format */ }

      let extractedFiles: ExtractedFile[] = [];

      if (actualFormat === 'zip') {
        setState('extracting');
        const extractDir = folder + 'extracted/';
        await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
        await unzip(result.uri, extractDir);
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        extractedFiles = await scanVideoFiles(extractDir);
        await saveToMediaLibrary(extractedFiles.map((f) => f.filePath));
      } else {
        const info = await FileSystem.getInfoAsync(destPath, { size: true });
        extractedFiles = [{ filename, filePath: destPath, size: (info as any).size ?? 0 }];
        await saveToMediaLibrary([destPath]);
      }

      const totalBytes = extractedFiles.reduce((s, f) => s + f.size, 0);
      addDownload({
        id: part._id,
        titleName,
        filename,
        folderPath: folder,
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
      setErrorMsg(msg.slice(0, 60));
      setState('error');
    }
  }, [state, part, titleName, addDownload]);

  const cancelDownload = useCallback(async () => {
    try { await downloadResumable.current?.cancelAsync(); } catch (_) {}
    downloadResumable.current = null;
    setState('idle');
    setProgress(0);
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });

  if (state === 'idle' || state === 'error') {
    return (
      <TouchableOpacity
        style={[styles.idlePill, state === 'error' && styles.errorPill]}
        onPress={startDownload}
        activeOpacity={0.85}
      >
        <Text style={[styles.idleLabel, state === 'error' && styles.errorLabel]} numberOfLines={1}>
          {state === 'error' ? `Retry · ${errorMsg.slice(0, 28)}` : part.label || buildFilename(part)}
        </Text>
        <View style={[styles.idleIcon, state === 'error' && styles.errorIcon]}>
          <MaterialCommunityIcons name={state === 'error' ? 'refresh' : 'arrow-down'} size={14} color={Colors.surface} />
        </View>
      </TouchableOpacity>
    );
  }

  if (state === 'downloading') {
    return (
      <View style={styles.progressPill}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[StyleSheet.absoluteFill, { width: `${progress}%` as any, backgroundColor: Colors.cream20 }]} />
          <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}>
            <LinearGradient colors={['transparent', Colors.cream30, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
        <View style={styles.progressInner}>
          <Text style={styles.progressPct}>{progress}%</Text>
          <Text style={styles.progressFilename} numberOfLines={1}>{buildFilename(part)}</Text>
        </View>
        <TouchableOpacity onPress={cancelDownload} style={styles.cancelBtn}>
          <MaterialCommunityIcons name="close" size={14} color={Colors.cream50} />
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'extracting') {
    return (
      <View style={styles.extractingPill}>
        <MaterialCommunityIcons name="archive-arrow-down-outline" size={16} color={Colors.cream50} />
        <Text style={styles.extractingLabel}>Extracting…</Text>
        <AnimatedDots />
      </View>
    );
  }

  return (
    <View style={styles.donePill}>
      <MaterialCommunityIcons name="check-circle" size={16} color={Colors.cream} />
      <Text style={styles.doneLabel}>Downloaded</Text>
      <TouchableOpacity style={styles.viewBtn} onPress={() => router.push('/(user)/downloads')} activeOpacity={0.8}>
        <Text style={styles.viewBtnText}>View →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  idlePill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.cream, borderRadius: 999, paddingLeft: 20, paddingRight: 9, paddingVertical: 9, minHeight: 48, shadowColor: Colors.cream, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  errorPill: { backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.cream20, shadowOpacity: 0, elevation: 0 },
  idleLabel: { fontFamily: Fonts.extraBold, fontSize: 12, color: Colors.black, flex: 1, letterSpacing: -0.1 },
  idleIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center' },
  errorIcon: { backgroundColor: Colors.cream30 },
  errorLabel: { color: Colors.cream50 },
  progressPill: { borderRadius: 999, backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.cream20, overflow: 'hidden', height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 80 },
  progressInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressPct: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.cream, minWidth: 34 },
  progressFilename: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.cream50, flex: 1 },
  cancelBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.cream10, alignItems: 'center', justifyContent: 'center' },
  extractingPill: { height: 48, borderRadius: 999, backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.cream20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 },
  extractingLabel: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.cream80, flex: 1 },
  dotsRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.cream30 },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: Colors.cream10, borderWidth: 1, borderColor: Colors.cream20, paddingHorizontal: 14, paddingVertical: 8, height: 48 },
  doneLabel: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.cream, flex: 1 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: Colors.cream20 },
  viewBtnText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.cream },
});
