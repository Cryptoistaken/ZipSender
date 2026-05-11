import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation, useAction } from 'convex/react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

interface UrlRow {
  id: string;
  url: string;
  format: 'zip' | 'video';
  size: string;
  resolvedName: string;
  fetching: boolean;
}

interface Props {
  onClose: () => void;
}

function extractFilename(url: string): string {
  const idMatch = url.match(DRIVE_ID_RE);
  if (idMatch) return `drive_${idMatch[1].slice(0, 8)}.file`;
  const segments = url.split('/');
  return segments[segments.length - 1] || 'file';
}

export default function AddSeriesSheet({ onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'movie' | 'series'>('series');
  const [urlRows, setUrlRows] = useState<UrlRow[]>([
    { id: '1', url: '', format: 'zip', size: '', resolvedName: '', fetching: false },
  ]);
  const [loading, setLoading] = useState(false);

  const createTitle = useMutation(api.titles.create);
  const addPart = useMutation(api.parts.add);
  const getFileMeta = useAction(api.drive.getFileMeta);

  const fetchMeta = async (rowId: string, url: string) => {
    if (!url.trim() || !DRIVE_ID_RE.test(url)) return;
    updateRow(rowId, { fetching: true });
    try {
      const meta = await getFileMeta({ driveUrl: url.trim() });
      updateRow(rowId, {
        fetching: false,
        format: meta.format as 'zip' | 'video',
        size: meta.size ?? '',
        resolvedName: meta.name ?? '',
      });
    } catch {
      updateRow(rowId, { fetching: false });
    }
  };

  const addUrlRow = () => {
    setUrlRows((r) => [
      ...r,
      { id: Date.now().toString(), url: '', format: 'zip', size: '', resolvedName: '', fetching: false },
    ]);
  };

  const updateRow = (id: string, patch: Partial<UrlRow>) => {
    setUrlRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const removeRow = (id: string) => {
    if (urlRows.length === 1) return;
    setUrlRows((rows) => rows.filter((r) => r.id !== id));
  };

  const handlePublish = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a title name.');
      return;
    }
    const filledRows = urlRows.filter((r) => r.url.trim());
    if (filledRows.length === 0) {
      Alert.alert('URL required', 'Add at least one file URL.');
      return;
    }
    setLoading(true);
    try {
      const titleId = await createTitle({ name: name.trim(), type });
      for (const row of filledRows) {
        const driveFileId = row.url.match(DRIVE_ID_RE)?.[1] ?? row.url;
        const filename = row.resolvedName || extractFilename(row.url);
        await addPart({
          titleId,
          label: filename,
          filename,
          driveFileId,
          driveUrl: row.url,
          format: row.format,
          size: row.size.trim() || undefined,
        });
      }
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to publish. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sheetTitle}>New title</Text>

      <Text style={styles.fieldLabel}>TITLE NAME</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. True Beauty Season 1"
        placeholderTextColor={Colors.cream30}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.fieldLabel}>TYPE</Text>
      <View style={styles.typeRow}>
        {(['movie', 'series'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typePill, type === t && styles.typePillActive]}
            onPress={() => setType(t)}
          >
            <Text
              style={[
                styles.typePillText,
                type === t && styles.typePillTextActive,
              ]}
            >
              {t === 'movie' ? '🎬 Movie' : '📺 Series'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>FILES</Text>
      {urlRows.map((row, i) => (
        <View key={row.id} style={styles.urlBlock}>
          <View style={styles.urlBlockHeader}>
            <Text style={styles.urlBlockNum}>File {i + 1}</Text>
            {urlRows.length > 1 && (
              <TouchableOpacity onPress={() => removeRow(row.id)}>
                <MaterialCommunityIcons
                  name="close"
                  size={16}
                  color={Colors.cream30}
                />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.formatRow}>
            {(['zip', 'video'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.fmtPill,
                  row.format === f && styles.fmtPillActive,
                ]}
                onPress={() => updateRow(row.id, { format: f })}
              >
                <Text
                  style={[
                    styles.fmtPillText,
                    row.format === f && styles.fmtPillTextActive,
                  ]}
                >
                  {f === 'zip' ? 'ZIP' : 'Video'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Google Drive URL"
            placeholderTextColor={Colors.cream30}
            value={row.url}
            onChangeText={(v) => updateRow(row.id, { url: v })}
            onBlur={() => fetchMeta(row.id, row.url)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {row.fetching && (
            <ActivityIndicator size="small" color={Colors.cream50} style={{ alignSelf: 'flex-start', marginLeft: 4 }} />
          )}
          {!row.fetching && (row.resolvedName || row.url.trim()) ? (
            <Text style={styles.preview} numberOfLines={1}>
              → {row.resolvedName || extractFilename(row.url)}
            </Text>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Size (e.g. 3.8 GB) — optional"
            placeholderTextColor={Colors.cream30}
            value={row.size}
            onChangeText={(v) => updateRow(row.id, { size: v })}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addFileBtn} onPress={addUrlRow}>
        <MaterialCommunityIcons name="plus" size={14} color={Colors.cream50} />
        <Text style={styles.addFileBtnText}>Add file URL</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishBtn, loading && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={loading}
        >
          <Text style={styles.publishBtnText}>
            {loading ? 'Publishing…' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 40 },
  sheetTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.cream30,
    letterSpacing: 0.8,
    marginBottom: -4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.cream,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
  },
  typePillActive: { backgroundColor: Colors.cream20, borderColor: Colors.cream50 },
  typePillText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream50,
  },
  typePillTextActive: { color: Colors.cream },
  urlBlock: {
    gap: 8,
    padding: 12,
    backgroundColor: Colors.card2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },
  urlBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urlBlockNum: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream50,
    letterSpacing: 0.3,
  },
  formatRow: { flexDirection: 'row', gap: 6 },
  fmtPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },
  fmtPillActive: { backgroundColor: Colors.cream20, borderColor: Colors.cream50 },
  fmtPillText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream30,
  },
  fmtPillTextActive: { color: Colors.cream },
  preview: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream50,
    paddingHorizontal: 4,
  },
  addFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    borderStyle: 'dashed',
    paddingVertical: 12,
  },
  addFileBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream50,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream50,
  },
  publishBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.cream,
    alignItems: 'center',
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.surface,
  },
});