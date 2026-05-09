import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import TitleCard from '../../components/TitleCard';

export default function HomeScreen() {
  const titles = useQuery(api.titles.list);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>
          Zip<Text style={styles.logoAccent}>Sender</Text>
        </Text>
        <Text style={styles.subtitle}>Your media catalog</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {titles === undefined ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading catalog…</Text>
          </View>
        ) : titles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No titles yet</Text>
            <Text style={styles.emptyBody}>Check back soon for new content.</Text>
          </View>
        ) : (
          titles.map((title) => <TitleCard key={title._id} title={title} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cream10,
  },
  logoText: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    color: Colors.cream,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: Colors.cream50,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.cream30,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  loadingContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.cream30,
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
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
});
