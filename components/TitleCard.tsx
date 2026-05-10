import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Doc } from '../convex/_generated/dataModel';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import DownloadButton from './DownloadButton';

interface Props {
  title: Doc<'titles'>;
}

// Type icon — matches .series-type-icon in prototype
function TypeIcon({ type }: { type: 'movie' | 'series' }) {
  return (
    <View style={[styles.typeIconBox, type === 'movie' ? styles.typeIconMovie : styles.typeIconSeries]}>
      <MaterialCommunityIcons
        name={type === 'movie' ? 'video-outline' : 'playlist-play'}
        size={16}
        color={Colors.cream50}
      />
    </View>
  );
}

export default function TitleCard({ title }: Props) {
  const parts = useQuery(api.parts.listByTitle, { titleId: title._id });

  const hasZip = parts?.some((p: Doc<'parts'>) => p.format === 'zip');
  const hasVideo = parts?.some((p: Doc<'parts'>) => p.format === 'video');

  const subtitle = parts
    ? `${title.partCount} ${title.partCount === 1 ? 'file' : 'files'}${title.totalSize ? ' · ' + title.totalSize : ''}`
    : '';

  return (
    <View style={styles.card}>
      {/* Card image strip — matches .card-img, height 88px */}
      <View style={styles.cardImg}>
        {/* Gradient fade — matches .card-img-fade */}
        <LinearGradient
          colors={['rgba(24,24,24,0)', '#1e1e1e']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {/* Badge row — matches .card-img-badges: bottom-left, gap 6px */}
        <View style={styles.badgeRow}>
          {/* Type badge */}
          <View style={[styles.badge, title.type === 'series' ? styles.badgeSeries : styles.badgeMovie]}>
            <Text style={[styles.badgeText, title.type === 'series' ? styles.badgeSeriesText : styles.badgeMovieText]}>
              {title.type === 'movie' ? 'Movie' : 'Series'}
            </Text>
          </View>
          {hasZip && (
            <View style={[styles.badge, styles.badgeZip]}>
              <Text style={[styles.badgeText, styles.badgeZipText]}>ZIP</Text>
            </View>
          )}
          {hasVideo && (
            <View style={[styles.badge, styles.badgeMp4]}>
              <Text style={[styles.badgeText, styles.badgeMp4Text]}>MP4</Text>
            </View>
          )}
        </View>
      </View>

      {/* Card body — matches .card-body: 13px 15px 15px */}
      <View style={styles.body}>
        {/* Title row: type icon + text */}
        <View style={styles.titleRow}>
          <TypeIcon type={title.type} />
          <View style={styles.titleTextBlock}>
            {/* .card-title */}
            <Text style={styles.titleText} numberOfLines={2}>{title.name}</Text>
            {/* .card-sub */}
            {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
          </View>
        </View>

        {/* Download buttons — flex-direction: column, gap: 7px per prototype */}
        <View style={styles.buttonsContainer}>
          {parts === undefined ? (
            <View style={styles.loadingPill}>
              <Text style={styles.loadingText}>Loading files…</Text>
            </View>
          ) : parts.length === 0 ? (
            <View style={styles.loadingPill}>
              <Text style={styles.loadingText}>No files added yet</Text>
            </View>
          ) : (
            parts.map((part: Doc<'parts'>) => (
              <DownloadButton key={part._id} part={part} titleName={title.name} />
            ))
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // .card — card2 bg, 22px radius, cream10 border
  card: {
    backgroundColor: Colors.card2,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },

  // .card-img — 88px, card bg
  cardImg: {
    height: 88,
    backgroundColor: Colors.card,
    justifyContent: 'flex-end',
  },

  // .card-img-badges — bottom: 10px, left: 14px, row, gap: 6
  badgeRow: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },

  // .badge — 999px radius, 8px 700 0.1em uppercase
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.1 * 8,
    textTransform: 'uppercase',
  },
  badgeSeries: { backgroundColor: 'transparent', borderColor: Colors.cream20 },
  badgeSeriesText: { color: Colors.cream50 },
  badgeMovie: { backgroundColor: Colors.cream10, borderColor: Colors.cream20 },
  badgeMovieText: { color: Colors.cream80 },
  badgeZip: { backgroundColor: Colors.cream10, borderColor: Colors.cream20 },
  badgeZipText: { color: Colors.cream80 },
  badgeMp4: { backgroundColor: Colors.cream20, borderColor: Colors.cream30 },
  badgeMp4Text: { color: Colors.cream },

  // .card-body — padding 13 15 15
  body: {
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 15,
    gap: 10,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  // .series-type-icon — 12px radius icon box
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  typeIconMovie: {
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },
  typeIconSeries: {
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },

  titleTextBlock: { flex: 1, gap: 2 },

  // .card-title — 14px 800 -0.03em
  titleText: {
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    color: Colors.cream,
    letterSpacing: -0.03 * 14,
    lineHeight: 18,
  },
  // .card-sub — 11px 300 0.01em cream50
  subtitleText: {
    fontFamily: Fonts.light,
    fontSize: 11,
    color: Colors.cream50,
    letterSpacing: 0.01 * 11,
  },

  // flex column, gap 7px
  buttonsContainer: { gap: 7 },

  loadingPill: {
    height: 48,
    borderRadius: 999,
    backgroundColor: Colors.cream10,
    borderWidth: 1,
    borderColor: Colors.cream20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.light,
    fontSize: 12,
    color: Colors.cream30,
  },
});
