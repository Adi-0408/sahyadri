import React from 'react';
import { Check } from 'lucide-react';

export interface MultiSelectChipsProps {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({ options, selected, onChange }) => {
  const toggleSelection = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleSelection(option.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium ${
              isSelected
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isSelected && <Check className="w-4 h-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
