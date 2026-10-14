import React, { useState, useEffect } from 'react';
import { LayoutGrid, Compass, Zap, ShieldAlert } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { fetchCollection } from '../../services/firebase';

export interface LandDetailsSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  control: Control<any>;
}

export const LandDetailsSection: React.FC<LandDetailsSectionProps> = ({
  register,
  errors,
  control
}) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const data = await fetchCollection('cms_fields');
        // Sort by order ascending
        const sorted = data.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        setFields(sorted.filter((f: any) => f.isVisible));
      } catch (err) {
        console.error("Failed to load cms fields:", err);
        // Fallback fields in correct default order
        setFields([
          { id: 'builtUpArea', label: 'Land Area Size', isVisible: true, order: 0, isRequired: true },
          { id: 'landType', label: 'Land Type', isVisible: true, order: 1, isRequired: true },
          { id: 'fencingAvailable', label: 'Fencing Available', isVisible: true, order: 3, isRequired: false },
          { id: 'electricityConnection', label: 'Electricity Connection', isVisible: true, order: 4, isRequired: false }
        ]);
      }
    };
    loadFields();
  }, []);

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/50 border-b border-slate-100 rounded-t-3xl">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-wide">{t('forms.landDetails')}</h3>
          <p className="text-xs text-slate-500">{t('forms.landDetailsDesc')}</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-6 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {fields.map((field) => {
            if (field.id === 'builtUpArea') {
              return (
                <Input
                  key="builtUpArea"
                  icon={LayoutGrid}
                  label={field.label || t('forms.landAreaSize')}
                  type="number"
                  placeholder={t('forms.landAreaSizePlaceholder')}
                  {...register('builtUpArea', { valueAsNumber: true })}
                  error={errors.builtUpArea?.message as string}
                />
              );
            }
            if (field.id === 'landType') {
              return (
                <Controller
                  key="landType"
                  name="landType"
                  control={control}
                  render={({ field: selectField }) => (
                    <Select
                      label={field.label || t('forms.landType')}
                      icon={Compass}
                      options={[
                        { value: 'Agricultural', label: t('landType.agricultural') },
                        { value: 'Non-Agricultural', label: t('landType.na') },
                        { value: 'Commercial', label: t('landType.commercial') },
                        { value: 'Industrial', label: t('landType.industrial') }
                      ]}
                      {...selectField}
                    />
                  )}
                />
              );
            }
            if (field.id === 'fencingAvailable') {
              return (
                <Controller
                  key="fencingAvailable"
                  name="fencingAvailable"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <ToggleSwitch
                      icon={ShieldAlert}
                      label={field.label || t('forms.fencingAvailable')}
                      description={t('forms.fencingDesc')}
                      checked={!!value}
                      onChange={onChange}
                    />
                  )}
                />
              );
            }
            if (field.id === 'electricityConnection') {
              return (
                <Controller
                  key="electricityConnection"
                  name="electricityConnection"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <ToggleSwitch
                      icon={Zap}
                      label={field.label || t('forms.electricityConnection')}
                      description={t('forms.electricityConnectionDesc')}
                      checked={!!value}
                      onChange={onChange}
                    />
                  )}
                />
              );
            }
            return null;
          })}
        </div>
      </div>
    </section>
  );
};
