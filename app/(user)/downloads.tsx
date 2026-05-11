import { useCallback, useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Linking,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import StorageWidget from "../../components/StorageWidget";
import {
  useDownloadsStore,
  DownloadedItem,
  ExtractedFile,
} from "../../store/downloads";
import { deletePublicFolder } from "../../hooks/useSafDownloads";
import { Colors } from "../../constants/colors";
import { Fonts } from "../../constants/fonts";
import {
  loadAdminUnlocked,
  saveAdminUnlocked,
} from "../../hooks/useSecretAdminTap";

const VIDEO_EXT = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v"];

function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim();
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const TAG = "[Downloads]";

let _intentActive = false;

// When user presses back in the video player, the intent closes without
// resolving our promise. AppState going "active" is the reliable signal
// that the external activity is gone — reset the lock here.
AppState.addEventListener("change", (state) => {
  if (state === "active" && _intentActive) {
    _intentActive = false;
    console.log(`${TAG} AppState active — intent lock reset`);
  }
});

async function playFile(filePath: string) {
  if (_intentActive) {
    console.log(`${TAG} playFile skipped — intent active`);
    return;
  }
  _intentActive = true;
  const decoded = decodeURIComponent(filePath);
  const fileUri = decoded.startsWith("file://") ? decoded : `file://${decoded}`;
  console.log(`${TAG} playFile → ${fileUri}`);
  try {
    if (Platform.OS === "android") {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      console.log(`${TAG} contentUri → ${contentUri}`);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 268435457,
        type: "video/*",
      });
    } else {
      await Linking.openURL(fileUri);
    }
  } catch (e: any) {
    console.warn(`${TAG} playFile failed: ${e?.message ?? e}`);
  } finally {
    _intentActive = false;
  }
}

interface DeleteModalProps {
  visible: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({
  visible,
  title,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onCancel}>
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        <Animated.View
          style={[
            styles.modalSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.confirmIconBox}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={22}
              color={Colors.cream50}
            />
          </View>
          <Text style={styles.confirmTitle}>Delete from device?</Text>
          <Text style={styles.confirmBody}>
            This will permanently delete{" "}
            <Text style={{ color: Colors.cream }}>{title}</Text> and all its
            files from your device. This cannot be undone.
          </Text>
          <View style={styles.confirmBtnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.destructBtn}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.destructBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

interface ExtractedRowProps {
  file: ExtractedFile;
  onDelete: () => void;
  isLast: boolean;
}

function ExtractedFileRow({ file, onDelete, isLast }: ExtractedRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteModal(false);
    onDelete();
    try {
      const uri = file.filePath.startsWith("file://")
        ? file.filePath
        : `file://${file.filePath}`;
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e: any) {
      console.warn(`${TAG} delete file failed: ${e?.message ?? e}`);
    }
  }, [file.filePath, onDelete]);

  return (
    <>
      <DeleteModal
        visible={showDeleteModal}
        title={file.filename}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      <View style={[styles.extractedRow, !isLast && styles.extractedRowBorder]}>
        <View style={styles.extractedIcon}>
          <MaterialCommunityIcons
            name="file-video-outline"
            size={13}
            color={Colors.cream50}
          />
        </View>
        <View style={styles.extractedInfo}>
          <Text style={styles.extractedName} numberOfLines={1}>
            {file.filename}
          </Text>
          {file.size > 0 && (
            <Text style={styles.extractedSize}>{formatBytes(file.size)}</Text>
          )}
        </View>
        <View style={styles.extractedActions}>
          <TouchableOpacity
            style={styles.extractedBtn}
            onPress={() => playFile(file.filePath)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="play"
              size={13}
              color={Colors.cream}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.extractedBtn}
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={13}
              color={Colors.cream50}
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

interface DlCardProps {
  item: DownloadedItem;
  onDelete: () => void;
}

function DlCard({ item, onDelete }: DlCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localFiles, setLocalFiles] = useState<ExtractedFile[]>(
    item.extractedFiles ?? [],
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const refreshFiles = useCallback(async (): Promise<ExtractedFile[]> => {
    try {
      const extractDir = item.folderPath + "extracted/";
      const entries = await FileSystem.readDirectoryAsync(extractDir).catch(
        () => [],
      );
      const fresh: ExtractedFile[] = [];
      for (const entry of entries) {
        if (VIDEO_EXT.some((e) => entry.toLowerCase().endsWith(e))) {
          const fp = extractDir + entry;
          const info = await FileSystem.getInfoAsync(fp, { size: true });
          if (info.exists) {
            fresh.push({
              filename: entry,
              filePath: fp,
              size: (info as any).size ?? 0,
            });
          }
        }
      }
      return fresh.sort((a, b) => a.filename.localeCompare(b.filename));
    } catch {
      return item.extractedFiles ?? [];
    }
  }, [item]);

  const handleExpand = useCallback(async () => {
    if (!expanded && item.format === "zip") {
      const fresh = await refreshFiles();
      setLocalFiles(fresh);
    }
    setExpanded((v) => !v);
  }, [expanded, item.format, refreshFiles]);

  const removeFile = useCallback((filePath: string) => {
    setLocalFiles((prev) => prev.filter((f) => f.filePath !== filePath));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteModal(false);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onDelete();
    try {
      const folder = item.folderPath.startsWith("file://")
        ? item.folderPath
        : `file://${item.folderPath}`;
      await FileSystem.deleteAsync(folder, { idempotent: true });
    } catch (e: any) {
      console.warn(`${TAG} delete folder failed: ${e?.message ?? e}`);
    }
    try {
      await deletePublicFolder(sanitizeName(item.titleName));
    } catch {}
  }, [item.folderPath, item.titleName, fadeAnim, onDelete]);

  const isZip = item.format === "zip";
  const fileCount = localFiles.length;
  const isSingleVideoZip = isZip && fileCount === 1;

  const folderLabel = item.folderPath
    .replace(FileSystem.documentDirectory ?? "", "ZipSender/")
    .replace(/\/$/, "");

  return (
    <>
      <DeleteModal
        visible={showDeleteModal}
        title={item.titleName}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
      <Animated.View style={[styles.dlCard, { opacity: fadeAnim }]}>
        <TouchableOpacity
          activeOpacity={isZip && !isSingleVideoZip ? 0.7 : 1}
          onPress={isZip && !isSingleVideoZip ? handleExpand : undefined}
          style={styles.dlCardHeader}
        >
          <View style={styles.dlThumb}>
            <MaterialCommunityIcons
              name={isZip ? "zip-box-outline" : "file-video-outline"}
              size={20}
              color={Colors.cream50}
            />
          </View>
          <View style={styles.dlInfo}>
            <View style={styles.dlBadgeRow}>
              <View
                style={[
                  styles.dlBadge,
                  isZip ? styles.badgeZip : styles.badgeMp4,
                ]}
              >
                <Text
                  style={[
                    styles.dlBadgeText,
                    isZip ? styles.badgeZipText : styles.badgeMp4Text,
                  ]}
                >
                  {isZip ? "ZIP" : "MP4"}
                </Text>
              </View>
            </View>
            <Text style={styles.dlTitle} numberOfLines={1}>
              {item.titleName}
            </Text>
            <Text style={styles.dlSub} numberOfLines={1}>
              {isZip
                ? `${fileCount} video${fileCount !== 1 ? "s" : ""} · ${item.size}`
                : item.size}
            </Text>
          </View>
          <View style={styles.dlActions}>
            {!isZip && localFiles.length > 0 && (
              <TouchableOpacity
                style={styles.dlBtn}
                onPress={() => playFile(localFiles[0].filePath)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="play"
                  size={16}
                  color={Colors.cream}
                />
              </TouchableOpacity>
            )}
            {isSingleVideoZip && (
              <TouchableOpacity
                style={styles.dlBtn}
                onPress={() => playFile(localFiles[0].filePath)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="play"
                  size={16}
                  color={Colors.cream}
                />
              </TouchableOpacity>
            )}
            {isZip && !isSingleVideoZip && (
              <View style={styles.dlBtn} pointerEvents="none">
                <MaterialCommunityIcons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={17}
                  color={Colors.cream}
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.dlBtn}
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={Colors.cream50}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <View style={styles.dlPathRow}>
          <MaterialCommunityIcons
            name="folder-outline"
            size={11}
            color={Colors.cream30}
          />
          <Text style={styles.dlPath} numberOfLines={1}>
            {folderLabel}
          </Text>
        </View>
        {isZip && !isSingleVideoZip && expanded && (
          <View style={styles.extractedList}>
            {localFiles.length === 0 ? (
              <View style={styles.extractedEmpty}>
                <Text style={styles.extractedEmptyText}>
                  No video files found
                </Text>
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
      </Animated.View>
    </>
  );
}

export default function DownloadsScreen() {
  const { items, remove } = useDownloadsStore();
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  useEffect(() => {
    loadAdminUnlocked().then((val) => {
      if (val) setAdminUnlocked(true);
    });
  }, []);

  const handleAdminUnlock = useCallback(() => {
    setAdminUnlocked(true);
    saveAdminUnlocked(true);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Downloads</Text>
          <Text style={styles.pageSub}>
            {items.length > 0
              ? `${items.length} title${items.length !== 1 ? "s" : ""} · saved to app storage`
              : "Nothing downloaded yet"}
          </Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <StorageWidget
            onUnlock={handleAdminUnlock}
            adminUnlocked={adminUnlocked}
          />
          {adminUnlocked && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push("/(admin)")}
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
              <DlCard
                key={item.id}
                item={item}
                onDelete={() => remove(item.id)}
              />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.cream,
    borderRadius: 11,
    paddingVertical: 11,
    marginBottom: 4,
  },
  adminButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.surface,
  },
  emptyState: {
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  dlCard: {
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
    borderRadius: 20,
    overflow: "hidden",
  },
  dlCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
    paddingRight: 10,
  },
  dlThumb: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dlInfo: { flex: 1, minWidth: 0, gap: 2 },
  dlBadgeRow: { flexDirection: "row", gap: 5, marginBottom: 1 },
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
    textTransform: "uppercase",
  },
  badgeZip: { backgroundColor: Colors.cream10, borderColor: Colors.cream20 },
  badgeZipText: { color: Colors.cream80 },
  badgeMp4: { backgroundColor: Colors.cream20, borderColor: Colors.cream30 },
  badgeMp4Text: { color: Colors.cream },
  dlTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream,
    letterSpacing: -0.02 * 14,
  },
  dlSub: { fontFamily: Fonts.light, fontSize: 11, color: Colors.cream50 },
  dlActions: { flexDirection: "row", gap: 5, flexShrink: 0 },
  dlBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: "center",
    justifyContent: "center",
  },
  dlPathRow: { display: "none" },
  dlPath: { display: "none" },
  extractedList: { borderTopWidth: 1, borderTopColor: Colors.cream10 },
  extractedEmpty: { padding: 14, alignItems: "center" },
  extractedEmptyText: {
    fontFamily: Fonts.light,
    fontSize: 11,
    color: Colors.cream30,
  },
  extractedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
    paddingLeft: 16,
  },
  extractedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream10,
  },
  extractedIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  extractedInfo: { flex: 1, minWidth: 0 },
  extractedName: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream,
    letterSpacing: -0.01 * 11,
  },
  extractedSize: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream50,
    marginTop: 1,
  },
  extractedActions: { flexDirection: "row", gap: 4, flexShrink: 0 },
  extractedBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.cream20,
    padding: 16,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.cream20,
    alignSelf: "center",
    marginBottom: 20,
  },
  confirmIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: Colors.cream,
    letterSpacing: -0.03 * 16,
    marginBottom: 6,
  },
  confirmBody: {
    fontFamily: Fonts.light,
    fontSize: 12,
    color: Colors.cream50,
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmBtnRow: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    backgroundColor: Colors.cream10,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  cancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream80,
  },
  destructBtn: {
    flex: 1,
    backgroundColor: Colors.cream20,
    borderRadius: 11,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.cream30,
    alignItems: "center",
  },
  destructBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream,
  },
});