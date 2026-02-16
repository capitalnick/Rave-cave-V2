import React from 'react';
import { Heading, MonoLabel } from '@/components/rc';
import WineIcon from '@/components/icons/WineIcon';

const SettingsPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-10 h-full overflow-y-auto">
      <div className="space-y-2 mb-10">
        <div className="flex items-center gap-3">
          <WineIcon size={28} />
          <Heading scale="hero">SETTINGS</Heading>
        </div>
        <MonoLabel size="label" colour="ghost">Coming soon</MonoLabel>
      </div>
    </div>
  );
};

export default SettingsPage;
