import React from 'react';
import WineIcon from '@/components/icons/WineIcon';
import { Heading, MonoLabel } from './typography';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => (
  <div>
    <div className="float-left mr-3 mt-[0.25em] w-10 h-10 md:hidden">
      <WineIcon size={56} className="w-full h-full text-[var(--rc-accent-pink)]" />
    </div>
    <Heading scale="hero">{title}</Heading>
    <MonoLabel size="label" colour="ghost" className="clear-left pt-2">
      {subtitle}
    </MonoLabel>
  </div>
);

export { PageHeader };
