import { useCallback, useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import StorageWidget from '../../components/StorageWidget';
import { useDownloadsStore, DownloadedItem, ExtractedFile } from '../../store/downloads';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { loadAdminUnlocked, saveAdminUnlocked } from '../../hooks/useSecretAdminTap';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function openFolder(folderPath: string) {
  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(folderPath);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'resource/folder',
      });
    } else {
      await Linking.openURL(folderPath);
    }
  } catch (_) {}
}

async function playFile(filePath: string) {
  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(filePath);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'video/*',
      });
    } else {
      await Linking.openURL(filePath);
    }
  } catch (_) {}
}

// ── Extracted file row ───────────────────────────────────────────────────────
interface ExtractedRowProps {
  file: ExtractedFile;
  onDelete: () => void;
  isLast: boolean;
}

function ExtractedFileRow({ file, onDelete, isLast }: ExtractedRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(async () => {
    try { await FileSystem.deleteAsync(file.filePath, { idempotent: true }); } catch (_) {}
    onDelete();
  }, [file.filePath, onDelete]);

  return (
    <View style={[styles.extractedRow, !isLast && styles.extractedRowBorder]}>
      <View style={styles.extractedIcon}>
        <MaterialCommunityIcons name="file-video-outline" size={13} color={Colors.cream50} />
      </View>
      <View style={styles.extractedInfo}>
        <Text style={styles.extractedName} numberOfLines={1}>{file.filename}</Text>
        {file.size > 0 && (
          <Text style={styles.extractedSize}>{formatBytes(file.size)}</Text>
        )}
      </View>
      <View style={styles.extractedActions}>
        <TouchableOpacity style={styles.extractedBtn} onPress={() => playFile(file.filePath)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="play" size={13} color={Colors.cream} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.extractedBtn, confirmDelete && styles.extractedBtnDanger]}
          onPress={() => {
            if (confirmDelete) { handleDelete(); }
            else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 2500); }
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={confirmDelete ? 'check' : 'trash-can-outline'}
            size={13}
            color={confirmDelete ? Colors.cream : Colors.cream50}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Download item card ───────────────────────────────────────────────────────
interface DlCardProps {
  item: DownloadedItem;
  onDelete: () => void;
}

function DlCard({ item, onDelete }: DlCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localFiles, setLocalFiles] = useState<ExtractedFile[]>(item.extractedFiles ?? []);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleExpand = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!expanded && item.format === 'zip') {
      try {
        const extractDir = item.folderPath + 'extracted/';
        const entries = await FileSystem.readDirectoryAsync(extractDir).catch(() => []);
        const fresh: ExtractedFile[] = [];
        for (const entry of entries) {
          if (VIDEO_EXT.some((e) => entry.toLowerCase().endsWith(e))) {
            const fp = extractDir + entry;
            const info = await FileSystem.getInfoAsync(fp, { size: true });
            if (info.exists) {
              fresh.push({ filename: entry, filePath: fp, size: (info as any).size ?? 0 });
            }
          }
        }
        setLocalFiles(fresh.sort((a, b) => a.filename.localeCompare(b.filename)));
      } catch (_) {
        setLocalFiles(item.extractedFiles ?? []);
      }
    }
    setExpanded((v) => !v);
  }, [expanded, item]);

  const removeFile = useCallback((filePath: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLocalFiles((prev) => prev.filter((f) => f.filePath !== filePath));
  }, []);

  const isZip = item.format === 'zip';
  const fileCount = localFiles.length;

  return (
    <View style={styles.dlCard}>
      <View style={styles.dlCardHeader}>
        <View style={styles.dlThumb}>
          <MaterialCommunityIcons
            name={isZip ? 'zip-box-outline' : 'file-video-outline'}
            size={20}
            color={Colors.cream50}
          />
        </View>
        <View style={styles.dlInfo}>
          <View style={styles.dlBadgeRow}>
            <View style={[styles.dlBadge, isZip ? styles.badgeZip : styles.badgeMp4]}>
              <Text style={[styles.dlBadgeText, isZip ? styles.badgeZipText : styles.badgeMp4Text]}>
                {isZip ? 'ZIP' : 'MP4'}
              </Text>
            </View>
          </View>
          <Text style={styles.dlTitle} numberOfLines={1}>{item.titleName}</Text>
          <Text style={styles.dlSub} numberOfLines={1}>
            {isZip ? `${fileCount} video${fileCount !== 1 ? 's' : ''} · ${item.size}` : item.size}
          </Text>
        </View>
        <View style={styles.dlActions}>
          {!isZip && localFiles.length > 0 && (
            <TouchableOpacity style={styles.dlBtn} onPress={() => playFile(localFiles[0].filePath)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="play" size={16} color={Colors.cream} />
            </TouchableOpacity>
          )}
          {isZip && (
            <TouchableOpacity style={styles.dlBtn} onPress={handleExpand} activeOpacity={0.7}>
              <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={Colors.cream} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dlBtn} onPress={() => openFolder(item.folderPath)} activeOpacity={0.7}>
            <MaterialCommunityIcons name="folder-open-outline" size={16} color={Colors.cream50} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dlBtn, deleteConfirm && styles.dlBtnDanger]}
            onPress={() => {
              if (deleteConfirm) { onDelete(); }
              else { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 2500); }
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={deleteConfirm ? 'check' : 'trash-can-outline'}
              size={16}
              color={deleteConfirm ? Colors.cream : Colors.cream50}
            />
          </TouchableOpacity>
        </View>
      </View>

      {isZip && expanded && (
        <View style={styles.extractedList}>
          {localFiles.length === 0 ? (
            <View style={styles.extractedEmpty}>
              <Text style={styles.extractedEmptyText}>No video files found</Text>
            </View>
          ) : (
            localFiles.map((f, i) => (
              <ExtractedFileRow
                key={f.filePath}
                file={f}
                isLast={i === localFiles.length - 1}
                onDelete={() => removeFile(f.filePath)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DownloadsScreen() {
  const { items, remove } = useDownloadsStore();
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  useEffect(() => {
    loadAdminUnlocked().then((val) => { if (val) setAdminUnlocked(true); });
  }, []);

  const handleAdminUnlock = useCallback(() => {
    setAdminUnlocked(true);
    saveAdminUnlocked(true);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Downloads</Text>
          <Text style={styles.pageSub}>
            {items.length > 0 ? `${items.length} title${items.length !== 1 ? 's' : ''}` : 'Nothing yet'}
          </Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <StorageWidget onUnlock={handleAdminUnlock} adminUnlocked={adminUnlocked} />
          {adminUnlocked && (
            <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/(admin)')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="shield-crown" size={16} color={Colors.surface} />
              <Text style={styles.adminButtonText}>Admin Panel</Text>
            </TouchableOpacity>
          )}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="tray-arrow-down" size={28} color={Colors.cream30} />
              </View>
              <Text style={styles.emptyTitle}>Nothing downloaded yet</Text>
              <Text style={styles.emptySub}>Download titles from the Home tab and they'll appear here.</Text>
            </View>
          ) : (
            items.map((item) => (
              <DlCard key={item.id} item={item} onDelete={() => remove(item.id)} />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, flexShrink: 0 },
  pageTitle: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.cream, letterSpacing: -0.05 * 22, marginBottom: 2 },
  pageSub: { fontFamily: Fonts.light, fontSize: 11, color: Colors.cream50, letterSpacing: 0.02 * 11 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 8, paddingBottom: 100 },
  adminButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.cream, borderRadius: 12, paddingVertical: 12 },
  adminButtonText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.surface, letterSpacing: 0.3 },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: Colors.cream10, borderWidth: 1, borderColor: Colors.cream20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: Fonts.extraBold, fontSize: 15, color: Colors.cream, letterSpacing: -0.03 * 15 },
  emptySub: { fontFamily: Fonts.light, fontSize: 12, color: Colors.cream50, lineHeight: 18, textAlign: 'center' },
  dlCard: { backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.cream10, borderRadius: 18, overflow: 'hidden' },
  dlCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 10 },
  dlThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.cream10, borderWidth: 1, borderColor: Colors.cream20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dlInfo: { flex: 1, minWidth: 0, gap: 2 },
  dlBadgeRow: { flexDirection: 'row', gap: 5, marginBottom: 2 },
  dlBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  dlBadgeText: { fontFamily: Fonts.bold, fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
  badgeZip: { backgroundColor: Colors.cream10, borderColor: Colors.cream20 },
  badgeZipText: { color: Colors.cream80 },
  badgeMp4: { backgroundColor: Colors.cream20, borderColor: Colors.cream30 },
  badgeMp4Text: { color: Colors.cream },
  dlTitle: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.cream, letterSpacing: -0.02 * 13 },
  dlSub: { fontFamily: Fonts.light, fontSize: 10, color: Colors.cream50 },
  dlActions: { flexDirection: 'row', gap: 5, flexShrink: 0 },
  dlBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.cream10, borderWidth: 1, borderColor: Colors.cream20, alignItems: 'center', justifyContent: 'center' },
  dlBtnDanger: { backgroundColor: Colors.cream20, borderColor: Colors.cream30 },
  extractedList: { borderTopWidth: 1, borderTopColor: Colors.cream10 },
  extractedEmpty: { padding: 14, alignItems: 'center' },
  extractedEmptyText: { fontFamily: Fonts.light, fontSize: 11, color: Colors.cream30 },
  extractedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 13, paddingLeft: 16 },
  extractedRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.cream10 },
  extractedIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: Colors.cream10, borderWidth: 1, borderColor: Colors.cream20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  extractedInfo: { flex: 1, minWidth: 0 },
  extractedName: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.cream, letterSpacing: -0.01 * 11 },
  extractedSize: { fontFamily: Fonts.light, fontSize: 10, color: Colors.cream50, marginTop: 1 },
  extractedActions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  extractedBtn: { width: 26, height: 26, borderRadius: 7, backgroundColor: Colors.cream10, borderWidth: 1, borderColor: Colors.cream20, alignItems: 'center', justifyContent: 'center' },
  extractedBtnDanger: { backgroundColor: Colors.cream20, borderColor: Colors.cream30 },
});
