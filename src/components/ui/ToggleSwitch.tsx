import React from 'react';
import { motion } from 'framer-motion';

export interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  icon?: React.ElementType;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange, description, icon: Icon }) => {
  return (
    <div 
      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {Icon && (
          <div className="p-2 bg-slate-100 rounded-lg text-slate-800 flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-black break-words">{label}</span>
          {description && (
            <span className="text-xs text-slate-700 mt-0.5 pr-2 sm:pr-4 leading-relaxed break-words">{description}</span>
          )}
        </div>
      </div>
      
      <div 
        className={`w-12 h-6 flex-shrink-0 flex items-center rounded-full p-1 transition-colors ${
          checked ? 'bg-primary' : 'bg-slate-200'
        }`}
      >
        <motion.div 
          className="bg-white w-4 h-4 rounded-full shadow-sm"
          layout
          initial={false}
          animate={{
            x: checked ? 24 : 0
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );
};
