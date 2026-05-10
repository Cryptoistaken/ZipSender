import { useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import BottomSheet from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Doc, Id } from '../../convex/_generated/dataModel';
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Admin header with back button */}
        <View style={styles.adminHeader}>
          <View style={styles.adminHeaderTop}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={Colors.cream}
              />
            </TouchableOpacity>
            <View style={styles.adminTitleBlock}>
              <Text style={styles.adminTitle}>Admin Panel</Text>
              <Text style={styles.adminSub}>Manage catalog titles and files</Text>
            </View>
          </View>

          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  filter === f.key && styles.filterPillActive,
                ]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filter === f.key && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            titles.map((title: Doc<'titles'>) => (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.surface },

  adminHeader: {
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream10,
  },
  adminHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  adminTitleBlock: { flex: 1 },
  adminTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.cream,
    letterSpacing: -0.05 * 22,
  },
  adminSub: {
    fontFamily: Fonts.light,
    fontSize: 11,
    color: Colors.cream50,
    letterSpacing: 0.02 * 11,
    marginTop: 1,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cream20,
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: Colors.cream,
    borderColor: Colors.cream,
  },
  filterPillText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: Colors.cream50,
    letterSpacing: 0.1 * 9,
    textTransform: 'uppercase',
  },
  filterPillTextActive: { color: Colors.black },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 100 },

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

  // matches prototype .fab — 48px, cream glow
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(222,219,200,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  // matches prototype .sheet background: #1a1a1a (slightly lighter than card2 #1e1e1e)
  sheetBg: { backgroundColor: '#1a1a1a' },
  sheetHandle: { backgroundColor: Colors.cream20, width: 36, height: 4, borderRadius: 2 },
});
