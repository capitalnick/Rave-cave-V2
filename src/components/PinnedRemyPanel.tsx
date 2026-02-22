import React from 'react';
import { RightPanel } from '@/components/ui/right-panel';
import ChatInterface from '@/components/ChatInterface';
import { useInventory } from '@/context/InventoryContext';

interface PinnedRemyPanelProps {
  open: boolean;
  onClose: () => void;
}

const PinnedRemyPanel: React.FC<PinnedRemyPanelProps> = ({ open, onClose }) => {
  const {
    inventory,
    isSynced,
    recommendContext,
    setRecommendContext,
    wineBriefContext,
    setWineBriefContext,
    handleAddToCellarFromChat,
  } = useInventory();

  return (
    <RightPanel
      open={open}
      onClose={onClose}
      width="remy"
      id="remy-pinned"
      pinned
      title="Rémy Sommelier"
    >
      <ChatInterface
        inventory={inventory}
        isSynced={isSynced}
        recommendContext={recommendContext}
        onRecommendContextConsumed={() => setRecommendContext(null)}
        wineBriefContext={wineBriefContext}
        onWineBriefContextConsumed={() => setWineBriefContext(null)}
        onAddToCellar={handleAddToCellarFromChat}
      />
    </RightPanel>
  );
};

export default PinnedRemyPanel;
