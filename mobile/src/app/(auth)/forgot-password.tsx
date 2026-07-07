import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AuthShell,
  Field,
  FormError,
  SubmitButton,
  SwitchLink,
} from '@/components/auth/auth-ui';
import { isValidEmail } from '@/lib/auth-validation';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

// The recovery link lands on the website's /reset-password (locked decision:
// no in-app deep link for password reset in v1).
const RESET_REDIRECT = `${process.env.EXPO_PUBLIC_API_BASE_URL}/reset-password`;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setPending(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT });
    setPending(false);
    // Always report success so we don't leak whether the address has an account.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow="Reset sent"
        title="Check your email."
        sub="If that address has an account, we sent a link to reset your password. Open it, set a new password, then log in here.">
        <View style={styles.sentBox}>
          <Text style={styles.sentTo}>{email.trim()}</Text>
        </View>
        <SwitchLink prompt="Remembered it?" href="/login" action="Back to log in" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Forgot password"
      title="Reset your password."
      sub="Enter your email and we'll send a link to set a new one.">
      {error ? <FormError>{error}</FormError> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />
      <SubmitButton
        label="Send reset link"
        pendingLabel="Sending"
        pending={pending}
        disabled={!email}
        onPress={onSubmit}
      />
      <SwitchLink prompt="Remembered it?" href="/login" action="Back to log in" />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  sentBox: {
    backgroundColor: colors.surface,
    borderRadius: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(4),
    alignItems: 'center',
  },
  sentTo: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
    color: colors.accent,
  },
});
