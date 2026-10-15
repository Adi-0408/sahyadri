import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  isLoading = false,
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold tracking-wider transition-all duration-300 active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-primary hover:bg-primary-dark text-white shadow-sm hover:shadow": variant === 'primary',
            "bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:shadow": variant === 'secondary',
            "border border-slate-300 hover:border-slate-800 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs font-semibold": variant === 'outline' || variant === 'glass',
            "bg-transparent hover:bg-slate-100 text-slate-800 font-semibold": variant === 'ghost',
            "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow": variant === 'danger'
          }
        ),
        className
      )}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
