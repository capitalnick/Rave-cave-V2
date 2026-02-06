import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import WineCard from './components/WineCard';
import WineModal from './components/WineModal';
import { inventoryService } from './services/inventoryService';
import { Wine, CellarFilters, WineType } from './types';
import { Loader2 } from 'lucide-react';
import { getMaturityStatus } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'inventory' | 'stats'>('inventory');
  const [inventory, setInventory] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);

  // Filter State
  const [filters, setFilters] = useState<CellarFilters>({
    vintage: [],
    type: [],
    cepage: [],
    producer: [],
    region: [],
    country: [],
    maturity: [],
    priceRange: []
  });

  // Real-time Firestore listener — inventory updates automatically
  useEffect(() => {
    const unsubscribe = inventoryService.onInventoryChange((wines) => {
      setInventory(wines);
      setLoading(false);
      setIsSynced(true);
    });
    return () => unsubscribe();
  }, []);

  // Filter Logic
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

  const filterOptions = useMemo(() => {
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
      country: Array.from(countries).sort()
    };
  }, [inventory]);

  const toggleFilter = (category: keyof CellarFilters, value: any) => {
    setFilters(prev => {
      const current = prev[category] as any[];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [category]: next };
    });
  };

  const clearFilters = () => {
    setFilters({ vintage: [], type: [], cepage: [], producer: [], region: [], country: [], maturity: [], priceRange: [] });
    setSearch('');
  };

  const totalBottlesFiltered = filteredInventory.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);

  const heroWineIds = useMemo(() => {
    return filteredInventory.sort((a, b) => (b.vivinoRating || 0) - (a.vivinoRating || 0)).slice(0, 2).map(w => w.id);
  }, [filteredInventory]);

  // Uses Firestore doc ID (wine.id) instead of row numbers
  const handleUpdate = async (wine: Wine, key: string, value: string) => {
    const success = await inventoryService.updateField(wine.id, key, value);
    if (success) {
      // Optimistic local update — Firestore listener will also sync
      setInventory(prev => prev.map(w => w.id === wine.id ? { ...w, [key]: value } : w));
      if (selectedWine?.id === wine.id) setSelectedWine(prev => prev ? { ...prev, [key]: value } : null);
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      filters={filters}
      filterOptions={filterOptions}
      onToggleFilter={toggleFilter}
      onClearFilters={clearFilters}
    >
      {activeTab === 'chat' && <ChatInterface inventory={inventory} isSynced={isSynced} />}
      
      {activeTab === 'inventory' && (
        <div className="p-4 sm:p-10 h-full overflow-y-auto space-y-6 sm:space-y-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div className="space-y-2 flex-1 w-full">
              <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-none uppercase tracking-tighter">Your Cave</h2>
              <p className="font-mono text-[10px] sm:text-sm uppercase tracking-widest text-[#878787]">
                Firestore • {isSynced ? 'Live Synchronized' : 'Connecting...'}
              </p>
              
              <div className="mt-4 sm:mt-6 max-w-xl relative">
                 <input 
                  type="text" 
                  placeholder="SEARCH PRODUCER OR LABEL..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border-4 border-black px-4 sm:px-6 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:border-[#FF006E] placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="flex gap-4 sm:gap-8 font-display text-2xl sm:text-4xl leading-none tracking-tight flex-shrink-0">
              <div className="flex flex-col items-end">
                <span className="text-[#FF006E] text-4xl sm:text-6xl">{totalBottlesFiltered}</span>
                <span className="text-[9px] sm:text-xs font-mono uppercase tracking-widest text-black">Bottles</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[#CCFF00] text-4xl sm:text-6xl text-stroke-black">{filteredInventory.length}</span>
                <span className="text-[9px] sm:text-xs font-mono uppercase tracking-widest text-black">Labels</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="animate-spin text-[#FF006E]" size={48} />
              <p className="font-mono text-sm sm:text-xl animate-pulse">SYNCHRONIZING...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8 pb-24 sm:pb-20">
              {filteredInventory.map(wine => (
                <WineCard 
                  key={wine.id} 
                  wine={wine} 
                  isHero={heroWineIds.includes(wine.id)}
                  onClick={() => setSelectedWine(wine)} 
                  onUpdate={(key, value) => handleUpdate(wine, key, value)}
                />
              ))}
              {filteredInventory.length === 0 && (
                <div className="col-span-full py-20 sm:py-40 text-center border-4 sm:border-8 border-dashed border-[#878787] bg-white/50 px-4">
                   <p className="font-display text-4xl sm:text-6xl text-[#878787]">NO RECORDS FOUND</p>
                   <button onClick={clearFilters} className="mt-6 bg-black text-white px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[#FF006E]">Reset All</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && <Dashboard inventory={inventory} />}

      {selectedWine && (
        <WineModal wine={selectedWine} onClose={() => setSelectedWine(null)} onUpdate={(key, value) => handleUpdate(selectedWine, key, value)} />
      )}
    </Layout>
  );
};

export default App;