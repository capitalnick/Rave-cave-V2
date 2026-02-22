import React from 'react';
import ChatInterface from '@/components/ChatInterface';
import { useInventory } from '@/context/InventoryContext';

const RemyPage: React.FC = () => {
  const {
    inventory,
    isSynced,
    recommendContext,
    setRecommendContext,
    wineBriefContext,
    setWineBriefContext,
    handleAddToCellarFromChat,
    setSelectedWine,
  } = useInventory();

  return (
    <ChatInterface
      inventory={inventory}
      isSynced={isSynced}
      recommendContext={recommendContext}
      onRecommendContextConsumed={() => setRecommendContext(null)}
      wineBriefContext={wineBriefContext}
      onWineBriefContextConsumed={() => setWineBriefContext(null)}
      onAddToCellar={handleAddToCellarFromChat}
      onViewWine={setSelectedWine}
    />
  );
};

export default RemyPage;
