import React from 'react';
import { MessageSquare, Database, LayoutDashboard, Settings, Sparkles } from 'lucide-react';
import WineIcon from '@/components/icons/WineIcon';
import { ScanBottleIcon } from '@/components/rc/ScanBottleIcon';
import { NavId, TabId } from '@/types';
import type { FacetKey, FacetOption, FiltersState } from '@/lib/faceted-filters';
import { TabItem, Divider, Heading, MonoLabel, ScanFAB, EnvBadge } from '@/components/rc';
import { ProdWriteGuard } from '@/components/ProdWriteGuard';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import FilterOverlay from '@/components/FilterOverlay';
import { useRailExpanded } from '@/hooks/useRailExpanded';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: NavId;
  onTabChange: (tab: NavId) => void;
  filters?: FiltersState;
  facetOptions?: Record<string, FacetOption[]>;
  filteredCount?: number;
  onToggleFacet?: (key: FacetKey, value: string) => void;
  onClearFilters?: () => void;
  mobileFiltersOpen?: boolean;
  onMobileFiltersOpenChange?: (open: boolean) => void;
  onScanPress?: () => void;
  onScanLongPress?: () => void;
  scanFABRef?: React.Ref<HTMLButtonElement>;
  scrollWrapperRef?: React.RefObject<HTMLDivElement | null>;
  pinnedRightOffset?: number;
  isPinnedRemy?: boolean;
  remyPanelOpen?: boolean;
}

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
  facetOptions,
  filteredCount = 0,
  onToggleFacet,
  onClearFilters,
  mobileFiltersOpen = false,
  onMobileFiltersOpenChange,
  onScanPress,
  onScanLongPress,
  scanFABRef,
  scrollWrapperRef,
  pinnedRightOffset = 0,
  isPinnedRemy = false,
  remyPanelOpen = false,
}) => {
  const isRailExpanded = useRailExpanded();
  const railContext = isRailExpanded ? 'rail-expanded' : 'rail-collapsed';

  const showFilters = activeTab === 'cellar' && filters && facetOptions && onToggleFacet && onClearFilters;

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
          <EnvBadge />
        </div>

        {/* Nav Items */}
        <nav className="w-full shrink-0 space-y-1 px-0" role="tablist">
          {navItems.map((item) => {
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
              <ScanBottleIcon size={16} />
              SCAN
            </button>
          ) : (
            <button
              onClick={onScanPress}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] hover:bg-[var(--rc-accent-pink-hover)] transition-colors"
              aria-label="Scan label"
            >
              <ScanBottleIcon size={18} />
            </button>
          )}
        </div>

        {/* Filters — expanded rail + cellar tab only */}
        {isRailExpanded && showFilters && (
          <div className="flex flex-col flex-1 w-full px-6 mt-6 overflow-hidden">
            <Divider weight="emphasised" />
            <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar pr-1 pt-4">
              <FilterOverlay
                filters={filters}
                facetOptions={facetOptions}
                filteredCount={filteredCount}
                onToggleFacet={onToggleFacet}
                onClearFilters={onClearFilters}
              />
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

      {/* Mobile Filter Overlay — BottomSheet */}
      {showFilters && (
        <BottomSheet
          open={mobileFiltersOpen}
          onOpenChange={(open) => onMobileFiltersOpenChange?.(open)}
          snapPoint="full"
          snapPoints={['full']}
          id="mobile-filters"
          title="Filters"
          dismissible
        >
          <FilterOverlay
            filters={filters}
            facetOptions={facetOptions}
            filteredCount={filteredCount}
            onToggleFacet={onToggleFacet}
            onClearFilters={onClearFilters}
            onClose={() => onMobileFiltersOpenChange?.(false)}
          />
        </BottomSheet>
      )}

      <main
        ref={scrollWrapperRef}
        className="flex-1 relative overflow-hidden flex flex-col bg-[var(--rc-surface-tertiary)] pb-16 md:pb-0 transition-[padding-right] duration-200"
        style={pinnedRightOffset ? { paddingRight: pinnedRightOffset } : undefined}
      >
        <EnvBadge className="fixed top-2 right-2 z-40 md:hidden" />
        {children}
      </main>
      <ProdWriteGuard />
    </div>
  );
};

export default Layout;
