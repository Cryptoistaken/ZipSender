import { useState, useEffect, useRef } from 'react';
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
import { Doc } from '../convex/_generated/dataModel';
import { useDownloadsStore } from '../store/downloads';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

type DlState = 'idle' | 'downloading' | 'extracting' | 'done';

interface Props {
  part: Doc<'parts'>;
  titleName: string;
}

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

function parseDriveId(url: string): string {
  return url.match(DRIVE_ID_RE)?.[1] ?? url;
}

export default function DownloadButton({ part, titleName }: Props) {
  const [state, setState] = useState<DlState>('idle');
  const [progress, setProgress] = useState(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addDownload = useDownloadsStore((s) => s.add);

  // Shimmer loop
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

  // Dot animation for extracting
  useEffect(() => {
    if (state === 'extracting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      dotAnim.stopAnimation();
      dotAnim.setValue(0);
    }
  }, [state, dotAnim]);

  const startDownload = () => {
    if (state !== 'idle') return;
    setState('downloading');
    setProgress(0);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 4 + 1;
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          if (part.format === 'zip') {
            setState('extracting');
            setTimeout(finishDownload, 2000 + Math.random() * 1500);
          } else {
            finishDownload();
          }
          return 100;
        }
        return next;
      });
    }, 120);
  };

  const finishDownload = () => {
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

  const cancelDownload = () => {
    clearInterval(intervalRef.current!);
    setState('idle');
    setProgress(0);
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  if (state === 'idle') {
    return (
      <TouchableOpacity
        style={styles.idlePill}
        onPress={startDownload}
        activeOpacity={0.85}
      >
        <Text style={styles.idleLabel} numberOfLines={1}>
          {part.label}
        </Text>
        <View style={styles.idleIcon}>
          <MaterialCommunityIcons
            name="arrow-down"
            size={14}
            color={Colors.surface}
          />
        </View>
      </TouchableOpacity>
    );
  }

  if (state === 'downloading') {
    return (
      <View style={styles.progressPill}>
        {/* Shimmer bar */}
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
          <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
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

  if (state === 'extracting') {
    return (
      <View style={styles.extractingPill}>
        <Animated.View
          style={{ transform: [{ rotate: dotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}
        >
          <MaterialCommunityIcons
            name="cog"
            size={14}
            color={Colors.cream50}
          />
        </Animated.View>
        <Text style={styles.extractingText}>Extracting</Text>
        <Text style={styles.dots}>···</Text>
      </View>
    );
  }

  // done
  return (
    <View style={styles.donePill}>
      <MaterialCommunityIcons
        name="check-circle"
        size={16}
        color={Colors.cream}
      />
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
  idlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cream,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 40,
  },
  idleLabel: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.surface,
    flex: 1,
  },
  idleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPill: {
    borderRadius: 999,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream20,
    overflow: 'hidden',
    height: 40,
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
    minWidth: 32,
  },
  progressFilename: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream50,
    flex: 1,
  },
  cancelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.cream10,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    height: 40,
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
    height: 40,
  },
  doneLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream,
    flex: 1,
  },
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.cream20,
  },
  viewBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream,
  },
});
