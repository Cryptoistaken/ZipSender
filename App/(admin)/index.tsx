import { useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from 'convex/react';
import BottomSheet from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import SeriesGroup from '../../components/SeriesGroup';
import AddSeriesSheet from '../../components/sheets/AddSeriesSheet';
import AddPartSheet from '../../components/sheets/AddPartSheet';
import EditSeriesSheet from '../../components/sheets/EditSeriesSheet';
import ConfirmDeleteSheet from '../../components/sheets/ConfirmDeleteSheet';

type FilterType = 'all' | 'zip' | 'video';

type SheetMode =
  | { type: 'none' }
  | { type: 'addSeries' }
  | { type: 'addPart'; titleId: Id<'titles'> }
  | { type: 'editSeries'; titleId: Id<'titles'>; currentName: string }
  | { type: 'deleteSeries'; titleId: Id<'titles'>; titleName: string }
  | { type: 'deletePart'; partId: Id<'parts'>; filename: string };

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'zip', label: 'ZIP' },
  { key: 'video', label: 'MP4' },
];

export default function AdminScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sheet, setSheet] = useState<SheetMode>({ type: 'none' });
  const bottomSheetRef = useRef<BottomSheet>(null);

  const titles = useQuery(api.titles.list);

  const openSheet = useCallback((mode: SheetMode) => {
    setSheet(mode);
    bottomSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setTimeout(() => setSheet({ type: 'none' }), 300);
  }, []);

  const renderSheet = () => {
    switch (sheet.type) {
      case 'addSeries':
        return <AddSeriesSheet onClose={closeSheet} />;
      case 'addPart':
        return <AddPartSheet titleId={sheet.titleId} onClose={closeSheet} />;
      case 'editSeries':
        return (
          <EditSeriesSheet
            titleId={sheet.titleId}
            currentName={sheet.currentName}
            onClose={closeSheet}
          />
        );
      case 'deleteSeries':
        return (
          <ConfirmDeleteSheet
            mode="series"
            id={sheet.titleId}
            label={sheet.titleName}
            onClose={closeSheet}
          />
        );
      case 'deletePart':
        return (
          <ConfirmDeleteSheet
            mode="part"
            id={sheet.partId}
            label={sheet.filename}
            onClose={closeSheet}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                filter === f.key && styles.pillTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {titles === undefined ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : titles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No titles yet</Text>
            <Text style={styles.emptyBody}>
              Tap the + button to add your first title.
            </Text>
          </View>
        ) : (
          titles.map((title) => (
            <SeriesGroup
              key={title._id}
              title={title}
              formatFilter={filter}
              onAddPart={() =>
                openSheet({ type: 'addPart', titleId: title._id })
              }
              onEdit={() =>
                openSheet({
                  type: 'editSeries',
                  titleId: title._id,
                  currentName: title.name,
                })
              }
              onDelete={() =>
                openSheet({
                  type: 'deleteSeries',
                  titleId: title._id,
                  titleName: title.name,
                })
              }
              onDeletePart={(partId, filename) =>
                openSheet({ type: 'deletePart', partId, filename })
              }
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => openSheet({ type: 'addSeries' })}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={26} color={Colors.surface} />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['70%', '92%']}
        enablePanDownToClose
        onClose={closeSheet}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        {renderSheet()}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },
  pillActive: {
    backgroundColor: Colors.cream,
    borderColor: Colors.cream,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.cream50,
    letterSpacing: 0.3,
  },
  pillTextActive: { color: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 100 },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.cream30,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyContainer: { paddingTop: 80, alignItems: 'center', gap: 8 },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.cream50,
  },
  emptyBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.cream30,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetBg: { backgroundColor: Colors.card2 },
  sheetHandle: { backgroundColor: Colors.cream30 },
});
