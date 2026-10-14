import React from 'react';
import { Settings, Armchair, Trees, Landmark, CarFront, Users } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';
import { ToggleSwitch } from '../ui/ToggleSwitch';

export interface AdditionalDetailsSectionProps {
  control: Control<any>;
  categoryType: string;
  transactionType: 'sale' | 'rent';
  facingOptions?: { value: string; label: string }[];
}

export const AdditionalDetailsSection: React.FC<AdditionalDetailsSectionProps> = ({
  control,
  categoryType: _categoryType,
  transactionType,
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
        <div className="text-emerald-700">
          <Settings className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.additionalDetails')}</h3>
      </div>

      <div className="p-6 flex flex-col gap-5 text-left">
        <Controller
          name="facingDirection"
          control={control}
          render={({ field }) => (
            <Select 
              label={t('forms.facingDirection')} 
              options={translatedFacingOptions} 
              {...field} 
            />
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="furnishingStatus"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ToggleSwitch
                icon={Armchair}
                label={t('forms.fullyFurnished')}
                description={t('forms.fullyFurnishedDesc')}
                checked={value === 'Furnished'}
                onChange={(checked) => onChange(checked ? 'Furnished' : 'Unfurnished')}
              />
            )}
          />

          <Controller
            name="garden"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ToggleSwitch
                icon={Trees}
                label={t('forms.privateGarden')}
                description={t('forms.privateGardenDesc')}
                checked={!!value}
                onChange={onChange}
              />
            )}
          />

          <Controller
            name="terrace"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ToggleSwitch
                icon={Landmark}
                label={t('forms.privateTerrace')}
                description={t('forms.privateTerraceDesc')}
                checked={!!value}
                onChange={onChange}
              />
            )}
          />

          <Controller
            name="carParking"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ToggleSwitch
                icon={CarFront}
                label={t('forms.reservedParking')}
                description={t('forms.reservedParkingDesc')}
                checked={!!value}
                onChange={onChange}
              />
            )}
          />

          {transactionType === 'rent' && (
            <Controller
              name="bachelorsAllowed"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ToggleSwitch
                  icon={Users}
                  label={t('forms.bachelorsAllowed')}
                  description={t('forms.bachelorsAllowedDesc')}
                  checked={!!value}
                  onChange={onChange}
                />
              )}
            />
          )}
        </div>
      </div>
    </section>
  );
};
