import React from 'react';
import { Heading, MonoLabel } from '@/components/rc';

const SettingsPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-10 h-full overflow-y-auto">
      <div className="space-y-2 mb-10">
        <Heading scale="display">Settings</Heading>
        <MonoLabel size="micro" colour="ghost">Coming soon</MonoLabel>
      </div>
    </div>
  );
};

export default SettingsPage;
