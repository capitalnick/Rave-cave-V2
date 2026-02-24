import React, { useState, useRef, useCallback, useMemo, type DragEvent } from 'react';
import { ArrowRight, Upload, CheckCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Button,
  Heading,
  Body,
  MonoLabel,
  Card,
  Spinner,
  InlineMessage,
} from '@/components/rc';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';
import { useProfile } from '@/context/ProfileContext';
import { useInventory } from '@/context/InventoryContext';
import { trackEvent } from '@/config/analytics';
import { CONFIG } from '@/constants';
import { cn } from '@/lib/utils';

// ── Types ──

const IMPORTABLE_FIELDS = [
  'producer', 'name', 'vintage', 'type', 'cepage', 'region', 'country',
  'appellation', 'quantity', 'drinkFrom', 'drinkUntil', 'price', 'format',
  'tastingNotes', 'personalNote', 'myRating', 'vivinoRating', 'linkToWine',
  'imageUrl',
] as const;

type ImportableField = typeof IMPORTABLE_FIELDS[number];

interface FieldMapping {
  csvColumn: string;
  raveCaveField: ImportableField | null;
  confidence: 'high' | 'medium' | 'low';
  sampleValues: string[];
}

interface MappingResult {
  mappings: FieldMapping[];
  detectedSource: string;
  notes: string;
  totalRows: number;
  parseWarnings: string[];
}

type ImportStage =
  | 'upload'
  | 'mapping-loading'
  | 'mapping'
  | 'preview'
  | 'importing'
  | 'complete';

const FIELD_LABELS: Record<string, string> = {
  producer: 'Producer',
  name: 'Wine Name',
  vintage: 'Vintage',
  type: 'Wine Type',
  cepage: 'Grape / Cépage',
  region: 'Region',
  country: 'Country',
  appellation: 'Appellation',
  quantity: 'Quantity',
  drinkFrom: 'Drink From',
  drinkUntil: 'Drink Until',
  price: 'Price',
  format: 'Format',
  tastingNotes: 'Tasting Notes',
  personalNote: 'Personal Note',
  myRating: 'My Rating',
  vivinoRating: 'Vivino Rating',
  linkToWine: 'Link to Wine',
  imageUrl: 'Label Image',
};

// ── Component ──

interface ImportFlowProps {
  onClose: () => void;
}

export default function ImportFlow({ onClose }: ImportFlowProps) {
  const navigate = useNavigate();
  const { isPremium } = useProfile();
  const { totalBottles } = useInventory();

  const [stage, setStage] = useState<ImportStage>('upload');
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [confirmedMappings, setConfirmedMappings] = useState<FieldMapping[]>([]);
  const [importProgress, setImportProgress] = useState({
    total: 0, imported: 0, skipped: 0, duplicates: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tier cap ──
  const remainingCapacity = isPremium
    ? Infinity
    : Math.max(0, CONFIG.FREE_TIER.MAX_BOTTLES - totalBottles);
  const canImport = mappingResult
    ? (isPremium ? mappingResult.totalRows : Math.min(mappingResult.totalRows, remainingCapacity))
    : 0;
  const blocked = mappingResult ? mappingResult.totalRows - canImport : 0;

  // ── Mapping validation ──
  const hasRequiredMapping = useMemo(() => {
    return confirmedMappings.some(
      m => m.raveCaveField === 'name' || m.raveCaveField === 'producer'
    );
  }, [confirmedMappings]);

  const missingWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!confirmedMappings.some(m => m.raveCaveField === 'vintage')) {
      warnings.push('Vintage not mapped — all wines will import as NV');
    }
    if (!confirmedMappings.some(m => m.raveCaveField === 'quantity')) {
      warnings.push('Quantity not mapped — defaulting to 1 bottle each');
    }
    return warnings;
  }, [confirmedMappings]);

  // ── Used fields (for disabling duplicate mapping in dropdowns) ──
  const usedFields = useMemo(() => {
    const set = new Set<string>();
    for (const m of confirmedMappings) {
      if (m.raveCaveField) set.add(m.raveCaveField);
    }
    return set;
  }, [confirmedMappings]);

  // ── File handling ──
  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum 5MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'tsv', 'txt'].includes(ext || '')) {
      setError('Unsupported file type. Please upload a .csv, .tsv, or .txt file.');
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    setCsvContent(text);
    setStage('mapping-loading');

    try {
      const res = await authFetch(FUNCTION_URLS.mapImportFields, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStage('upload');
        return;
      }

      setMappingResult(data);
      setConfirmedMappings(data.mappings);
      setStage('mapping');
    } catch (e: any) {
      setError(e.message || 'Failed to analyse CSV. Please try again.');
      setStage('upload');
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Mapping change ──
  const handleMappingChange = useCallback((index: number, field: ImportableField | null) => {
    setConfirmedMappings(prev => prev.map((m, i) =>
      i === index ? { ...m, raveCaveField: field, confidence: 'high' } : m
    ));
  }, []);

  // ── Preview data ──
  const previewWines = useMemo(() => {
    if (!csvContent || !confirmedMappings.length) return [];

    // Quick client-side parse for preview
    const lines = csvContent.split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const wines: Record<string, string>[] = [];

    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i]);
      const wine: Record<string, string> = {};
      for (const m of confirmedMappings) {
        if (!m.raveCaveField) continue;
        const colIndex = headers.findIndex(h => h.trim() === m.csvColumn);
        if (colIndex >= 0 && values[colIndex]) {
          wine[m.raveCaveField] = values[colIndex].trim();
        }
      }
      if (wine.producer || wine.name) wines.push(wine);
    }

    return wines;
  }, [csvContent, confirmedMappings]);

  // ── Import handler ──
  const handleImport = useCallback(async () => {
    setStage('importing');
    setError(null);
    setImportProgress({ total: canImport, imported: 0, skipped: 0, duplicates: 0 });

    try {
      const res = await authFetch(FUNCTION_URLS.commitImport, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: csvContent,
          mappings: confirmedMappings.map(m => ({
            csvColumn: m.csvColumn,
            raveCaveField: m.raveCaveField,
          })),
          maxWines: canImport,
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error);
        setStage('preview');
        return;
      }

      setImportProgress({
        total: canImport,
        imported: result.imported,
        skipped: result.skipped,
        duplicates: result.duplicatesMerged,
      });
      setStage('complete');

      trackEvent('wines_imported', {
        count: result.imported,
        duplicates: result.duplicatesMerged,
        skipped: result.skipped,
        source: mappingResult?.detectedSource || 'unknown',
      });
    } catch (e: any) {
      setError(e.message || 'Import failed. Please try again.');
      setStage('preview');
    }
  }, [canImport, csvContent, confirmedMappings, mappingResult]);

  // ── Source label ──
  const sourceLabel = mappingResult?.detectedSource === 'cellartracker'
    ? 'CellarTracker'
    : mappingResult?.detectedSource === 'vivino'
      ? 'Vivino'
      : 'CSV';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-[640px] max-h-[90dvh] overflow-y-auto bg-[var(--rc-surface-primary)] p-0"
        onPointerDownOutside={(e) => {
          if (stage === 'importing') e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Import Wines</DialogTitle>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {stage !== 'upload' && stage !== 'mapping-loading' && stage !== 'importing' && stage !== 'complete' && (
                <button
                  onClick={() => {
                    if (stage === 'mapping') setStage('upload');
                    if (stage === 'preview') setStage('mapping');
                  }}
                  className="text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-primary)] transition-colors text-sm"
                >
                  &larr; Back
                </button>
              )}
              <Heading scale="heading">Import Wines</Heading>
            </div>
            {fileName && stage !== 'upload' && (
              <MonoLabel size="label" colour="ghost" className="w-auto">
                {fileName}
              </MonoLabel>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4">
              <InlineMessage tone="error" message={error} />
            </div>
          )}

          {/* ── Upload Stage ── */}
          {stage === 'upload' && (
            <div>
              <Body className="w-auto mb-2">
                Upload a CSV file exported from CellarTracker, Vivino, or any spreadsheet.
              </Body>
              <Body size="caption" colour="secondary" className="w-auto mb-6">
                Vivino users: upload <strong>cellar.csv</strong> for your current collection,
                or <strong>full_wine_list.csv</strong> for everything you've scanned.
              </Body>

              <div
                className={cn(
                  'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-[var(--rc-accent-pink)] bg-[var(--rc-accent-pink)]/5'
                    : 'border-[var(--rc-border-subtle)] hover:border-[var(--rc-ink-ghost)]'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload size={32} className="mx-auto mb-4 text-[var(--rc-ink-ghost)]" />
                <Body className="w-auto mb-1">Drag & drop a .csv file here</Body>
                <Body size="caption" colour="ghost" className="w-auto">or click to browse</Body>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>

              <MonoLabel size="label" colour="ghost" className="mt-4 block text-center">
                Supported: .csv, .tsv, .txt (max 5MB, max 2,000 wines)
              </MonoLabel>
            </div>
          )}

          {/* ── Mapping Loading Stage ── */}
          {stage === 'mapping-loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Spinner size="lg" />
              <Body className="w-auto">Analysing columns...</Body>
              <MonoLabel size="label" colour="ghost" className="w-auto">
                AI is mapping your CSV fields
              </MonoLabel>
            </div>
          )}

          {/* ── Mapping Stage ── */}
          {stage === 'mapping' && mappingResult && (
            <div>
              <Body className="w-auto mb-1">
                Detected a <strong>{sourceLabel}</strong> export with{' '}
                <strong>{mappingResult.totalRows}</strong> wines.
              </Body>
              <Body size="caption" colour="secondary" className="w-auto mb-4">
                Review the column mapping below, then continue.
              </Body>

              {mappingResult.notes && (
                <div className="mb-4">
                  <InlineMessage tone="info" message={mappingResult.notes} />
                </div>
              )}

              {/* Mapping rows */}
              <div className="space-y-0 mb-6">
                {confirmedMappings.map((mapping, index) => (
                  <MappingRow
                    key={mapping.csvColumn + index}
                    mapping={mapping}
                    usedFields={usedFields}
                    currentField={mapping.raveCaveField}
                    onChange={(field) => handleMappingChange(index, field)}
                  />
                ))}
              </div>

              {/* Warnings */}
              {missingWarnings.map((w) => (
                <div key={w} className="mb-2">
                  <InlineMessage tone="warning" message={w} />
                </div>
              ))}

              {/* Continue */}
              <div className="flex justify-end mt-4">
                <Button
                  variantType="Primary"
                  label="Continue"
                  onClick={() => setStage('preview')}
                  disabled={!hasRequiredMapping}
                />
              </div>

              {!hasRequiredMapping && (
                <Body size="caption" colour="ghost" className="w-auto text-right mt-2">
                  Map at least Producer or Wine Name to continue
                </Body>
              )}
            </div>
          )}

          {/* ── Preview Stage ── */}
          {stage === 'preview' && mappingResult && (
            <div>
              <Body className="w-auto mb-4">
                Preview — here's how your first wines will look:
              </Body>

              <div className="space-y-3 mb-6">
                {previewWines.map((wine, i) => (
                  <Card key={i} elevation="flat" padding="standard">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Heading scale="subhead" className="truncate">
                          {wine.producer && wine.name
                            ? `${wine.producer} ${wine.name}`
                            : wine.name || wine.producer || 'Unknown Wine'}
                        </Heading>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {wine.vintage && wine.vintage !== '0' && (
                          <MonoLabel size="label" colour="ghost" className="w-auto">
                            {wine.vintage}
                          </MonoLabel>
                        )}
                        {wine.quantity && (
                          <MonoLabel size="label" colour="ghost" className="w-auto">
                            &times;{wine.quantity}
                          </MonoLabel>
                        )}
                      </div>
                    </div>
                    <Body size="caption" colour="secondary" className="w-auto mt-1">
                      {[wine.cepage, wine.region, wine.country]
                        .filter(Boolean)
                        .join(' \u00B7 ')}
                    </Body>
                    {(wine.price || wine.drinkFrom || wine.drinkUntil) && (
                      <Body size="caption" colour="ghost" className="w-auto mt-0.5">
                        {[
                          wine.price ? `$${wine.price}` : null,
                          wine.drinkFrom && wine.drinkUntil
                            ? `Drink ${wine.drinkFrom}–${wine.drinkUntil}`
                            : wine.drinkUntil
                              ? `Drink by ${wine.drinkUntil}`
                              : null,
                        ].filter(Boolean).join(' \u00B7 ')}
                      </Body>
                    )}
                  </Card>
                ))}

                {previewWines.length === 0 && (
                  <Body size="caption" colour="ghost" className="w-auto text-center py-8">
                    No preview available — check your column mapping
                  </Body>
                )}
              </div>

              {/* Tier cap info */}
              {!isPremium && blocked > 0 && (
                <Card elevation="flat" padding="standard" className="mb-4 border border-[var(--rc-accent-pink)]/20">
                  <Body size="caption" className="w-auto">
                    Free tier: {CONFIG.FREE_TIER.MAX_BOTTLES} bottles max. You have{' '}
                    {totalBottles} bottles now.
                  </Body>
                  <Body size="caption" colour="secondary" className="w-auto mt-1">
                    <strong>{canImport}</strong> of {mappingResult.totalRows} wines will be
                    imported. Upgrade to import all {mappingResult.totalRows}.
                  </Body>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  variantType="Primary"
                  label={`Import ${canImport === Infinity ? mappingResult.totalRows : canImport} Wine${canImport === 1 ? '' : 's'}`}
                  onClick={handleImport}
                  disabled={canImport === 0}
                />
                {!isPremium && blocked > 0 && (
                  <Body size="caption" colour="ghost" className="w-auto text-center">
                    Upgrade to Reserve to import all {mappingResult.totalRows} wines
                  </Body>
                )}
              </div>
            </div>
          )}

          {/* ── Importing Stage ── */}
          {stage === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Spinner size="lg" />
              <Heading scale="subhead">Importing wines...</Heading>
              <Body size="caption" colour="ghost" className="w-auto">
                This may take a minute for large collections.
              </Body>

              {/* Indeterminate progress bar */}
              <div className="w-full max-w-[320px] h-1.5 bg-[var(--rc-surface-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--rc-accent-pink)] rounded-full animate-pulse"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          )}

          {/* ── Complete Stage ── */}
          {stage === 'complete' && (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <CheckCircle size={48} className="text-[var(--rc-accent-acid)]" />
              <Heading scale="heading">Import Complete</Heading>

              <div className="space-y-1">
                <Body className="w-auto">
                  <strong>{importProgress.imported}</strong> wine{importProgress.imported !== 1 ? 's' : ''} imported
                </Body>
                {importProgress.duplicates > 0 && (
                  <Body size="caption" colour="secondary" className="w-auto">
                    {importProgress.duplicates} duplicate{importProgress.duplicates !== 1 ? 's' : ''} merged (quantity added)
                  </Body>
                )}
                {importProgress.skipped > 0 && (
                  <Body size="caption" colour="secondary" className="w-auto">
                    {importProgress.skipped} row{importProgress.skipped !== 1 ? 's' : ''} skipped (missing required data)
                  </Body>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variantType="Primary"
                  label="View Cellar"
                  onClick={() => {
                    onClose();
                    navigate({ to: '/cellar' });
                  }}
                />
                <Button
                  variantType="Secondary"
                  label="Import Another"
                  onClick={() => {
                    setStage('upload');
                    setCsvContent(null);
                    setFileName('');
                    setMappingResult(null);
                    setConfirmedMappings([]);
                    setError(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── MappingRow ──

function MappingRow({
  mapping,
  usedFields,
  currentField,
  onChange,
}: {
  mapping: FieldMapping;
  usedFields: Set<string>;
  currentField: ImportableField | null;
  onChange: (field: ImportableField | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[var(--rc-border-subtle)] last:border-0">
      {/* CSV column */}
      <div className="w-[130px] shrink-0 truncate">
        <MonoLabel size="label">{mapping.csvColumn}</MonoLabel>
      </div>

      {/* Arrow */}
      <ArrowRight size={14} className="text-[var(--rc-ink-ghost)] shrink-0" />

      {/* Target field dropdown */}
      <select
        value={currentField || 'skip'}
        onChange={(e) =>
          onChange(e.target.value === 'skip' ? null : e.target.value as ImportableField)
        }
        className="flex-1 min-w-0 bg-[var(--rc-surface-secondary)] border border-[var(--rc-border-subtle)] rounded-lg px-2.5 py-1.5 text-sm text-[var(--rc-ink-primary)]"
      >
        <option value="skip">Skip</option>
        {IMPORTABLE_FIELDS.map((f) => (
          <option
            key={f}
            value={f}
            disabled={usedFields.has(f) && f !== currentField}
          >
            {FIELD_LABELS[f] || f}
          </option>
        ))}
      </select>

      {/* Confidence dot */}
      <div
        className={cn(
          'w-2 h-2 rounded-full shrink-0',
          mapping.confidence === 'high'
            ? 'bg-[var(--rc-accent-acid)]'
            : mapping.confidence === 'medium'
              ? 'bg-[var(--rc-accent-coral)]'
              : 'bg-[var(--rc-ink-ghost)]'
        )}
      />

      {/* Sample values */}
      <div className="w-[140px] shrink-0 truncate hidden sm:block">
        <Body size="caption" colour="ghost" className="w-auto truncate">
          {mapping.sampleValues.join(', ')}
        </Body>
      </div>
    </div>
  );
}

// ── CSV line parser (handles quoted fields) ──

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
