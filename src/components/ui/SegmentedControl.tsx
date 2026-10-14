import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => {
  return (
    <div className="flex p-1 bg-slate-100 rounded-xl relative w-full sm:w-auto">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative flex-1 py-3 px-6 text-sm font-semibold rounded-lg z-10 transition-colors ${
              isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-control-active"
                className="absolute inset-0 bg-primary rounded-lg shadow-md -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
