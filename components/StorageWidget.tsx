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

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 ** 3);
  return gb.toFixed(1) + ' GB';
}

export default function StorageWidget({ onUnlock }: Props) {
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);

  const { handleTap, unlocked } = useSecretAdminTap(onUnlock);

  useEffect(() => {
    (async () => {
      try {
        const free = await FileSystem.getFreeDiskStorageAsync();
        const total = await FileSystem.getTotalDiskCapacityAsync();
        setFreeBytes(free);
        setTotalBytes(total);
      } catch {
        // Fallback values
        setTotalBytes(64 * 1024 ** 3);
        setFreeBytes(Math.round(64 * 1024 ** 3 * 0.4));
      }
    })();
  }, []);

  const used = totalBytes && freeBytes ? totalBytes - freeBytes : null;
  const usedPct =
    totalBytes && used ? Math.round((used / totalBytes) * 100) : 60;

  return (
    <TouchableOpacity
      style={styles.widget}
      onPress={handleTap}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="harddisk"
          size={18}
          color={Colors.cream50}
        />
        <Text style={styles.label}>Storage</Text>
        {unlocked && (
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedText}>Admin unlocked</Text>
          </View>
        )}
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${usedPct}%` }]} />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>
          {used ? formatBytes(used) : '—'} used
        </Text>
        <Text style={styles.stat}>
          {freeBytes ? formatBytes(freeBytes) : '—'} free
        </Text>
        <Text style={styles.stat}>
          {totalBytes ? formatBytes(totalBytes) : '—'} total
        </Text>
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
    fontSize: 13,
    color: Colors.cream50,
    flex: 1,
  },
  unlockedBadge: {
    backgroundColor: Colors.cream20,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unlockedText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.cream,
    letterSpacing: 0.5,
  },
  barBg: {
    height: 4,
    backgroundColor: Colors.cream10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
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
    fontSize: 11,
    color: Colors.cream30,
  },
});
