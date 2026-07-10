import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii, space } from '@/lib/theme';

// S9 stub of the public profile (web: app/u/[username]/page.tsx). Feed cards
// and user search navigate here; S10 replaces the placeholder body with the
// full profile (stats, height, grades, public videos).

type PublicProfile = { username: string; avatar_url: string | null };

// Exact-match, case-insensitive lookup (ilike without wildcards).
async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  const profileQuery = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchProfile(username),
  });

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

      {profileQuery.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : profileQuery.isError || !profileQuery.data ? (
        <View style={styles.center}>
          <Ionicons name="person-outline" size={28} color={colors.fgFaint} />
          <Text style={styles.emptyTitle}>Climber not found</Text>
          <Text style={styles.emptyText}>
            No profile matches &ldquo;{username}&rdquo;.
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Avatar
            src={profileQuery.data.avatar_url}
            name={profileQuery.data.username}
            size={88}
          />
          <Text style={styles.name}>{profileQuery.data.username}</Text>
          <Text style={styles.note}>Full profile with stats and videos arrives in S10.</Text>
        </View>
      )}
    </SafeAreaView>
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
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.chalk50,
  },
  note: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
});
