import React from 'react';
import { User, Smartphone } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';

export interface OwnerDetailsSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  categoryType: string;
}

export const OwnerDetailsSection: React.FC<OwnerDetailsSectionProps> = ({
  register,
  errors,
  categoryType: _categoryType
}) => {
  const { t } = useTranslation();

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50">
        <div className="text-slate-700">
          <User className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.ownerDetails')}</h3>
      </div>
      
      <div className="p-6 flex flex-col gap-5">
        <Input
          icon={User}
          label={t('forms.ownerName')}
          placeholder={t('forms.ownerNamePlaceholder')}
          {...register('ownerName')}
          error={errors.ownerName?.message as string}
        />
        <Input
          icon={Smartphone}
          label={t('forms.mobileNumber')}
          type="tel"
          maxLength={10}
          placeholder={t('forms.mobileNumberPlaceholder')}
          {...register('mobileNumber', {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            }
          })}
          error={errors.mobileNumber?.message as string}
        />
      </div>
    </section>
  );
};
