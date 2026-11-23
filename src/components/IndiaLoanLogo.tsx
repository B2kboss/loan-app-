import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const IndiaLoanLogo: React.FC<LogoProps> = ({ variant = 'light', size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ilRing" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id="ilCore" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#071A4B" />
            <stop offset="100%" stopColor="#155EEF" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="url(#ilCore)" />
        <circle
          cx="32"
          cy="32"
          r="23"
          stroke="url(#ilRing)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="118 26"
        />
        <path
          d="M24 22H40M24 29H40M32 22C35.8 22 38 24.4 38 27.5C38 30.8 35.6 33 31.2 33H24.5L36.5 45"
          stroke="#FFFFFF"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`font-display font-bold tracking-tight ${textSize} ${
          variant === 'light' ? 'text-white' : 'text-[#0A215C]'
        }`}
      >
        India Loan
      </span>
    </span>
  );
};
