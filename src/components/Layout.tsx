import React, { useState, useMemo } from 'react';
import { MessageSquare, Database, LayoutDashboard, Settings, Wine as WineIcon, ChevronDown, ChevronUp, Filter, Sparkles, Crosshair } from 'lucide-react';
import { CellarFilters, NavId, TabId } from '@/types';
import { TabItem, Divider, Heading, MonoLabel, Checkbox, Input, ScanFAB } from '@/components/rc';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useRailExpanded } from '@/hooks/useRailExpanded';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: NavId;
  onTabChange: (tab: NavId) => void;
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
  onScanLongPress?: () => void;
  scanFABRef?: React.Ref<HTMLButtonElement>;
  scrollWrapperRef?: React.RefObject<HTMLDivElement | null>;
  /** Reserve space on right for pinned panel (px). 0 = no offset. */
  pinnedRightOffset?: number;
  /** Whether the pinned Remy breakpoint is active */
  isPinnedRemy?: boolean;
  /** Whether the pinned Remy panel is currently open */
  remyPanelOpen?: boolean;
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
  onScanPress,
  onScanLongPress,
  scanFABRef,
  scrollWrapperRef,
  pinnedRightOffset = 0,
  isPinnedRemy = false,
  remyPanelOpen = false,
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isRailExpanded = useRailExpanded();
  const railContext = isRailExpanded ? 'rail-expanded' : 'rail-collapsed';

  return (
    <div className="flex h-screen bg-[var(--rc-surface-tertiary)] text-[var(--rc-ink-primary)] overflow-hidden">
      {/* Desktop Rail */}
      <aside className={cn(
        "hidden md:flex border-r-[var(--rc-divider-emphasis-weight)] border-r-[var(--rc-ink-primary)] flex-col items-center bg-[var(--rc-surface-primary)] overflow-hidden transition-[width] duration-200",
        isRailExpanded ? "w-[var(--rc-rail-width-expanded)]" : "w-[var(--rc-rail-width-collapsed)]"
      )}>
        {/* Logo */}
        <div className={cn(
          "shrink-0 flex flex-col items-center gap-2",
          isRailExpanded ? "py-10" : "py-6"
        )}>
          <WineIcon size={isRailExpanded ? 48 : 28} className="text-[var(--rc-accent-pink)]" />
          {isRailExpanded && <Heading scale="title" align="centre" className="mt-2">RAVE CAVE</Heading>}
        </div>

        {/* Nav Items */}
        <nav className="w-full shrink-0 space-y-1 px-0" role="tablist">
          {navItems.map((item) => {
            // In pinned mode, Remy active state reflects panel open/closed
            const isActive = item.id === 'remy' && isPinnedRemy
              ? remyPanelOpen
              : activeTab === item.id;
            return (
              <TabItem
                key={item.id}
                icon={<item.icon className="w-full h-full" />}
                iconFilled={<item.icon className="w-full h-full" strokeWidth={2.5} />}
                label={item.label}
                state={isActive ? 'active' : 'inactive'}
                context={railContext}
                onClick={() => onTabChange(item.id)}
              />
            );
          })}
        </nav>

        {/* Scan Button */}
        <div className={cn("w-full mt-4 shrink-0", isRailExpanded ? "px-6" : "px-3")}>
          {isRailExpanded ? (
            <button
              onClick={onScanPress}
              className="w-full flex items-center justify-center gap-2 h-10 bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] rounded-[var(--rc-radius-md)] font-[var(--rc-font-mono)] text-xs uppercase tracking-widest hover:bg-[var(--rc-accent-pink-hover)] transition-colors"
            >
              <Crosshair size={16} />
              SCAN
            </button>
          ) : (
            <button
              onClick={onScanPress}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] hover:bg-[var(--rc-accent-pink-hover)] transition-colors"
              aria-label="Scan label"
            >
              <Crosshair size={18} />
            </button>
          )}
        </div>

        {/* Filters — expanded rail + cellar tab only */}
        {isRailExpanded && activeTab === 'cellar' && filters && filterOptions && (
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

        {/* Settings */}
        <div className="w-full px-0 mt-auto shrink-0">
          <Divider weight="emphasised" />
          <TabItem
            icon={<Settings className="w-full h-full" />}
            iconFilled={<Settings className="w-full h-full" />}
            label="SETTINGS"
            state={activeTab === 'settings' ? 'active' : 'inactive'}
            context={railContext}
            onClick={() => onTabChange('settings')}
          />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--rc-surface-primary)] border-t-[var(--rc-divider-emphasis-weight)] border-t-[var(--rc-ink-primary)] z-50 grid grid-cols-5 items-end pb-[env(safe-area-inset-bottom)]" role="tablist">
        {navItems.slice(0, 2).map((item) => (
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
        <div className="flex items-center justify-center pb-1">
          <ScanFAB ref={scanFABRef} onClick={onScanPress} onLongPress={onScanLongPress} className="relative -top-3" />
        </div>
        {navItems.slice(2).map((item) => (
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

      {/* Mobile Filter Overlay — BottomSheet at 90% */}
      {activeTab === 'cellar' && (
        <BottomSheet
          open={mobileFiltersOpen}
          onOpenChange={setMobileFiltersOpen}
          snapPoint="full"
          snapPoints={['full']}
          id="mobile-filters"
          title="Filters"
          dismissible
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2">
              <Heading scale="heading">Filters</Heading>
              <button
                onClick={() => onClearFilters?.()}
                className="font-[var(--rc-font-mono)] text-[9px] font-bold uppercase underline text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
              >
                Clear All
              </button>
            </div>
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
            <div className="pt-4 pb-2">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full py-4 bg-[var(--rc-accent-acid)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] font-[var(--rc-font-display)] text-2xl uppercase font-black rounded-[var(--rc-radius-md)]"
              >
                Show Results
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      <main
        ref={scrollWrapperRef}
        className="flex-1 relative overflow-hidden flex flex-col bg-[var(--rc-surface-tertiary)] pb-16 md:pb-0 transition-[padding-right] duration-200"
        style={pinnedRightOffset ? { paddingRight: pinnedRightOffset } : undefined}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
