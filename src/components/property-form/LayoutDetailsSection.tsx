import React from 'react';
import { LayoutGrid, Bed, Bath, Layers, Calendar } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';

export interface LayoutDetailsSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  categoryType: string;
}

export const LayoutDetailsSection: React.FC<LayoutDetailsSectionProps> = ({
  register,
  errors,
  categoryType
}) => {
  const { t } = useTranslation();
  const isPlotOrLand = categoryType?.toLowerCase() === 'plot' || categoryType?.toLowerCase() === 'land';
  const isFlat = categoryType?.toLowerCase() === 'flat';
  const isCommercial = categoryType?.toLowerCase() === 'commercial';

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50">
        <div className="text-amber-700">
          <LayoutGrid className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.layoutAreaDetails')}</h3>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
        {/* Built-up Area is required for all property types */}
        <div className="col-span-1">
          <Input
            icon={LayoutGrid}
            label={t('forms.areaSize')}
            type="number"
            placeholder={t('forms.areaSizePlaceholder')}
            {...register('builtUpArea', { valueAsNumber: true })}
            error={errors.builtUpArea?.message as string}
          />
        </div>

        {!isPlotOrLand && (
          <>
            <div className="col-span-1">
              <Input
                icon={LayoutGrid}
                label={t('forms.totalRooms')}
                type="number"
                placeholder={t('forms.totalRoomsPlaceholder')}
                {...register('totalRooms', { valueAsNumber: true })}
                error={errors.totalRooms?.message as string}
              />
            </div>

            {!isCommercial && (
              <>
                <div className="col-span-1">
                  <Input
                    icon={Bed}
                    label={t('forms.bedrooms')}
                    type="number"
                    placeholder={t('forms.bedroomsPlaceholder')}
                    {...register('bedrooms', { valueAsNumber: true })}
                    error={errors.bedrooms?.message as string}
                  />
                </div>

                <div className="col-span-1">
                  <Input
                    icon={Bath}
                    label={t('forms.bathrooms')}
                    type="number"
                    placeholder={t('forms.bathroomsPlaceholder')}
                    {...register('bathrooms', { valueAsNumber: true })}
                    error={errors.bathrooms?.message as string}
                  />
                </div>
              </>
            )}

            {isFlat && (
              <div className="col-span-1">
                <Input
                  icon={Layers}
                  label={t('forms.floorNumber')}
                  type="number"
                  placeholder={t('forms.floorNumberPlaceholder')}
                  {...register('floorNumber', { valueAsNumber: true })}
                  error={errors.floorNumber?.message as string}
                />
              </div>
            )}

            <div className="col-span-1">
              <Input
                icon={Layers}
                label={isFlat ? t('forms.totalFloorsInBuilding') : t('forms.totalFloors')}
                type="number"
                placeholder={t('forms.totalFloorsPlaceholder')}
                {...register('totalFloors', { valueAsNumber: true })}
                error={errors.totalFloors?.message as string}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <Input
                icon={Calendar}
                label={t('forms.yearBuilt')}
                type="number"
                placeholder={t('forms.yearBuiltPlaceholder')}
                {...register('yearBuilt', { valueAsNumber: true })}
                error={errors.yearBuilt?.message as string}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
};
