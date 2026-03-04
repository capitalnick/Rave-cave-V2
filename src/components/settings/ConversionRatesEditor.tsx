import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { BUILT_IN_CURRENCIES, getCurrencySymbol } from '@/lib/currencyConversion';
import {
  Button,
  Divider,
  Caption,
  showToast,
} from '@/components/rc';

interface Props {
  /** Wine priceCurrency values currently in use — blocks deletion of these */
  usedCurrencies: Set<string>;
}

const MAX_CUSTOM = 10;

/** Shared inline styles for inputs — avoids Tailwind v4 class detection issues */
const rateInputStyle: React.CSSProperties = {
  width: 88,
  minWidth: 88,
  borderRadius: 'var(--rc-input-radius)',
  border: '1px solid var(--rc-input-border)',
  backgroundColor: 'var(--rc-input-bg)',
  padding: '6px 10px',
  textAlign: 'right',
  fontSize: 15,
  color: 'var(--rc-input-text)',
  outline: 'none',
  fontFamily: 'var(--rc-font-mono)',
};

const codeInputStyle: React.CSSProperties = {
  width: 72,
  borderRadius: 'var(--rc-input-radius)',
  border: '1px solid var(--rc-input-border)',
  backgroundColor: 'var(--rc-input-bg)',
  padding: '6px 10px',
  fontSize: 14,
  color: 'var(--rc-input-text)',
  outline: 'none',
  fontFamily: 'var(--rc-font-mono)',
  textTransform: 'uppercase',
};

const ConversionRatesEditor: React.FC<Props> = ({ usedCurrencies }) => {
  const { profile, updateConversionRates, updateCustomCurrencies } = useProfile();

  // Local copy of rates for editing (only saved on explicit Save)
  const [localRates, setLocalRates] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState('');

  // All non-home currencies — deduplicate built-in vs custom
  const allCurrencies = useMemo(() => {
    const builtInSet = new Set(BUILT_IN_CURRENCIES as readonly string[]);
    const builtIn = BUILT_IN_CURRENCIES.filter(c => c !== profile.currency);
    const custom = profile.customCurrencies.filter(c => c !== profile.currency && !builtInSet.has(c));
    return [...builtIn, ...custom];
  }, [profile.currency, profile.customCurrencies]);

  // Sync from profile -> local state when profile changes
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
    const builtInSet = new Set(BUILT_IN_CURRENCIES as readonly string[]);
    if (builtInSet.has(code) || profile.customCurrencies.includes(code)) {
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

  const homeSym = getCurrencySymbol(profile.currency).trim();
  const isCustomCode = (code: string) => profile.customCurrencies.includes(code);

  return (
    <div style={{ padding: '0 var(--rc-row-padding-h) 16px' }}>
      <Caption className="mb-3" style={{ color: 'var(--rc-ink-tertiary)' }}>
        How many {homeSym} does 1 unit of each foreign currency buy?
      </Caption>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {allCurrencies.map((code, idx) => {
          const rateStr = localRates[code] ?? '';
          const rateNum = parseFloat(rateStr);
          const foreignSym = getCurrencySymbol(code).trim();
          const inverse = !isNaN(rateNum) && rateNum > 0 ? (1 / rateNum).toFixed(4) : '\u2014';
          const isCustom = isCustomCode(code);
          const isUsed = usedCurrencies.has(code);
          const isLast = idx === allCurrencies.length - 1;

          return (
            <div
              key={code}
              style={{
                padding: '10px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--rc-border-subtle)',
              }}
            >
              {/* Line 1: code + equation + input + home symbol + delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--rc-font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--rc-ink-primary)',
                    width: 40,
                    flexShrink: 0,
                  }}
                >
                  {code}
                </span>

                <span
                  style={{
                    fontFamily: 'var(--rc-font-body)',
                    fontSize: 14,
                    color: 'var(--rc-ink-tertiary)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {foreignSym}1 =
                </span>

                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0.0001"
                  value={rateStr}
                  onChange={e => handleRateChange(code, e.target.value)}
                  style={rateInputStyle}
                  placeholder="0.00"
                />

                <span
                  style={{
                    fontFamily: 'var(--rc-font-body)',
                    fontSize: 14,
                    color: 'var(--rc-ink-tertiary)',
                    flexShrink: 0,
                  }}
                >
                  {homeSym}
                </span>

                {/* Spacer pushes delete button right */}
                <span style={{ flex: 1 }} />

                {isCustom && (
                  <button
                    onClick={() => handleDeleteCurrency(code)}
                    disabled={isUsed}
                    title={isUsed ? `In use by wines — cannot delete` : `Remove ${code}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 4,
                      border: 'none',
                      background: 'transparent',
                      cursor: isUsed ? 'not-allowed' : 'pointer',
                      opacity: isUsed ? 0.4 : 1,
                      color: 'var(--rc-ink-ghost)',
                      transition: 'color 150ms',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => {
                      if (!isUsed) (e.currentTarget.style.color = 'var(--rc-accent-coral)');
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget.style.color = 'var(--rc-ink-ghost)');
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Line 2: inverse rate caption */}
              <div style={{ paddingLeft: 48, marginTop: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--rc-font-body)',
                    fontSize: 12,
                    color: 'var(--rc-ink-ghost)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {homeSym}1 = {inverse} {foreignSym}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* Add custom currency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input
          type="text"
          value={newCode}
          onChange={e => setNewCode(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="e.g. CHF"
          maxLength={3}
          style={codeInputStyle}
        />
        <button
          onClick={handleAddCurrency}
          disabled={newCode.length !== 3}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--rc-font-mono)',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--rc-accent-pink)',
            background: 'none',
            border: 'none',
            cursor: newCode.length !== 3 ? 'default' : 'pointer',
            opacity: newCode.length !== 3 ? 0.4 : 1,
            padding: 0,
          }}
        >
          <Plus size={14} /> Add Currency
        </button>
      </div>

      {/* Save button */}
      {dirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button
            variantType="Primary"
            label={saving ? 'Saving...' : 'Save Rates'}
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      )}
    </div>
  );
};

export default ConversionRatesEditor;
