import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { inventoryService } from '@/services/inventoryService';
import { deleteLabelImage } from '@/services/storageService';
import { showToast } from '@/components/rc';
import { getMaturityStatus } from '@/constants';
import type { Wine, RecommendChatContext, Recommendation, SortField, FacetKey } from '@/types';
import type { FiltersState, FacetOption } from '@/lib/faceted-filters';
import {
  EMPTY_FILTERS,
  matchesAllFacets,
  aggregateFacetOptions,
  countActiveFilters,
} from '@/lib/faceted-filters';

// ── Dynamic facet options shape ──
interface FacetOptionsMap {
  wineType: FacetOption[];
  maturityStatus: FacetOption[];
  country: FacetOption[];
  region: FacetOption[];
  appellation: FacetOption[];
  producer: FacetOption[];
  grapeVariety: FacetOption[];
  vintage: FacetOption[];
  price: FacetOption[];
}

// ── Context value shape ──
interface InventoryContextValue {
  // Core data
  inventory: Wine[];
  loading: boolean;
  isSynced: boolean;

  // Search + filters + sort
  search: string;
  setSearch: (s: string) => void;
  filters: FiltersState;
  facetOptions: FacetOptionsMap;
  filteredInventory: Wine[];
  toggleFacet: (key: FacetKey, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  totalBottlesFiltered: number;
  heroWineIds: string[];
  sortField: SortField;
  setSortField: (f: SortField) => void;

  // Wine CRUD
  handleUpdate: (wine: Wine, key: string, value: string) => Promise<void>;

  // Scan overlay
  scanOpen: boolean;
  prefillData: Partial<Wine> | null;
  openScan: (prefill?: Partial<Wine> | null) => void;
  closeScan: () => void;
  handleWineCommitted: (docId: string | string[]) => void;
  handleViewWine: (wine: Wine) => void;
  scanFABRef: React.RefObject<HTMLButtonElement | null>;

  // Wine detail
  selectedWine: Wine | null;
  setSelectedWine: (w: Wine | null) => void;

  // Recommend → Remy handoff
  recommendContext: RecommendChatContext | null;
  setRecommendContext: (ctx: RecommendChatContext | null) => void;
  handleHandoffToRemy: (ctx: RecommendChatContext) => void;
  handleAddToCellarFromRecommend: (rec: Recommendation) => void;
  handleAddToCellarFromChat: (wine: Partial<Wine>) => void;

  // Mobile filter overlay
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (open: boolean) => void;

  // Refresh (for Pulse)
  triggerRefreshFeedback: () => void;

  // Recommend reset (nav tab re-click → back to grid)
  recommendResetKey: number;
  bumpRecommendResetKey: () => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}

const NUMERIC_WINE_FIELDS = new Set(['vintage', 'quantity', 'drinkFrom', 'drinkUntil', 'vivinoRating', 'price']);

function maturityRank(wine: Wine): number {
  const status = getMaturityStatus(wine.drinkFrom, wine.drinkUntil);
  if (status.includes('Past Peak')) return 0;   // urgent first
  if (status.includes('Drink Now')) return 1;
  if (status.includes('Hold')) return 2;
  return 3; // unknown last
}

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // ── Core state ──
  const [inventory, setInventory] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // ── Search + filter + sort state ──
  const [search, setSearchRaw] = useState('');
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<SortField>('maturity');

  // Sync search into filters.searchQuery
  const setSearch = useCallback((s: string) => {
    setSearchRaw(s);
    setFilters(prev => ({ ...prev, searchQuery: s }));
  }, []);

  // ── Wine detail ──
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  // ── Scan overlay ──
  const [scanOpen, setScanOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<Wine> | null>(null);
  const scanFABRef = useRef<HTMLButtonElement | null>(null);

  // ── Mobile filter overlay ──
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ── Recommend handoff ──
  const [recommendContext, setRecommendContext] = useState<RecommendChatContext | null>(null);

  // ── Recommend reset key (bumped when nav tab re-clicked) ──
  const [recommendResetKey, setRecommendResetKey] = useState(0);
  const bumpRecommendResetKey = useCallback(() => setRecommendResetKey(k => k + 1), []);

  // ── Real-time Firestore listener ──
  useEffect(() => {
    const unsubscribe = inventoryService.onInventoryChange((wines) => {
      setInventory(wines);
      setLoading(false);
      setIsSynced(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Faceted filter logic ──
  const filteredInventory = useMemo(
    () => inventory.filter(w => matchesAllFacets(w, filters)),
    [inventory, filters],
  );

  const sortedInventory = useMemo(() => {
    const sorted = [...filteredInventory];
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'maturity':
          return maturityRank(a) - maturityRank(b);
        case 'vintage-desc':
          return (b.vintage || 0) - (a.vintage || 0);
        case 'vintage-asc':
          return (a.vintage || 0) - (b.vintage || 0);
        case 'rating':
          return (b.vivinoRating || 0) - (a.vivinoRating || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'producer':
          return a.producer.localeCompare(b.producer);
        case 'country':
          return a.country.localeCompare(b.country);
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredInventory, sortField]);

  // ── Dynamic self-excluding facet options ──
  const facetOptions = useMemo<FacetOptionsMap>(() => ({
    wineType: aggregateFacetOptions(inventory, filters, 'wineType'),
    maturityStatus: aggregateFacetOptions(inventory, filters, 'maturityStatus'),
    country: aggregateFacetOptions(inventory, filters, 'country'),
    region: aggregateFacetOptions(inventory, filters, 'region'),
    appellation: aggregateFacetOptions(inventory, filters, 'appellation'),
    producer: aggregateFacetOptions(inventory, filters, 'producer'),
    grapeVariety: aggregateFacetOptions(inventory, filters, 'grapeVariety'),
    vintage: aggregateFacetOptions(inventory, filters, 'vintage'),
    price: aggregateFacetOptions(inventory, filters, 'price'),
  }), [inventory, filters]);

  const toggleFacet = useCallback((key: FacetKey, value: string) => {
    setFilters(prev => {
      const facet = prev[key];
      if ('include' in facet) {
        const arr = facet.include;
        const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
        return { ...prev, [key]: { ...facet, include: next } };
      }
      return prev;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearchRaw('');
    setSortField('maturity');
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const totalBottlesFiltered = useMemo(
    () => sortedInventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0),
    [sortedInventory],
  );

  const heroWineIds = useMemo(
    () => [...sortedInventory].sort((a, b) => (b.vivinoRating || 0) - (a.vivinoRating || 0)).slice(0, 2).map(w => w.id),
    [sortedInventory],
  );

  // ── Wine update handler ──
  const handleUpdate = useCallback(async (wine: Wine, key: string, value: string) => {
    // Auto-delete when quantity reaches 0
    if (key === 'quantity' && Number(value) <= 0) {
      const wineName = `${wine.vintage || ''} ${wine.producer || 'Wine'}`.trim();
      await inventoryService.deleteWine(wine.id);
      deleteLabelImage(wine.id).catch(() => {});
      setInventory(prev => prev.filter(w => w.id !== wine.id));
      setSelectedWine(prev => prev?.id === wine.id ? null : prev);
      showToast({ tone: 'neutral', message: `${wineName} removed from cellar` });
      return;
    }

    const success = await inventoryService.updateField(wine.id, key, value);
    if (success) {
      const coerced: any = NUMERIC_WINE_FIELDS.has(key) ? Number(value) : value;
      setInventory(prev => prev.map(w => w.id === wine.id ? { ...w, [key]: coerced } : w));
      setSelectedWine(prev => prev?.id === wine.id ? { ...prev, [key]: coerced } : prev);
    }
  }, []);

  // ── Scan callbacks ──
  const openScan = useCallback((prefill?: Partial<Wine> | null) => {
    setPrefillData(prefill ?? null);
    setScanOpen(true);
  }, []);

  const closeScan = useCallback(() => {
    setScanOpen(false);
    setPrefillData(null);
    requestAnimationFrame(() => scanFABRef.current?.focus());
  }, []);

  const handleWineCommitted = useCallback((docId: string | string[]) => {
    setScanOpen(false);
    navigate({ to: '/cellar' });
    const ids = Array.isArray(docId) ? docId : [docId];
    requestAnimationFrame(() => {
      setTimeout(() => {
        ids.forEach((id, i) => {
          const el = document.getElementById(`wine-card-${id}`);
          if (el) {
            if (i === 0) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('rc-highlight-pulse');
            setTimeout(() => el.classList.remove('rc-highlight-pulse'), 2000);
          }
        });
      }, 300);
    });
  }, [navigate]);

  const handleViewWine = useCallback((wine: Wine) => {
    setSelectedWine(wine);
  }, []);

  // ── Recommend / Chat handoff ──
  const handleHandoffToRemy = useCallback((ctx: RecommendChatContext) => {
    setRecommendContext(ctx);
    const isPinned = window.matchMedia('(min-width: 1440px)').matches;
    if (!isPinned) {
      navigate({ to: '/remy' });
    }
  }, [navigate]);

  const handleAddToCellarFromRecommend = useCallback((rec: Recommendation) => {
    setPrefillData({
      producer: rec.producer,
      name: rec.name,
      vintage: rec.vintage,
      type: rec.type,
    });
    setScanOpen(true);
  }, []);

  const handleAddToCellarFromChat = useCallback((wine: Partial<Wine>) => {
    setPrefillData(wine);
    setScanOpen(true);
  }, []);

  // ── Pulse refresh feedback ──
  const triggerRefreshFeedback = useCallback(() => {
    setIsSynced(false);
    setTimeout(() => setIsSynced(true), 500);
  }, []);

  const value = useMemo<InventoryContextValue>(() => ({
    inventory,
    loading,
    isSynced,
    search,
    setSearch,
    filters,
    facetOptions,
    filteredInventory: sortedInventory,
    toggleFacet,
    clearFilters,
    activeFilterCount,
    totalBottlesFiltered,
    heroWineIds,
    sortField,
    setSortField,
    handleUpdate,
    scanOpen,
    prefillData,
    openScan,
    closeScan,
    handleWineCommitted,
    handleViewWine,
    scanFABRef,
    selectedWine,
    setSelectedWine,
    recommendContext,
    setRecommendContext,
    handleHandoffToRemy,
    handleAddToCellarFromRecommend,
    handleAddToCellarFromChat,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    triggerRefreshFeedback,
    recommendResetKey,
    bumpRecommendResetKey,
  }), [
    inventory, loading, isSynced, search, setSearch, filters, facetOptions,
    sortedInventory, sortField, toggleFacet, clearFilters, activeFilterCount,
    totalBottlesFiltered, heroWineIds, handleUpdate, scanOpen, prefillData,
    openScan, closeScan, handleWineCommitted, handleViewWine, selectedWine,
    recommendContext, handleHandoffToRemy, handleAddToCellarFromRecommend,
    handleAddToCellarFromChat, mobileFiltersOpen, triggerRefreshFeedback,
    recommendResetKey, bumpRecommendResetKey,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
