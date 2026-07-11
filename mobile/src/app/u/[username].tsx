import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { StatBand } from '@/components/profile/stat-band';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { VideoCard } from '@/components/profile/video-card';
import { timeAgo } from '@/lib/feed';
import { formatHeight } from '@/lib/height';
import { holdColor } from '@/lib/holds';
import {
  fetchProfileVideos,
  fetchPublicProfile,
  fetchSends,
  getHeightUnit,
  sendStats,
} from '@/lib/profile';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

// Public profile (web: app/u/[username]/page.tsx): hero, stat band, ready-only
// beta grid, and the send log. Reached from feed items, comments, the senders
// strip, and user search.

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useSession();
  const router = useRouter();

  const profileQuery = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfile(username),
  });
  const profile = profileQuery.data;

  const videosQuery = useQuery({
    queryKey: ['public-profile-videos', profile?.id],
    queryFn: () => fetchProfileVideos(profile!.id, true),
    enabled: !!profile,
  });
  const sendsQuery = useQuery({
    queryKey: ['public-profile-sends', profile?.id],
    queryFn: () => fetchSends(profile!.id),
    enabled: !!profile,
  });
  const unitQuery = useQuery({ queryKey: ['height-unit'], queryFn: getHeightUnit });

  const isSelf = !!profile && session?.user.id === profile.id;

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space(2)}
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}>
          <Ionicons name="chevron-back" size={20} color={colors.chalk100} />
        </Pressable>
      </View>

      {profileQuery.isPending || (profile && (videosQuery.isPending || sendsQuery.isPending)) ? (
        <LoadingState />
      ) : profileQuery.isError || videosQuery.isError || sendsQuery.isError ? (
        <ErrorState
          message="We could not load this profile. Check your connection and try again."
          onRetry={() => {
            profileQuery.refetch();
            videosQuery.refetch();
            sendsQuery.refetch();
          }}
        />
      ) : !profile ? (
        <View style={styles.center}>
          <Ionicons name="person-outline" size={28} color={colors.fgFaint} />
          <Text style={styles.emptyTitle}>Climber not found</Text>
          <Text style={styles.emptyText}>No profile matches &ldquo;{username}&rdquo;.</Text>
        </View>
      ) : (
        <PublicProfileBody
          profile={profile}
          videos={videosQuery.data?.videos ?? []}
          commentCounts={videosQuery.data?.commentCounts ?? {}}
          sends={sendsQuery.data ?? []}
          unit={unitQuery.data ?? 'cm'}
          isSelf={isSelf}
          refreshing={profileQuery.isRefetching}
          onRefresh={() => {
            profileQuery.refetch();
            videosQuery.refetch();
            sendsQuery.refetch();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function PublicProfileBody({
  profile,
  videos,
  commentCounts,
  sends,
  unit,
  isSelf,
  refreshing,
  onRefresh,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof fetchPublicProfile>>>;
  videos: Awaited<ReturnType<typeof fetchProfileVideos>>['videos'];
  commentCounts: Record<string, number>;
  sends: Awaited<ReturnType<typeof fetchSends>>;
  unit: 'cm' | 'ftin';
  isSelf: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const stats = sendStats(sends);
  const since = new Date(profile.created_at).getFullYear();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl tintColor={colors.accent} refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* hero */}
      <View style={styles.hero}>
        <Avatar src={profile.avatar_url} name={profile.username} size={88} />
        <Text style={styles.eyebrow}>Climber</Text>
        <Text style={styles.name}>{profile.username}</Text>
        <View style={styles.metaRow}>
          {stats.topGym && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={13} color={colors.fgMuted} />
              <Text style={styles.metaText}>{stats.topGym}</Text>
            </View>
          )}
          {profile.height_cm != null && (
            <View style={styles.metaItem}>
              <Ionicons name="resize-outline" size={13} color={colors.fgMuted} />
              <Text style={styles.metaText}>{formatHeight(profile.height_cm, unit)}</Text>
            </View>
          )}
          <Text style={styles.metaText}>Climbing since {since}</Text>
        </View>
        {isSelf && (
          <Pressable
            onPress={() => router.push('/edit-profile')}
            style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}>
            <Ionicons name="pencil-outline" size={14} color={colors.fg} />
            <Text style={styles.editLabel}>Edit profile</Text>
          </Pressable>
        )}
      </View>

      {/* stat band */}
      <StatBand
        stats={[
          { label: 'Sends', value: stats.total },
          { label: 'Beta filmed', value: videos.length },
          { label: 'Gyms', value: stats.distinctGyms },
        ]}
        maxBoulder={profile.max_boulder_grade}
        maxRoute={profile.max_route_grade}
      />

      {/* beta filmed */}
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>Beta filmed</Text>
        <Text style={styles.secCount}>
          {videos.length} {videos.length === 1 ? 'clip' : 'clips'}
        </Text>
      </View>
      {videos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="videocam-outline" size={26} color={colors.fgFaint} />
          <Text style={styles.emptyTitle}>No beta yet</Text>
          <Text style={styles.emptyText}>
            {isSelf
              ? "You haven't filmed any beta yet. When you share a clip, it'll show up here for the rest of the gym to learn from."
              : `@${profile.username} hasn't filmed any beta yet. When they share a clip, it'll show up here for the rest of the gym to learn from.`}
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} commentCount={commentCounts[v.id] ?? 0} />
          ))}
        </View>
      )}

      {/* send log */}
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>Send log</Text>
        <Text style={styles.secCount}>
          {stats.total} {stats.total === 1 ? 'send' : 'sends'}
          {stats.distinctGyms > 0
            ? ` · ${stats.distinctGyms} ${stats.distinctGyms === 1 ? 'gym' : 'gyms'}`
            : ''}
        </Text>
      </View>
      {sends.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flag-outline" size={26} color={colors.fgFaint} />
          <Text style={styles.emptyTitle}>No sends logged</Text>
          <Text style={styles.emptyText}>
            {isSelf
              ? "You haven't logged any sends yet. Your tick list will appear here."
              : `@${profile.username} hasn't logged any sends yet. Their tick list will appear here.`}
          </Text>
        </View>
      ) : (
        <View style={styles.logTable}>
          {sends.map((s, i) => {
            const r = s.routes!;
            return (
              <Pressable
                key={`${r.id}-${i}`}
                onPress={() => router.push(`/routes/${r.id}`)}
                style={({ pressed }) => [styles.logRow, pressed && styles.logRowPressed]}>
                <View style={[styles.logDot, { backgroundColor: holdColor(r.color) }]} />
                <View style={styles.logBody}>
                  <Text style={styles.logName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.logGym} numberOfLines={1}>
                    {r.gyms?.name ?? 'Unknown gym'}
                  </Text>
                </View>
                <Text style={styles.logGrade}>{r.grade_label}</Text>
                <Text style={styles.logWhen}>{timeAgo(s.sent_at)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  backBtnPressed: {
    backgroundColor: colors.surfaceHover,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(8),
    gap: space(3),
  },
  content: {
    paddingHorizontal: space(5),
    paddingTop: space(4),
    paddingBottom: space(8),
    gap: space(5),
  },
  hero: {
    alignItems: 'center',
    gap: space(2),
  },
  eyebrow: {
    marginTop: space(1),
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.chalk50,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space(3),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  metaText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.fgMuted,
  },
  editBtn: {
    marginTop: space(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
  },
  editBtnPressed: {
    backgroundColor: colors.surface,
  },
  editLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.fg,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space(2),
    marginTop: space(1),
  },
  secTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  secCount: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.fgFaint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space(3),
  },
  empty: {
    alignItems: 'center',
    gap: space(2),
    paddingVertical: space(8),
    paddingHorizontal: space(6),
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: colors.chalk50,
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  logTable: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  logRowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  logDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  logBody: {
    flex: 1,
    gap: space(0.5),
  },
  logName: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.fg,
  },
  logGym: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgMuted,
  },
  logGrade: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.accent,
  },
  logWhen: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.fgFaint,
    minWidth: 32,
    textAlign: 'right',
  },
});
