import React from 'react';
import WineIcon from '@/components/icons/WineIcon';
import { Heading, MonoLabel } from './typography';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => (
  <div>
    <WineIcon
      size={28}
      className="float-left mr-3 mt-[0.15em] text-[var(--rc-accent-pink)]"
    />
    <Heading scale="hero">{title}</Heading>
    <MonoLabel size="label" colour="ghost" className="clear-left pt-2">
      {subtitle}
    </MonoLabel>
  </div>
);

export { PageHeader };
