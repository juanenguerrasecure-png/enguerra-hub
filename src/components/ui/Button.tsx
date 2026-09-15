import React from 'react';
import { ENGUERRA_COLORS } from '../../lib/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'touchAdult' | 'touchKids' | 'touchHub';
  moduleColor?: keyof typeof ENGUERRA_COLORS;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', moduleColor, className = '', children, ...props }, ref) => {
    // Base styles: minimal shadow, refined transitions, typography
    let baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all select-none disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

    // Touch sizing adherence:
    // Adult mobile >= 44px
    // Kids >= 48px
    // Hub >= 56px
    let sizeStyles = 'h-10 px-4 text-sm';
    if (size === 'sm') sizeStyles = 'h-8 px-3 text-xs';
    if (size === 'lg') sizeStyles = 'h-12 px-5 text-base';
    if (size === 'touchAdult') sizeStyles = 'min-h-[44px] min-w-[44px] px-4 text-sm';
    if (size === 'touchKids') sizeStyles = 'min-h-[48px] min-w-[48px] px-5 text-base font-bold rounded-2xl';
    if (size === 'touchHub') sizeStyles = 'min-h-[56px] min-w-[56px] px-6 text-lg font-bold rounded-2xl';

    let variantStyles = '';
    let customStyle: React.CSSProperties = {};

    if (variant === 'primary') {
      if (moduleColor && ENGUERRA_COLORS[moduleColor]) {
        customStyle = { backgroundColor: ENGUERRA_COLORS[moduleColor], color: '#FFFFFF' };
        variantStyles = 'hover:opacity-95 shadow-xs text-white';
      } else {
        variantStyles = 'bg-[#1C1E21] text-white hover:bg-[#2C3036] shadow-xs';
      }
    } else if (variant === 'secondary') {
      variantStyles = 'bg-white text-[#1C1E21] border border-[#E5E4E1] hover:bg-[#F7F6F4] shadow-xs';
    } else if (variant === 'outline') {
      variantStyles = 'bg-transparent text-[#1C1E21] border border-[#E5E4E1] hover:bg-[#F7F6F4]';
    } else if (variant === 'ghost') {
      variantStyles = 'bg-transparent text-[#5B6169] hover:text-[#1C1E21] hover:bg-[#E5E4E1]/40';
    } else if (variant === 'danger') {
      variantStyles = 'bg-[#E16F7C] text-white hover:opacity-95 shadow-xs';
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        style={customStyle}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
