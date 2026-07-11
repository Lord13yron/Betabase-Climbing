import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, space } from '@/lib/theme';

// Shared query-state surfaces for full-screen (or full-region) fetch UI.
// Every screen renders these instead of hand-rolling spinner/error markup.

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  children,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={28} color={colors.fgFaint} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={onRetry}>
          <Text style={styles.btnLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(8),
    paddingVertical: space(8),
    gap: space(2.5),
  },
  title: {
    fontFamily: fonts.uiSemi,
    fontSize: 17,
    color: colors.chalk50,
  },
  text: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 21,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  btn: {
    marginTop: space(1),
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  btnPressed: {
    backgroundColor: colors.surfaceHover,
  },
  btnLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: colors.fg,
  },
});
