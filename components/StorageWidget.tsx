import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSecretAdminTap } from '../hooks/useSecretAdminTap';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

interface Props {
  onUnlock: () => void;
}

function formatGB(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1) + ' GB';
}

export default function StorageWidget({ onUnlock }: Props) {
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);

  const { handleTap, unlocked, tapCount } = useSecretAdminTap(onUnlock);

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
        // Fallback — 64 GB device at 60% used
        setTotalBytes(64 * 1024 ** 3);
        setFreeBytes(Math.round(64 * 1024 ** 3 * 0.4));
      }
    })();
  }, []);

  const used = totalBytes && freeBytes ? totalBytes - freeBytes : null;
  const usedPct =
    totalBytes && used ? Math.min(Math.round((used / totalBytes) * 100), 100) : 60;

  return (
    <TouchableOpacity style={styles.widget} onPress={handleTap} activeOpacity={0.9}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="harddisk" size={16} color={Colors.cream50} />
        <Text style={styles.label}>Storage</Text>
        {unlocked && (
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedText}>ADMIN</Text>
          </View>
        )}
        {!unlocked && tapCount > 0 && tapCount < 20 && (
          <Text style={styles.tapHint}>{tapCount}/20</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${usedPct}%` as any }]} />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>{used ? formatGB(used) : '—'} used</Text>
        <Text style={styles.stat}>{freeBytes ? formatGB(freeBytes) : '—'} free</Text>
        <Text style={styles.stat}>{totalBytes ? formatGB(totalBytes) : '—'} total</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  widget: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream50,
    flex: 1,
    letterSpacing: 0.05 * 12,
  },
  tapHint: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.cream30,
    letterSpacing: 0.5,
  },
  unlockedBadge: {
    backgroundColor: Colors.cream20,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unlockedText: {
    fontFamily: Fonts.bold,
    fontSize: 8,
    color: Colors.cream,
    letterSpacing: 0.8,
  },
  track: {
    height: 3,
    backgroundColor: Colors.cream10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.cream50,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.cream30,
  },
});
