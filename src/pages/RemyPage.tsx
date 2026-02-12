import React from 'react';
import ChatInterface from '@/components/ChatInterface';
import { useInventory } from '@/context/InventoryContext';

const RemyPage: React.FC = () => {
  const {
    inventory,
    isSynced,
    recommendContext,
    setRecommendContext,
    handleAddToCellarFromChat,
  } = useInventory();

  return (
    <ChatInterface
      inventory={inventory}
      isSynced={isSynced}
      recommendContext={recommendContext}
      onRecommendContextConsumed={() => setRecommendContext(null)}
      onAddToCellar={handleAddToCellarFromChat}
    />
  );
};

export default RemyPage;
