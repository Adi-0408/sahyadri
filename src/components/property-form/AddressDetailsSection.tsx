import React from 'react';
import { MapPin, Building } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

export interface AddressDetailsSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  control: Control<any>;
  districts: { value: string; label: string }[];
  talukas: { value: string; label: string }[];
}

export const AddressDetailsSection: React.FC<AddressDetailsSectionProps> = ({
  register,
  errors,
  control,
  districts,
  talukas
}) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50 rounded-t-2xl">
        <div className="text-indigo-600">
          <MapPin className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.addressLocation')}</h3>
      </div>

      <div className="p-6 flex flex-col gap-5 text-left">
        <div className="grid grid-cols-2 gap-5">
          <Controller
            name="district"
            control={control}
            render={({ field }) => (
              <Select
                label={t('forms.district')}
                options={districts}
                {...field}
                error={errors.district?.message as string}
              />
            )}
          />

          <Controller
            name="taluka"
            control={control}
            render={({ field }) => (
              <Select
                label={t('forms.taluka')}
                options={talukas}
                {...field}
                error={errors.taluka?.message as string}
              />
            )}
          />
        </div>

        <Input
          icon={Building}
          label={t('forms.cityVillage')}
          placeholder={t('forms.cityVillagePlaceholder')}
          {...register('cityVillage')}
          error={errors.cityVillage?.message as string}
        />

        <Textarea
          label={t('forms.fullAddress')}
          placeholder={t('forms.fullAddressPlaceholder')}
          {...register('fullAddress')}
          error={errors.fullAddress?.message as string}
        />

      </div>
    </section>
  );
};
