import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, suffix, type = 'text', maxLength, inputMode, onChange, onKeyDown, ...props }, ref) => {
    const isTel = type === 'tel';
    const effectiveMaxLength = isTel ? (maxLength ?? 10) : maxLength;
    const effectiveInputMode = isTel ? (inputMode ?? 'numeric') : inputMode;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isTel) {
        // Allow mobile virtual keyboard events
        if (e.key === 'Unidentified' || e.keyCode === 229) {
          onKeyDown?.(e);
          return;
        }

        // Allow navigation, deletion, copy/paste shortcuts
        const isControlKey =
          e.key === 'Backspace' ||
          e.key === 'Delete' ||
          e.key === 'Tab' ||
          e.key === 'Escape' ||
          e.key === 'Enter' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'Home' ||
          e.key === 'End' ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey;

        if (isControlKey) {
          onKeyDown?.(e);
          return;
        }

        // Only allow single digit 0-9
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        // Prevent typing more than effectiveMaxLength if no text is selected
        const target = e.currentTarget;
        const selectedLength = (target.selectionEnd ?? 0) - (target.selectionStart ?? 0);
        if (effectiveMaxLength && target.value.length >= effectiveMaxLength && selectedLength === 0) {
          e.preventDefault();
          return;
        }
      }

      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isTel) {
        let val = e.target.value.replace(/\D/g, '');
        // If pasted with country code +91 or leading 0 when length exceeds 10
        if (val.length > (effectiveMaxLength ?? 10)) {
          if (val.startsWith('91') && val.length === 12) {
            val = val.slice(2);
          } else if (val.startsWith('0') && val.length === 11) {
            val = val.slice(1);
          }
        }
        e.target.value = val.slice(0, effectiveMaxLength ?? 10);
      }
      onChange?.(e);
    };

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label className="text-xs uppercase tracking-wider font-bold text-slate-800">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-4 text-slate-500 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <input
            type={type}
            ref={ref}
            maxLength={effectiveMaxLength}
            inputMode={effectiveInputMode}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            className={twMerge(
              clsx(
                "w-full rounded-xl bg-white border border-slate-300 hover:border-slate-400 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all duration-200",
                { 
                  "border-yellow-400 bg-yellow-50/50 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500": !!error,
                  "pl-12": !!Icon,
                  "pl-4": !Icon,
                  "pr-24": !!suffix,
                  "pr-4": !suffix
                }
              ),
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-4 text-xs font-semibold text-slate-500 flex items-center justify-center">
              {suffix}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
