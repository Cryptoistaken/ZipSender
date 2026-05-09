import { useCallback, useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StorageWidget from '../../components/StorageWidget';
import { useDownloadsStore } from '../../store/downloads';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { loadAdminUnlocked, saveAdminUnlocked } from '../../hooks/useSecretAdminTap';

export default function DownloadsScreen() {
  const { items, remove } = useDownloadsStore();
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load persisted admin state on mount
  useEffect(() => {
    loadAdminUnlocked().then((val) => {
      if (val) setAdminUnlocked(true);
    });
  }, []);

  const handleAdminUnlock = useCallback(() => {
    setAdminUnlocked(true);
    saveAdminUnlocked(true);
  }, []);

  const deleteItem = deleteId ? items.find((i) => i.id === deleteId) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Downloads</Text>
          <Text style={styles.pageSub}>
            {items.length > 0
              ? `${items.length} file${items.length !== 1 ? 's' : ''}`
              : 'Nothing yet'}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Storage widget — 20 invisible taps unlocks admin */}
          <StorageWidget onUnlock={handleAdminUnlock} adminUnlocked={adminUnlocked} />

          {/* Revealed admin button — stays once unlocked */}
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

          {/* Empty state */}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="tray-arrow-down"
                  size={28}
                  color={Colors.cream30}
                />
              </View>
              <Text style={styles.emptyTitle}>Nothing downloaded yet</Text>
              <Text style={styles.emptySub}>
                Download titles from the Home tab and they'll appear here.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.dlItem}>
                {/* format badge thumb */}
                <View style={styles.dlThumb}>
                  <Text style={styles.dlThumbText}>
                    {item.format === 'zip' ? 'ZIP' : 'MP4'}
                  </Text>
                </View>

                <View style={styles.dlInfo}>
                  <View style={styles.dlBadgeRow}>
                    <View
                      style={[
                        styles.dlBadge,
                        item.format === 'zip' ? styles.badgeZip : styles.badgeMp4,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dlBadgeText,
                          item.format === 'zip'
                            ? styles.badgeZipText
                            : styles.badgeMp4Text,
                        ]}
                      >
                        {item.format === 'zip' ? 'ZIP' : 'MP4'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dlTitle} numberOfLines={1}>
                    {item.titleName}
                  </Text>
                  <Text style={styles.dlSub} numberOfLines={1}>
                    Downloads/ZipSender · {item.size}
                  </Text>
                </View>

                <TouchableOpacity style={styles.dlItemOpen} activeOpacity={0.7}>
                  <MaterialCommunityIcons
                    name="folder-open-outline"
                    size={18}
                    color={Colors.cream50}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dlItemOpen}
                  activeOpacity={0.7}
                  onPress={() => setDeleteId(item.id)}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={Colors.cream50}
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Inline delete confirm overlay */}
        {deleteId && deleteItem && (
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteCard}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={32}
                color={Colors.cream50}
              />
              <Text style={styles.deleteTitle}>Remove download?</Text>
              <Text style={styles.deleteBody} numberOfLines={2}>
                "{deleteItem.titleName}" will be removed from your list.
              </Text>
              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => setDeleteId(null)}
                >
                  <Text style={styles.deleteCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={() => {
                    remove(deleteId);
                    setDeleteId(null);
                  }}
                >
                  <Text style={styles.deleteConfirmText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexShrink: 0,
  },
  pageTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.cream,
    letterSpacing: -0.05 * 22,
    marginBottom: 2,
  },
  pageSub: {
    fontFamily: Fonts.light,
    fontSize: 11,
    color: Colors.cream50,
    letterSpacing: 0.02 * 11,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 8, paddingBottom: 100 },

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

  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 15,
    color: Colors.cream,
    letterSpacing: -0.03 * 15,
  },
  emptySub: {
    fontFamily: Fonts.light,
    fontSize: 12,
    color: Colors.cream50,
    lineHeight: 18,
    textAlign: 'center',
  },

  dlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
    borderRadius: 18,
    padding: 12,
    paddingRight: 13,
  },
  dlThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dlThumbText: {
    fontFamily: Fonts.extraBold,
    fontSize: 9,
    color: Colors.cream50,
    letterSpacing: 0.8,
  },
  dlInfo: { flex: 1, minWidth: 0, gap: 2 },
  dlBadgeRow: { flexDirection: 'row', gap: 5, marginBottom: 2 },
  dlBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  dlBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeZip: { backgroundColor: Colors.cream10, borderColor: Colors.cream20 },
  badgeZipText: { color: Colors.cream80 },
  badgeMp4: { backgroundColor: Colors.cream20, borderColor: Colors.cream30 },
  badgeMp4Text: { color: Colors.cream },
  dlTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream,
    letterSpacing: -0.02 * 13,
  },
  dlSub: { fontFamily: Fonts.light, fontSize: 10, color: Colors.cream50 },
  dlItemOpen: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteCard: {
    backgroundColor: Colors.card2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cream20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  deleteTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.cream,
    textAlign: 'center',
  },
  deleteBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.cream50,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteActions: { flexDirection: 'row', gap: 10, width: '100%' },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
  },
  deleteCancelText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream50,
  },
  deleteConfirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.cream30,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream,
  },
});
