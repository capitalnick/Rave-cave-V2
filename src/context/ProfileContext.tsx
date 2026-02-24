import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';

// ── Types ──

export type Currency = 'AUD' | 'USD' | 'EUR' | 'GBP';
export type Tier = 'free' | 'premium';

interface UserProfile {
  currency: Currency;
  onboardingComplete: boolean;
  createdAt: Timestamp | null;
  tier: Tier;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  upgradedAt: Timestamp | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
}

interface ProfileContextValue {
  profile: UserProfile;
  profileLoading: boolean;
  isPremium: boolean;
  hasSubscription: boolean;
  updateCurrency: (currency: Currency) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  currency: 'AUD',
  onboardingComplete: false,
  createdAt: null,
  tier: 'free',
  stripeCustomerId: null,
  subscriptionId: null,
  subscriptionStatus: null,
  upgradedAt: null,
  cancelAtPeriodEnd: false,
  cancelAt: null,
};

// ── Context ──

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}

// ── Provider ──

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setProfileLoading(false);
      return;
    }

    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');

    const unsubscribe = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          currency: data.currency ?? DEFAULT_PROFILE.currency,
          onboardingComplete: data.onboardingComplete ?? DEFAULT_PROFILE.onboardingComplete,
          createdAt: data.createdAt ?? null,
          tier: data.tier ?? DEFAULT_PROFILE.tier,
          stripeCustomerId: data.stripeCustomerId ?? null,
          subscriptionId: data.subscriptionId ?? null,
          subscriptionStatus: data.subscriptionStatus ?? null,
          upgradedAt: data.upgradedAt ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          cancelAt: data.cancelAt ?? null,
        });
      } else {
        // New user — create default profile doc
        // Note: tier is omitted here (protected field in Firestore rules)
        // and defaults to 'free' on read via ?? fallback
        await setDoc(profileRef, {
          currency: DEFAULT_PROFILE.currency,
          onboardingComplete: DEFAULT_PROFILE.onboardingComplete,
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateCurrency = useCallback(async (currency: Currency) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    await updateDoc(profileRef, { currency });
  }, [user]);

  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    await updateDoc(profileRef, { onboardingComplete: true });
  }, [user]);

  const isPremium = profile.tier === 'premium';
  const hasSubscription = !!profile.subscriptionId;

  const value = useMemo<ProfileContextValue>(() => ({
    profile,
    profileLoading,
    isPremium,
    hasSubscription,
    updateCurrency,
    markOnboardingComplete,
  }), [profile, profileLoading, isPremium, hasSubscription, updateCurrency, markOnboardingComplete]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
