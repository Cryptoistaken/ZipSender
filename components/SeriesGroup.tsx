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
  // Fix: removed `as Doc<'parts'>[] | undefined` cast — caused "type instantiation
  // is excessively deep" error. useQuery already returns the correct inferred type.
  const partsResult = useQuery(api.parts.listByTitle, { titleId: title._id });
  const parts: Doc<'parts'>[] | undefined = partsResult ?? undefined;

  // Client-side format filter
  const visible =
    formatFilter === 'all'
      ? true
      : parts?.some((p: Doc<'parts'>) => p.format === formatFilter);

  if (!visible && parts !== undefined) return null;

  const icon = title.type === 'series' ? 'playlist-play' : 'video-outline';

  return (
    // matches prototype .series-group
    <View style={styles.group}>
      {/* Header row — matches .series-header */}
      <View style={styles.header}>
        {/* Type icon box — matches .series-type-icon */}
        <View style={styles.typeIcon}>
          <MaterialCommunityIcons name={icon} size={20} color={Colors.cream50} />
        </View>

        <View style={styles.info}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {title.type === 'movie' ? 'Movie' : 'Series'}
              </Text>
            </View>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>{title.name}</Text>
          <Text style={styles.subText}>
            {title.partCount} {title.partCount === 1 ? 'file' : 'files'}
            {title.totalSize ? ' · ' + title.totalSize : ''}
          </Text>
        </View>

        {/* Action buttons — matches .series-actions .icon-btn */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onAddPart} activeOpacity={0.7}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.cream50} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onEdit} activeOpacity={0.7}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.cream50} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={onDelete} activeOpacity={0.7}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.cream50} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Part list — collapsible */}
      {parts !== undefined && parts.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.expandRow}
            onPress={() => setExpanded((e) => !e)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandLabel}>
              {expanded ? 'Hide files' : `Show ${parts.length} file${parts.length !== 1 ? 's' : ''}`}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.cream30}
            />
          </TouchableOpacity>

          {expanded && (
            // matches .part-list
            <View style={styles.partList}>
              {parts.map((part: Doc<'parts'>) => (
                <PartRow
                  key={part._id}
                  part={part}
                  onDelete={() => onDeletePart(part._id, part.filename)}
                />
              ))}
              {/* matches .add-part-row */}
              <TouchableOpacity style={styles.addPartRow} onPress={onAddPart} activeOpacity={0.7}>
                <MaterialCommunityIcons name="plus" size={14} color={Colors.cream} />
                <Text style={styles.addPartLabel}>Add another file…</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // matches .series-group
  group: {
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // matches .series-header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    paddingRight: 13,
  },
  // matches .series-type-icon
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0, gap: 3 },
  badgeRow: { flexDirection: 'row', gap: 5, marginBottom: 1 },
  badge: {
    backgroundColor: Colors.cream10,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 8,
    color: Colors.cream50,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    fontFamily: Fonts.extraBold,
    fontSize: 13,
    color: Colors.cream,
    letterSpacing: -0.03 * 13,
  },
  subText: {
    fontFamily: Fonts.light,
    fontSize: 10,
    color: Colors.cream50,
    marginTop: 1,
  },
  // matches .series-actions
  actions: { flexDirection: 'row', gap: 5, flexShrink: 0 },
  // matches .icon-btn
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {},

  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
  },
  expandLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.cream30,
  },

  // matches .part-list
  partList: {
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
  },

  // matches .add-part-row
  addPartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.cream10,
    opacity: 0.55,
  },
  addPartLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.cream,
    letterSpacing: 0.01 * 11,
  },
});
