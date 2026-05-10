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
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

const DRIVE_ID_RE = /(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{25,})/;

interface Props {
  titleId: Id<'titles'>;
  onClose: () => void;
}

function extractFilename(url: string): string {
  const id = url.match(DRIVE_ID_RE)?.[1];
  if (id) return `drive_${id.slice(0, 8)}.file`;
  const parts = url.split('/');
  return parts[parts.length - 1] || 'file';
}

export default function AddPartSheet({ titleId, onClose }: Props) {
  const [format, setFormat] = useState<'zip' | 'video'>('zip');
  const [url, setUrl] = useState('');
  const [size, setSize] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  const addPart = useMutation(api.parts.add);
  const getFileMeta = useAction(api.drive.getFileMeta);

  const fetchMeta = async (raw: string) => {
    if (!raw.trim() || !DRIVE_ID_RE.test(raw)) return;
    setFetching(true);
    try {
      const meta = await getFileMeta({ driveUrl: raw.trim() });
      setFormat(meta.format as 'zip' | 'video');
      if (meta.size) setSize(meta.size);
      if (meta.name) setResolvedName(meta.name);
    } catch {
      // ignore — admin can set manually
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = async () => {
    if (!url.trim()) {
      Alert.alert('URL required', 'Paste a Google Drive share URL.');
      return;
    }
    const driveFileId = url.match(DRIVE_ID_RE)?.[1] ?? url;
    const filename = resolvedName || extractFilename(url);
    setLoading(true);
    try {
      await addPart({
        titleId,
        label: filename,
        filename,
        driveFileId,
        driveUrl: url.trim(),
        format,
        size: size.trim() || undefined,
      });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to add file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetView style={styles.container}>
      <Text style={styles.sheetTitle}>Add file</Text>

      <Text style={styles.fieldLabel}>FORMAT</Text>
      <View style={styles.formatRow}>
        {(['zip', 'video'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.fmtPill, format === f && styles.fmtPillActive]}
            onPress={() => setFormat(f)}
          >
            <Text
              style={[
                styles.fmtPillText,
                format === f && styles.fmtPillTextActive,
              ]}
            >
              {f === 'zip' ? 'ZIP' : 'Video'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>GOOGLE DRIVE URL</Text>
      <TextInput
        style={styles.input}
        placeholder="https://drive.google.com/file/d/..."
        placeholderTextColor={Colors.cream30}
        value={url}
        onChangeText={setUrl}
        onBlur={() => fetchMeta(url)}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {fetching && (
        <ActivityIndicator size="small" color={Colors.cream50} style={{ alignSelf: 'flex-start', marginLeft: 4 }} />
      )}
      {!fetching && url.trim() ? (
        <Text style={styles.preview}>→ {resolvedName || extractFilename(url)}</Text>
      ) : null}

      <Text style={styles.fieldLabel}>SIZE (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 3.8 GB"
        placeholderTextColor={Colors.cream30}
        value={size}
        onChangeText={setSize}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, loading && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          <Text style={styles.addBtnText}>
            {loading ? 'Adding…' : 'Add file'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  sheetTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.cream,
    marginBottom: 4,
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
  formatRow: { flexDirection: 'row', gap: 8 },
  fmtPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
  },
  fmtPillActive: { backgroundColor: Colors.cream20, borderColor: Colors.cream50 },
  fmtPillText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.cream50,
  },
  fmtPillTextActive: { color: Colors.cream },
  preview: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream50,
    paddingHorizontal: 4,
    marginTop: -4,
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
  addBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.cream,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.surface,
  },
});
