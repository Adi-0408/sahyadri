import React from 'react';
import { Building, IndianRupee } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';

export interface PropertyInformationSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  categoryType: string;
  transactionType: 'sale' | 'rent';
  watch?: any;
  setValue?: any;
}

export const PropertyInformationSection: React.FC<PropertyInformationSectionProps> = ({
  register,
  errors,
  categoryType,
  transactionType,
  watch,
  setValue
}) => {
  const { t } = useTranslation();

  const categoryKey = categoryType ? categoryType.toLowerCase() : '';
  const translatedCategory = categoryKey ? t(`categories.${categoryKey}`, categoryType) : '';
  const nameLabel = categoryKey === 'house'
    ? t('forms.propertyNameHouse', 'Property Name /Title')
    : categoryKey === 'land'
      ? t('forms.propertyNameLand', 'Land Title / Short Name')
      : categoryType
        ? t('forms.propertyNameLabel', { category: translatedCategory })
        : t('forms.propertyName');

  const namePlaceholder = categoryKey === 'land'
    ? t('forms.propertyNamePlaceholderLand', 'e.g. 5 Guntha Land, Vishrambag')
    : categoryType
      ? t('forms.propertyNamePlaceholderDynamic', { category: translatedCategory, defaultValue: `e.g. Sai Sadan ${categoryType}, Gokul Colony` })
      : t('forms.propertyNamePlaceholder', { defaultValue: 'e.g. Dream Residency' });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50">
        <div className="text-orange-500">
          <Building className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.propertyInfo')}</h3>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <Input
          icon={Building}
          label={nameLabel}
          placeholder={namePlaceholder}
          {...register('propertyName')}
          error={errors.propertyName?.message as string}
        />

        {categoryKey === 'land' && (
          <Input
            label={t('forms.gutNumber') || 'Gut Number / Gat Number'}
            placeholder={t('forms.gutNumberPlaceholder') || 'e.g. 124/A'}
            {...register('gutNumber')}
            error={errors.gutNumber?.message as string}
          />
        )}

        <AnimatePresence mode="wait">
          {transactionType === 'sale' ? (
            <motion.div
              key="sale-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              {categoryKey === 'plot' || categoryKey === 'land' ? (
                <div className="flex flex-col gap-5">
                  {/* Price Type Selector */}
                  <div className="w-full flex flex-col gap-1.5 text-left">
                    <label className="text-xs uppercase tracking-widest font-bold text-black">
                      {t('forms.priceType') || 'Price Type'} *
                    </label>
                    <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setValue('priceType', 'total_price')}
                        className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${(watch('priceType') || 'total_price') === 'total_price'
                            ? 'bg-[#111c2e] text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        {t('forms.totalPrice') || 'Total Price'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('priceType', 'price_per_guntha')}
                        className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${watch('priceType') === 'price_per_guntha'
                            ? 'bg-[#111c2e] text-white shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        {t('forms.pricePerGuntha') || 'Price Per Guntha'}
                      </button>
                    </div>
                  </div>

                  {/* Price Amount Input */}
                  <Input
                    icon={IndianRupee}
                    label={
                      watch('priceType') === 'price_per_guntha'
                        ? (t('forms.enterPricePerGuntha') || 'Enter Price Per Guntha')
                        : (t('forms.enterTotalPrice') || 'Enter Total Price')
                    }
                    type="number"
                    placeholder={
                      watch('priceType') === 'price_per_guntha'
                        ? 'e.g. 50000'
                        : 'e.g. 5000000'
                    }
                    {...register('priceAmount', { valueAsNumber: true })}
                    error={errors.priceAmount?.message as string}
                  />

                  {/* Auto-Calculation display */}
                  {(() => {
                    const builtUpArea = watch('builtUpArea');
                    const areaType = watch('areaType') || 'sqft';
                    const priceType = watch('priceType') || 'total_price';
                    const priceAmount = watch('priceAmount');

                    let totalGuntha = 0;
                    if (builtUpArea && !isNaN(builtUpArea)) {
                      totalGuntha = areaType === 'guthevari' ? builtUpArea : builtUpArea / 1089;
                    }

                    if (totalGuntha > 0 && priceAmount && !isNaN(priceAmount)) {
                      if (priceType === 'total_price') {
                        const pricePerGuntha = Math.round(priceAmount / totalGuntha);
                        return (
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 text-left">
                            <strong>Estimated Price Per Guntha:</strong> ₹{pricePerGuntha.toLocaleString('en-IN')} / guntha
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Calculated as Total Price (₹{priceAmount.toLocaleString('en-IN')}) ÷ Area ({totalGuntha.toFixed(2)} Guntha)
                            </div>
                          </div>
                        );
                      } else {
                        const totalPrice = Math.round(priceAmount * totalGuntha);
                        return (
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 text-left">
                            <strong>Estimated Total Price:</strong> ₹{totalPrice.toLocaleString('en-IN')}
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Calculated as Price Per Guntha (₹{priceAmount.toLocaleString('en-IN')}) × Area ({totalGuntha.toFixed(2)} Guntha)
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <Input
                  icon={IndianRupee}
                  label={`${t('forms.expectedPrice')} (₹)`}
                  type="number"
                  placeholder={t('forms.expectedPricePlaceholder')}
                  {...register('expectedPrice', { valueAsNumber: true })}
                  error={errors.expectedPrice?.message as string}
                />
              )}

              {/* Price Negotiable Selector */}
              {watch && setValue && categoryKey !== 'bungalow' && (
                <div className="w-full flex flex-col gap-1.5 text-left">
                  <label className="text-xs uppercase tracking-widest font-bold text-black">
                    {t('forms.isPriceNegotiable') || 'Is the Price Negotiable?'} *
                  </label>
                  <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setValue('isNegotiable', true)}
                      className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${watch('isNegotiable') === true
                          ? 'bg-[#111c2e] text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      {t('forms.yes') || 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('isNegotiable', false)}
                      className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${watch('isNegotiable') === false
                          ? 'bg-[#111c2e] text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      {t('forms.no') || 'No'}
                    </button>
                  </div>
                  {errors.isNegotiable && (
                    <span className="text-red-500 text-xs mt-1 font-bold">
                      {errors.isNegotiable.message as string}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="rent-details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`grid grid-cols-1 ${categoryKey === 'plot' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-5`}
            >
              <Input
                icon={IndianRupee}
                label={`${t('forms.monthlyRent')} (₹)`}
                type="number"
                placeholder={t('forms.monthlyRentPlaceholder')}
                {...register('monthlyRent', { valueAsNumber: true })}
                error={errors.monthlyRent?.message as string}
              />
              <Input
                icon={IndianRupee}
                label={`${t('forms.securityDeposit')} (₹)`}
                type="number"
                placeholder={t('forms.securityDepositPlaceholder')}
                {...register('securityDeposit', { valueAsNumber: true })}
                error={errors.securityDeposit?.message as string}
              />
              {categoryKey !== 'plot' && (
                <Input
                  icon={IndianRupee}
                  label={`${t('forms.maintenanceCharges')} (₹)`}
                  type="number"
                  placeholder={t('forms.maintenanceChargesPlaceholder')}
                  {...register('maintenanceCharges', { valueAsNumber: true })}
                  error={errors.maintenanceCharges?.message as string}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
