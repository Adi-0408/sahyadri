import React from 'react';
import { LayoutGrid, Compass, ShieldAlert, Columns, Hammer, GitFork, CheckCircle, XCircle } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ToggleSwitch } from '../ui/ToggleSwitch';

export interface PlotDetailsSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  control: Control<any>;
  watch: any;
}

export const PlotDetailsSection: React.FC<PlotDetailsSectionProps> = ({
  register,
  errors,
  control,
  watch
}) => {
  const { t, i18n } = useTranslation();
  const areaType = watch('areaType') || 'sqft';


  const areaLabel = areaType === 'sqft'
    ? `${t('forms.areaSizeLabel', 'क्षेत्रफळ')} (${t('forms.sqftLabel', 'चौरस फूट')}) *`
    : `${t('forms.areaSizeLabel', 'क्षेत्रफळ')} (${t('forms.guthevariLabel', 'गुंठा')}) *`;

  const areaSuffix = areaType === 'sqft'
    ? t('forms.sqftLabel', 'चौरस फूट')
    : t('forms.guthevariLabel', 'गुंठा');

  const areaPlaceholder = areaType === 'sqft'
    ? (t('forms.areaSizePlaceholder') || (i18n.language?.startsWith('mr') ? "उदा. 1200" : "e.g. 1200"))
    : (t('forms.gunthaPlaceholder') || (i18n.language?.startsWith('mr') ? "उदा. ५" : "e.g. 5"));

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50 rounded-t-2xl">
        <div className="text-emerald-600">
          <LayoutGrid className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.layoutDetails')}</h3>
      </div>

      <div className="p-6 flex flex-col gap-6 text-left">
        {/* Area Type Selector (Segmented Control style) */}
        <Controller
          name="areaType"
          control={control}
          render={({ field: { value, onChange } }) => (
            <div className="w-full flex flex-col gap-2 text-left">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                {t('forms.areaType', 'क्षेत्रफळ प्रकार')}
              </label>
              <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                <button
                  type="button"
                  onClick={() => onChange('sqft')}
                  className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    value === 'sqft'
                      ? 'bg-[#111c2e] text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('forms.sqftLabel', 'चौरस फूट')}
                </button>
                <button
                  type="button"
                  onClick={() => onChange('guthevari')}
                  className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    value === 'guthevari'
                      ? 'bg-[#111c2e] text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('forms.guthevariLabel', 'गुंठा')}
                </button>
              </div>
            </div>
          )}
        />

        {/* Dynamic Area Size Input */}
        <Input
          label={areaLabel}
          type="number"
          placeholder={areaPlaceholder}
          suffix={areaSuffix}
          {...register('builtUpArea', { valueAsNumber: true })}
          error={errors.builtUpArea?.message as string}
        />

        {/* Dropdowns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Controller
            name="landType"
            control={control}
            render={({ field }) => (
              <Select
                label={t('forms.landType')}
                icon={Compass}
                options={[
                  { value: 'NA', label: t('plotLandType.na') },
                  { value: 'Guthevari', label: t('plotLandType.guthevari') }
                ]}
                {...field}
              />
            )}
          />

          <Controller
            name="occupancyClass"
            control={control}
            render={({ field }) => (
              <Select
                label={t('forms.occupancyClass')}
                icon={ShieldAlert}
                options={[
                  { value: 'Class 1', label: t('occupancy.class1') },
                  { value: 'Class 2', label: t('occupancy.class2') },
                  { value: 'Class 3', label: t('occupancy.class3') }
                ]}
                {...field}
              />
            )}
          />
        </div>

        {/* Feature Toggle Switches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="isSharedRoad"
            control={control}
            render={({ field: { value, onChange } }) => (
              <div className="flex flex-col gap-4 p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4 text-left">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-800 flex-shrink-0">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-black">{t('forms.sharedRoad')}</span>
                    <span className="text-xs text-slate-700 mt-0.5 pr-4 leading-relaxed">
                      {t('forms.sharedRoadDesc')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => onChange(true)}
                    className={
                      value === true
                        ? "w-full py-3 text-sm font-bold rounded-xl border-2 border-emerald-600 bg-emerald-50 text-emerald-800 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        : "w-full py-3 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all cursor-pointer flex items-center justify-center gap-2"
                    }
                  >
                    <CheckCircle className={`w-4 h-4 mr-2 ${value === true ? 'text-emerald-600 fill-emerald-100' : 'text-slate-400'}`} />
                    {t('forms.yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(false)}
                    className={
                      value === false
                        ? "w-full py-3 text-sm font-bold rounded-xl border-2 border-rose-600 bg-rose-50 text-rose-800 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        : "w-full py-3 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-all cursor-pointer flex items-center justify-center gap-2"
                    }
                  >
                    <XCircle className={`w-4 h-4 mr-2 ${value === false ? 'text-rose-600 fill-rose-100' : 'text-slate-400'}`} />
                    {t('forms.no')}
                  </button>
                </div>

                {value === true && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-600 text-emerald-800">
                      <GitFork className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('forms.sharedRoadAvailable') || 'Shared Road Available'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          />

          <Controller
            name="gatedCommunity"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ToggleSwitch
                icon={Columns}
                label={t('forms.gatedCommunity')}
                description={t('forms.gatedCommunityDesc')}
                checked={!!value}
                onChange={onChange}
              />
            )}
          />

          <Controller
            name="cornerPlot"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ToggleSwitch
                icon={Compass}
                label={t('forms.cornerPlot')}
                description={t('forms.cornerPlotDesc')}
                checked={!!value}
                onChange={onChange}
              />
            )}
          />

          <div className="col-span-1 md:col-span-2">
            <Controller
              name="boundaryWall"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ToggleSwitch
                  icon={Hammer}
                  label={t('forms.boundaryWall')}
                  description={t('forms.boundaryWallDesc')}
                  checked={!!value}
                  onChange={onChange}
                />
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
