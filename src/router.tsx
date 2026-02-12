import React from 'react';
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
import { RCToaster } from '@/components/rc';
import { InventoryProvider, useInventory } from '@/context/InventoryContext';
import { SurfaceProvider } from '@/context/SurfaceContext';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import CellarPage from '@/pages/CellarPage';
import PulsePage from '@/pages/PulsePage';
import RecommendPage from '@/pages/RecommendPage';
import RemyPage from '@/pages/RemyPage';
import SettingsPage from '@/pages/SettingsPage';
import type { NavId } from '@/types';

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

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={(tab: NavId) => navigate({ to: `/${tab}` })}
      filters={ctx.filters}
      filterOptions={ctx.filterOptions}
      onToggleFilter={ctx.toggleFilter}
      onClearFilters={ctx.clearFilters}
      onScanPress={() => ctx.openScan()}
      onScanLongPress={() => ctx.openScan()}
      scanFABRef={ctx.scanFABRef}
      scrollWrapperRef={scrollWrapperRef}
    >
      <Outlet />

      <ScanOverlay
        open={ctx.scanOpen}
        onClose={ctx.closeScan}
        inventory={ctx.inventory}
        onWineCommitted={ctx.handleWineCommitted}
        onViewWine={ctx.handleViewWine}
        prefillData={ctx.prefillData}
      />

      {ctx.selectedWine && (
        <WineModal
          wine={ctx.selectedWine}
          onClose={() => ctx.setSelectedWine(null)}
          onUpdate={(key, value) => ctx.handleUpdate(ctx.selectedWine!, key, value)}
        />
      )}

      <RCToaster />
    </Layout>
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
