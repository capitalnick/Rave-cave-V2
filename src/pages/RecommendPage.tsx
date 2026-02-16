import React from 'react';
import RecommendScreen from '@/components/RecommendScreen';
import { useInventory } from '@/context/InventoryContext';

const RecommendPage: React.FC = () => {
  const {
    inventory,
    handleHandoffToRemy,
    handleAddToCellarFromRecommend,
    setSelectedWine,
  } = useInventory();

  return (
    <RecommendScreen
      inventory={inventory}
      onHandoffToRemy={handleHandoffToRemy}
      onAddToCellar={handleAddToCellarFromRecommend}
      onViewWine={setSelectedWine}
    />
  );
};

export default RecommendPage;
