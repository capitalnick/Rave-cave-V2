import React from 'react';
import RecommendScreen from '@/components/RecommendScreen';
import { useInventory } from '@/context/InventoryContext';

const RecommendPage: React.FC = () => {
  const {
    inventory,
    handleHandoffToRemy,
    handleAddToCellarFromRecommend,
  } = useInventory();

  return (
    <RecommendScreen
      inventory={inventory}
      onHandoffToRemy={handleHandoffToRemy}
      onAddToCellar={handleAddToCellarFromRecommend}
    />
  );
};

export default RecommendPage;
