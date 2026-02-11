import React, { useState, useMemo } from 'react';
import { MessageSquare, Database, LayoutDashboard, Settings, Wine as WineIcon, ChevronDown, ChevronUp, X, Filter, Search, Sparkles } from 'lucide-react';
import { CellarFilters, WineType, TabId } from '@/types';
import { TabItem, Divider, Heading, MonoLabel, Checkbox, Input, IconButton } from '@/components/rc';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
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
  onScanPress?: () => void;
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
    <div className="py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <MonoLabel size="micro" weight="bold" colour="primary" as="span" className="w-auto">
          {title}
        </MonoLabel>
        {expanded ? <ChevronUp size={14} className="text-[var(--rc-ink-tertiary)]" /> : <ChevronDown size={14} className="text-[var(--rc-ink-tertiary)]" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {searchable && (
            <div className="mb-2">
              <Input
                typeVariant="Search"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <Checkbox
                  key={opt}
                  variant={selected.includes(opt) ? 'Checked' : 'Unchecked'}
                  label={String(opt)}
                  platform="Desktop"
                  onChange={() => onToggle(opt)}
                />
              ))
            ) : (
              <MonoLabel size="micro" colour="ghost" align="centre" as="span" className="block py-2">
                No results
              </MonoLabel>
            )}
          </div>
        </div>
      )}
      <Divider weight="subtle" className="mt-3" />
    </div>
  );
};

const navItems: { id: TabId; label: string; icon: typeof Database }[] = [
  { id: 'cellar', label: 'CELLAR', icon: Database },
  { id: 'pulse', label: 'PULSE', icon: LayoutDashboard },
  { id: 'recommend', label: 'RECOMMEND', icon: Sparkles },
  { id: 'remy', label: 'RÉMY', icon: MessageSquare },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  filters,
  filterOptions,
  onToggleFilter,
  onClearFilters,
  onScanPress
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--rc-surface-tertiary)] text-[var(--rc-ink-primary)] overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-72 border-r-[var(--rc-divider-emphasis-weight)] border-r-[var(--rc-ink-primary)] flex-col items-center bg-[var(--rc-surface-primary)] overflow-hidden">
        <div className="py-10 flex flex-col items-center gap-2 shrink-0">
          <WineIcon size={48} className="text-[var(--rc-accent-pink)]" />
          <Heading scale="title" align="centre" className="mt-2">RAVE CAVE</Heading>
        </div>

        <nav className="w-full shrink-0 space-y-1 px-0" role="tablist">
          {navItems.map((item) => (
            <TabItem
              key={item.id}
              icon={<item.icon className="w-full h-full" />}
              iconFilled={<item.icon className="w-full h-full" strokeWidth={2.5} />}
              label={item.label}
              state={activeTab === item.id ? 'active' : 'inactive'}
              context="rail-expanded"
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </nav>

        {activeTab === 'cellar' && filters && filterOptions && (
          <div className="flex flex-col flex-1 w-full px-6 mt-6 overflow-hidden">
            <Divider weight="emphasised" />
            <div className="py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[var(--rc-accent-pink)]" />
                <MonoLabel size="micro" weight="bold" colour="primary" as="span" className="w-auto">Filters</MonoLabel>
              </div>
              <button onClick={() => onClearFilters?.()} className="font-[var(--rc-font-mono)] text-[9px] font-bold uppercase underline text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors">
                Clear
              </button>
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

        <div className="w-full px-0 mt-auto shrink-0">
          <Divider weight="emphasised" />
          <TabItem
            icon={<Settings className="w-full h-full" />}
            iconFilled={<Settings className="w-full h-full" />}
            label="SETTINGS"
            state="inactive"
            context="rail-expanded"
          />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--rc-surface-primary)] border-t-[var(--rc-divider-emphasis-weight)] border-t-[var(--rc-ink-primary)] z-50 flex items-center justify-around" role="tablist">
        {navItems.map((item) => (
          <TabItem
            key={item.id}
            icon={<item.icon className="w-full h-full" />}
            iconFilled={<item.icon className="w-full h-full" strokeWidth={2.5} />}
            label={item.label}
            state={activeTab === item.id ? 'active' : 'inactive'}
            context="tabbar"
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </nav>

      {/* Mobile Filter Toggle Button */}
      {activeTab === 'cellar' && (
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] shadow-[4px_4px_0_rgba(0,0,0,1)] z-40 flex items-center justify-center rounded-[var(--rc-radius-md)]"
        >
          <Filter size={20} />
        </button>
      )}

      {/* Mobile Filter Overlay */}
      {mobileFiltersOpen && activeTab === 'cellar' && (
        <div className="md:hidden fixed inset-0 bg-[var(--rc-surface-tertiary)] z-[60] flex flex-col">
          <div className="p-6 border-b-[var(--rc-divider-emphasis-weight)] border-b-[var(--rc-ink-primary)] flex items-center justify-between bg-[var(--rc-surface-primary)]">
            <Heading scale="heading">Filters</Heading>
            <IconButton
              icon={X}
              aria-label="Close filters"
              onClick={() => setMobileFiltersOpen(false)}
              className="bg-[var(--rc-accent-acid)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            <button
              onClick={() => onClearFilters?.()}
              className="w-full py-3 bg-[var(--rc-ink-primary)] text-[var(--rc-accent-acid)] font-[var(--rc-font-mono)] text-xs uppercase mb-4 rounded-[var(--rc-radius-sm)]"
            >
              Clear All Filters
            </button>
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
          <div className="p-6 border-t-[var(--rc-divider-emphasis-weight)] border-t-[var(--rc-ink-primary)] bg-[var(--rc-surface-primary)]">
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-4 bg-[var(--rc-accent-acid)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] font-[var(--rc-font-display)] text-2xl uppercase font-black rounded-[var(--rc-radius-md)]"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden flex flex-col bg-[var(--rc-surface-tertiary)] pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;
