import { useState } from 'react';

import {
  AuthShell,
  Field,
  FormError,
  SubmitButton,
  SwitchLink,
} from '@/components/auth/auth-ui';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(null);
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    // On success, onAuthStateChange flips the gate to onboarding or tabs.
    if (error) setError(error.message);
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Pick up where you left off."
      sub="Log in to find your gym, watch beta, and keep logging your sends.">
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
        autoComplete="current-password"
        textContentType="password"
        placeholder="Your password"
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />
      <SubmitButton
        label="Log in"
        pendingLabel="Logging in"
        pending={pending}
        disabled={!email || !password}
        onPress={onSubmit}
      />
      <SwitchLink prompt="Forgot your password?" href="/forgot-password" action="Reset it" />
      <SwitchLink prompt="New to Betabase?" href="/signup" action="Create an account" />
    </AuthShell>
  );
}
