import type { Session, User } from '@biltme/backend';
import { createContext, type PropsWithChildren, use, useEffect, useMemo, useState } from 'react';

import { backend } from '@/lib/backend';

type AuthState = {
  session: Session | null;
  user: User | null;
  /** True until the persisted session has been read from storage. */
  initializing: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  initializing: true,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    void backend.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = backend.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitializing(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, initializing }),
    [session, initializing],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}

/** Emails a 6-digit sign-in code, creating the account on first use. */
export async function sendSignInCode(email: string) {
  const { error } = await backend.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifySignInCode(email: string, code: string) {
  const { error } = await backend.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await backend.auth.signOut();
  if (error) throw error;
}
