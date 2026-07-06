import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, space } from '@/lib/theme';

// Temporary S0 screen proving the theme: eyebrow (Plex Mono), title
// (Playfair Display), body (Hanken Grotesk) on the dark slate palette.
// Each tab replaces this with its real screen in later sections.
export function PlaceholderScreen({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
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
});
