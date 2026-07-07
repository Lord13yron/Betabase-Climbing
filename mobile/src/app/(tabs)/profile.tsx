import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii, space } from '@/lib/theme';

export default function ProfileScreen() {
  const { session, username } = useSession();

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.eyebrow}>Your climbing</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>Your videos, stats, and settings. Built in S10.</Text>

        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Signed in as</Text>
          <Text style={styles.metaValue}>@{username}</Text>
          <Text style={styles.metaSub}>{session?.user.email}</Text>
        </View>

        {/* Temporary control until the real profile screen ships in S10. */}
        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
          onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutLabel}>Log out</Text>
        </Pressable>
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
    paddingHorizontal: space(6),
    paddingTop: space(8),
    gap: space(4),
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
    fontSize: 40,
    lineHeight: 44,
    color: colors.chalk50,
  },
  body: {
    fontFamily: fonts.ui,
    fontSize: 16,
    lineHeight: 25,
    color: colors.fgMuted,
    maxWidth: 320,
  },
  meta: {
    marginTop: space(4),
    gap: space(1),
  },
  metaLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgFaint,
  },
  metaValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 18,
    color: colors.fg,
  },
  metaSub: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.fgMuted,
  },
  signOut: {
    marginTop: 'auto',
    marginBottom: space(6),
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
