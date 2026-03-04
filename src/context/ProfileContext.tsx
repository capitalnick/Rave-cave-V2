import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/config/analytics';
import { stampMissingCurrency } from '@/services/currencyMigrationService';

// ── Types ──

export type BuiltInCurrency = 'AUD' | 'USD' | 'EUR' | 'GBP';
export type Currency = BuiltInCurrency;
export type Tier = 'free' | 'premium';

/** Default foreign-to-home rates seeded per home currency */
export const DEFAULT_RATES: Record<BuiltInCurrency, Record<string, number>> = {
  AUD: { USD: 1.55, EUR: 1.68, GBP: 1.95 },
  USD: { AUD: 0.65, EUR: 1.08, GBP: 1.26 },
  EUR: { AUD: 0.60, USD: 0.93, GBP: 1.16 },
  GBP: { AUD: 0.51, USD: 0.79, EUR: 0.86 },
};

interface UserProfile {
  currency: Currency;
  conversionRates: Record<string, number>;
  customCurrencies: string[];
  onboardingComplete: boolean;
  createdAt: Timestamp | null;
  tier: Tier;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  upgradedAt: Timestamp | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  currencyBackfillComplete: boolean;
}

interface ProfileContextValue {
  profile: UserProfile;
  profileLoading: boolean;
  isPremium: boolean;
  hasSubscription: boolean;
  updateCurrency: (currency: Currency) => Promise<void>;
  updateConversionRates: (rates: Record<string, number>) => Promise<void>;
  updateCustomCurrencies: (currencies: string[]) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  currency: 'AUD',
  conversionRates: DEFAULT_RATES['AUD'],
  customCurrencies: [],
  onboardingComplete: false,
  createdAt: null,
  tier: 'free',
  stripeCustomerId: null,
  subscriptionId: null,
  subscriptionStatus: null,
  upgradedAt: null,
  cancelAtPeriodEnd: false,
  cancelAt: null,
  currencyBackfillComplete: false,
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
        const currency = (data.currency ?? DEFAULT_PROFILE.currency) as Currency;
        setProfile({
          currency,
          conversionRates: data.conversionRates ?? DEFAULT_RATES[currency] ?? DEFAULT_RATES['AUD'],
          customCurrencies: data.customCurrencies ?? [],
          onboardingComplete: data.onboardingComplete ?? DEFAULT_PROFILE.onboardingComplete,
          createdAt: data.createdAt ?? null,
          tier: data.tier ?? DEFAULT_PROFILE.tier,
          stripeCustomerId: data.stripeCustomerId ?? null,
          subscriptionId: data.subscriptionId ?? null,
          subscriptionStatus: data.subscriptionStatus ?? null,
          upgradedAt: data.upgradedAt ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          cancelAt: data.cancelAt ?? null,
          currencyBackfillComplete: data.currencyBackfillComplete ?? false,
        });
      } else {
        // New user — create default profile doc
        // Note: tier is omitted here (protected field in Firestore rules)
        // and defaults to 'free' on read via ?? fallback
        await setDoc(profileRef, {
          currency: DEFAULT_PROFILE.currency,
          conversionRates: DEFAULT_PROFILE.conversionRates,
          customCurrencies: DEFAULT_PROFILE.customCurrencies,
          onboardingComplete: DEFAULT_PROFILE.onboardingComplete,
          createdAt: serverTimestamp(),
        }, { merge: true });
        trackEvent('sign_up');
      }
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateCurrency = useCallback(async (newCurrency: Currency) => {
    if (!user) return;
    const oldCurrency = profile.currency;

    // Stamp wines lacking priceCurrency with the OLD currency before switching
    if (oldCurrency !== newCurrency) {
      try {
        await stampMissingCurrency(user.uid, oldCurrency);
      } catch (e) {
        console.error('Failed to stamp wines with old currency:', e);
        // Non-blocking — proceed with currency change
      }
    }

    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    // Seed default rates for the new home currency
    const newRates = DEFAULT_RATES[newCurrency] ?? {};
    await updateDoc(profileRef, { currency: newCurrency, conversionRates: newRates });
  }, [user, profile.currency]);

  const updateConversionRates = useCallback(async (rates: Record<string, number>) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    await updateDoc(profileRef, { conversionRates: rates });
  }, [user]);

  const updateCustomCurrencies = useCallback(async (currencies: string[]) => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    await updateDoc(profileRef, { customCurrencies: currencies });
  }, [user]);

  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;
    const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    await updateDoc(profileRef, { onboardingComplete: true });
  }, [user]);

  // ── One-time backfill: stamp wines missing priceCurrency with home currency ──
  // Skip if profile already has the flag set (avoids reading entire wines collection every session)
  const backfillRan = useRef(false);
  useEffect(() => {
    if (!user || profileLoading || backfillRan.current) return;
    if (profile.currencyBackfillComplete) return;
    backfillRan.current = true;
    (async () => {
      try {
        const stamped = await stampMissingCurrency(user.uid, profile.currency);
        // Mark backfill complete so future sessions skip this
        const profileRef = doc(db, 'users', user.uid, 'profile', 'preferences');
        await updateDoc(profileRef, { currencyBackfillComplete: true });
        if (stamped > 0) console.info(`Currency backfill: stamped ${stamped} wines`);
      } catch (e) {
        console.error('Currency backfill failed:', e);
      }
    })();
  }, [user, profileLoading, profile.currency, profile.currencyBackfillComplete]);

  const isPremium = profile.tier === 'premium';
  const hasSubscription = !!profile.subscriptionId;

  const value = useMemo<ProfileContextValue>(() => ({
    profile,
    profileLoading,
    isPremium,
    hasSubscription,
    updateCurrency,
    updateConversionRates,
    updateCustomCurrencies,
    markOnboardingComplete,
  }), [profile, profileLoading, isPremium, hasSubscription, updateCurrency, updateConversionRates, updateCustomCurrencies, markOnboardingComplete]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
