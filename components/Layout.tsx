import React, { useState, useMemo } from 'react';
import { MessageSquare, Database, LayoutDashboard, Settings, Wine as WineIcon, ChevronDown, ChevronUp, X, Filter, Search } from 'lucide-react';
import { CellarFilters, WineType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'chat' | 'inventory' | 'stats';
  onTabChange: (tab: 'chat' | 'inventory' | 'stats') => void;
  // Filter Props
  filters?: CellarFilters;
  filterOptions?: {
    vintage: number[];
    type: string[];
    cepage: string[];
    producer: string[];
    region: string[];
    country: string[];
  };
  onToggleFilter?: (category: keyof CellarFilters, value: any) => void;
  onClearFilters?: () => void;
}

const FilterSection: React.FC<{
  title: string;
  options: any[];
  selected: any[];
  onToggle: (val: any) => void;
  searchable?: boolean;
}> = ({ title, options, selected, onToggle, searchable = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter(opt => 
      opt.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, searchable]);

  if (!options.length) return null;

  return (
    <div className="border-b border-[#EBEBDF] py-3">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="font-mono text-[10px] font-bold tracking-widest text-black uppercase">{title}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {searchable && (
            <div className="relative mb-2">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#878787]" />
              <input 
                type="text" 
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F5F0E8] border border-black px-6 py-1 font-mono text-[9px] focus:outline-none"
              />
            </div>
          )}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => onToggle(opt)}
                    className="w-3 h-3 border border-black checked:bg-[#CCFF00] appearance-none cursor-pointer"
                  />
                  <span className={`font-mono text-[10px] uppercase truncate ${selected.includes(opt) ? 'text-black font-bold' : 'text-[#878787] group-hover:text-black'}`}>
                    {opt}
                  </span>
                </label>
              ))
            ) : (
              <span className="font-mono text-[9px] text-[#878787] uppercase text-center block py-2">No results</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange,
  filters,
  filterOptions,
  onToggleFilter,
  onClearFilters
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const navItems = [
    { id: 'chat', label: 'RÉMY', icon: MessageSquare },
    { id: 'inventory', label: 'CELLAR', icon: Database },
    { id: 'stats', label: 'STATS', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen bg-[#FAFAF8] text-[#0A0A0A] overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-72 border-r-8 border-[#0A0A0A] flex-col items-center bg-white overflow-hidden">
        <div className="py-10 flex flex-col items-center gap-2 flex-shrink-0">
          <WineIcon size={48} className="text-[#FF006E]" />
          <h1 className="text-5xl font-display tracking-tighter uppercase leading-none mt-2">RAVE CAVE</h1>
        </div>

        <nav className="w-full flex-shrink-0 space-y-1 px-4 font-display text-3xl">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => onTabChange(item.id as any)}
              className={`w-full flex items-center gap-4 p-4 transition-all border-b-4 border-transparent hover:border-[#CCFF00] ${activeTab === item.id ? 'bg-[#CCFF00] text-black border-[#0A0A0A]' : 'text-gray-400 hover:text-black'}`}
            >
              <item.icon size={28} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'inventory' && filters && filterOptions && (
          <div className="flex flex-col flex-1 w-full px-6 mt-6 overflow-hidden border-t-4 border-black">
            <div className="py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[#FF006E]" />
                <h3 className="font-mono text-[10px] font-bold tracking-widest uppercase">Filters</h3>
              </div>
              <button onClick={() => onClearFilters?.()} className="text-[9px] font-mono font-bold uppercase underline text-[#878787] hover:text-[#FF006E]">Clear</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar pr-1">
              <FilterSection title="Grapes" options={filterOptions.cepage} selected={filters.cepage} onToggle={(val) => onToggleFilter?.('cepage', val)} searchable />
              <FilterSection title="Producer" options={filterOptions.producer} selected={filters.producer} onToggle={(val) => onToggleFilter?.('producer', val)} searchable />
              <FilterSection title="Vintages" options={filterOptions.vintage} selected={filters.vintage} onToggle={(val) => onToggleFilter?.('vintage', val)} />
              <FilterSection title="Type" options={filterOptions.type} selected={filters.type} onToggle={(val) => onToggleFilter?.('type', val)} />
              <FilterSection title="Maturity" options={['Drink Now', 'Hold', 'Past Peak']} selected={filters.maturity} onToggle={(val) => onToggleFilter?.('maturity', val)} />
              <FilterSection title="Price" options={['Under $30', '$30-$60', '$60-$100', '$100+']} selected={filters.priceRange} onToggle={(val) => onToggleFilter?.('priceRange', val)} />
              <FilterSection title="Region" options={filterOptions.region} selected={filters.region} onToggle={(val) => onToggleFilter?.('region', val)} />
              <FilterSection title="Country" options={filterOptions.country} selected={filters.country} onToggle={(val) => onToggleFilter?.('country', val)} />
            </div>
          </div>
        )}

        <div className="w-full px-4 pt-4 mt-auto border-t-4 border-[#0A0A0A] font-display text-2xl flex-shrink-0">
          <button className="w-full flex items-center gap-4 p-4 text-[#878787] hover:text-[#0A0A0A] transition-all">
            <Settings size={28} />
            <span className="uppercase">Settings</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t-4 border-black z-50 flex items-center justify-around">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id as any)}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${activeTab === item.id ? 'bg-[#CCFF00] text-black' : 'text-gray-400'}`}
          >
            <item.icon size={24} />
            <span className="font-mono text-[9px] mt-1 font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Filter Toggle Button */}
      {activeTab === 'inventory' && (
        <button 
          onClick={() => setMobileFiltersOpen(true)}
          className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-[#FF006E] text-white border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] z-40 flex items-center justify-center"
        >
          <Filter size={20} />
        </button>
      )}

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && activeTab === 'inventory' && (
        <div className="md:hidden fixed inset-0 bg-[#FAFAF8] z-[60] flex flex-col">
          <div className="p-6 border-b-4 border-black flex items-center justify-between bg-white">
            <h2 className="font-display text-4xl">Filters</h2>
            <button onClick={() => setMobileFiltersOpen(false)} className="p-2 border-4 border-black bg-[#CCFF00]">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            <button onClick={() => onClearFilters?.()} className="w-full py-3 bg-black text-[#CCFF00] font-mono text-xs uppercase mb-4">Clear All Filters</button>
            {filterOptions && filters && (
              <>
                <FilterSection title="Grapes" options={filterOptions.cepage} selected={filters.cepage} onToggle={(val) => onToggleFilter?.('cepage', val)} searchable />
                <FilterSection title="Producer" options={filterOptions.producer} selected={filters.producer} onToggle={(val) => onToggleFilter?.('producer', val)} searchable />
                <FilterSection title="Vintages" options={filterOptions.vintage} selected={filters.vintage} onToggle={(val) => onToggleFilter?.('vintage', val)} />
                <FilterSection title="Type" options={filterOptions.type} selected={filters.type} onToggle={(val) => onToggleFilter?.('type', val)} />
                <FilterSection title="Maturity" options={['Drink Now', 'Hold', 'Past Peak']} selected={filters.maturity} onToggle={(val) => onToggleFilter?.('maturity', val)} />
                <FilterSection title="Price" options={['Under $30', '$30-$60', '$60-$100', '$100+']} selected={filters.priceRange} onToggle={(val) => onToggleFilter?.('priceRange', val)} />
                <FilterSection title="Region" options={filterOptions.region} selected={filters.region} onToggle={(val) => onToggleFilter?.('region', val)} />
                <FilterSection title="Country" options={filterOptions.country} selected={filters.country} onToggle={(val) => onToggleFilter?.('country', val)} />
              </>
            )}
          </div>
          <div className="p-6 border-t-4 border-black bg-white">
            <button onClick={() => setMobileFiltersOpen(false)} className="w-full py-4 bg-[#CCFF00] border-4 border-black font-display text-2xl uppercase">Show Results</button>
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden flex flex-col bg-[#F5F0E8] pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;