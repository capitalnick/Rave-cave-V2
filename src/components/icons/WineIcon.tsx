import React from 'react';

interface WineIconProps {
  size?: number;
  className?: string;
}

const WineIcon: React.FC<WineIconProps> = ({ size = 32, className = 'text-[var(--rc-accent-pink)]' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={className}
  >
    <path d="M9 2h6v7c0 3.5-2.5 6-6 6s-6-2.5-6-6V2m0 13h12M7 22h10" />
  </svg>
);

export default WineIcon;
