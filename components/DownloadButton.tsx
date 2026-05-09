import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Doc } from '../convex/_generated/dataModel';
import { useDownloadsStore } from '../store/downloads';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

type DlState = 'idle' | 'downloading' | 'extracting' | 'done' | 'error';

interface Props {
  part: Doc<'parts'>;
  titleName: string;
}

// ── Same Drive URL pattern used in Scripts/index.js ────────────────────────
// Scripts/index.js: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`
const DRIVE_DOWNLOAD_URL = (fileId: string) =>
  `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

// ── Same regex used in Scripts/index.js ─────────────────────────────────────
const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

function parseDriveId(url: string): string {
  return url.match(DRIVE_ID_RE)?.[1] ?? url;
}

function destDir(): string {
  return FileSystem.documentDirectory + 'ZipSender/';
}

export default function DownloadButton({ part, titleName }: Props) {
  const [state, setState] = useState<DlState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const downloadResumable = useRef<FileSystem.DownloadResumable | null>(null);
  const addDownload = useDownloadsStore((s) => s.add);

  // ── Shimmer loop while downloading ─────────────────────────────────────────
  useEffect(() => {
    if (state === 'downloading') {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
  }, [state, shimmerAnim]);

  // ── Spinner for extracting state ────────────────────────────────────────────
  useEffect(() => {
    if (state === 'extracting') {
      Animated.loop(
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [state, dotAnim]);

  const startDownload = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;
    setState('downloading');
    setProgress(0);
    setErrorMsg('');

    try {
      // Ensure download directory exists
      const dir = destDir();
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      // Resolve Drive file ID — same logic as Scripts/index.js
      const fileId = parseDriveId(part.driveFileId || part.driveUrl);
      const downloadUrl = DRIVE_DOWNLOAD_URL(fileId);
      const destPath = dir + part.filename;

      // Remove pre-existing file if re-downloading
      const existing = await FileSystem.getInfoAsync(destPath);
      if (existing.exists) {
        await FileSystem.deleteAsync(destPath, { idempotent: true });
      }

      downloadResumable.current = FileSystem.createDownloadResumable(
        downloadUrl,
        destPath,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        },
        (downloadProgress) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } =
            downloadProgress;
          if (totalBytesExpectedToWrite > 0) {
            setProgress(
              Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100),
            );
          }
        },
      );

      const result = await downloadResumable.current.downloadAsync();

      if (!result?.uri) throw new Error('Download failed — no URI returned');

      // ZIP format: simulate brief "extracting" phase
      if (part.format === 'zip') {
        setState('extracting');
        await new Promise((r) => setTimeout(r, 2000));
      }

      finishDownload(result.uri);
    } catch (err: any) {
      // Cancelled by user — go back to idle silently
      if (err?.message?.includes('cancelled') || err?.code === 'ERR_TASK_CANCELLED') {
        setState('idle');
        return;
      }
      setErrorMsg(err?.message ?? 'Download failed');
      setState('error');
    }
  }, [state, part]);

  const finishDownload = (uri: string) => {
    setState('done');
    addDownload({
      id: part._id,
      titleName,
      filename: part.filename,
      size: part.size ?? '—',
      format: part.format,
      downloadedAt: Date.now(),
    });
  };

  const cancelDownload = useCallback(async () => {
    try {
      await downloadResumable.current?.cancelAsync();
    } catch (_) {}
    downloadResumable.current = null;
    setState('idle');
    setProgress(0);
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const spinDeg = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── IDLE ───────────────────────────────────────────────────────────────────
  if (state === 'idle' || state === 'error') {
    return (
      <TouchableOpacity
        style={styles.idlePill}
        onPress={startDownload}
        activeOpacity={0.85}
      >
        <Text style={styles.idleLabel} numberOfLines={1}>
          {state === 'error' ? `Retry · ${errorMsg.slice(0, 30)}` : part.label}
        </Text>
        <View style={styles.idleIcon}>
          <MaterialCommunityIcons name="arrow-down" size={14} color={Colors.surface} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── DOWNLOADING ────────────────────────────────────────────────────────────
  if (state === 'downloading') {
    return (
      <View style={styles.progressPill}>
        {/* Progress fill + shimmer */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View
            style={[
              StyleSheet.absoluteFill,
              { width: `${progress}%`, backgroundColor: Colors.cream20 },
            ]}
          />
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', Colors.cream30, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <View style={styles.progressInner}>
          <Text style={styles.progressPct}>{progress}%</Text>
          <Text style={styles.progressFilename} numberOfLines={1}>
            {part.filename}
          </Text>
        </View>

        <TouchableOpacity onPress={cancelDownload} style={styles.cancelBtn}>
          <MaterialCommunityIcons name="close" size={14} color={Colors.cream50} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── EXTRACTING ─────────────────────────────────────────────────────────────
  if (state === 'extracting') {
    return (
      <View style={styles.extractingPill}>
        <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
          <MaterialCommunityIcons name="cog" size={14} color={Colors.cream50} />
        </Animated.View>
        <Text style={styles.extractingText}>Extracting</Text>
        <Text style={styles.dots}>···</Text>
      </View>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.donePill}>
      <MaterialCommunityIcons name="check-circle" size={16} color={Colors.cream} />
      <Text style={styles.doneLabel}>Downloaded</Text>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => router.push('/(user)/downloads')}
        activeOpacity={0.8}
      >
        <Text style={styles.viewBtnText}>View →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── idle pill — matches prototype .btn-dl ──────────────────────────────────
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  idleLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.black,
    flex: 1,
    letterSpacing: -0.1,
  },
  idleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── progress pill ──────────────────────────────────────────────────────────
  progressPill: {
    borderRadius: 999,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
    overflow: 'hidden',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
  },
  progressInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressPct: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream,
    minWidth: 34,
  },
  progressFilename: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream50,
    flex: 1,
  },
  cancelBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.cream10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── extracting pill ────────────────────────────────────────────────────────
  extractingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 48,
  },
  extractingText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream50,
  },
  dots: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream30,
    letterSpacing: 2,
  },

  // ── done pill ──────────────────────────────────────────────────────────────
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    height: 48,
  },
  doneLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream,
    flex: 1,
  },
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.cream20,
  },
  viewBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream,
  },
});
