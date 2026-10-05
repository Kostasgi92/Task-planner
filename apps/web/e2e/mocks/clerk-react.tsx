// Stand-in for @clerk/react used only by `vite --mode e2e` (Playwright).
// Exposes window.__tasknestTestClerk so tests can sign in/out and switch accounts.
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

type TestUser = {
  id: string;
  firstName: string;
  primaryEmailAddress: { emailAddress: string };
};

type Listener = (payload: { user: TestUser | null }) => void;

type TestClerkContext = {
  userId: string | null;
  user: TestUser | null;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  addListener: (listener: Listener) => () => void;
};

declare global {
  interface Window {
    __tasknestTestClerk?: {
      setUser: (userId: string | null) => void;
      signOut: () => Promise<void>;
      getUserId: () => string | null;
    };
  }
}

const defaultUser: TestUser = {
  id: 'e2e-user',
  firstName: 'Test User',
  primaryEmailAddress: { emailAddress: 'test@example.test' },
};

function createTestUser(userId: string): TestUser {
  if (userId === defaultUser.id) return defaultUser;
  return {
    id: userId,
    firstName: userId === 'e2e-user-b' ? 'User B' : userId,
    primaryEmailAddress: { emailAddress: `${userId}@example.test` },
  };
}

const Context = createContext<TestClerkContext>({
  userId: defaultUser.id,
  user: defaultUser,
  signOut: async () => {},
  addListener: () => () => {},
});

export function ClerkProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(defaultUser.id);
  const listeners = useRef(new Set<Listener>());
  const setUser = useCallback((next: string | null) => {
    setUserId(next);
    const user = next ? createTestUser(next) : null;
    for (const listener of listeners.current) listener({ user });
  }, []);
  const signOut = useCallback(async () => setUser(null), [setUser]);
  const getUserId = useCallback(() => userId, [userId]);

  useEffect(() => {
    window.__tasknestTestClerk = { setUser, signOut, getUserId };
    return () => {
      delete window.__tasknestTestClerk;
    };
  }, [getUserId, setUser, signOut]);

  const value: TestClerkContext = {
    userId,
    user: userId ? createTestUser(userId) : null,
    signOut,
    addListener: (listener) => {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const { userId } = useContext(Context);
  return { userId, isLoaded: true, isSignedIn: Boolean(userId), getToken: async () => null };
}

export function useClerk() {
  const { signOut, addListener } = useContext(Context);
  return { signOut, addListener };
}

export function useUser() {
  const { user } = useContext(Context);
  return { user, isLoaded: true, isSignedIn: Boolean(user) };
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}
