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
    // matches prototype .part-row
    <View style={styles.row}>
      {/* Part icon — matches .part-icon */}
      <View style={styles.partIcon}>
        <MaterialCommunityIcons
          name={(part.format === 'zip' ? 'zip-box-outline' : 'film-outline') as any}
          size={14}
          color={Colors.cream50}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{part.filename}</Text>
        {part.size ? (
          <Text style={styles.meta}>{part.size}</Text>
        ) : null}
      </View>

      {/* Actions — matches .part-actions .part-btn */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.partBtn} onPress={onDelete} activeOpacity={0.7}>
          <MaterialCommunityIcons name="trash-can-outline" size={14} color={Colors.cream30} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // matches .part-row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingLeft: 16,
    paddingRight: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
  },
  // matches .part-icon
  partIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream,
    letterSpacing: -0.01 * 11,
  },
  meta: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream50,
    marginTop: 1,
  },
  actions: { flexDirection: 'row', gap: 4 },
  // matches .part-btn
  partBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Colors.cream10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
