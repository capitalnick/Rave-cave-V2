import React from 'react';
import ChatInterface from '@/components/ChatInterface';
import { useInventory } from '@/context/InventoryContext';
import { useProfile } from '@/context/ProfileContext';
import UpgradePrompt from '@/components/UpgradePrompt';

const RemyPage: React.FC = () => {
  const { isPremium } = useProfile();
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

  if (!isPremium) {
    return <UpgradePrompt variant="fullscreen" feature="remy" />;
  }

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
