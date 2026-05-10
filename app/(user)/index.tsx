import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Doc } from '../../convex/_generated/dataModel';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import TitleCard from '../../components/TitleCard';

// Exact URL from prototype/app.html hero-strip <video src="...">
const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4';

// Hero strip — autoplay looping muted video, matches prototype .hero-strip
function HeroStrip() {
  const player = useVideoPlayer(HERO_VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.heroStrip}>
      {/* Video — object-fit: cover, fills the strip */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Gradient overlay — matches .hero-strip-overlay:
          linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, #000 100%) */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', '#000']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Text overlay — bottom-left, matches .hero-strip-text */}
      <SafeAreaView style={styles.heroSafeArea} edges={['top']}>
        <View style={styles.heroText}>
          {/* .hero-label — 8px 700 0.18em uppercase cream50 */}
          <Text style={styles.heroLabel}>ZipSender</Text>
          {/* .hero-title — 26px 800 -0.05em line-height 1 */}
          <Text style={styles.heroTitle}>
            Your <Text style={styles.heroTitleItalic}>videos</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function HomeScreen() {
  const titles = useQuery(api.titles.list);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeroStrip />

        {titles === undefined ? (
          // Loading skeleton
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : titles.length === 0 ? (
          // Empty state — matches prototype .empty-state
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="inbox-outline" size={26} color={Colors.cream30} />
            </View>
            <Text style={styles.emptyTitle}>No titles yet</Text>
            <Text style={styles.emptyBody}>
              The catalog is empty.{'\n'}Check back soon for new content.
            </Text>
          </View>
        ) : (
          titles.map((title: Doc<'titles'>) => (
            <TitleCard key={title._id} title={title} />
          ))
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
  // .scroll-area: 14px 16px 20px — bottom 100 for nav
  scrollContent: {
    paddingBottom: 110,
    paddingHorizontal: 16,
    paddingTop: 0,
  },

  // .hero-strip — 168px, overflow hidden, margin -16px horizontal to bleed full width
  heroStrip: {
    height: 168,
    overflow: 'hidden',
    marginHorizontal: -16,
    marginBottom: 14,
    position: 'relative',
  },
  // SafeAreaView fills the strip so text sits at the bottom
  heroSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  // .hero-strip-text — bottom padding + left padding
  heroText: {
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  // .hero-label — 8px 700 0.18em uppercase cream50
  heroLabel: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.18 * 8,
    textTransform: 'uppercase',
    color: Colors.cream50,
    marginBottom: 3,
  },
  // .hero-title — 26px 800 -0.05em line-height 1 cream
  heroTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.05 * 26,
    color: Colors.cream,
    lineHeight: 26,
  },
  // Instrument Serif italic accent word
  heroTitleItalic: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 26,
    color: Colors.cream,
  },

  // Loading state: skeleton cards
  loadingContainer: { gap: 10, paddingTop: 0 },
  skeletonCard: {
    height: 180,
    borderRadius: 22,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },

  // .empty-state
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  // .empty-icon — 58×58 r18 cream10 bg cream20 border
  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  // .empty-title — 15px 800 -0.03em cream
  emptyTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 15,
    color: Colors.cream,
    letterSpacing: -0.03 * 15,
  },
  // .empty-sub — 12px 300 cream50 line-height 1.6
  emptyBody: {
    fontFamily: Fonts.light,
    fontSize: 12,
    color: Colors.cream50,
    lineHeight: 18,
    textAlign: 'center',
  },
});
