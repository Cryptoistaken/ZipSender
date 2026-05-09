import { useRef } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../convex/_generated/api';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import TitleCard from '../../components/TitleCard';

// CloudFront URL from prototype
const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4';

export default function HomeScreen() {
  const titles = useQuery(api.titles.list);

  const player = useVideoPlayer(HERO_VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero strip — matches prototype .hero-strip */}
        <View style={styles.heroStrip}>
          <VideoView
            style={styles.heroVideo}
            player={player}
            contentFit="cover"
            nativeControls={false}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', '#000']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Safe area inset handled by paddingTop in heroText */}
          <SafeAreaView style={styles.heroSafeArea} edges={['top']}>
            <View style={styles.heroText}>
              <Text style={styles.heroLabel}>ZipSender</Text>
              <Text style={styles.heroTitle}>Your Catalog</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Title cards */}
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 16, paddingTop: 4 },

  // ── hero strip ─────────────────────────────────────────────────────────────
  heroStrip: {
    height: 200,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
    marginHorizontal: -16,
  },
  heroVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroText: {
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  heroLabel: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.18 * 8,
    textTransform: 'uppercase',
    color: Colors.cream50,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.05 * 26,
    color: Colors.cream,
    lineHeight: 26,
  },

  loadingContainer: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.cream30,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
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
