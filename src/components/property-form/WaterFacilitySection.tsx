import React from 'react';
import { Droplet, Compass, Check } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';

export interface WaterFacilitySectionProps {
  control: Control<any>;
  watch: any;
  setValue: any;
  facingOptions?: { value: string; label: string }[];
  categoryType?: string;
  hideFacing?: boolean;
}

export const WaterFacilitySection: React.FC<WaterFacilitySectionProps> = ({
  control,
  watch,
  setValue,
  facingOptions = [
    { value: 'East', label: 'East' },
    { value: 'West', label: 'West' },
    { value: 'North', label: 'North' },
    { value: 'South', label: 'South' }
  ],
  categoryType,
  hideFacing = false
}) => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  const isHouseType = categoryType?.toLowerCase() === 'house' || categoryType?.toLowerCase() === 'bungalow' || categoryType?.toLowerCase() === 'flat';

  const houseWaterSources = [
    { value: 'Municipal Water', label: t('waterSource.municipal', 'Municipal Tap Line') },
    { value: 'Borewell', label: t('waterSource.borewell', 'Borewell') },
    { value: 'Well', label: t('waterSource.well', 'Well / Open Well') },
    { value: 'Both', label: isMr ? 'दोन्ही (नळ + बोअरवेल)' : 'Both (Municipal + Borewell)' },
    { value: '24x7 Supply', label: isMr ? '२४ तास पाण्याची सोय' : '24x7 Water Supply' },
    { value: 'River', label: t('waterSource.river', 'River Water Intake') },
    { value: 'Other', label: t('waterSource.other', 'Other Water Source') }
  ];

  const landWaterSources = [
    { value: 'River', label: t('waterSource.river', 'River Water Intake') },
    { value: 'Well', label: t('waterSource.well', 'Well / Open Well') },
    { value: 'Borewell', label: t('waterSource.borewell', 'Borewell') },
    { value: 'Canal', label: t('waterSource.canal', 'Irrigation Canal') },
    { value: 'Municipal Water', label: t('waterSource.municipal', 'Municipal Tap Line') },
    { value: 'Other', label: t('waterSource.other', 'Other Water Source') }
  ];

  const waterSources = isHouseType ? houseWaterSources : landWaterSources;

  const translatedFacingOptions = facingOptions.map((opt) => ({
    value: opt.value,
    label: t(`facing.${opt.value.toLowerCase()}`, opt.label)
  }));

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50 rounded-t-2xl">
        <div className="text-emerald-600">
          <Droplet className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">
          {t('forms.waterSourceAvailable') || 'Water Facility Available'}
        </h3>
      </div>

      <div className="p-6 flex flex-col gap-6 text-left">
        {/* Water Facility Available Pills */}
        <div className="w-full flex flex-col gap-2.5 text-left">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
            {t('forms.waterSourceAvailable') || 'Water Facility Available'}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {waterSources.map((item) => {
              const currentSource = watch('waterSourceType');
              const isAvailable = watch('waterSourceAvailable') === true || watch('waterSupply') === true;
              const isActive = isAvailable && (
                currentSource === item.value ||
                (item.value === 'Municipal Water' && (currentSource === 'Municipal Corporation' || currentSource === 'Municipal Water'))
              );
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setValue('waterSourceType', '');
                      setValue('waterSourceAvailable', false);
                      setValue('waterSupply', false);
                    } else {
                      setValue('waterSourceType', item.value);
                      setValue('waterSourceAvailable', true);
                      setValue('waterSupply', true);
                    }
                  }}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#111c2e]/10 border-[#111c2e] text-[#111c2e] font-bold shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {isActive && <Check className="w-4 h-4 text-[#111c2e]" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Facing Direction Select */}
        {!hideFacing && (
          <Controller
            name="facingDirection"
            control={control}
            render={({ field }) => (
              <Select
                label={t('forms.facingDirection') || 'Facing Direction'}
                icon={Compass}
                options={translatedFacingOptions}
                {...field}
              />
            )}
          />
        )}
      </div>
    </section>
  );
};
