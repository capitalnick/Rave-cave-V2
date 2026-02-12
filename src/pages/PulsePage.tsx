import React from 'react';
import PulseScreen from '@/components/PulseScreen';
import { useInventory } from '@/context/InventoryContext';

const PulsePage: React.FC = () => {
  const {
    inventory,
    triggerRefreshFeedback,
    setSelectedWine,
    openScan,
  } = useInventory();

  return (
    <PulseScreen
      inventory={inventory}
      onRefreshInventory={triggerRefreshFeedback}
      onNavigateToWine={(wineId) => {
        const wine = inventory.find(w => w.id === wineId);
        if (wine) setSelectedWine(wine);
      }}
      onScanPress={() => openScan()}
    />
  );
};

export default PulsePage;
