import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { BUILT_IN_CURRENCIES, getCurrencySymbol } from '@/lib/currencyConversion';
import {
  Button,
  Input,
  Divider,
  Body,
  Caption,
  MonoLabel,
  showToast,
} from '@/components/rc';

interface Props {
  /** Wine priceCurrency values currently in use — blocks deletion of these */
  usedCurrencies: Set<string>;
}

const MAX_CUSTOM = 10;

const ConversionRatesEditor: React.FC<Props> = ({ usedCurrencies }) => {
  const { profile, updateConversionRates, updateCustomCurrencies } = useProfile();

  // Local copy of rates for editing (only saved on explicit Save)
  const [localRates, setLocalRates] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState('');

  // All non-home currencies to show rows for
  const allCurrencies = useMemo(() => {
    const builtIn = BUILT_IN_CURRENCIES.filter(c => c !== profile.currency);
    const custom = profile.customCurrencies.filter(c => c !== profile.currency);
    return [...builtIn, ...custom];
  }, [profile.currency, profile.customCurrencies]);

  // Sync from profile → local state when profile changes
  useEffect(() => {
    const rateStrings: Record<string, string> = {};
    for (const code of allCurrencies) {
      const rate = profile.conversionRates[code];
      rateStrings[code] = rate != null ? String(rate) : '';
    }
    setLocalRates(rateStrings);
    setDirty(false);
  }, [profile.conversionRates, allCurrencies]);

  const handleRateChange = (code: string, value: string) => {
    setLocalRates(prev => ({ ...prev, [code]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validate all rates
    const parsed: Record<string, number> = {};
    for (const code of allCurrencies) {
      const raw = localRates[code]?.trim();
      if (!raw) continue;
      const num = parseFloat(raw);
      if (isNaN(num) || num <= 0) {
        showToast({ tone: 'error', message: `Invalid rate for ${code} — must be a positive number` });
        return;
      }
      parsed[code] = num;
    }

    setSaving(true);
    try {
      await updateConversionRates(parsed);
      setDirty(false);
      showToast({ tone: 'success', message: 'Conversion rates saved' });
    } catch {
      showToast({ tone: 'error', message: 'Failed to save rates' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCurrency = async () => {
    const code = newCode.trim().toUpperCase();
    if (!code || code.length !== 3 || !/^[A-Z]{3}$/.test(code)) {
      showToast({ tone: 'error', message: 'Enter a valid 3-letter currency code' });
      return;
    }
    if (code === profile.currency) {
      showToast({ tone: 'error', message: `${code} is already your home currency` });
      return;
    }
    if (BUILT_IN_CURRENCIES.includes(code as any) || profile.customCurrencies.includes(code)) {
      showToast({ tone: 'error', message: `${code} already exists` });
      return;
    }
    if (profile.customCurrencies.length >= MAX_CUSTOM) {
      showToast({ tone: 'error', message: `Maximum ${MAX_CUSTOM} custom currencies` });
      return;
    }

    try {
      await updateCustomCurrencies([...profile.customCurrencies, code]);
      setNewCode('');
      showToast({ tone: 'success', message: `${code} added` });
    } catch {
      showToast({ tone: 'error', message: 'Failed to add currency' });
    }
  };

  const handleDeleteCurrency = async (code: string) => {
    if (usedCurrencies.has(code)) {
      showToast({ tone: 'error', message: `Cannot delete ${code} — wines are tagged with this currency. Reassign them first.` });
      return;
    }

    const updated = profile.customCurrencies.filter(c => c !== code);
    const updatedRates = { ...profile.conversionRates };
    delete updatedRates[code];

    try {
      await updateCustomCurrencies(updated);
      await updateConversionRates(updatedRates);
      showToast({ tone: 'success', message: `${code} removed` });
    } catch {
      showToast({ tone: 'error', message: 'Failed to remove currency' });
    }
  };

  return (
    <div className="px-[var(--rc-row-padding-h)] pb-4 space-y-3">
      <Caption className="text-[var(--rc-text-secondary)]">
        Rates are foreign-to-home: how many {profile.currency} per 1 unit of each currency.
      </Caption>

      {allCurrencies.map(code => {
        const rateStr = localRates[code] ?? '';
        const rateNum = parseFloat(rateStr);
        const inverse = !isNaN(rateNum) && rateNum > 0 ? (1 / rateNum).toFixed(4) : '—';
        const isCustom = profile.customCurrencies.includes(code);
        const isUsed = usedCurrencies.has(code);

        return (
          <div key={code} className="flex items-center gap-2">
            <MonoLabel className="w-12 shrink-0 text-[var(--rc-text-primary)]">{code}</MonoLabel>
            <Body className="shrink-0 text-[var(--rc-text-secondary)]">{getCurrencySymbol(code).trim()}1 =</Body>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min="0.0001"
              value={rateStr}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRateChange(code, e.target.value)}
              className="w-24 text-right"
              placeholder="0.00"
            />
            <Body className="shrink-0 text-[var(--rc-text-secondary)]">{getCurrencySymbol(profile.currency).trim()}</Body>
            <Caption className="ml-auto text-[var(--rc-text-tertiary)] whitespace-nowrap">
              1 {profile.currency} = {inverse} {code}
            </Caption>
            {isCustom && (
              <button
                onClick={() => handleDeleteCurrency(code)}
                className={`ml-1 p-1 rounded transition-colors ${
                  isUsed
                    ? 'text-[var(--rc-text-tertiary)] cursor-not-allowed opacity-40'
                    : 'text-[var(--rc-text-secondary)] hover:text-[var(--rc-accent-coral)]'
                }`}
                title={isUsed ? `In use by wines — cannot delete` : `Remove ${code}`}
                disabled={isUsed}
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}

      <Divider />

      {/* Add custom currency */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={newCode}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCode(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="e.g. CHF"
          className="w-20 uppercase"
          maxLength={3}
        />
        <button
          onClick={handleAddCurrency}
          disabled={newCode.length !== 3}
          className="flex items-center gap-1 font-[family-name:var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-wider text-[var(--rc-accent-pink)] hover:underline disabled:opacity-40 disabled:no-underline"
        >
          <Plus size={14} /> Add Currency
        </button>
      </div>

      {/* Save button */}
      {dirty && (
        <div className="flex justify-end pt-1">
          <Button
            variantType="Primary"
            label={saving ? 'Saving…' : 'Save Rates'}
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      )}
    </div>
  );
};

export default ConversionRatesEditor;
