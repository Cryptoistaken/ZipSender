import { View, Text, StyleSheet } from 'react-native';
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

export default function TitleCard({ title }: Props) {
  const parts = useQuery(api.parts.listByTitle, { titleId: title._id });

const hasZip = parts?.some((p: Doc<'parts'>) => p.format === 'zip');
const hasVideo = parts?.some((p: Doc<'parts'>) => p.format === 'video');

const subtitle = parts
? `${title.partCount} ${title.partCount === 1 ? 'file' : 'files'}${title.totalSize ? ' · ' + title.totalSize : ''}`
: '';

return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
        <MaterialCommunityIcons
            name={title.type === 'movie' ? 'video-outline' : 'playlist-play'}
          size={17}
          color={Colors.cream50}
          />
      </View>
    <View style={styles.meta}>
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
<Text style={styles.titleText} numberOfLines={1}>{title.name}</Text>
{subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
</View>
</View>
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
);
}

const styles = StyleSheet.create({
card: {
backgroundColor: Colors.card2,
borderRadius: 18,
overflow: 'hidden',
marginBottom: 8,
borderWidth: 1,
borderColor: Colors.cream10,
},
header: {
flexDirection: 'row',
alignItems: 'center',
gap: 10,
paddingHorizontal: 12,
  paddingTop: 11,
    paddingBottom: 10,
  },
  iconBox: {
  width: 34,
height: 34,
borderRadius: 9,
backgroundColor: Colors.cream10,
borderWidth: 1,
borderColor: Colors.cream20,
alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
},
meta: { flex: 1, minWidth: 0, gap: 3 },
badgeRow: { flexDirection: 'row', gap: 5 },
badge: {
  borderRadius: 999,
paddingHorizontal: 7,
paddingVertical: 2,
borderWidth: 1,
},
badgeText: {
  fontSize: 7,
  fontFamily: Fonts.bold,
letterSpacing: 0.7,
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
titleText: {
  fontFamily: Fonts.extraBold,
  fontSize: 14,
  color: Colors.cream,
  letterSpacing: -0.03 * 14,
},
subtitleText: {
  fontFamily: Fonts.light,
  fontSize: 10,
color: Colors.cream50,
},
buttonsContainer: {
gap: 6,
  paddingHorizontal: 10,
  paddingBottom: 10,
},
loadingPill: {
height: 46,
  borderRadius: 13,
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