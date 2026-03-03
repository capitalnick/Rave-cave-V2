// ── Import Dedup Utilities ──
// Detects intra-CSV duplicates before import and builds a merged CSV.

export interface DuplicateGroup {
  key: string;
  label: { producer: string; name: string; vintage: string; cepage?: string };
  rowIndices: number[];
  quantities: number[];
  totalQuantity: number;
  merged: boolean;
  representativeRow: Record<string, string>;
  differingFields: string[];
}

export interface FieldMapping {
  csvColumn: string;
  raveCaveField: string | null;
}

export interface ParsedWine {
  rowIndex: number;    // 0-based data row index
  lineIndex: number;   // 1-based line index in CSV (for rebuilding)
  producer: string;
  name: string;
  vintage: string;
  cepage: string;
  quantity: number;    // parsed from qty column, default 1
}

// ── Normalise: lowercase, strip non-alphanumeric ──

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Parse a single CSV line (handles quoted fields, commas, tabs) ──

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

// ── Detect duplicate groups within parsed CSV rows ──

export function detectDuplicates(
  csvContent: string,
  mappings: FieldMapping[],
): DuplicateGroup[] {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);

  // Build column index lookup for mapped identity fields
  const fieldIndex = (field: string): number => {
    const mapping = mappings.find(m => m.raveCaveField === field);
    if (!mapping) return -1;
    return headers.findIndex(h => h.trim() === mapping.csvColumn);
  };

  const producerIdx = fieldIndex('producer');
  const nameIdx = fieldIndex('name');
  const vintageIdx = fieldIndex('vintage');
  const cepageIdx = fieldIndex('cepage');
  const quantityIdx = fieldIndex('quantity');

  // Parse all data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h].trim()] = (values[h] || '').trim();
    }
    row.__lineIndex = String(i); // 1-based line index for CSV reconstruction
    rows.push(row);
  }

  // Group by normalised identity key
  const groups = new Map<string, { indices: number[]; rows: Record<string, string>[] }>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const vals = parseCSVLine(lines[parseInt(row.__lineIndex)]);

    const producer = producerIdx >= 0 ? (vals[producerIdx] || '').trim() : '';
    const name = nameIdx >= 0 ? (vals[nameIdx] || '').trim() : '';
    const vintage = vintageIdx >= 0 ? (vals[vintageIdx] || '').trim() : '';
    const cepage = cepageIdx >= 0 ? (vals[cepageIdx] || '').trim() : '';

    const keyParts = [normalise(producer), normalise(name), normalise(vintage)];
    if (cepageIdx >= 0) keyParts.push(normalise(cepage));
    const key = keyParts.join('|');

    // Skip rows that have no meaningful identity
    if (!normalise(producer) && !normalise(name)) continue;

    const existing = groups.get(key);
    if (existing) {
      existing.indices.push(i);
      existing.rows.push(row);
    } else {
      groups.set(key, { indices: [i], rows: [row] });
    }
  }

  // Convert to DuplicateGroup[], filtering to groups with >1 row
  const result: DuplicateGroup[] = [];

  for (const [key, group] of groups) {
    if (group.indices.length <= 1) continue;

    const firstRow = group.rows[0];
    const firstVals = parseCSVLine(lines[parseInt(firstRow.__lineIndex)]);

    const producer = producerIdx >= 0 ? (firstVals[producerIdx] || '').trim() : '';
    const name = nameIdx >= 0 ? (firstVals[nameIdx] || '').trim() : '';
    const vintage = vintageIdx >= 0 ? (firstVals[vintageIdx] || '').trim() : '';
    const cepage = cepageIdx >= 0 ? (firstVals[cepageIdx] || '').trim() : '';

    // Compute quantities
    const quantities = group.rows.map(row => {
      const lineVals = parseCSVLine(lines[parseInt(row.__lineIndex)]);
      const q = quantityIdx >= 0 ? parseInt(lineVals[quantityIdx] || '1', 10) : 1;
      return isNaN(q) || q < 1 ? 1 : q;
    });

    // Find differing fields (columns whose values differ across rows in this group)
    const differingFields: string[] = [];
    const mappedHeaders = headers.map(h => h.trim());
    for (const header of mappedHeaders) {
      const values = group.rows.map(row => row[header] || '');
      const unique = new Set(values.map(v => v.toLowerCase().trim()));
      if (unique.size > 1) {
        // Exclude identity fields from differing list — user already knows those match
        const isIdentity = [producerIdx, nameIdx, vintageIdx, cepageIdx, quantityIdx]
          .filter(idx => idx >= 0)
          .some(idx => mappedHeaders[idx] === header);
        if (!isIdentity) {
          differingFields.push(header);
        }
      }
    }

    // Build representative row (first row data, all columns)
    const representativeRow: Record<string, string> = {};
    for (const header of mappedHeaders) {
      representativeRow[header] = firstRow[header] || '';
    }

    result.push({
      key,
      label: { producer, name, vintage, cepage: cepage || undefined },
      rowIndices: group.indices,
      quantities,
      totalQuantity: quantities.reduce((a, b) => a + b, 0),
      merged: true,
      representativeRow,
      differingFields,
    });
  }

  return result;
}

// ── CSV encoding helpers ──

function quoteCSVField(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\t') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function encodeCSVLine(values: string[]): string {
  return values.map(quoteCSVField).join(',');
}

// ── Build a merged CSV from the original, applying user's merge decisions ──

export function buildMergedCSV(
  originalCSV: string,
  groups: DuplicateGroup[],
  mappings: FieldMapping[],
): string {
  const lines = originalCSV.split('\n');
  if (lines.length < 2) return originalCSV;

  const headers = parseCSVLine(lines[0]);
  const quantityMapping = mappings.find(m => m.raveCaveField === 'quantity');
  const quantityColIdx = quantityMapping
    ? headers.findIndex(h => h.trim() === quantityMapping.csvColumn)
    : -1;

  // Collect line indices to remove and lines to update quantity
  const linesToRemove = new Set<number>();
  const quantityUpdates = new Map<number, number>(); // lineIndex → new quantity

  for (const group of groups) {
    if (!group.merged || group.rowIndices.length <= 1) continue;

    const dataLines: number[] = [];
    let dataRowIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if (group.rowIndices.includes(dataRowIdx)) {
        dataLines.push(i);
      }
      dataRowIdx++;
    }

    if (dataLines.length <= 1) continue;

    const keepLine = dataLines[0];
    quantityUpdates.set(keepLine, group.totalQuantity);

    for (let d = 1; d < dataLines.length; d++) {
      linesToRemove.add(dataLines[d]);
    }
  }

  // Rebuild CSV
  const result: string[] = [lines[0]]; // header row

  for (let i = 1; i < lines.length; i++) {
    if (linesToRemove.has(i)) continue;

    if (quantityUpdates.has(i) && quantityColIdx >= 0) {
      const values = parseCSVLine(lines[i]);
      values[quantityColIdx] = String(quantityUpdates.get(i));
      result.push(encodeCSVLine(values));
    } else {
      result.push(lines[i]);
    }
  }

  return result.join('\n');
}

// ── Build merged CSV with unmapped columns injected into personalNote ──

export function buildMergedCSVWithNotes(
  originalCSV: string,
  groups: DuplicateGroup[],
  mappings: FieldMapping[],
): { csv: string; mappings: FieldMapping[] } {
  const lines = originalCSV.split('\n');
  if (lines.length < 2) return { csv: originalCSV, mappings };

  const headers = parseCSVLine(lines[0]);

  // Identify unmapped columns (raveCaveField === null)
  const unmappedCols: { csvColumn: string; colIdx: number }[] = [];
  for (const m of mappings) {
    if (m.raveCaveField === null) {
      const idx = headers.findIndex(h => h.trim() === m.csvColumn);
      if (idx >= 0) unmappedCols.push({ csvColumn: m.csvColumn, colIdx: idx });
    }
  }

  // No unmapped columns → delegate to buildMergedCSV
  if (unmappedCols.length === 0) {
    return { csv: buildMergedCSV(originalCSV, groups, mappings), mappings };
  }

  // Build lineIndex → groupIndex map for merged groups
  const lineToGroup = new Map<number, number>(); // lineIndex → group array index
  const mergedGroups = groups.filter(g => g.merged && g.rowIndices.length > 1);
  for (let gi = 0; gi < mergedGroups.length; gi++) {
    const group = mergedGroups[gi];
    // Map row indices to line indices
    let dataRowIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if (group.rowIndices.includes(dataRowIdx)) {
        lineToGroup.set(i, gi);
      }
      dataRowIdx++;
    }
  }

  // Collect unmapped values per group
  const groupNotes = new Map<number, string[]>(); // groupIndex → deduplicated "Col:Val" pairs
  for (let gi = 0; gi < mergedGroups.length; gi++) {
    const pairs: string[] = [];
    const group = mergedGroups[gi];
    let dataRowIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if (group.rowIndices.includes(dataRowIdx)) {
        const values = parseCSVLine(lines[i]);
        for (const uc of unmappedCols) {
          const val = (values[uc.colIdx] || '').trim();
          if (val) {
            const pair = `${uc.csvColumn}:${val}`;
            if (!pairs.includes(pair)) pairs.push(pair);
          }
        }
      }
      dataRowIdx++;
    }
    groupNotes.set(gi, pairs);
  }

  // Collect unmapped values per standalone line
  const standaloneNotes = new Map<number, string[]>(); // lineIndex → "Col:Val" pairs
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (lineToGroup.has(i)) continue; // handled by group
    const values = parseCSVLine(lines[i]);
    const pairs: string[] = [];
    for (const uc of unmappedCols) {
      const val = (values[uc.colIdx] || '').trim();
      if (val) pairs.push(`${uc.csvColumn}:${val}`);
    }
    if (pairs.length > 0) standaloneNotes.set(i, pairs);
  }

  // Determine if personalNote is already mapped
  const personalNoteMapping = mappings.find(m => m.raveCaveField === 'personalNote');
  const personalNoteColIdx = personalNoteMapping
    ? headers.findIndex(h => h.trim() === personalNoteMapping.csvColumn)
    : -1;

  // Build the notes string for a line
  const getNotesForLine = (lineIdx: number): string | null => {
    const gi = lineToGroup.get(lineIdx);
    if (gi !== undefined) {
      const pairs = groupNotes.get(gi);
      return pairs && pairs.length > 0 ? pairs.join(' | ') : null;
    }
    const pairs = standaloneNotes.get(lineIdx);
    return pairs && pairs.length > 0 ? pairs.join(' | ') : null;
  };

  // Track which group's representative line has been seen (for dedup merge logic)
  const groupFirstLine = new Map<number, number>(); // groupIndex → first lineIndex

  // Now rebuild the CSV with notes injected
  const addColumn = personalNoteColIdx < 0; // need to add _RC_Notes column
  const newMappings = [...mappings];
  if (addColumn) {
    newMappings.push({ csvColumn: '_RC_Notes', raveCaveField: 'personalNote' });
  }

  // Rebuild header
  const newHeader = addColumn
    ? lines[0] + ',_RC_Notes'
    : lines[0];

  // Now apply merge logic + notes injection in one pass
  const quantityMapping = mappings.find(m => m.raveCaveField === 'quantity');
  const quantityColIdx = quantityMapping
    ? headers.findIndex(h => h.trim() === quantityMapping.csvColumn)
    : -1;

  const linesToRemove = new Set<number>();
  const quantityUpdates = new Map<number, number>();

  for (const group of mergedGroups) {
    const dataLines: number[] = [];
    let dataRowIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if (group.rowIndices.includes(dataRowIdx)) {
        dataLines.push(i);
      }
      dataRowIdx++;
    }
    if (dataLines.length <= 1) continue;

    const keepLine = dataLines[0];
    quantityUpdates.set(keepLine, group.totalQuantity);
    for (let d = 1; d < dataLines.length; d++) {
      linesToRemove.add(dataLines[d]);
    }
  }

  const result: string[] = [newHeader];

  for (let i = 1; i < lines.length; i++) {
    if (linesToRemove.has(i)) continue;
    if (!lines[i].trim()) continue;

    const values = parseCSVLine(lines[i]);

    // Apply quantity update
    if (quantityUpdates.has(i) && quantityColIdx >= 0) {
      values[quantityColIdx] = String(quantityUpdates.get(i));
    }

    // Inject notes
    const notes = getNotesForLine(i);
    if (addColumn) {
      // Append new column value
      if (notes) {
        values.push(notes);
      } else {
        values.push('');
      }
    } else if (personalNoteColIdx >= 0 && notes) {
      // Append to existing personalNote column
      const existing = (values[personalNoteColIdx] || '').trim();
      values[personalNoteColIdx] = existing
        ? `${existing} | ${notes}`
        : notes;
    }

    result.push(encodeCSVLine(values));
  }

  return { csv: result.join('\n'), mappings: newMappings };
}

// ── Mapping fingerprint: detect if mappings changed between visits ──

export function mappingFingerprint(mappings: FieldMapping[]): string {
  return mappings
    .filter(m => m.raveCaveField)
    .map(m => `${m.csvColumn}:${m.raveCaveField}`)
    .sort()
    .join('|');
}

// ── Parse all wines from CSV with field mappings ──

export function parseAllWines(csvContent: string, mappings: FieldMapping[]): ParsedWine[] {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);

  const fieldIndex = (field: string): number => {
    const mapping = mappings.find(m => m.raveCaveField === field);
    if (!mapping) return -1;
    return headers.findIndex(h => h.trim() === mapping.csvColumn);
  };

  const producerIdx = fieldIndex('producer');
  const nameIdx = fieldIndex('name');
  const vintageIdx = fieldIndex('vintage');
  const cepageIdx = fieldIndex('cepage');
  const quantityIdx = fieldIndex('quantity');

  const result: ParsedWine[] = [];
  let rowIndex = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);

    const producer = producerIdx >= 0 ? (values[producerIdx] || '').trim() : '';
    const name = nameIdx >= 0 ? (values[nameIdx] || '').trim() : '';
    const vintage = vintageIdx >= 0 ? (values[vintageIdx] || '').trim() : '';
    const cepage = cepageIdx >= 0 ? (values[cepageIdx] || '').trim() : '';
    const rawQty = quantityIdx >= 0 ? parseInt(values[quantityIdx] || '1', 10) : 1;
    const quantity = isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;

    // Skip rows with no meaningful identity
    if (!producer && !name) {
      rowIndex++;
      continue;
    }

    result.push({ rowIndex, lineIndex: i, producer, name, vintage, cepage, quantity });
    rowIndex++;
  }

  return result;
}

// ── Rebuild CSV keeping only header + lines at specified lineIndices ──

export function buildFilteredCSV(csvContent: string, selectedLineIndices: number[]): string {
  const lines = csvContent.split('\n');
  if (lines.length < 2) return csvContent;

  const keepSet = new Set(selectedLineIndices);
  const result: string[] = [lines[0]]; // always keep header

  for (let i = 1; i < lines.length; i++) {
    if (keepSet.has(i)) {
      result.push(lines[i]);
    }
  }

  return result.join('\n');
}
