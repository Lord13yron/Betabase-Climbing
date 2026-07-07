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

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setPending(false);
    // Email confirmation is on, so there is no session yet. Show the
    // "check your email" state; the confirm link opens the website, then the
    // user returns and logs in from the app.
    if (error) {
      setError(error.message);
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your email."
        sub="Click the confirmation link to finish creating your account, then come back and log in.">
        <View style={styles.sentBox}>
          <Text style={styles.sentTo}>{sentTo}</Text>
        </View>
        <SwitchLink prompt="Confirmed already?" href="/login" action="Back to log in" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Join the community"
      title="Start your logbook."
      sub="Create an account to track sends, favorite gyms, and give back your beta.">
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
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 6 characters"
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />
      <SubmitButton
        label="Create account"
        pendingLabel="Creating account"
        pending={pending}
        disabled={!email || !password}
        onPress={onSubmit}
      />
      <SwitchLink prompt="Already climbing with us?" href="/login" action="Log in" />
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
