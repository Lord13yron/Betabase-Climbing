import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthShell, Field, FormError, SubmitButton } from '@/components/auth/auth-ui';
import { RESERVED, USERNAME_RE } from '@/lib/auth-validation';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors, fonts, space } from '@/lib/theme';

type Check =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'invalid'; message: string }
  | { status: 'reserved'; message: string }
  | { status: 'taken'; message: string }
  | { status: 'error'; message: string };

// Mirrors checkUsernameAction on the website: format → reserved → case-
// insensitive existence probe (ilike with no wildcards = exact, case-insensitive).
async function checkUsername(raw: string): Promise<Check> {
  const username = raw.trim();
  if (!USERNAME_RE.test(username)) {
    return { status: 'invalid', message: 'Only letters, numbers, and underscores (3 to 20).' };
  }
  if (RESERVED.has(username.toLowerCase())) {
    return { status: 'reserved', message: 'That handle is reserved.' };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();
  if (error) return { status: 'error', message: 'Could not check right now.' };
  if (data) return { status: 'taken', message: `@${username} is already taken.` };
  return { status: 'ok' };
}

export default function OnboardingScreen() {
  const { session, refreshProfile } = useSession();
  const [username, setUsername] = useState('');
  const [check, setCheck] = useState<Check>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Debounce the live availability probe (~400ms) as the user types.
  useEffect(() => {
    if (username.trim() === '') {
      setCheck({ status: 'idle' });
      return;
    }
    setCheck({ status: 'checking' });
    const handle = setTimeout(async () => {
      const result = await checkUsername(username);
      setCheck(result);
    }, 400);
    return () => clearTimeout(handle);
  }, [username]);

  async function onSubmit() {
    setError(null);
    const value = username.trim();
    if (!USERNAME_RE.test(value)) {
      setError('Use 3 to 20 letters, numbers, or underscores.');
      return;
    }
    if (RESERVED.has(value.toLowerCase())) {
      setError('That username is reserved.');
      return;
    }
    const userId = session?.user.id;
    if (!userId) return;

    setPending(true);
    const { error } = await supabase.from('profiles').update({ username: value }).eq('id', userId);
    if (error) {
      setPending(false);
      // 23505 = unique_violation (claimed between check and submit).
      setError(error.code === '23505' ? 'That username is taken.' : error.message);
      return;
    }
    // Advance the gate: re-read the profile so username is set and the guard
    // flips to (tabs). Keep pending true through the transition.
    await refreshProfile();
  }

  const hint = check.status === 'ok' ? { text: `@${username.trim()} is available.`, ok: true } : null;
  const problem =
    check.status === 'invalid' || check.status === 'reserved' || check.status === 'taken' || check.status === 'error'
      ? check.message
      : null;

  return (
    <AuthShell
      eyebrow="One last thing"
      title="Claim your handle."
      sub="Pick a username. It's how the community finds you and credits your beta.">
      {error ? <FormError>{error}</FormError> : null}
      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={20}
        placeholder="crux_crusher"
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />
      {hint ? <Text style={styles.ok}>{hint.text}</Text> : null}
      {problem ? <Text style={styles.problem}>{problem}</Text> : null}
      <SubmitButton
        label="Claim username"
        pendingLabel="Claiming"
        pending={pending}
        disabled={check.status !== 'ok'}
        onPress={onSubmit}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  ok: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: colors.accent,
  },
  problem: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: '#e6a49d',
  },
});
