import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// Deep link the OAuth flow returns to. Must be added verbatim to the Supabase
// dashboard's Redirect URLs allow-list. In the dev build this resolves to
// betabase://auth-callback (the scheme is set in app.json).
const redirectTo = makeRedirectUri({ scheme: 'betabase', path: 'auth-callback' });

// Native Google sign-in (PKCE). Opens the consent screen in an in-app browser,
// then exchanges the returned ?code for a session. On success the client's
// onAuthStateChange (see lib/session.tsx) advances the onboarding gate, so a
// new Google user lands on onboarding and a returning one lands on the tabs.
// A user-cancelled browser is a silent no-op (error: null).
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data.url) return { error: 'Could not start Google sign-in.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { error: null };

  const { params, errorCode } = getQueryParams(result.url);
  if (errorCode) return { error: errorCode };
  const { code } = params;
  if (!code) return { error: 'No authorization code returned from Google.' };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return { error: exchangeError?.message ?? null };
}
