import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSecretAdminTap } from '../hooks/useSecretAdminTap';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

interface Props {
  onUnlock: () => void;
  adminUnlocked: boolean;
}

function formatGB(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1) + ' GB';
}

export default function StorageWidget({ onUnlock, adminUnlocked }: Props) {
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const barAnim = useRef(new Animated.Value(0)).current;

  const { handleTap } = useSecretAdminTap(onUnlock, adminUnlocked);

  useEffect(() => {
    (async () => {
      try {
        const [free, total] = await Promise.all([
          FileSystem.getFreeDiskStorageAsync(),
          FileSystem.getTotalDiskCapacityAsync(),
        ]);
        setFreeBytes(free);
        setTotalBytes(total);
      } catch {
        // Fallback — 64 GB total, 38.4 GB used (prototype defaults)
        const total = 64 * 1024 ** 3;
        setTotalBytes(total);
        setFreeBytes(Math.round(total * 0.4));
      }
    })();
  }, []);

  const used = totalBytes && freeBytes ? totalBytes - freeBytes : null;
  const usedPct = totalBytes && used ? Math.min(used / totalBytes, 1) : 0.6;

  // Animate bar width on mount — matches prototype rAF + 120ms setTimeout
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(barAnim, {
        toValue: usedPct,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }, 120);
    return () => clearTimeout(t);
  }, [usedPct]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity style={styles.widget} onPress={handleTap} activeOpacity={0.9}>
      {/* Top row: label + total */}
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons name="server" size={13} color={Colors.cream50} />
          <Text style={styles.storageLabel}>STORAGE</Text>
        </View>
        <Text style={styles.totalText}>
          {totalBytes ? formatGB(totalBytes) : '64.0 GB'}
        </Text>
      </View>

      {/* Animated bar — matches .storage-bar: 6px height, 999px radius */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth as any }]} />
      </View>

      {/* Legend row — used dot (cream) + free dot (cream20) */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotUsed]} />
          <Text style={styles.legendText}>Used </Text>
          <Text style={styles.legendValue}>{used ? formatGB(used) : '—'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotFree]} />
          <Text style={styles.legendText}>Free </Text>
          <Text style={styles.legendValue}>{freeBytes ? formatGB(freeBytes) : '—'}</Text>
        </View>
        {adminUnlocked && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // .storage-widget — card2 bg, cream10 border, 20px radius, padding 14 16 13
  widget: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 13,
    flexShrink: 0,
    gap: 11,
  },

  // Top row: STORAGE label + total value
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  // .storage-label — 9px 700 0.14em uppercase cream50
  storageLabel: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 0.14 * 9,
    textTransform: 'uppercase',
    color: Colors.cream50,
  },
  // .storage-total — 11px 700 -0.01em cream
  totalText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: -0.01 * 11,
    color: Colors.cream,
  },

  // .storage-bar — 6px height, 999px radius, cream10 bg
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.cream10,
    overflow: 'hidden',
  },
  // .storage-bar-used — cream fill, left-rounded (right corners flush)
  fill: {
    height: '100%',
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  // Legend row — gap: 14px
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  // 6×6 dots
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendDotUsed: { backgroundColor: Colors.cream },
  legendDotFree: {
    backgroundColor: Colors.cream20,
    borderWidth: 1,
    borderColor: Colors.cream30,
  },
  // .storage-legend-text — 10px 300 cream50 0.01em
  legendText: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream50,
    letterSpacing: 0.01 * 10,
  },
  // .storage-legend-value — 10px 700 cream80
  legendValue: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.cream80,
    marginLeft: 1,
  },
  adminBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.cream20,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 8,
    color: Colors.cream,
    letterSpacing: 0.1 * 8,
    textTransform: 'uppercase',
  },
});
