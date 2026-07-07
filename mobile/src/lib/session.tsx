import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';

type SessionValue = {
  session: Session | null;
  // The signed-in user's claimed handle, or null if they still need onboarding.
  username: string | null;
  // True until the initial session (and, if signed in, the profile) resolve.
  loading: boolean;
  // Re-read the profile after claiming a username so the gate can advance.
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

// Fetch the profile handle for the gate. A missing row or a null username both
// mean "needs onboarding" (mirrors lib/supabase/session.ts on the website, but
// tolerant of a not-yet-created row via maybeSingle).
async function fetchUsername(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  return data?.username ?? null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setUsername(null);
      return;
    }
    setUsername(await fetchUsername(userId));
  }, [session?.user.id]);

  useEffect(() => {
    let active = true;

    async function resolve(next: Session | null) {
      if (!active) return;
      setSession(next);
      setUsername(next ? await fetchUsername(next.user.id) : null);
      if (active) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      resolve(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, username, loading, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
