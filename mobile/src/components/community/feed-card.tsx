import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { timeAgo, type ActivityEvent, type FeedEvent, type RoutesAddedEvent } from '@/lib/feed';
import { holdColor } from '@/lib/holds';
import { colors, fonts, radii, space } from '@/lib/theme';

// Native port of the two feed card families on the web community page
// (app/community/page.tsx): activity rows (video / send / comment /
// video_comment) and grouped new-routes rows.

const VERB: Record<ActivityEvent['kind'], string> = {
  video: 'shared beta on',
  send: 'sent',
  comment: 'commented on',
  video_comment: 'commented on beta for',
};

const KIND_ICON: Record<ActivityEvent['kind'] | 'routes', keyof typeof Ionicons.glyphMap> = {
  video: 'videocam-outline',
  send: 'flag-outline',
  comment: 'chatbubble-ellipses-outline',
  video_comment: 'chatbubble-ellipses-outline',
  routes: 'trail-sign-outline',
};

export function FeedCard({ event }: { event: FeedEvent }) {
  return event.kind === 'routes' ? <RoutesCard event={event} /> : <ActivityCard event={event} />;
}

// Inline route chip usable inside a wrapping Text line: colored hold dot,
// route name, mono grade. Nested Text keeps natural line wrapping.
function RouteChip({
  route,
  onPress,
}: {
  route: { id: string; name: string; color: string | null; grade: string };
  onPress: () => void;
}) {
  return (
    <Text style={styles.route} onPress={onPress}>
      <Text style={{ color: holdColor(route.color) }}>{'●'} </Text>
      {route.name}
      <Text style={styles.grade}> {route.grade}</Text>
    </Text>
  );
}

function MetaRow({ kind, ts }: { kind: ActivityEvent['kind'] | 'routes'; ts: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={KIND_ICON[kind]} size={13} color={colors.fgFaint} />
      <Text style={styles.when}>{timeAgo(ts)}</Text>
    </View>
  );
}

function ActivityCard({ event }: { event: ActivityEvent }) {
  const router = useRouter();
  const openProfile = () => router.push(`/u/${event.actor.username}`);
  const openRoute = () => router.push(`/routes/${event.route.id}`);
  const verb =
    event.kind === 'video_comment' && event.ownVideo
      ? 'commented on your beta on'
      : VERB[event.kind];
  const showThumb = event.kind === 'video' || event.kind === 'video_comment';

  return (
    <View style={styles.card}>
      <Pressable onPress={openProfile} hitSlop={space(1.5)}>
        <Avatar src={event.actor.avatar_url} name={event.actor.username} size={38} />
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.line}>
          <Text style={styles.actor} onPress={openProfile}>
            {event.actor.username}
          </Text>
          <Text style={styles.verb}> {verb} </Text>
          <RouteChip route={event.route} onPress={openRoute} />
          {event.gymName ? <Text style={styles.gym}> at {event.gymName}</Text> : null}
        </Text>
        {(event.kind === 'comment' || event.kind === 'video_comment') && event.body ? (
          <Text style={styles.quote}>&ldquo;{event.body}&rdquo;</Text>
        ) : null}
        {event.kind === 'video' && event.body ? (
          <Text style={styles.caption}>{event.body}</Text>
        ) : null}
        <MetaRow kind={event.kind} ts={event.ts} />
      </View>
      {showThumb ? (
        <Pressable onPress={openRoute} style={styles.thumb}>
          {event.thumb ? (
            <Image source={{ uri: event.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={100} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.thumbBlank]} />
          )}
          <View style={styles.thumbPlay}>
            <Ionicons name="play" size={12} color={colors.chalk50} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function RoutesCard({ event }: { event: RoutesAddedEvent }) {
  const router = useRouter();
  const openGym = () => router.push(`/gyms/${event.gym.id}`);
  const single = event.routes.length === 1;
  const shown = event.routes.slice(0, 3);
  const extra = event.routes.length - shown.length;

  return (
    <View style={styles.card}>
      <Pressable onPress={openGym} hitSlop={space(1.5)}>
        <Avatar src={event.gym.image_url} name={event.gym.name} size={38} />
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.line}>
          <Text style={styles.actor} onPress={openGym}>
            {event.gym.name}
          </Text>
          <Text style={styles.verb}>
            {single ? ' added ' : ` added ${event.routes.length} new routes`}
          </Text>
          {single ? (
            <RouteChip
              route={event.routes[0]}
              onPress={() => router.push(`/routes/${event.routes[0].id}`)}
            />
          ) : null}
        </Text>
        {!single ? (
          <Text style={styles.line}>
            {shown.map((r, i) => (
              <Text key={r.id}>
                {i > 0 ? <Text style={styles.verb}>{'   '}</Text> : null}
                <RouteChip route={r} onPress={() => router.push(`/routes/${r.id}`)} />
              </Text>
            ))}
            {extra > 0 ? (
              <Text style={styles.more} onPress={openGym}>
                {'   '}+{extra} more
              </Text>
            ) : null}
          </Text>
        ) : null}
        <MetaRow kind="routes" ts={event.ts} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space(3),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    padding: space(3.5),
  },
  body: {
    flex: 1,
    gap: space(1.5),
  },
  line: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
  },
  actor: {
    fontFamily: fonts.uiSemi,
    color: colors.fg,
  },
  verb: {
    color: colors.fgMuted,
  },
  route: {
    fontFamily: fonts.uiMedium,
    color: colors.fg,
  },
  grade: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.accent,
  },
  gym: {
    color: colors.fgFaint,
  },
  quote: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: colors.chalk300,
    fontStyle: 'italic',
  },
  caption: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 19,
    color: colors.chalk300,
  },
  more: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.accent,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    marginTop: space(0.5),
  },
  when: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.fgFaint,
  },
  thumb: {
    width: 84,
    height: 56,
    borderRadius: radii.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBlank: {
    backgroundColor: colors.surfaceHover,
  },
  thumbPlay: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(14, 18, 22, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
