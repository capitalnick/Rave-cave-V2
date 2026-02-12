import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { inventoryService } from '@/services/inventoryService';
import { getMaturityStatus } from '@/constants';
import type { Wine, CellarFilters, RecommendChatContext, Recommendation } from '@/types';

// ── Filter options derived from inventory ──
interface FilterOptions {
  vintage: number[];
  type: string[];
  cepage: string[];
  producer: string[];
  region: string[];
  country: string[];
}

// ── Context value shape ──
interface InventoryContextValue {
  // Core data
  inventory: Wine[];
  loading: boolean;
  isSynced: boolean;

  // Search + filters
  search: string;
  setSearch: (s: string) => void;
  filters: CellarFilters;
  filterOptions: FilterOptions;
  filteredInventory: Wine[];
  toggleFilter: (category: keyof CellarFilters, value: any) => void;
  clearFilters: () => void;
  totalBottlesFiltered: number;
  heroWineIds: string[];

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

  // Refresh (for Pulse)
  triggerRefreshFeedback: () => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}

const EMPTY_FILTERS: CellarFilters = {
  vintage: [],
  type: [],
  cepage: [],
  producer: [],
  region: [],
  country: [],
  maturity: [],
  priceRange: [],
};

const NUMERIC_WINE_FIELDS = new Set(['vintage', 'quantity', 'drinkFrom', 'drinkUntil', 'vivinoRating', 'price']);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // ── Core state ──
  const [inventory, setInventory] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // ── Search + filter state ──
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CellarFilters>(EMPTY_FILTERS);

  // ── Wine detail ──
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  // ── Scan overlay ──
  const [scanOpen, setScanOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<Wine> | null>(null);
  const scanFABRef = useRef<HTMLButtonElement | null>(null);

  // ── Recommend handoff ──
  const [recommendContext, setRecommendContext] = useState<RecommendChatContext | null>(null);

  // ── Real-time Firestore listener ──
  useEffect(() => {
    const unsubscribe = inventoryService.onInventoryChange((wines) => {
      setInventory(wines);
      setLoading(false);
      setIsSynced(true);
    });
    return () => unsubscribe();
  }, []);

  // ── Filter logic ──
  const filteredInventory = useMemo(() => {
    return inventory.filter(wine => {
      const matchesSearch = !search ||
        wine.producer.toLowerCase().includes(search.toLowerCase()) ||
        wine.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filters.vintage.length > 0 && !filters.vintage.includes(wine.vintage)) return false;
      if (filters.type.length > 0 && !filters.type.includes(wine.type)) return false;
      if (filters.region.length > 0 && !filters.region.includes(wine.region)) return false;
      if (filters.country.length > 0 && !filters.country.includes(wine.country)) return false;

      const maturity = getMaturityStatus(wine.drinkFrom, wine.drinkUntil).replace(/[🍷🟢⚠️]/g, '').trim();
      if (filters.maturity.length > 0 && !filters.maturity.includes(maturity)) return false;

      if (filters.priceRange.length > 0) {
        const matchesPrice = filters.priceRange.some(range => {
          if (range === 'Under $30') return wine.price < 30;
          if (range === '$30-$60') return wine.price >= 30 && wine.price < 60;
          if (range === '$60-$100') return wine.price >= 60 && wine.price < 100;
          if (range === '$100+') return wine.price >= 100;
          return false;
        });
        if (!matchesPrice) return false;
      }

      if (filters.producer.length > 0 && !filters.producer.includes(wine.producer)) return false;

      if (filters.cepage.length > 0) {
        if (!wine.cepage || wine.cepage.trim() === '') return false;
        const wineGrapes = wine.cepage.split(/[\/&+,]|(?:\s+and\s+)/i).map(g => g.trim().toLowerCase()).filter(g => g.length > 0);
        const hasMatch = filters.cepage.some(fGrape => wineGrapes.includes(fGrape.toLowerCase()));
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [inventory, search, filters]);

  const filterOptions = useMemo<FilterOptions>(() => {
    const grapes = new Set<string>();
    const vintages = new Set<number>();
    const types = new Set<string>();
    const regions = new Set<string>();
    const countries = new Set<string>();
    const producers = new Set<string>();

    inventory.forEach(wine => {
      if (wine.cepage) {
        wine.cepage.split(/[\/&+,]|(?:\s+and\s+)/i).map(g => g.trim()).filter(g => g.length > 0).forEach(g => grapes.add(g));
      }
      if (wine.vintage) vintages.add(wine.vintage);
      if (wine.type) types.add(wine.type);
      if (wine.region) regions.add(wine.region);
      if (wine.country) countries.add(wine.country);
      if (wine.producer) producers.add(wine.producer);
    });

    return {
      cepage: Array.from(grapes).sort(),
      producer: Array.from(producers).sort(),
      vintage: Array.from(vintages).sort((a, b) => b - a),
      type: Array.from(types).sort(),
      region: Array.from(regions).sort(),
      country: Array.from(countries).sort(),
    };
  }, [inventory]);

  const toggleFilter = useCallback((category: keyof CellarFilters, value: any) => {
    setFilters(prev => {
      const current = prev[category] as any[];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [category]: next };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  }, []);

  const totalBottlesFiltered = useMemo(
    () => filteredInventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0),
    [filteredInventory],
  );

  const heroWineIds = useMemo(
    () => [...filteredInventory].sort((a, b) => (b.vivinoRating || 0) - (a.vivinoRating || 0)).slice(0, 2).map(w => w.id),
    [filteredInventory],
  );

  // ── Wine update handler ──
  const handleUpdate = useCallback(async (wine: Wine, key: string, value: string) => {
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
    navigate({ to: '/remy' });
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
    filterOptions,
    filteredInventory,
    toggleFilter,
    clearFilters,
    totalBottlesFiltered,
    heroWineIds,
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
    triggerRefreshFeedback,
  }), [
    inventory, loading, isSynced, search, filters, filterOptions,
    filteredInventory, toggleFilter, clearFilters, totalBottlesFiltered,
    heroWineIds, handleUpdate, scanOpen, prefillData, openScan, closeScan,
    handleWineCommitted, handleViewWine, selectedWine, recommendContext,
    handleHandoffToRemy, handleAddToCellarFromRecommend, handleAddToCellarFromChat,
    triggerRefreshFeedback,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
