import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Discipline } from '@/lib/grades';
import { shortSetLabel, toggleFavoriteRoute, type GymRoute } from '@/lib/gym-detail';
import { holdColor, holdInk } from '@/lib/holds';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

// Route-row discipline labels, matching the web RouteBrowser (shorter than the
// directory's "Bouldering").
const DISCIPLINE_LABEL: Record<Discipline, string> = {
  boulder: 'Boulder',
  top_rope: 'Top rope',
  lead: 'Lead',
};

// Color-led route row ported from the web's gd-crow: hold-color band with the
// grade, then name + meta, then beta/send minis. The heart sits outside the
// navigation Pressable so tapping it never opens the route.
export function RouteRow({
  route,
  wallName,
  favorited,
}: {
  route: GymRoute;
  wallName: string;
  favorited: boolean;
}) {
  const router = useRouter();
  const band = holdColor(route.color);
  const ink = holdInk(route.color);
  const setLabel = shortSetLabel(route.set_date);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push(`/routes/${route.id}`)}
        style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
        <View style={[styles.band, { backgroundColor: band }]}>
          <Text style={[styles.grade, { color: ink }]}>{route.grade_label}</Text>
          {route.color ? (
            <Text style={[styles.colorName, { color: ink }]} numberOfLines={1}>
              {route.color}
            </Text>
          ) : null}
        </View>
        <View style={styles.body}>
          <View style={styles.left}>
            <Text style={styles.name} numberOfLines={1}>
              {route.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {DISCIPLINE_LABEL[route.discipline]}
              {'  ·  '}
              {wallName}
            </Text>
            {setLabel ? <Text style={styles.setLabel}>Set {setLabel}</Text> : null}
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.statNum}>
                <Ionicons
                  name="play-circle-outline"
                  size={14}
                  color={route.beta_count === 0 ? colors.fgFaint : colors.accent}
                />
                <Text style={[styles.statN, route.beta_count === 0 && styles.statMuted]}>
                  {route.beta_count}
                </Text>
              </View>
              <Text style={styles.statL}>Beta</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statN, route.send_count === 0 && styles.statMuted]}>
                {route.send_count}
              </Text>
              <Text style={styles.statL}>Sends</Text>
            </View>
          </View>
        </View>
      </Pressable>
      <FavoriteHeart routeId={route.id} gymId={route.gym_id} favorited={favorited} />
    </View>
  );
}

function FavoriteHeart({
  routeId,
  gymId,
  favorited,
}: {
  routeId: string;
  gymId: string;
  favorited: boolean;
}) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const toggle = useMutation({
    mutationFn: () => toggleFavoriteRoute(userId!, routeId),
    onError: () => Alert.alert('Could not update favorite', 'Check your connection and try again.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['favorite-route-ids', gymId] }),
  });

  if (!userId) return null;

  return (
    <Pressable
      onPress={() => toggle.mutate()}
      disabled={toggle.isPending}
      hitSlop={space(2)}
      accessibilityLabel={favorited ? 'Remove route from favorites' : 'Add route to favorites'}
      style={({ pressed }) => [styles.heart, (pressed || toggle.isPending) && styles.heartPressed]}>
      <Ionicons
        name={favorited ? 'heart' : 'heart-outline'}
        size={18}
        color={favorited ? colors.accent : colors.fgMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  press: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pressed: {
    opacity: 0.85,
  },
  band: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(0.5),
    paddingVertical: space(3),
    paddingHorizontal: space(1),
  },
  grade: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
  },
  colorName: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space(3.5),
    // Leaves room for the absolutely positioned heart.
    paddingRight: space(11),
    paddingVertical: space(3),
    gap: space(2),
  },
  left: {
    flex: 1,
    gap: space(1),
  },
  name: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: colors.chalk50,
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgMuted,
  },
  setLabel: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: colors.fgFaint,
  },
  stats: {
    flexDirection: 'row',
    gap: space(3.5),
  },
  stat: {
    alignItems: 'center',
    gap: space(0.5),
    minWidth: 30,
  },
  statNum: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  statN: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: colors.chalk100,
  },
  statMuted: {
    color: colors.fgFaint,
  },
  statL: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.fgFaint,
  },
  heart: {
    position: 'absolute',
    right: space(2.5),
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartPressed: {
    opacity: 0.7,
  },
});
