import React, { useState, useCallback, useEffect } from 'react';
import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
  useRouterState,
  useNavigate,
} from '@tanstack/react-router';
import Layout from '@/components/Layout';
import ScanOverlay from '@/components/ScanOverlay';
import WineModal from '@/components/WineModal';
import PinnedRemyPanel from '@/components/PinnedRemyPanel';
import { RCToaster } from '@/components/rc';
import { InventoryProvider, useInventory } from '@/context/InventoryContext';
import { SurfaceProvider } from '@/context/SurfaceContext';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePinnedRemy } from '@/hooks/usePinnedRemy';
import CellarPage from '@/pages/CellarPage';
import PulsePage from '@/pages/PulsePage';
import RecommendPage from '@/pages/RecommendPage';
import RemyPage from '@/pages/RemyPage';
import SettingsPage from '@/pages/SettingsPage';
import type { NavId } from '@/types';

const LS_KEY = 'rc_remy_pinned_open';

// ── Derive active tab from the current URL pathname ──
const TAB_FROM_PATH: Record<string, NavId> = {
  cellar: 'cellar',
  pulse: 'pulse',
  recommend: 'recommend',
  remy: 'remy',
  settings: 'settings',
};

function useActiveTab(): NavId {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segment = pathname.split('/').filter(Boolean)[0] || 'cellar';
  return TAB_FROM_PATH[segment] || 'cellar';
}

// ── AppShell: bridges context + router → Layout props ──
function AppShell() {
  const ctx = useInventory();
  const activeTab = useActiveTab();
  const navigate = useNavigate();
  const scrollWrapperRef = useScrollPreservation();
  useKeyboardShortcuts(navigate);

  const isPinned = usePinnedRemy();

  // Pinned Remy panel state (local to AppShell, persisted in localStorage)
  const [remyPanelOpen, setRemyPanelOpen] = useState(() => {
    try { return localStorage.getItem(LS_KEY) !== 'false'; } catch { return true; }
  });

  const toggleRemyPanel = useCallback(() => {
    setRemyPanelOpen(prev => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const closeRemyPanel = useCallback(() => {
    setRemyPanelOpen(false);
    try { localStorage.setItem(LS_KEY, 'false'); } catch {}
  }, []);

  const openRemyPanel = useCallback(() => {
    setRemyPanelOpen(true);
    try { localStorage.setItem(LS_KEY, 'true'); } catch {}
  }, []);

  const pinnedRemyVisible = isPinned && activeTab !== 'remy' && remyPanelOpen;

  // Auto-open pinned panel when recommend handoff sets context
  useEffect(() => {
    if (isPinned && ctx.recommendContext) {
      openRemyPanel();
    }
  }, [isPinned, ctx.recommendContext, openRemyPanel]);

  // Auto-open pinned panel when wine brief context is set
  useEffect(() => {
    if (isPinned && ctx.wineBriefContext) {
      openRemyPanel();
    }
  }, [isPinned, ctx.wineBriefContext, openRemyPanel]);

  // Tab change handler — Remy nav toggles panel at >=1440px
  const handleTabChange = useCallback((tab: NavId) => {
    if (tab === 'remy' && isPinned) {
      toggleRemyPanel();
    } else {
      // Re-clicking recommend while already on recommend → reset to grid
      if (tab === 'recommend' && activeTab === 'recommend') {
        ctx.bumpRecommendResetKey();
      }
      navigate({ to: `/${tab}` });
    }
  }, [isPinned, toggleRemyPanel, navigate, activeTab, ctx]);

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        filters={ctx.filters}
        facetOptions={ctx.facetOptions}
        filteredCount={ctx.filteredInventory.length}
        onToggleFacet={ctx.toggleFacet}
        onClearFilters={ctx.clearFilters}
        mobileFiltersOpen={ctx.mobileFiltersOpen}
        onMobileFiltersOpenChange={ctx.setMobileFiltersOpen}
        onScanPress={() => ctx.openScan()}
        onScanLongPress={() => ctx.openScan()}
        scanFABRef={ctx.scanFABRef}
        scrollWrapperRef={scrollWrapperRef}
        pinnedRightOffset={pinnedRemyVisible ? 400 : 0}
        isPinnedRemy={isPinned}
        remyPanelOpen={remyPanelOpen}
      >
        <Outlet />
      </Layout>

      <ScanOverlay
        open={ctx.scanOpen}
        onClose={ctx.closeScan}
        inventory={ctx.inventory}
        onWineCommitted={ctx.handleWineCommitted}
        onViewWine={ctx.handleViewWine}
        prefillData={ctx.prefillData}
        onAskRemy={ctx.handleAskRemyAboutWine}
      />

      {ctx.selectedWine && (
        <WineModal
          wine={ctx.selectedWine}
          onClose={() => ctx.setSelectedWine(null)}
          onUpdate={(key, value) => ctx.handleUpdate(ctx.selectedWine!, key, value)}
        />
      )}

      <RCToaster />

      {pinnedRemyVisible && (
        <PinnedRemyPanel open={remyPanelOpen} onClose={closeRemyPanel} />
      )}
    </>
  );
}

// ── Route tree ──

const rootRoute = createRootRoute({
  component: () => (
    <SurfaceProvider>
      <InventoryProvider>
        <AppShell />
      </InventoryProvider>
    </SurfaceProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/cellar' });
  },
});

const cellarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cellar',
  component: CellarPage,
});

const pulseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pulse',
  component: PulsePage,
});

const recommendRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recommend',
  component: RecommendPage,
});

const remyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/remy',
  component: RemyPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  cellarRoute,
  pulseRoute,
  recommendRoute,
  remyRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => {
    const navigate = useNavigate();
    React.useEffect(() => {
      navigate({ to: '/cellar' });
    }, [navigate]);
    return null;
  },
});

// ── Type registration for type-safe navigation ──
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
