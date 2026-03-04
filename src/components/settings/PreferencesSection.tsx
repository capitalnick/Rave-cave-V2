import React, { useState, useEffect, useMemo } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, type Currency } from '@/context/ProfileContext';
import { useInventory } from '@/context/InventoryContext';
import {
  Card,
  Row,
  Heading,
  Radio,
  Divider,
  InlineMessage,
  showToast,
} from '@/components/rc';
import { requestNotificationPermission, getNotificationStatus } from '@/config/notifications';
import ConversionRatesEditor from './ConversionRatesEditor';

// ── Constants ──

const CURRENCY_LABELS: Record<Currency, string> = {
  AUD: 'AUD — Australian Dollar',
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  GBP: 'GBP — British Pound',
};

const PreferencesSection: React.FC = () => {
  const { user } = useAuth();
  const { profile, updateCurrency } = useProfile();
  const { inventory } = useInventory();

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported' | 'loading'>('loading');

  // Collect all priceCurrency values currently in use across wines
  const usedCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const w of inventory) {
      if (w.priceCurrency) set.add(w.priceCurrency);
    }
    return set;
  }, [inventory]);

  // Check notification permission on mount
  useEffect(() => {
    getNotificationStatus().then(setNotifStatus);
  }, []);

  const handleNotifToggle = async (checked: boolean) => {
    if (!checked || !user) return;
    setNotifStatus('loading');
    try {
      const granted = await requestNotificationPermission(user.uid);
      if (granted) {
        setNotifStatus('granted');
        showToast({ tone: 'success', message: 'Drinking window alerts enabled' });
      } else {
        const status = await getNotificationStatus();
        setNotifStatus(status);
        showToast({ tone: 'error', message: 'Notification permission denied' });
      }
    } catch {
      const status = await getNotificationStatus();
      setNotifStatus(status);
      showToast({ tone: 'error', message: 'Failed to enable notifications' });
    }
  };

  const handleCurrencySelect = async (c: Currency) => {
    await updateCurrency(c);
    setCurrencyOpen(false);
  };

  return (
    <>
      <Heading scale="subhead" className="mb-2">Preferences</Heading>
      <Card elevation="flat">
        {/* 1. Set local currency */}
        <Row
          title="Currency"
          trailingAction="value"
          trailingValue={profile.currency}
          onClick={() => setCurrencyOpen(prev => !prev)}
        />
        <AnimatePresence initial={false}>
          {currencyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Divider />
              <div className="px-[var(--rc-row-padding-h)] pb-3">
                {(['AUD', 'USD', 'EUR', 'GBP'] as Currency[]).map(c => (
                  <div
                    key={c}
                    className="flex items-center py-2 cursor-pointer"
                    onClick={() => handleCurrencySelect(c)}
                  >
                    <Radio
                      variant={profile.currency === c ? 'Selected' : 'Unselected'}
                      label={CURRENCY_LABELS[c]}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Divider />
        {/* 2. Conversion rates */}
        <Row
          title="Conversion Rates"
          subtitle="Manual rates for multi-currency cellar value"
          trailingAction="value"
          trailingValue={ratesOpen ? 'Hide' : 'Edit'}
          onClick={() => setRatesOpen(prev => !prev)}
          divider={notifStatus !== 'unsupported'}
        />
        <AnimatePresence initial={false}>
          {ratesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Divider />
              <ConversionRatesEditor usedCurrencies={usedCurrencies} />
            </motion.div>
          )}
        </AnimatePresence>
        {/* 3. Drinking window alerts */}
        {notifStatus !== 'unsupported' && (
          <>
            <Row
              title="Drinking Window Alerts"
              subtitle={
                notifStatus === 'denied'
                  ? 'Blocked — tap below to fix'
                  : notifStatus === 'granted'
                    ? 'Enabled \u2014 you\u2019ll be notified when wines are ready'
                    : 'Get notified when wines are ready'
              }
              leadingIcon={<Bell size={20} />}
              trailingAction="switch"
              switchChecked={notifStatus === 'granted'}
              onSwitchChange={handleNotifToggle}
              disabled={notifStatus === 'denied' || notifStatus === 'loading'}
              divider={notifStatus === 'denied'}
            />
            {notifStatus === 'denied' && (
              <div className="px-[var(--rc-row-padding-h)] py-3">
                <InlineMessage
                  tone="warning"
                  message="Notifications are blocked by your browser. To enable them, open your browser's site settings for Rave Cave and set Notifications to Allow, then reload."
                />
                <button
                  onClick={() => {
                    showToast({ tone: 'neutral', message: 'Open your browser settings → Site Settings → Notifications → Allow' });
                  }}
                  className="mt-2 font-[family-name:var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-wider text-[var(--rc-accent-pink)] hover:underline"
                >
                  How to fix →
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
};

export default PreferencesSection;
