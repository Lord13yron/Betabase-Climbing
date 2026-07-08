import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toggleFavoriteGym, type GymCardData } from '@/lib/gyms';
import { useSession } from '@/lib/session';
import { colors, fonts, radii, space } from '@/lib/theme';

// Full-width photo card for the gyms directory: image with a routes badge,
// discipline label, name, city, beta count, and "Set X ago". A heart overlay
// toggles `favorite_gyms` (port of the web's GymFavoriteButton) and sits
// outside the navigation Pressable so tapping it never opens the gym.
export function GymCard({ gym, favorited }: { gym: GymCardData; favorited: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push(`/gyms/${gym.id}`)}
        style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
        <View style={styles.media}>
          <Image
            source={{ uri: gym.image }}
            style={styles.image}
            alt={gym.name}
            contentFit="cover"
            transition={150}
          />
          <View style={styles.badge}>
            <Ionicons name="layers-outline" size={13} color={colors.chalk100} />
            <Text style={styles.badgeText}>{gym.routesCount} routes</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Text style={styles.types}>{gym.typesLabel}</Text>
          <Text style={styles.name}>{gym.name}</Text>
          {gym.city ? (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={14} color={colors.fgMuted} />
              <Text style={styles.loc}>{gym.city}</Text>
            </View>
          ) : null}
          <View style={styles.foot}>
            <View style={styles.betaRow}>
              <Ionicons name="play-circle-outline" size={15} color={colors.accent} />
              <Text style={styles.beta}>{gym.beta} beta</Text>
            </View>
            {gym.setLabel ? <Text style={styles.setLabel}>Set {gym.setLabel}</Text> : null}
          </View>
        </View>
      </Pressable>
      <FavoriteHeart gymId={gym.id} favorited={favorited} />
    </View>
  );
}

function FavoriteHeart({ gymId, favorited }: { gymId: string; favorited: boolean }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const toggle = useMutation({
    mutationFn: () => toggleFavoriteGym(userId!, gymId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorite-gym-ids'] }),
  });

  if (!userId) return null;

  return (
    <Pressable
      onPress={() => toggle.mutate()}
      disabled={toggle.isPending}
      hitSlop={space(2)}
      accessibilityLabel={favorited ? 'Remove gym from favorites' : 'Add gym to favorites'}
      style={({ pressed }) => [styles.heart, (pressed || toggle.isPending) && styles.heartPressed]}>
      <Ionicons
        name={favorited ? 'heart' : 'heart-outline'}
        size={20}
        color={favorited ? colors.accent : colors.chalk100}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  press: {
    borderRadius: radii.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  media: {
    height: 170,
    backgroundColor: colors.slate700,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    left: space(3),
    bottom: space(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    backgroundColor: 'rgba(14, 18, 22, 0.72)',
    borderRadius: radii.sm,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.5),
  },
  badgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.chalk100,
  },
  body: {
    padding: space(4),
    gap: space(1.5),
  },
  types: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  name: {
    fontFamily: fonts.uiSemi,
    fontSize: 19,
    color: colors.chalk50,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
  },
  loc: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.fgMuted,
  },
  foot: {
    marginTop: space(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  betaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  beta: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.chalk100,
  },
  setLabel: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.fgFaint,
  },
  heart: {
    position: 'absolute',
    top: space(3),
    right: space(3),
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 22, 0.6)',
  },
  heartPressed: {
    opacity: 0.7,
  },
});
