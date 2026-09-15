import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = 'max-w-md';
  if (maxWidth === 'sm') widthClass = 'max-w-sm';
  if (maxWidth === 'lg') widthClass = 'max-w-lg';
  if (maxWidth === 'xl') widthClass = 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1E21]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full ${widthClass} bg-white rounded-[20px] sm:rounded-[24px] border border-[#E5E4E1] shadow-lg p-6 relative overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E5E4E1] mb-5">
          <div>
            {title && <h2 className="text-lg font-bold text-[#1C1E21] tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-[#5B6169] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8A8F98] hover:text-[#1C1E21] hover:bg-[#F7F6F4] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-[#1C1E21]">{children}</div>
      </div>
    </div>
  );
};

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  side?: 'right' | 'bottom';
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
}) => {
  if (!isOpen) return null;

  const isBottom = side === 'bottom';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1C1E21]/50 backdrop-blur-xs">
      <div
        className={`bg-white border-[#E5E4E1] shadow-xl p-6 flex flex-col transition-transform ${
          isBottom
            ? 'w-full max-h-[85vh] rounded-t-[24px] border-t self-end'
            : 'w-full max-w-md h-full border-l rounded-l-[24px]'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E4E1] mb-4">
          <h2 className="text-base font-bold text-[#1C1E21]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8A8F98] hover:text-[#1C1E21] hover:bg-[#F7F6F4]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
