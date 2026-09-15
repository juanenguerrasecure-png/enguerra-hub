import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ className = '', children, ...props }) => {
  return (
    <label
      className={`block text-xs font-semibold text-[#5B6169] mb-1 select-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`w-full min-h-[44px] px-3.5 py-2.5 bg-white border rounded-xl text-sm text-[#1C1E21] placeholder-[#8A8F98] transition-colors focus:outline-none focus:border-[#1C1E21] focus:ring-1 focus:ring-[#1C1E21] disabled:bg-[#F7F6F4] disabled:text-[#8A8F98] ${
            error ? 'border-[#E16F7C]' : 'border-[#E5E4E1]'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-[#E16F7C] mt-1 block">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
