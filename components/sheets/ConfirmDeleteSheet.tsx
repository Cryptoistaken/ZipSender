import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation } from 'convex/react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

type Mode = 'series' | 'part';

interface Props {
  mode: Mode;
  id: Id<'titles'> | Id<'parts'>;
  label: string;
  onClose: () => void;
}

export default function ConfirmDeleteSheet({ mode, id, label, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const archiveTitle = useMutation(api.titles.archive);
  const removePart = useMutation(api.parts.remove);

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (mode === 'series') {
        await archiveTitle({ titleId: id as Id<'titles'> });
      } else {
        await removePart({ partId: id as Id<'parts'> });
      }
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to delete. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetView style={styles.container}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={32}
          color={Colors.cream50}
        />
      </View>
      <Text style={styles.title}>
        Delete {mode === 'series' ? 'title' : 'file'}?
      </Text>
      <Text style={styles.body} numberOfLines={2}>
        "{label}" will be hidden from the catalog
        {mode === 'series' ? ' (and all its files removed)' : ''}.
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, loading && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={loading}
        >
          <Text style={styles.deleteBtnText}>
            {loading ? 'Deleting…' : 'Delete'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 28,
    gap: 14,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.cream10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Colors.cream,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.cream50,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
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
  deleteBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.cream30,
    alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream,
  },
});