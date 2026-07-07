import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, type Href } from 'expo-router';

import { colors, fonts, radii, space } from '@/lib/theme';

// Muted prompt with a tappable accent link, e.g. "New here? Create an account".
export function SwitchLink({ prompt, href, action }: { prompt: string; href: Href; action: string }) {
  return (
    <Text style={styles.switch}>
      {prompt}{' '}
      <Link href={href} style={styles.switchLink}>
        {action}
      </Link>
    </Text>
  );
}

// Shared themed auth primitives so login / signup / forgot-password / onboarding
// don't each re-declare the same field and button styles.

// Page scaffold: dark background, safe area, keyboard-aware scroll, and the
// eyebrow / title / subtitle header used across every auth screen.
export function AuthShell({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.shell} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{sub}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = TextInputProps & { label: string };

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, style, ...props },
  ref
) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        placeholderTextColor={colors.fgFaint}
        {...props}
      />
    </View>
  );
});

export function SubmitButton({
  label,
  pendingLabel,
  pending,
  disabled,
  onPress,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const isDisabled = pending || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}>
      {pending ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={styles.buttonLabel}>{isDisabled ? pendingLabel : label}</Text>
      )}
    </Pressable>
  );
}

export function FormError({ children }: { children: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space(6),
    paddingTop: space(8),
    paddingBottom: space(8),
    gap: space(5),
  },
  header: {
    gap: space(2),
    marginBottom: space(2),
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
  sub: {
    fontFamily: fonts.ui,
    fontSize: 15,
    lineHeight: 23,
    color: colors.fgMuted,
    maxWidth: 340,
  },
  fieldWrap: {
    gap: space(2),
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.fgMuted,
  },
  input: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.fg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3.5),
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: space(4),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPressed: {
    backgroundColor: colors.accentHover,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 16,
    color: colors.onAccent,
  },
  errorBox: {
    backgroundColor: 'rgba(197, 80, 70, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 80, 70, 0.4)',
    borderRadius: radii.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  errorText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#e6a49d',
  },
  switch: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.fgMuted,
    textAlign: 'center',
  },
  switchLink: {
    fontFamily: fonts.uiSemi,
    color: colors.accent,
  },
});
