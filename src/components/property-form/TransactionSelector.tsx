import React from 'react';
import { motion } from 'framer-motion';
import { Tag, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TransactionSelectorProps {
  value: 'sale' | 'rent';
  onChange: (value: 'sale' | 'rent') => void;
  categoryType?: string;
}

export const TransactionSelector: React.FC<TransactionSelectorProps> = ({ value, onChange, categoryType = 'Bungalow' }) => {
  const { t } = useTranslation();
  const categoryKey = categoryType.toLowerCase();
  const translatedCategory = t(`categories.${categoryKey}`, categoryType);

  const options = [
    { label: t('forms.sellCategory', { category: translatedCategory }), value: 'sale', icon: Tag, desc: t('forms.sellCategoryDesc') },
    { label: t('forms.rentCategory', { category: translatedCategory }), value: 'rent', icon: Key, desc: t('forms.rentCategoryDesc') }
  ] as const;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex p-1.5 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
        {options.map((option) => {
          const isActive = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 text-sm font-bold rounded-xl z-10 transition-colors cursor-pointer ${
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="transaction-active-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              {option.label}
            </button>
          );
        })}
      </div>

    </div>
  );
};
