import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero' | 'interactive' | 'flat';
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    // Radius rules:
    // Standard card: 16px (rounded-[16px])
    // Hero / large panels: 20-24px (rounded-[20px] sm:rounded-[24px])
    // Minimal shadow: shadow-xs or shadow-none
    let base = 'bg-white border border-[#E5E4E1] transition-all text-[#1C1E21]';
    let variantStyles = 'rounded-[16px] shadow-xs p-5';

    if (variant === 'hero') {
      variantStyles = 'rounded-[20px] sm:rounded-[24px] shadow-xs p-6 sm:p-8';
    } else if (variant === 'interactive') {
      variantStyles = 'rounded-[16px] shadow-xs hover:border-[#8A8F98] hover:shadow-sm cursor-pointer p-5';
    } else if (variant === 'flat') {
      variantStyles = 'rounded-[16px] p-5';
    }

    return (
      <div
        ref={ref}
        className={`${base} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
