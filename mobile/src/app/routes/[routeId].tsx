import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

// S5 stub so route rows have somewhere to navigate. S6 replaces this with the
// real route detail: playback, sends, favorites.
export default function RouteScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const router = useRouter();

  const routeQuery = useQuery({
    queryKey: ['route-stub', routeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('name, grade_label')
        .eq('id', routeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={space(2)}
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
        <Ionicons name="chevron-back" size={18} color={colors.fg} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>
          {routeQuery.data?.grade_label ? `Route · ${routeQuery.data.grade_label}` : 'Route'}
        </Text>
        <Text style={styles.title}>{routeQuery.data?.name ?? ' '}</Text>
        <Text style={styles.note}>Beta videos, sends, and favorites land here. Built in S6.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(0.5),
    alignSelf: 'flex-start',
    marginHorizontal: space(4),
    marginTop: space(2),
    paddingVertical: space(1),
    paddingRight: space(2),
  },
  backPressed: {
    opacity: 0.7,
  },
  backLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: colors.fg,
  },
  body: {
    paddingHorizontal: space(6),
    paddingTop: space(6),
    gap: space(3),
  },
  eyebrow: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.chalk50,
  },
  note: {
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 23,
    color: colors.fgMuted,
    maxWidth: 320,
  },
});
