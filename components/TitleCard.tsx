import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Doc } from '../convex/_generated/dataModel';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import DownloadButton from './DownloadButton';

interface Props {
  title: Doc<'titles'>;
}

export default function TitleCard({ title }: Props) {
  const parts = useQuery(api.parts.listByTitle, { titleId: title._id });

  const hasZip = parts?.some((p: Doc<'parts'>) => p.format === 'zip');
  const hasVideo = parts?.some((p: Doc<'parts'>) => p.format === 'video');

  const subtitle = parts
    ? `${title.partCount} ${title.partCount === 1 ? 'part' : 'parts'}${title.totalSize ? ' · ' + title.totalSize : ''}`
    : '';

  return (
    <View style={styles.card}>
      {/* matches prototype .card-img — gradient strip with overlaid badges */}
      <View style={styles.cardImg}>
        {/* Dark gradient placeholder — matches card-img-fade */}
        <LinearGradient
          colors={['rgba(24,24,24,0)', '#1e1e1e']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {/* matches .card-img-badges */}
        <View style={styles.cardImgBadges}>
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

      {/* Card body — matches prototype .card-body */}
      <View style={styles.body}>
        {/* matches .card-title */}
        <Text style={styles.titleText}>{title.name}</Text>
        {/* matches .card-sub */}
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}

        {/* Download buttons */}
        <View style={styles.buttonsContainer}>
          {parts === undefined ? (
            <Text style={styles.loadingText}>Loading…</Text>
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
  // matches prototype .card — card2 background, 22px radius
  card: {
    backgroundColor: Colors.card2,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },
  // matches prototype .card-img — 88px height
  cardImg: {
    height: 88,
    backgroundColor: Colors.card,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  // matches prototype .card-img-badges
  cardImgBadges: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  // matches prototype .badge with pill shape (999px radius)
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
  // .badge-series
  badgeSeries: {
    backgroundColor: 'transparent',
    borderColor: Colors.cream20,
  },
  badgeSeriesText: { color: Colors.cream50 },
  // .badge-movie
  badgeMovie: {
    backgroundColor: Colors.cream10,
    borderColor: Colors.cream20,
  },
  badgeMovieText: { color: Colors.cream80 },
  // .badge-zip
  badgeZip: {
    backgroundColor: Colors.cream10,
    borderColor: Colors.cream20,
  },
  badgeZipText: { color: Colors.cream80 },
  // .badge-mp4
  badgeMp4: {
    backgroundColor: Colors.cream20,
    borderColor: Colors.cream30,
  },
  badgeMp4Text: { color: Colors.cream },

  // matches prototype .card-body
  body: {
    padding: 15,
    paddingTop: 13,
    gap: 8,
  },
  // matches prototype .card-title
  titleText: {
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    color: Colors.cream,
    letterSpacing: -0.03 * 14,
    marginBottom: 2,
  },
  // matches prototype .card-sub
  subtitleText: {
    fontFamily: Fonts.light,
    fontSize: 11,
    color: Colors.cream50,
    letterSpacing: 0.01 * 11,
    marginTop: -4,
  },
  buttonsContainer: { gap: 8 },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.cream30,
  },
});
