import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: (SelectOption | string)[];
  error?: string;
  icon?: React.ElementType;
  value?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, icon: Icon, value, onChange, placeholder, disabled, name, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);

    // Combine forwarded ref and local ref
    React.useImperativeHandle(ref, () => selectRef.current!);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const normalizedOptions: SelectOption[] = React.useMemo(() => {
      return (options || []).map((opt) =>
        typeof opt === 'string' || typeof opt === 'number'
          ? { value: String(opt), label: String(opt) }
          : { value: String(opt.value), label: opt.label }
      );
    }, [options]);

    const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));
    
    // Fallback display text
    const displayText = selectedOption 
      ? selectedOption.label 
      : (placeholder || (normalizedOptions.length > 0 ? normalizedOptions[0].label : 'Select...'));

    const handleOptionClick = (opt: SelectOption) => {
      if (disabled) return;
      
      if (selectRef.current) {
        // Update the value of the native select element
        selectRef.current.value = String(opt.value);
        // Dispatch a native change event for compatibility with libraries like React Hook Form
        const event = new Event('change', { bubbles: true });
        selectRef.current.dispatchEvent(event);
      }

      if (onChange) {
        const simulatedEvent = {
          target: {
            name: name || '',
            value: String(opt.value),
          },
          currentTarget: {
            name: name || '',
            value: String(opt.value),
          }
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(simulatedEvent);
      }
      setIsOpen(false);
    };

    return (
      <div 
        ref={containerRef} 
        className={twMerge(
          "w-full max-w-full flex flex-col gap-1.5 text-left relative transition-all duration-100", 
          isOpen ? "z-50" : "z-10"
        )}
      >
        {/* Hidden select for standard HTML form/ref support */}
        <select
          ref={selectRef}
          name={name}
          value={value}
          onChange={onChange || (() => {})}
          disabled={disabled}
          className="sr-only"
          {...props}
        >
          {normalizedOptions.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {label && (
          <label className="text-xs uppercase tracking-widest font-bold text-slate-700">
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {Icon && (
            <div className="absolute left-4 text-slate-400 flex items-center justify-center pointer-events-none z-10">
              <Icon className="w-5 h-5" />
            </div>
          )}
          
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            title={displayText}
            className={twMerge(
              clsx(
                "w-full min-w-0 rounded-xl bg-white border border-slate-200 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary transition-all duration-300 flex items-center justify-between text-left font-semibold cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-xs",
                { 
                  "border-yellow-400 bg-yellow-50/50 focus:border-yellow-500": !!error,
                  "pl-12 pr-10": !!Icon,
                  "px-4 pr-10": !Icon,
                  "border-primary ring-2 ring-primary/10": isOpen && !error
                }
              ),
              className
            )}
          >
            <span className="truncate pr-2">{displayText}</span>
            <div className="absolute right-4 pointer-events-none text-slate-400 flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={twMerge("transition-transform duration-200", isOpen && "rotate-180 text-slate-800")}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </button>

          {/* Styled Dropdown List matching theme */}
          {isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 min-w-full">
              {normalizedOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 font-medium">No options available</div>
              ) : (
                normalizedOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleOptionClick(opt)}
                      className={twMerge(
                        "w-full text-left px-4 py-3 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-between gap-3",
                        isSelected
                          ? "bg-slate-900 text-white font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span className="text-left whitespace-normal break-words leading-snug flex-1">{opt.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
