import React, { useState, useEffect } from 'react';
import { LogOut, Download, Upload, Trash2, Crown, CreditCard, Bell } from 'lucide-react';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, type Currency } from '@/context/ProfileContext';
import { useInventory } from '@/context/InventoryContext';
import { db, storage, auth } from '@/firebase';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';
import {
  PageHeader,
  Card,
  Row,
  Heading,
  Body,
  MonoLabel,
  Radio,
  Divider,
  Button,
  Input,
  InlineMessage,
  showToast,
} from '@/components/rc';
import { CONFIG } from '@/constants';
import type { Wine } from '@/types';
import { formatGrapeDisplay } from '@/utils/grapeUtils';
import { trackEvent } from '@/config/analytics';
import ImportFlow from '@/components/import/ImportFlow';
import { requestNotificationPermission, getNotificationStatus } from '@/config/notifications';

// ── Constants ──

const CURRENCY_LABELS: Record<Currency, string> = {
  AUD: 'AUD — Australian Dollar',
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  GBP: 'GBP — British Pound',
};

const PRIVACY_URL = 'https://ravecave.app/privacy';
const TERMS_URL = 'https://ravecave.app/terms';

// ── CSV Export ──

function exportCellarCSV(inventory: Wine[]): void {
  const headers = [
    'Producer', 'Wine Name', 'Vintage', 'Type', 'Cepage',
    'Region', 'Country', 'Appellation', 'Quantity', 'Price',
    'Rating', 'Maturity', 'Drink From', 'Drink Until',
    'Tasting Notes', 'Personal Note', 'Format',
  ];

  const escapeCSV = (value: any): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = inventory.map(w => [
    w.producer, w.name, w.vintage || '', w.type || '', formatGrapeDisplay(w.grapeVarieties) || '',
    w.region || '', w.country || '', w.appellation || '', w.quantity || '',
    w.price || '', w.vivinoRating || '', w.maturity || '', w.drinkFrom || '',
    w.drinkUntil || '', w.tastingNotes || '', w.personalNote || '', w.format || '',
  ].map(escapeCSV).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rave-cave-cellar-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Settings Page ──

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { profile, isPremium, hasSubscription, updateCurrency } = useProfile();
  const { inventory, totalBottles } = useInventory();

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
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

  // Show success toast when returning from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      trackEvent('upgrade_completed');
      showToast({ tone: 'success', message: 'Welcome to Premium! Your upgrade is active.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // ── Handlers ──

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCurrencySelect = async (c: Currency) => {
    await updateCurrency(c);
    setCurrencyOpen(false);
  };

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

  const handleExport = () => {
    trackEvent('csv_exported');
    exportCellarCSV(inventory);
    showToast({ tone: 'neutral', message: 'Cellar exported' });
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);

    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const uid = currentUser.uid;

    try {
      // Step 0: Cancel Stripe subscription if active
      if (hasSubscription) {
        try {
          await authFetch(FUNCTION_URLS.cancelSubscription, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.warn('Subscription cancel during delete:', e);
        }
      }

      // Step 1: Delete all wine documents (user still authenticated for security rules)
      const winesRef = collection(db, 'users', uid, 'wines');
      const snapshot = await getDocs(winesRef);
      const BATCH_SIZE = 500;
      let batch = writeBatch(db);
      let count = 0;
      for (const docSnap of snapshot.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count % BATCH_SIZE === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      if (count % BATCH_SIZE !== 0) {
        await batch.commit();
      }

      // Step 2: Delete profile document
      const profileRef = doc(db, 'users', uid, 'profile', 'preferences');
      await deleteDoc(profileRef);

      // Step 3: Delete Storage files
      try {
        const labelsRef = ref(storage, `users/${uid}/labels`);
        const labelsList = await listAll(labelsRef);
        await Promise.all(labelsList.items.map(item => deleteObject(item)));
      } catch (e) {
        console.warn('Label cleanup:', e);
      }

      try {
        const winelistsRef = ref(storage, `users/${uid}/winelists`);
        const wlList = await listAll(winelistsRef);
        for (const prefix of wlList.prefixes) {
          const subList = await listAll(prefix);
          await Promise.all(subList.items.map(item => deleteObject(item)));
        }
        await Promise.all(wlList.items.map(item => deleteObject(item)));
      } catch (e) {
        console.warn('Wine list cleanup:', e);
      }

      // Step 4: Delete auth account (last — removes auth, triggering AuthGate)
      await currentUser.delete();
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        setDeleteError('For security, please sign out and sign back in, then try again.');
      } else {
        setDeleteError(`Failed to delete account: ${e?.message || 'Unknown error'}`);
        console.error('Delete account error:', e);
      }
      setDeleting(false);
    }
  };

  // ── Derived ──

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const photoURL = user?.photoURL;
  const providerId = user?.providerData[0]?.providerId;
  const providerLabel =
    providerId === 'google.com' ? 'Connected via Google' :
    providerId === 'apple.com' ? 'Connected via Apple' :
    'Signed in with email';
  const initial = (displayName[0] || email[0] || 'U').toUpperCase();

  return (
    <div className="p-4 sm:p-10 h-full overflow-y-auto">
      <PageHeader title="SETTINGS" subtitle="Account & preferences" />
      <div className="h-8" />

      {/* ── Account Section ── */}
      <Heading scale="subhead" className="mb-2">Account</Heading>
      <Card elevation="flat">
        {/* Profile row */}
        <div className="flex items-center gap-4 py-[var(--rc-row-padding-v)] px-[var(--rc-row-padding-h)]">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-['Satoshi'] font-bold text-lg"
              style={{
                backgroundColor: 'var(--rc-accent-pink)',
                color: 'var(--rc-ink-on-accent)',
              }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <Body className="w-auto truncate">{displayName}</Body>
            <MonoLabel size="label" colour="ghost" className="w-auto truncate">{email}</MonoLabel>
            <MonoLabel size="label" colour="ghost" className="w-auto">{providerLabel}</MonoLabel>
          </div>
        </div>
        <Divider />
        <Row
          title="Sign Out"
          leadingIcon={<LogOut size={20} />}
          trailingAction="none"
          onClick={handleSignOut}
          divider={false}
        />
      </Card>

      <div className="h-8" />

      {/* ── Plan Section ── */}
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

      <div className="h-8" />

      {/* ── Preferences Section ── */}
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

      <div className="h-8" />

      {/* ── About Section ── */}
      <Heading scale="subhead" className="mb-2">About</Heading>
      <Card elevation="flat">
        <Row title="Version" trailingAction="value" trailingValue="1.0.0" divider={true} />
        <Row
          title="Privacy Policy"
          trailingAction="chevron"
          onClick={() => window.open(PRIVACY_URL, '_blank')}
          divider={true}
        />
        <Row
          title="Terms of Service"
          trailingAction="chevron"
          onClick={() => window.open(TERMS_URL, '_blank')}
          divider={false}
        />
      </Card>

      <div className="h-8" />

      {/* ── Data Section ── */}
      <Heading scale="subhead" className="mb-2">Data</Heading>
      <Card elevation="flat">
        <Row
          title="Import Wines"
          subtitle="From CellarTracker, Vivino, or CSV"
          leadingIcon={<Upload size={20} />}
          trailingAction="chevron"
          onClick={() => setShowImport(true)}
        />
        <Row
          title="Export Cellar (CSV)"
          leadingIcon={<Download size={20} />}
          trailingAction="chevron"
          onClick={handleExport}
        />
        <Row
          title="Delete Account"
          leadingIcon={<Trash2 size={20} className="text-[var(--rc-accent-coral)]" />}
          trailingAction="chevron"
          onClick={() => { setDeleteModalOpen(true); setConfirmText(''); setDeleteError(null); }}
          divider={false}
          className="[&_span:first-of-type]:text-[var(--rc-accent-coral)]"
        />
      </Card>

      <div className="h-20" />

      {/* ── Delete Account Modal ── */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
            onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-[440px]"
            >
              <Card elevation="raised" padding="standard">
                <Heading scale="heading" colour="accent-coral">Delete Account</Heading>
                <div className="h-3" />
                <Body className="w-auto">
                  This will permanently delete your account and all cellar data. This cannot be undone.
                </Body>
                <div className="h-4" />
                <Body className="w-auto">Type DELETE to confirm:</Body>
                <div className="h-2" />
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  state={deleting ? 'Disabled' : 'Default'}
                />
                <div className="h-4" />
                <InlineMessage tone="warning" message="This action is irreversible" />
                {deleteError && (
                  <>
                    <div className="h-3" />
                    <InlineMessage tone="error" message={deleteError} />
                  </>
                )}
                <div className="h-4" />
                <div className="flex gap-3">
                  <Button
                    variantType="Secondary"
                    label="Cancel"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                    className="flex-1"
                  />
                  <Button
                    variantType="Destructive"
                    label={deleting ? 'Deleting...' : 'Delete Everything'}
                    disabled={confirmText !== 'DELETE' || deleting}
                    onClick={handleDelete}
                    className="flex-1"
                  />
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showImport && <ImportFlow onClose={() => setShowImport(false)} />}
    </div>
  );
};

export default SettingsPage;
