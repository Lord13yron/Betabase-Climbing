import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { muxThumb, timeAgo } from '@/lib/feed';
import { holdColor } from '@/lib/holds';
import type { ProfileVideo } from '@/lib/profile';
import { colors, fonts, radii, space } from '@/lib/theme';

function fmtCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
}

// Beta clip card for the profile grids (web: MyVideosGrid card / u-card).
// Own profile passes onDelete for the trash overlay; public profiles do not.
export function VideoCard({
  video,
  commentCount,
  onDelete,
}: {
  video: ProfileVideo;
  commentCount: number;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const thumb = muxThumb(video.mux_playback_id);
  const route = video.routes;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => route && router.push(`/routes/${route.id}`)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.stage}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" transition={100} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
          {video.status === 'ready' ? (
            <View style={styles.play}>
              <Ionicons name="play" size={16} color={colors.chalk50} />
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <Ionicons name="videocam-outline" size={12} color={colors.chalk100} />
              <Text style={styles.statusLabel}>
                {video.status === 'pending' ? 'Processing' : 'Failed'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: holdColor(route?.color ?? null) }]} />
            <Text style={styles.routeName} numberOfLines={1}>
              {route?.name ?? 'Route'}
            </Text>
            <Text style={styles.grade}>{route?.grade_label}</Text>
          </View>
          <Text style={styles.caption} numberOfLines={2}>
            {video.caption || 'Beta for this route.'}
          </Text>
          <View style={styles.foot}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={13} color={colors.fgFaint} />
              <Text style={styles.statText}>{fmtCount(video.view_count)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={12} color={colors.fgFaint} />
              <Text style={styles.statText}>{commentCount}</Text>
            </View>
            <Text style={[styles.statText, styles.when]}>{timeAgo(video.created_at)}</Text>
          </View>
        </View>
      </Pressable>
      {onDelete && (
        <Pressable
          onPress={onDelete}
          hitSlop={space(2)}
          accessibilityLabel="Delete video"
          style={({ pressed }) => [styles.del, pressed && styles.delPressed]}>
          <Ionicons name="trash-outline" size={15} color={colors.chalk100} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '48%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: colors.surfaceHover,
  },
  stage: {
    aspectRatio: 16 / 9,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumbFallback: {
    backgroundColor: colors.slate700,
  },
  play: {
    position: 'absolute',
    bottom: space(2),
    left: space(2),
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 22, 0.72)',
  },
  statusBadge: {
    position: 'absolute',
    bottom: space(2),
    left: space(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    borderRadius: radii.sm,
    backgroundColor: 'rgba(14, 18, 22, 0.72)',
  },
  statusLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.chalk100,
  },
  body: {
    padding: space(2.5),
    gap: space(1.5),
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  routeName: {
    flex: 1,
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: colors.fg,
  },
  grade: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.accent,
  },
  caption: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 17,
    color: colors.fgMuted,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  statText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.fgFaint,
  },
  when: {
    marginLeft: 'auto',
  },
  del: {
    position: 'absolute',
    top: space(2),
    right: space(2),
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 22, 0.72)',
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  delPressed: {
    backgroundColor: '#7a2e2e',
  },
});
