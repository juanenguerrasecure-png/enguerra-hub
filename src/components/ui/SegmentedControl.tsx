import React from 'react';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'touchAdult' | 'touchKids';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  let containerPadding = 'p-1 rounded-xl';
  let buttonPadding = 'px-3 py-1.5 text-xs';

  if (size === 'sm') {
    containerPadding = 'p-0.5 rounded-lg';
    buttonPadding = 'px-2 py-1 text-[11px]';
  } else if (size === 'touchAdult') {
    containerPadding = 'p-1.5 rounded-2xl';
    buttonPadding = 'min-h-[44px] px-4 text-sm';
  } else if (size === 'touchKids') {
    containerPadding = 'p-2 rounded-2xl';
    buttonPadding = 'min-h-[48px] px-5 text-base font-bold';
  }

  return (
    <div className={`inline-flex items-center bg-[#F7F6F4] border border-[#E5E4E1] ${containerPadding} ${className}`}>
      {options.map(opt => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex items-center justify-center space-x-1.5 font-medium rounded-lg transition-all select-none ${buttonPadding} ${
              isActive
                ? 'bg-white text-[#1C1E21] shadow-xs font-semibold'
                : 'text-[#5B6169] hover:text-[#1C1E21] hover:bg-white/50'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive ? 'bg-[#1C1E21] text-white' : 'bg-[#E5E4E1] text-[#5B6169]'
              }`}>
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
