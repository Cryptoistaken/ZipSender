import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Doc } from '../convex/_generated/dataModel';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

interface Props {
  part: Doc<'parts'>;
  onDelete: () => void;
}

export default function PartRow({ part, onDelete }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.formatBadge}>
        <Text style={styles.formatText}>
          {part.format === 'zip' ? 'ZIP' : 'MP4'}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.filename} numberOfLines={1}>
          {part.filename}
        </Text>
        {part.size ? (
          <Text style={styles.size}>{part.size}</Text>
        ) : null}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={16}
          color={Colors.cream30}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.card2,
  },
  formatBadge: {
    backgroundColor: Colors.cream10,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  formatText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.cream50,
    letterSpacing: 0.3,
  },
  info: { flex: 1 },
  filename: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.cream,
  },
  size: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.cream30,
    marginTop: 2,
  },
  deleteBtn: { padding: 4 },
});
