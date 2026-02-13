import React, { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import PulseScreen from '@/components/PulseScreen';
import { useInventory } from '@/context/InventoryContext';
import type { FacetKey } from '@/types';

const PulsePage: React.FC = () => {
  const {
    inventory,
    triggerRefreshFeedback,
    setSelectedWine,
    openScan,
    clearFilters,
    toggleFacet,
  } = useInventory();
  const navigate = useNavigate();

  const handleFilterNavigate = useCallback((key: FacetKey, value: string) => {
    clearFilters();
    toggleFacet(key, value);
    navigate({ to: '/cellar' });
  }, [clearFilters, toggleFacet, navigate]);

  return (
    <PulseScreen
      inventory={inventory}
      onRefreshInventory={triggerRefreshFeedback}
      onNavigateToWine={(wineId) => {
        const wine = inventory.find(w => w.id === wineId);
        if (wine) setSelectedWine(wine);
      }}
      onScanPress={() => openScan()}
      onFilterNavigate={handleFilterNavigate}
    />
  );
};

export default PulsePage;
