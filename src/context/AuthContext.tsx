import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
  type AuthError,
} from 'firebase/auth';
import { auth } from '@/firebase';
import { setSentryUser } from '@/config/sentry';
import { identifyUser, resetAnalytics } from '@/config/analytics';

// ── Error mapping ──

const googleProvider = new GoogleAuthProvider();

function mapAuthError(error: AuthError): string | null {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/popup-closed-by-user':
      return null;
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    default:
      return 'Something went wrong. Please try again';
  }
}

// ── Context shape ──

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  continueWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Provider ──

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setSentryUser(firebaseUser?.uid ?? null, firebaseUser?.email);
      if (firebaseUser) {
        identifyUser(firebaseUser.uid);
      } else {
        resetAnalytics();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const msg = mapAuthError(e as AuthError);
      if (msg) setError(msg);
    }
  }, []);

  const continueWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (signInErr) {
      const code = (signInErr as AuthError).code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        // User may not exist — attempt sign-up
        try {
          const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
          if (displayName) await updateProfile(newUser, { displayName });
        } catch (signUpErr) {
          const signUpCode = (signUpErr as AuthError).code;
          if (signUpCode === 'auth/email-already-in-use') {
            // Account exists — the original sign-in failed due to wrong password
            setError('Incorrect password');
          } else {
            const msg = mapAuthError(signUpErr as AuthError);
            if (msg) setError(msg);
          }
        }
      } else {
        const msg = mapAuthError(signInErr as AuthError);
        if (msg) setError(msg);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      const msg = mapAuthError(e as AuthError);
      if (msg) setError(msg);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    signInWithGoogle,
    continueWithEmail,
    signOut,
  }), [user, loading, error, signInWithGoogle, continueWithEmail, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
