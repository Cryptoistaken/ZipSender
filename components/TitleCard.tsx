import { View, Text, StyleSheet } from 'react-native';
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

  const hasZip = parts?.some((p) => p.format === 'zip');
  const hasVideo = parts?.some((p) => p.format === 'video');

  const subtitle = parts
    ? `${title.partCount} ${title.partCount === 1 ? 'part' : 'parts'}${title.totalSize ? ' · ' + title.totalSize : ''}`
    : '';

  return (
    <View style={styles.card}>
      {/* Badges row — overlaid at bottom like prototype .card-img-badges */}
      <View style={styles.badgeRow}>
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

      {/* Card body */}
      <View style={styles.body}>
        <Text style={styles.titleText}>{title.name}</Text>
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}

        {/* Download buttons */}
        <View style={styles.buttonsContainer}>
          {parts === undefined ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : (
            parts.map((part) => (
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 15,
    paddingTop: 14,
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

  body: {
    padding: 13,
    paddingTop: 10,
    gap: 8,
  },
  titleText: {
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    color: Colors.cream,
    letterSpacing: -0.03 * 14,
  },
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
