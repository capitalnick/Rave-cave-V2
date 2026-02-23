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
}

interface ProfileContextValue {
  profile: UserProfile;
  profileLoading: boolean;
  isPremium: boolean;
  updateCurrency: (currency: Currency) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  currency: 'AUD',
  onboardingComplete: false,
  createdAt: null,
  tier: 'free',
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
        });
      } else {
        // New user — create default profile doc
        await setDoc(profileRef, {
          currency: DEFAULT_PROFILE.currency,
          onboardingComplete: DEFAULT_PROFILE.onboardingComplete,
          tier: DEFAULT_PROFILE.tier,
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

  const value = useMemo<ProfileContextValue>(() => ({
    profile,
    profileLoading,
    isPremium,
    updateCurrency,
    markOnboardingComplete,
  }), [profile, profileLoading, isPremium, updateCurrency, markOnboardingComplete]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
