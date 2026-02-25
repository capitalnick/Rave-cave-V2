import React from 'react';
import RecommendScreen from '@/components/RecommendScreen';
import { useInventory } from '@/context/InventoryContext';

const RecommendPage: React.FC = () => {
  const {
    inventory,
    handleHandoffToRemy,
    handleAddToCellarFromRecommend,
    handleUpdate,
    setSelectedWine,
    recommendResetKey,
  } = useInventory();

  return (
    <RecommendScreen
      inventory={inventory}
      resetKey={recommendResetKey}
      onHandoffToRemy={handleHandoffToRemy}
      onAddToCellar={handleAddToCellarFromRecommend}
      onViewWine={setSelectedWine}
      onUpdateWine={handleUpdate}
    />
  );
};

export default RecommendPage;
