import { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StorageWidget from '../../components/StorageWidget';
import { useDownloadsStore } from '../../store/downloads';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

export default function DownloadsScreen() {
  const { items, remove } = useDownloadsStore();
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const handleAdminUnlock = useCallback(() => {
    setAdminUnlocked(true);
  }, []);

  const confirmDelete = (id: string, filename: string) => {
    Alert.alert(
      'Remove download?',
      `"${filename}" will be removed from your list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => remove(id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StorageWidget onUnlock={handleAdminUnlock} />

        {adminUnlocked && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/(admin)')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="shield-crown"
              size={16}
              color={Colors.surface}
            />
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="tray-arrow-down"
              size={48}
              color={Colors.cream20}
            />
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptyBody}>
              Download titles from the Home tab and they'll appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listLabel}>
              {items.length} {items.length === 1 ? 'file' : 'files'}
            </Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.formatBadge}>
                  <Text style={styles.formatBadgeText}>
                    {item.format === 'zip' ? 'ZIP' : 'MP4'}
                  </Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.titleName}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    Downloads/ZipSender · {item.size}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                    <MaterialCommunityIcons
                      name="folder-open-outline"
                      size={18}
                      color={Colors.cream50}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    activeOpacity={0.7}
                    onPress={() => confirmDelete(item.id, item.filename)}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={18}
                      color={Colors.cream50}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream10,
  },
  headerTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    color: Colors.cream,
    letterSpacing: -0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    paddingVertical: 12,
  },
  adminButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.surface,
    letterSpacing: 0.3,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.cream50,
  },
  emptyBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.cream30,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: { gap: 8 },
  listLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream30,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },
  formatBadge: {
    backgroundColor: Colors.cream10,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  formatBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.cream50,
    letterSpacing: 0.5,
  },
  itemInfo: { flex: 1 },
  itemTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream,
  },
  itemMeta: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream30,
    marginTop: 2,
  },
  itemActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
});
