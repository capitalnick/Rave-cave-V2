import React, { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { useProfile } from '@/context/ProfileContext';
import { useInventory } from '@/context/InventoryContext';
import { db, storage, auth } from '@/firebase';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';
import {
  Card,
  Row,
  Heading,
  Body,
  Button,
  Input,
  InlineMessage,
  showToast,
} from '@/components/rc';
import type { Wine } from '@/types';
import { formatGrapeDisplay } from '@/utils/grapeUtils';
import { trackEvent } from '@/config/analytics';
import ImportFlow from '@/components/import/ImportFlow';

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

// ── Component ──

const DangerZoneSection: React.FC = () => {
  const { hasSubscription } = useProfile();
  const { inventory } = useInventory();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

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

  return (
    <>
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
    </>
  );
};

export default DangerZoneSection;
