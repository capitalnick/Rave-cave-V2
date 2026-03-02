import React, { useState, useEffect } from 'react';
import { Crown } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { useInventory } from '@/context/InventoryContext';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';
import {
  Card,
  Heading,
  Body,
  MonoLabel,
  Button,
  showToast,
} from '@/components/rc';
import { CONFIG } from '@/constants';
import { trackEvent } from '@/config/analytics';

const PlanSection: React.FC = () => {
  const { profile, isPremium, hasSubscription } = useProfile();
  const { totalBottles } = useInventory();

  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);

  // Show success toast when returning from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      trackEvent('upgrade_completed');
      showToast({ tone: 'success', message: 'Welcome to Premium! Your upgrade is active.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const res = await authFetch(FUNCTION_URLS.createCheckout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to start checkout');
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      showToast({ tone: 'error', message: e.message || 'Something went wrong' });
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setManageLoading(true);
    try {
      const res = await authFetch(FUNCTION_URLS.createPortal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to open subscription portal');
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e: any) {
      showToast({ tone: 'error', message: e.message || 'Something went wrong' });
      setManageLoading(false);
    }
  };

  return (
    <>
      <Heading scale="subhead" className="mb-2">Plan</Heading>
      <Card elevation="flat">
        <div className="py-[var(--rc-row-padding-v)] px-[var(--rc-row-padding-h)]">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: isPremium ? 'var(--rc-accent-pink)' : 'var(--rc-surface-tertiary)',
              }}
            >
              <Crown size={18} style={{ color: isPremium ? 'var(--rc-ink-on-accent)' : 'var(--rc-ink-tertiary)' }} />
            </div>
            <div>
              <Body className="w-auto font-semibold">
                {isPremium
                  ? profile.cancelAtPeriodEnd
                    ? `Premium (expires ${profile.cancelAt ? new Date(profile.cancelAt).toLocaleDateString() : 'soon'})`
                    : 'Premium'
                  : 'Free'}
              </Body>
              <MonoLabel size="label" colour="ghost" className="w-auto">
                {isPremium
                  ? profile.cancelAtPeriodEnd
                    ? 'Your subscription will not renew'
                    : 'Unlimited bottles & full R\u00e9my access'
                  : `${totalBottles} of ${CONFIG.FREE_TIER.MAX_BOTTLES} bottles used`}
              </MonoLabel>
              {profile.subscriptionStatus === 'past_due' && (
                <MonoLabel size="label" className="w-auto text-[var(--rc-accent-coral)]">
                  Payment past due — please update your card
                </MonoLabel>
              )}
            </div>
          </div>
          {isPremium && hasSubscription ? (
            <Button
              variantType="Secondary"
              label={manageLoading ? 'Opening...' : 'Manage Subscription'}
              onClick={handleManageSubscription}
              disabled={manageLoading}
              className="w-full"
            />
          ) : !isPremium ? (
            <>
              {/* Usage bar */}
              <div className="mb-4">
                <div className="h-2 rounded-full bg-[var(--rc-surface-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((totalBottles / CONFIG.FREE_TIER.MAX_BOTTLES) * 100, 100)}%`,
                      backgroundColor: totalBottles >= CONFIG.FREE_TIER.MAX_BOTTLES
                        ? 'var(--rc-accent-coral)'
                        : 'var(--rc-accent-pink)',
                    }}
                  />
                </div>
              </div>
              <Button
                variantType="Primary"
                label={upgradeLoading ? 'Redirecting...' : 'Upgrade to Premium'}
                onClick={handleUpgrade}
                disabled={upgradeLoading}
                className="w-full"
              />
            </>
          ) : null}
        </div>
      </Card>
    </>
  );
};

export default PlanSection;
