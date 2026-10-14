import React from 'react';
import { Compass } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';

export interface FacingDetailsSectionProps {
  control: Control<any>;
  facingOptions?: { value: string; label: string }[];
}

export const FacingDetailsSection: React.FC<FacingDetailsSectionProps> = ({
  control,
  facingOptions = [
    { value: 'East', label: 'East' },
    { value: 'West', label: 'West' },
    { value: 'North', label: 'North' },
    { value: 'South', label: 'South' }
  ]
}) => {
  const { t } = useTranslation();

  const translatedFacingOptions = facingOptions.map((opt) => ({
    value: opt.value,
    label: t(`facing.${opt.value.toLowerCase()}`, opt.label)
  }));

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50 rounded-t-2xl">
        <div className="text-blue-600">
          <Compass className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.facingDetails')}</h3>
      </div>

      <div className="p-6 text-left">
        <Controller
          name="facingDirection"
          control={control}
          render={({ field }) => (
            <Select
              label={t('forms.facingDirection')}
              icon={Compass}
              options={translatedFacingOptions}
              {...field}
            />
          )}
        />
      </div>
    </section>
  );
};
