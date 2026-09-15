import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  let sideClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
  if (side === 'bottom') sideClasses = 'top-full left-1/2 -translate-x-1/2 mt-2';
  if (side === 'left') sideClasses = 'right-full top-1/2 -translate-y-1/2 mr-2';
  if (side === 'right') sideClasses = 'left-full top-1/2 -translate-y-1/2 ml-2';

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1 text-[11px] font-medium text-white bg-[#1C1E21] rounded-lg shadow-sm whitespace-nowrap pointer-events-none transition-opacity ${sideClasses}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export interface ToastProps {
  message: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  let borderColor = 'border-[#E5E4E1]';
  let dotColor = 'bg-[#3A80DE]';

  if (type === 'success') {
    borderColor = 'border-[#3F9D68]/40';
    dotColor = 'bg-[#3F9D68]';
  } else if (type === 'warning') {
    borderColor = 'border-[#D9962A]/40';
    dotColor = 'bg-[#D9962A]';
  } else if (type === 'danger') {
    borderColor = 'border-[#E16F7C]/40';
    dotColor = 'bg-[#E16F7C]';
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white border ${borderColor} rounded-[16px] shadow-sm px-4 py-3 flex items-center space-x-3 text-sm text-[#1C1E21]`}>
      <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
      <span className="font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#8A8F98] hover:text-[#1C1E21] text-xs font-bold pl-2"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};
