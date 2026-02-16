import React from 'react';

interface ScanBottleIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const ScanBottleIcon: React.FC<ScanBottleIconProps> = ({ size = 30, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 30 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M3.75 8.75V6.25C3.75 5.58696 4.01339 4.95107 4.48223 4.48223C4.95107 4.01339 5.58696 3.75 6.25 3.75H8.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21.25 3.75H23.75C24.413 3.75 25.0489 4.01339 25.5178 4.48223C25.9866 4.95107 26.25 5.58696 26.25 6.25V8.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M26.25 21.25V23.75C26.25 24.413 25.9866 25.0489 25.5178 25.5178C25.0489 25.9866 24.413 26.25 23.75 26.25H21.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.75 26.25H6.25C5.58696 26.25 4.95107 25.9866 4.48223 25.5178C4.01339 25.0489 3.75 24.413 3.75 23.75V21.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <g clipPath="url(#scan-bottle-clip)">
      <path d="M13.5906 -1.72767C13.5906 -2.07458 13.6871 -2.40729 13.8588 -2.65259C14.0305 -2.8979 14.2634 -3.03571 14.5062 -3.03571H16.3375C16.5803 -3.03571 16.8132 -2.8979 16.9849 -2.65259C17.1567 -2.40729 17.2531 -2.07458 17.2531 -1.72767V0.888402C17.2531 2.58652 17.6387 4.23883 18.3519 5.59733L18.9012 6.64376C19.6145 8.00225 20 9.65457 20 11.3527V21.817C20 22.1639 19.9035 22.4966 19.7318 22.7419C19.5601 22.9872 19.3272 23.125 19.0844 23.125H11.7594C11.5165 23.125 11.2836 22.9872 11.1119 22.7419C10.9402 22.4966 10.8438 22.1639 10.8438 21.817V11.3527C10.8438 9.65457 11.2293 8.00225 11.9425 6.64376L12.4919 5.59733C13.2051 4.23883 13.5906 2.58652 13.5906 0.888402V-1.72767Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 12.6607H10.8438V19.2009H20V12.6607Z" stroke="currentColor" strokeWidth="2"/>
    </g>
    <defs>
      <clipPath id="scan-bottle-clip">
        <rect width="14.375" height="20" fill="white" transform="translate(8.125 5)"/>
      </clipPath>
    </defs>
  </svg>
);
