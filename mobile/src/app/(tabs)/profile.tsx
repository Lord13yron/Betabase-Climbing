import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { StatBand } from '@/components/profile/stat-band';
import { VideoCard } from '@/components/profile/video-card';
import { formatHeight } from '@/lib/height';
import {
  deleteVideo,
  fetchFavoriteCount,
  fetchOwnProfile,
  fetchProfileVideos,
  fetchSends,
  getHeightUnit,
  sendStats,
} from '@/lib/profile';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii, space } from '@/lib/theme';

// Own profile (web: app/profile/page.tsx). S10 scope: hero, stat band, and
// the my-videos grid with delete. Send log and favorites lists stay web-only;
// favorites already live on the Gyms tab.

export default function ProfileScreen() {
  const { session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = session!.user.id;

  const profileQuery = useQuery({
    queryKey: ['own-profile', userId],
    queryFn: () => fetchOwnProfile(userId),
  });
  const videosQuery = useQuery({
    queryKey: ['profile-videos', userId],
    queryFn: () => fetchProfileVideos(userId, false),
  });
  const sendsQuery = useQuery({
    queryKey: ['profile-sends', userId],
    queryFn: () => fetchSends(userId),
  });
  const favCountQuery = useQuery({
    queryKey: ['profile-fav-count', userId],
    queryFn: () => fetchFavoriteCount(userId),
  });
  const unitQuery = useQuery({ queryKey: ['height-unit'], queryFn: getHeightUnit });

  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => deleteVideo(videoId, session!.access_token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-videos', userId] });
    },
    onError: (err: Error) => Alert.alert('Delete failed', err.message),
  });

  function confirmDelete(videoId: string) {
    Alert.alert('Delete beta video', "This removes the clip for everyone. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(videoId) },
    ]);
  }

  if (profileQuery.isPending || videosQuery.isPending || sendsQuery.isPending) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <View style={[styles.page, styles.center]}>
        <Text style={styles.emptyTitle}>Couldn't load your profile</Text>
        <Pressable onPress={() => profileQuery.refetch()} style={styles.retry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const profile = profileQuery.data;
  const { videos, commentCounts } = videosQuery.data ?? { videos: [], commentCounts: {} };
  const sends = sendsQuery.data ?? [];
  const stats = sendStats(sends);
  const unit = unitQuery.data ?? 'cm';
  const since = new Date(profile.created_at).getFullYear();

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* hero */}
          <View style={styles.hero}>
            <Avatar src={profile.avatar_url} name={profile.username} size={88} />
            <Text style={styles.eyebrow}>Your profile</Text>
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
            <Pressable
              onPress={() => router.push('/edit-profile')}
              style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}>
              <Ionicons name="pencil-outline" size={14} color={colors.onAccent} />
              <Text style={styles.editLabel}>Edit profile</Text>
            </Pressable>
          </View>

          {/* stat band */}
          <StatBand
            stats={[
              { label: 'Sends', value: stats.total },
              { label: 'Beta filmed', value: videos.length },
              { label: 'Favorites', value: favCountQuery.data ?? 0 },
            ]}
            maxBoulder={profile.max_boulder_grade}
            maxRoute={profile.max_route_grade}
          />

          {/* beta you've filmed */}
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Beta you've filmed</Text>
            <Text style={styles.secCount}>
              {videos.length} {videos.length === 1 ? 'clip' : 'clips'}
            </Text>
          </View>
          {videos.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="videocam-outline" size={26} color={colors.fgFaint} />
              <Text style={styles.emptyTitle}>No beta yet</Text>
              <Text style={styles.emptyText}>
                You haven't filmed any beta. Find a route you've sent and show the next climber how
                it's done.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {videos.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  commentCount={commentCounts[v.id] ?? 0}
                  onDelete={() => confirmDelete(v.id)}
                />
              ))}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
            onPress={() => supabase.auth.signOut()}>
            <Text style={styles.signOutLabel}>Log out</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(3),
  },
  content: {
    paddingHorizontal: space(5),
    paddingTop: space(6),
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
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
  },
  editBtnPressed: {
    backgroundColor: colors.accentHover,
  },
  editLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.onAccent,
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
  retry: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(5),
    paddingVertical: space(2.5),
  },
  retryLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.fg,
  },
  signOut: {
    marginTop: space(3),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingVertical: space(3.5),
    alignItems: 'center',
  },
  signOutPressed: {
    backgroundColor: colors.surface,
  },
  signOutLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.fg,
  },
});
