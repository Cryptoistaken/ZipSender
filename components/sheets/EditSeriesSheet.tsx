import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface Props {
  titleId: Id<'titles'>;
  currentName: string;
  onClose: () => void;
}

export default function EditSeriesSheet({
  titleId,
  currentName,
  onClose,
}: Props) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const rename = useMutation(api.titles.rename);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setLoading(true);
    try {
      await rename({ titleId, name: name.trim() });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to rename. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetView style={styles.container}>
      <Text style={styles.sheetTitle}>Rename title</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={Colors.cream30}
        autoFocus
      />

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>
            {loading ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  sheetTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.cream,
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
  actionRow: { flexDirection: 'row', gap: 10 },
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
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.cream,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.surface,
  },
});