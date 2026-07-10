import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommentsSheet } from '@/components/routes/comments-sheet';
import { RouteActions } from '@/components/routes/route-actions';
import { RouteTheater } from '@/components/routes/route-theater';
import { SendersStrip } from '@/components/routes/senders-strip';
import {
  fetchRouteComments,
  fetchVideoComments,
  type CommentTarget,
} from '@/lib/comments';
import type { Discipline } from '@/lib/grades';
import { holdColor, holdInk } from '@/lib/holds';
import {
  fetchMyRouteState,
  fetchRouteDetail,
  fetchRouteVideos,
  fetchSenders,
} from '@/lib/route-detail';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Boulder',
  top_rope: 'Top rope',
  lead: 'Lead',
};

// Route detail ported from the web app/routes/[routeId]/page.tsx: header +
// send/favorite actions, senders strip, beta theater, comments. Upload entry
// (S8) comes later.
export default function RouteScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const routeQuery = useQuery({
    queryKey: ['route-detail', routeId],
    queryFn: () => fetchRouteDetail(routeId),
  });
  const videosQuery = useQuery({
    queryKey: ['route-videos', routeId],
    queryFn: () => fetchRouteVideos(routeId),
  });
  const sendersQuery = useQuery({
    queryKey: ['route-senders', routeId],
    queryFn: () => fetchSenders(routeId),
  });
  const myStateQuery = useQuery({
    queryKey: ['route-my-state', routeId, userId],
    queryFn: () => fetchMyRouteState(userId!, routeId),
    enabled: !!userId,
  });
  // Comments are secondary content: they don't gate the screen's loading or
  // error states, and the sheet just shows an empty thread until they land.
  const routeCommentsQuery = useQuery({
    queryKey: ['route-comments', routeId],
    queryFn: () => fetchRouteComments(routeId),
  });
  const videoIds = videosQuery.data?.map((v) => v.id);
  const videoCommentsQuery = useQuery({
    queryKey: ['route-video-comments', routeId],
    queryFn: () => fetchVideoComments(videoIds!),
    enabled: !!videoIds,
  });

  const [sheetTarget, setSheetTarget] = useState<CommentTarget | null>(null);

  const route = routeQuery.data;

  if (routeQuery.isPending || videosQuery.isPending || sendersQuery.isPending) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (routeQuery.isError || videosQuery.isError || sendersQuery.isError || !route) {
    return (
      <View style={[styles.page, styles.center]}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>We could not load this route.</Text>
        <View style={styles.errorBtns}>
          <Pressable
            style={styles.outlineBtn}
            onPress={() => {
              routeQuery.refetch();
              videosQuery.refetch();
              sendersQuery.refetch();
            }}>
            <Text style={styles.outlineBtnLabel}>Try again</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => router.back()}>
            <Text style={styles.outlineBtnLabel}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const band = holdColor(route.color);
  const ink = holdInk(route.color);
  const wallName = route.walls?.name ?? 'Unassigned';
  const setDate = route.set_date
    ? new Date(route.set_date).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const { senders, totalSends } = sendersQuery.data ?? { senders: [], totalSends: 0 };
  const routeComments = routeCommentsQuery.data ?? [];
  const commentsByVideo = videoCommentsQuery.data ?? {};
  const sheetComments = !sheetTarget
    ? []
    : 'routeId' in sheetTarget
      ? routeComments
      : (commentsByVideo[sheetTarget.videoId] ?? []);

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={space(2)}
          style={({ pressed }) => [styles.crumb, pressed && styles.crumbPressed]}>
          <Ionicons name="chevron-back" size={18} color={colors.fg} />
          <Text style={styles.crumbLabel} numberOfLines={1}>
            {route.gyms?.name ?? 'Back'}
          </Text>
        </Pressable>

        {/* route header */}
        <View style={styles.head}>
          <View style={[styles.gradeChip, { backgroundColor: band }]}>
            <Text style={[styles.gradeLabel, { color: ink }]}>{route.grade_label}</Text>
            {route.color && !route.color.startsWith('#') ? (
              <Text style={[styles.gradeColor, { color: ink }]} numberOfLines={1}>
                {route.color}
              </Text>
            ) : null}
          </View>
          <View style={styles.headMain}>
            {route.gyms ? <Text style={styles.eyebrow}>{route.gyms.name}</Text> : null}
            <Text style={styles.name}>{route.name}</Text>
            <Text style={styles.meta}>
              {DISCIPLINE_LABEL[route.discipline]}
              {route.color ? `  ·  ${route.color}` : ''}
              {`  ·  ${wallName}`}
              {setDate ? `  ·  Set ${setDate}` : ''}
            </Text>
          </View>
        </View>

        <RouteActions
          routeId={route.id}
          gymId={route.gym_id}
          sent={myStateQuery.data?.sent ?? false}
          favorited={myStateQuery.data?.favorited ?? false}
        />

        {/* S8 entry: open the Upload tab with this route pre-selected. */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/upload',
              params: {
                routeId: route.id,
                routeName: route.name,
                gradeLabel: route.grade_label,
                color: route.color ?? '',
                gymId: route.gym_id,
                gymName: route.gyms?.name ?? '',
              },
            })
          }
          style={({ pressed }) => [styles.addBetaBtn, pressed && styles.pressed]}>
          <Ionicons name="videocam-outline" size={18} color={colors.accent} />
          <Text style={styles.addBetaLabel}>Add beta video</Text>
        </Pressable>

        <SendersStrip senders={senders} totalSends={totalSends} />

        <View style={styles.rule} />

        <RouteTheater
          videos={videosQuery.data ?? []}
          commentsByVideo={commentsByVideo}
          onOpenComments={(videoId) => setSheetTarget({ videoId })}
        />

        <Pressable
          onPress={() => setSheetTarget({ routeId: route.id })}
          style={({ pressed }) => [styles.discussionRow, pressed && styles.pressed]}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
          <Text style={styles.discussionTitle}>Discussion</Text>
          <Text style={styles.discussionCount}>
            {routeComments.length} {routeComments.length === 1 ? 'comment' : 'comments'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.fgFaint} />
        </Pressable>
      </ScrollView>

      <CommentsSheet
        target={sheetTarget}
        routeId={route.id}
        comments={sheetComments}
        onClose={() => setSheetTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(8),
    gap: space(2.5),
  },
  scroll: {
    paddingHorizontal: space(4),
    paddingBottom: space(10),
    gap: space(4),
  },
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.5),
    alignSelf: 'flex-start',
    marginTop: space(2),
    paddingVertical: space(1),
    paddingRight: space(2),
  },
  crumbPressed: {
    opacity: 0.7,
  },
  crumbLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: colors.fg,
  },
  head: {
    flexDirection: 'row',
    gap: space(3.5),
  },
  gradeChip: {
    width: 72,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(0.5),
    paddingVertical: space(3),
    paddingHorizontal: space(1),
  },
  gradeLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 18,
  },
  gradeColor: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  headMain: {
    flex: 1,
    gap: space(1),
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.chalk50,
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.fgMuted,
  },
  rule: {
    height: 1,
    backgroundColor: colors.hairlineSoft,
  },
  addBetaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  addBetaLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.fg,
  },
  discussionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
  },
  discussionTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.chalk50,
  },
  discussionCount: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgFaint,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.7,
  },
  errorTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  errorBtns: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(1),
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  outlineBtnLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
  },
});
