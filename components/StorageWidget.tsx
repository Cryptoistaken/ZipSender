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
        const total = 64 * 1024 ** 3;
        setTotalBytes(total);
        setFreeBytes(Math.round(total * 0.4));
      }
    })();
  }, []);

  const used = totalBytes && freeBytes ? totalBytes - freeBytes : null;
  const usedPct = totalBytes && used ? Math.min(used / totalBytes, 1) : 0.6;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(barAnim, {
        toValue: usedPct,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }, 120);
    return () => clearTimeout(t);
  }, [usedPct, barAnim]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity style={styles.widget} onPress={handleTap} activeOpacity={0.9}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons name="server" size={13} color={Colors.cream50} />
          <Text style={styles.storageLabel}>STORAGE</Text>
        </View>
        <Text style={styles.totalText}>
          {totalBytes ? formatGB(totalBytes) : '64.0 GB'}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth }]} />
      </View>
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
  widget: {
    marginBottom: 14,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 13,
    gap: 11,
  },
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
  storageLabel: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 0.14 * 9,
    textTransform: 'uppercase',
    color: Colors.cream50,
  },
  totalText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: -0.01 * 11,
    color: Colors.cream,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.cream10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
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
  legendText: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream50,
    letterSpacing: 0.01 * 10,
  },
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