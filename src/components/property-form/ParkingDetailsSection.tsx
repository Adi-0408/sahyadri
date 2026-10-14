import React from 'react';
import { CarFront, Layers } from 'lucide-react';
import { Controller } from 'react-hook-form';
import type { Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

export interface ParkingDetailsSectionProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  visible: boolean;
}

export const ParkingDetailsSection: React.FC<ParkingDetailsSectionProps> = ({
  control,
  register,
  errors,
  visible
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ 
            opacity: 1, 
            height: 'auto', 
            marginTop: 16,
            transition: { height: { type: "spring", stiffness: 300, damping: 30 } }
          }}
          exit={{ 
            opacity: 0, 
            height: 0, 
            marginTop: 0,
            transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } }
          }}
          className="overflow-hidden border-l-2 border-slate-200 pl-4 md:pl-12 mt-2 flex flex-col gap-5 text-left"
        >

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Controller
              name="parkingType"
              control={control}
              render={({ field }) => (
                <Select
                  label={t('forms.parkingType')}
                  icon={CarFront}
                  options={[
                    { value: 'Covered', label: t('parking.covered') },
                    { value: 'Open', label: t('parking.open') }
                  ]}
                  {...field}
                />
              )}
            />

            <Input
              icon={Layers}
              label={t('forms.parkingCapacity')}
              type="number"
              placeholder={t('forms.parkingCapacityPlaceholder')}
              {...register('parkingCapacity', { valueAsNumber: true })}
              error={errors.parkingCapacity?.message as string}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
