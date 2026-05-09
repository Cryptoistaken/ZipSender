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
      {/* Badges row */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, styles.typeBadge]}>
          <Text style={styles.badgeText}>
            {title.type === 'movie' ? '🎬 Movie' : '📺 Series'}
          </Text>
        </View>
        {hasZip && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ZIP</Text>
          </View>
        )}
        {hasVideo && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Video</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.titleText}>{title.name}</Text>
      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}

      {/* Download buttons */}
      <View style={styles.buttonsContainer}>
        {parts === undefined ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : (
          parts.map((part) => (
            <DownloadButton
              key={part._id}
              part={part}
              titleName={title.name}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cream10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: Colors.cream10,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.cream20,
  },
  typeBadge: {
    backgroundColor: Colors.cream05,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.cream50,
    letterSpacing: 0.4,
  },
  titleText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.cream,
    lineHeight: 22,
  },
  subtitleText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.cream30,
  },
  buttonsContainer: { gap: 8, marginTop: 4 },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.cream30,
  },
});
