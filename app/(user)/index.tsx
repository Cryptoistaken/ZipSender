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

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4';

function HeroStrip() {
  const player = useVideoPlayer(HERO_VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.heroStrip}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', '#000']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <SafeAreaView style={styles.heroSafeArea} edges={['top']}>
        <View style={styles.heroText}>
          <Text style={styles.heroLabel}>ZipSender</Text>
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
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : titles.length === 0 ? (
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
  scrollContent: {
    paddingBottom: 110,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  heroStrip: {
    height: 240,
    overflow: 'hidden',
    marginHorizontal: -16,
    marginBottom: 16,
    position: 'relative',
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
  heroTitleItalic: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 26,
    color: Colors.cream,
  },
  loadingContainer: { gap: 10, paddingTop: 0 },
  skeletonCard: {
    height: 180,
    borderRadius: 22,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
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
  emptyTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 15,
    color: Colors.cream,
    letterSpacing: -0.03 * 15,
  },
  emptyBody: {
    fontFamily: Fonts.light,
    fontSize: 12,
    color: Colors.cream50,
    lineHeight: 18,
    textAlign: 'center',
  },
});