import React from 'react';
import { Wine } from '@/types';
import Dashboard from './Dashboard';

const PulseScreen: React.FC<{ inventory: Wine[] }> = ({ inventory }) => {
  return <Dashboard inventory={inventory} />;
};

export default PulseScreen;
