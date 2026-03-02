import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, type Currency } from '@/context/ProfileContext';
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

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported' | 'loading'>('loading');

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
        <Row
          title="Currency"
          trailingAction="value"
          trailingValue={profile.currency}
          onClick={() => setCurrencyOpen(prev => !prev)}
          divider={notifStatus !== 'unsupported'}
        />
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
                  className="mt-2 font-[var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-wider text-[var(--rc-accent-pink)] hover:underline"
                >
                  How to fix →
                </button>
              </div>
            )}
          </>
        )}
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
      </Card>
    </>
  );
};

export default PreferencesSection;
