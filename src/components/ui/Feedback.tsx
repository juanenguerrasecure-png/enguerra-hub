import React from 'react';
import { Loader2, Inbox } from 'lucide-react';
import { ENGUERRA_COLORS } from '../../lib/tokens';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center rounded-[16px] border border-dashed border-[#E5E4E1] bg-white ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#F7F6F4] text-[#8A8F98] flex items-center justify-center mx-auto mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-bold text-[#1C1E21] tracking-tight">{title}</h3>
      {description && (
        <p className="text-xs text-[#5B6169] max-w-sm mx-auto mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`p-10 flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="w-6 h-6 text-[#245F83] animate-spin mb-3" />
      <p className="text-xs font-medium text-[#5B6169]">{message}</p>
    </div>
  );
};

export interface ModuleTileProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  moduleColor: keyof typeof ENGUERRA_COLORS;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export const ModuleTile: React.FC<ModuleTileProps> = ({
  title,
  description,
  icon,
  moduleColor,
  badge,
  onClick,
  className = '',
}) => {
  const accentColor = ENGUERRA_COLORS[moduleColor] || ENGUERRA_COLORS.today;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[16px] border border-[#E5E4E1] p-5 shadow-xs hover:border-[#8A8F98] transition-all cursor-pointer select-none group ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
        {badge && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              color: accentColor,
              backgroundColor: `${accentColor}10`,
              borderColor: `${accentColor}30`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-[#1C1E21] tracking-tight">{title}</h3>
      {description && <p className="text-xs text-[#5B6169] mt-1 leading-relaxed">{description}</p>}
    </div>
  );
};

export interface StatusChipProps {
  label: string;
  variant?: 'today' | 'calendar' | 'tasks' | 'family' | 'shopping' | 'messages' | 'meals' | 'documents' | 'more' | 'neutral';
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, variant = 'neutral', className = '' }) => {
  let color = '#5B6169';
  let bg = '#F7F6F4';
  let border = '#E5E4E1';

  if (variant !== 'neutral' && ENGUERRA_COLORS[variant]) {
    color = ENGUERRA_COLORS[variant];
    bg = `${color}14`;
    border = `${color}30`;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${className}`}
      style={{ color, backgroundColor: bg, borderColor: border }}
    >
      {label}
    </span>
  );
};
