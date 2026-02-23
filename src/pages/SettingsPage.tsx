import React, { useState } from 'react';
import { LogOut, Download, Trash2, Crown } from 'lucide-react';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, type Currency } from '@/context/ProfileContext';
import { useInventory } from '@/context/InventoryContext';
import { db, storage, auth } from '@/firebase';
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
    w.producer, w.name, w.vintage || '', w.type || '', w.cepage || '',
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
  const { profile, isPremium, updateCurrency } = useProfile();
  const { inventory, totalBottles } = useInventory();

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Handlers ──

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCurrencySelect = async (c: Currency) => {
    await updateCurrency(c);
    setCurrencyOpen(false);
  };

  const handleExport = () => {
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
              <Body className="w-auto font-semibold">{isPremium ? 'Premium' : 'Free'}</Body>
              <MonoLabel size="label" colour="ghost" className="w-auto">
                {isPremium ? 'Unlimited bottles & full R\u00e9my access' : `${totalBottles} of ${CONFIG.FREE_TIER.MAX_BOTTLES} bottles used`}
              </MonoLabel>
            </div>
          </div>
          {!isPremium && (
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
                label="Upgrade to Premium"
                onClick={() => showToast({ tone: 'neutral', message: 'Premium coming soon! Contact support for early access.' })}
                className="w-full"
              />
            </>
          )}
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
          divider={false}
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
    </div>
  );
};

export default SettingsPage;
