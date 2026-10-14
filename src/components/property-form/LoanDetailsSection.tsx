import React from 'react';
import { Landmark, IndianRupee } from 'lucide-react';
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';

export interface LoanDetailsSectionProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: any;
  setValue: any;
}

export const LoanDetailsSection: React.FC<LoanDetailsSectionProps> = ({
  control: _control,
  register,
  errors,
  watch,
  setValue
}) => {
  const { t } = useTranslation();
  const hasLoan = watch('hasLoan');

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50">
        <div className="text-slate-700">
          <Landmark className="w-5 h-5" fill="currentColor" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">
          {t('forms.loanInfoTitle') || 'Property Loan Information'}
        </h3>
      </div>

      <div className="p-6 flex flex-col gap-5 text-left">
        {/* Toggle option for hasLoan */}
        <div className="w-full flex flex-col gap-2.5 text-left">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
            {t('forms.isLoanAvailable') || 'IS THERE ANY LOAN ON PROPERTY?'}
          </label>
          <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setValue('hasLoan', false);
                setValue('loanAmount', undefined);
                setValue('loanBankName', '');
              }}
              className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                !hasLoan
                  ? 'bg-[#111c2e] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('forms.no') || 'No'}
            </button>
            <button
              type="button"
              onClick={() => setValue('hasLoan', true)}
              className={`flex-1 py-3 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                hasLoan
                  ? 'bg-[#111c2e] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('forms.yes') || 'Yes'}
            </button>
          </div>
        </div>

        {/* Conditional inputs */}
        <AnimatePresence initial={false}>
          {hasLoan && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                marginTop: 8,
                transition: { height: { type: "spring", stiffness: 300, damping: 30 } }
              }}
              exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } }
              }}
              className="overflow-hidden border-l-2 border-slate-200 pl-4 md:pl-12 mt-2 flex flex-col gap-5"
            >
              <Input
                icon={IndianRupee}
                label={`${t('forms.loanAmount')} (₹)`}
                type="number"
                placeholder={t('forms.loanAmountPlaceholder') || 'Enter loan amount'}
                {...register('loanAmount', { valueAsNumber: true })}
                error={errors.loanAmount?.message as string}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
