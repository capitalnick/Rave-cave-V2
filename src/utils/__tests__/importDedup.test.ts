import { describe, it, expect } from 'vitest';
import {
  detectDuplicates,
  buildMergedCSV,
  mappingFingerprint,
  parseAllWines,
  buildFilteredCSV,
  type FieldMapping,
} from '../importDedup';

const MAPPINGS: FieldMapping[] = [
  { csvColumn: 'Producer', raveCaveField: 'producer' },
  { csvColumn: 'Name', raveCaveField: 'name' },
  { csvColumn: 'Vintage', raveCaveField: 'vintage' },
  { csvColumn: 'Qty', raveCaveField: 'quantity' },
];

const MAPPINGS_WITH_CEPAGE: FieldMapping[] = [
  ...MAPPINGS,
  { csvColumn: 'Grape', raveCaveField: 'cepage' },
];

describe('detectDuplicates', () => {
  it('finds duplicate rows with identical identity', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,1\nPenfolds,Grange,2019,2';
    const groups = detectDuplicates(csv, MAPPINGS);
    expect(groups).toHaveLength(1);
    expect(groups[0].totalQuantity).toBe(3);
    expect(groups[0].rowIndices).toHaveLength(2);
  });

  it('returns empty when no duplicates', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,1\nHenschke,Hill of Grace,2018,1';
    expect(detectDuplicates(csv, MAPPINGS)).toEqual([]);
  });

  it('normalises case for identity matching', () => {
    const csv = 'Producer,Name,Vintage,Qty\npenfolds,grange,2019,1\nPENFOLDS,GRANGE,2019,2';
    const groups = detectDuplicates(csv, MAPPINGS);
    expect(groups).toHaveLength(1);
  });

  it('skips rows with no producer and no name', () => {
    const csv = 'Producer,Name,Vintage,Qty\n,,2019,1\nPenfolds,Grange,2019,1';
    expect(detectDuplicates(csv, MAPPINGS)).toEqual([]);
  });

  it('defaults quantity to 1 when missing', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,\nPenfolds,Grange,2019,';
    const groups = detectDuplicates(csv, MAPPINGS);
    expect(groups[0].quantities).toEqual([1, 1]);
    expect(groups[0].totalQuantity).toBe(2);
  });

  it('returns empty for CSV with only header', () => {
    expect(detectDuplicates('Producer,Name', MAPPINGS)).toEqual([]);
  });

  it('ignores empty lines', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,1\n\nPenfolds,Grange,2019,1';
    const groups = detectDuplicates(csv, MAPPINGS);
    expect(groups).toHaveLength(1);
  });

  it('detects differing fields across duplicate rows', () => {
    const csv = 'Producer,Name,Vintage,Qty,Region\nPenfolds,Grange,2019,1,Barossa\nPenfolds,Grange,2019,1,McLaren Vale';
    const mappings: FieldMapping[] = [
      ...MAPPINGS,
      { csvColumn: 'Region', raveCaveField: 'region' },
    ];
    const groups = detectDuplicates(csv, mappings);
    expect(groups[0].differingFields).toContain('Region');
  });
});

describe('buildMergedCSV', () => {
  it('removes duplicate rows and sums quantity on kept row', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,1\nPenfolds,Grange,2019,2';
    const groups = detectDuplicates(csv, MAPPINGS);
    const merged = buildMergedCSV(csv, groups, MAPPINGS);
    const lines = merged.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(lines[1]).toContain('3'); // merged quantity
  });

  it('keeps all rows when no groups are merged', () => {
    const csv = 'Producer,Name,Vintage,Qty\nA,X,2019,1\nB,Y,2020,1';
    const merged = buildMergedCSV(csv, [], MAPPINGS);
    expect(merged).toBe(csv);
  });

  it('returns original CSV for single-line CSV', () => {
    const csv = 'Producer,Name';
    expect(buildMergedCSV(csv, [], MAPPINGS)).toBe(csv);
  });
});

describe('mappingFingerprint', () => {
  it('produces stable fingerprint for same mappings', () => {
    const fp1 = mappingFingerprint(MAPPINGS);
    const fp2 = mappingFingerprint(MAPPINGS);
    expect(fp1).toBe(fp2);
  });

  it('is order-independent', () => {
    const reversed = [...MAPPINGS].reverse();
    expect(mappingFingerprint(reversed)).toBe(mappingFingerprint(MAPPINGS));
  });

  it('excludes unmapped columns', () => {
    const withNull: FieldMapping[] = [
      ...MAPPINGS,
      { csvColumn: 'Ignored', raveCaveField: null },
    ];
    expect(mappingFingerprint(withNull)).toBe(mappingFingerprint(MAPPINGS));
  });

  it('changes when mappings differ', () => {
    const different: FieldMapping[] = [
      { csvColumn: 'Winery', raveCaveField: 'producer' },
      { csvColumn: 'Name', raveCaveField: 'name' },
    ];
    expect(mappingFingerprint(different)).not.toBe(mappingFingerprint(MAPPINGS));
  });
});

describe('parseAllWines', () => {
  it('parses CSV rows into ParsedWine objects', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,3';
    const wines = parseAllWines(csv, MAPPINGS);
    expect(wines).toHaveLength(1);
    expect(wines[0].producer).toBe('Penfolds');
    expect(wines[0].name).toBe('Grange');
    expect(wines[0].vintage).toBe('2019');
    expect(wines[0].quantity).toBe(3);
  });

  it('defaults quantity to 1 when not present', () => {
    const csv = 'Producer,Name,Vintage,Qty\nPenfolds,Grange,2019,';
    const wines = parseAllWines(csv, MAPPINGS);
    expect(wines[0].quantity).toBe(1);
  });

  it('skips rows with no producer and no name', () => {
    const csv = 'Producer,Name,Vintage,Qty\n,,2019,1\nPenfolds,Grange,2019,1';
    const wines = parseAllWines(csv, MAPPINGS);
    expect(wines).toHaveLength(1);
  });

  it('returns empty for header-only CSV', () => {
    expect(parseAllWines('Producer,Name', MAPPINGS)).toEqual([]);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'Producer,Name,Vintage,Qty\n"Penfolds, SA",Grange,2019,1';
    const wines = parseAllWines(csv, MAPPINGS);
    expect(wines[0].producer).toBe('Penfolds, SA');
  });
});

describe('buildFilteredCSV', () => {
  it('keeps only header + selected lines', () => {
    const csv = 'Header\nRow1\nRow2\nRow3';
    const result = buildFilteredCSV(csv, [1, 3]);
    expect(result).toBe('Header\nRow1\nRow3');
  });

  it('returns original for header-only CSV', () => {
    const csv = 'Header';
    expect(buildFilteredCSV(csv, [])).toBe('Header');
  });

  it('returns header only when no lines selected', () => {
    const csv = 'Header\nRow1\nRow2';
    expect(buildFilteredCSV(csv, [])).toBe('Header');
  });
});
