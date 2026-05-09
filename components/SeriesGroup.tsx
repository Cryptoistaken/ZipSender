import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../convex/_generated/api';
import { Doc, Id } from '../convex/_generated/dataModel';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import PartRow from './PartRow';

interface Props {
  title: Doc<'titles'>;
  formatFilter: 'all' | 'zip' | 'video';
  onAddPart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeletePart: (partId: Id<'parts'>, filename: string) => void;
}

export default function SeriesGroup({
  title,
  formatFilter,
  onAddPart,
  onEdit,
  onDelete,
  onDeletePart,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const parts = useQuery(api.parts.listByTitle, { titleId: title._id });

  // Client-side format filter
  const visible =
    formatFilter === 'all'
      ? true
      : parts?.some((p) => p.format === formatFilter);

  if (!visible && parts !== undefined) return null;

  const icon =
    title.type === 'series' ? 'playlist-play' : 'video-outline';

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <MaterialCommunityIcons name={icon} size={20} color={Colors.cream50} />
        <View style={styles.headerInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {title.type === 'movie' ? 'Movie' : 'Series'}
              </Text>
            </View>
          </View>
          <Text style={styles.titleText}>{title.name}</Text>
          <Text style={styles.subtitleText}>
            {title.partCount} {title.partCount === 1 ? 'file' : 'files'}
            {title.totalSize ? ' · ' + title.totalSize : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onAddPart}>
            <MaterialCommunityIcons name="plus" size={18} color={Colors.cream50} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={Colors.cream50}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={Colors.cream50}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible part list */}
      <TouchableOpacity
        style={styles.expandRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Text style={styles.expandLabel}>
          {expanded ? 'Hide files' : 'Show files'}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.cream30}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.partList}>
          {parts === undefined ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : (
            parts.map((part) => (
              <PartRow
                key={part._id}
                part={part}
                onDelete={() => onDeletePart(part._id, part.filename)}
              />
            ))
          )}
          <TouchableOpacity style={styles.addFileRow} onPress={onAddPart}>
            <MaterialCommunityIcons
              name="plus"
              size={14}
              color={Colors.cream30}
            />
            <Text style={styles.addFileText}>Add another file…</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cream10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    alignItems: 'flex-start',
  },
  headerInfo: { flex: 1, gap: 4 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: {
    backgroundColor: Colors.cream10,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.cream50,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  titleText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.cream,
  },
  subtitleText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream30,
  },
  actions: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 6 },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
  },
  expandLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.cream30,
  },
  partList: {
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
    gap: 1,
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.cream30,
    padding: 12,
  },
  addFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
    borderStyle: 'dashed',
  },
  addFileText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.cream30,
  },
});
