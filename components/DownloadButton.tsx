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
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

const TAG = '[DownloadButton]';

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
    console.log(`${TAG} scanVideoFiles found ${entries.length} entries in ${dir}`);
    const results: ExtractedFile[] = [];
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        const filePath = decodeURIComponent(dir.replace(/\/$/, '')) + '/' + entry;
        const info = await FileSystem.getInfoAsync(filePath, { size: true });
        const size = info.exists ? (info as any).size ?? 0 : 0;
        console.log(`${TAG}   video found: ${entry} (${formatBytes(size)})`);
        results.push({ filename: entry, filePath, size });
      }
    }
    results.sort((a, b) => a.filename.localeCompare(b.filename));
    console.log(`${TAG} scanVideoFiles → ${results.length} video(s)`);
    return results;
  } catch (e) {
    console.error(`${TAG} scanVideoFiles failed:`, e);
    return [];
  }
}

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
      if (existing.exists) {
        await FileSystem.deleteAsync(destPath, { idempotent: true });
      }

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
      const fl = filename.toLowerCase();
      if (fl.endsWith('.zip')) {
        actualFormat = 'zip';
      } else if (VIDEO_EXTENSIONS.some((e) => fl.endsWith(e))) {
        actualFormat = 'video';
      } else {
        try {
          const headRes = await fetch(downloadUrl, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            redirect: 'follow',
          });
          const mime = headRes.headers.get('content-type') ?? '';
          if (mime.includes('zip')) actualFormat = 'zip';
          else if (mime.startsWith('video/')) actualFormat = 'video';
        } catch {}
      }

      let extractedFiles: ExtractedFile[] = [];

      if (actualFormat === 'zip') {
        setState('extracting');

        const extractDir = folder + 'extracted/';
        await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });

        const srcPath = decodeURIComponent(result.uri.replace(/^file:\/\//, ''));
        const dstPath = decodeURIComponent(extractDir.replace(/^file:\/\//, ''));

        await unzip(srcPath, dstPath);
        await FileSystem.deleteAsync(result.uri, { idempotent: true });

        extractedFiles = await scanVideoFiles(extractDir);
      } else {
        const info = await FileSystem.getInfoAsync(destPath, { size: true });
        const fileSize = info.exists ? (info as any).size ?? 0 : 0;
        extractedFiles = [{ filename, filePath: destPath, size: fileSize }];
      }

      const totalBytes = extractedFiles.reduce((s, f) => s + f.size, 0);

      addDownload({
        id: part._id,
        titleName,
        filename,
        folderPath: folder,
        publicFolderUri: undefined,
        size: part.size ?? (totalBytes > 0 ? formatBytes(totalBytes) : '—'),
        format: actualFormat === 'zip' ? 'zip' : 'video',
        downloadedAt: Date.now(),
        extractedFiles,
      });

      setState('done');
    } catch (err: any) {
      if (
        err?.message?.includes('cancelled') ||
        err?.message?.includes('cancel') ||
        err?.code === 'ERR_TASK_CANCELLED' ||
        downloadResumable.current === null
      ) {
        setState('idle');
        return;
      }
      const msg = err?.message ?? 'Download failed';
      setErrorMsg(msg.slice(0, 50));
      setState('error');
    }
  }, [state, part, titleName, addDownload]);

  const cancelDownload = useCallback(async () => {
    const dr = downloadResumable.current;
    downloadResumable.current = null;
    setState('idle');
    setProgress(0);
    try { await dr?.cancelAsync(); } catch {}
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });
  const displayLabel = part.label && part.label !== 'file' && !part.label.startsWith('drive_')
    ? part.label
    : buildFilename(part);

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
            name={state === 'error' ? 'refresh' : 'arrow-down-bold'}
            size={state === 'error' ? 14 : 17}
            color={state === 'error' ? Colors.cream50 : Colors.cream}
          />
        </View>
      </TouchableOpacity>
    );
  }

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

  if (state === 'extracting') {
    return (
      <View style={styles.extractingPill}>
        <MaterialCommunityIcons name="archive-arrow-down-outline" size={15} color={Colors.cream50} />
        <Text style={styles.extractingLabel}>Extracting…</Text>
        <AnimatedDots />
        <View style={styles.extractingIconBox}>
          <MaterialCommunityIcons name="archive-outline" size={15} color={Colors.cream50} />
        </View>
      </View>
    );
  }

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
  idlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderRadius: 13,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 46,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  errorPill: {
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: 'rgba(225,224,204,0.15)',
    elevation: 0,
    shadowOpacity: 0,
  },
  idleLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 13,
    color: '#0a0a0a',
    flex: 1,
    letterSpacing: -0.02 * 13,
    marginRight: 10,
  },
  errorLabel: { color: Colors.cream50 },
  idleCircle: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCircle: { backgroundColor: Colors.cream20 },
  progressPill: {
    height: 46,
    borderRadius: 13,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
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
    fontSize: 12,
    color: Colors.cream,
    letterSpacing: -0.02 * 12,
    minWidth: 32,
  },
  progressFilename: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream30,
    flex: 1,
  },
  cancelCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractingPill: {
    height: 46,
    borderRadius: 13,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
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
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    borderRadius: 13,
    padding: 6,
    paddingLeft: 12,
    minHeight: 46,
  },
  doneCheck: {
    width: 34,
    height: 34,
    borderRadius: 9,
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
    gap: 2,
  },
  doneTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.cream,
    letterSpacing: -0.02 * 12,
  },
  doneFile: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream30,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.cream,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  viewBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: '#0a0a0a',
    letterSpacing: -0.01 * 11,
  },
});