import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Building, Settings, User,
  IndianRupee, Smartphone, LayoutGrid, Bed, Bath, Layers, Calendar,
  Armchair, CarFront, Rocket, ArrowUpDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sellPropertySchema, rentPropertySchema } from '../../schemas/property.schema';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { fetchCollection, createDocument } from '../../services/firebase';
import { useAuth } from '../../app/providers/AuthProvider';
import { scrollToFirstError } from '../../utils/validation';
import { useFocusRetention } from '../../hooks/useFocusRetention';
import { mapToFirebaseProperty } from '../../utils/propertyMapper';
import { LoanDetailsSection } from '../../components/property-form/LoanDetailsSection';
import { MediaUploadSection } from '../../components/property-form/MediaUploadSection';

interface FlatListingFormProps {
  onBack: () => void;
  onSuccess: (propertyCode: string) => void;
  onTransactionTypeChange?: (type: 'sale' | 'rent') => void;
  initialTransactionType?: 'sale' | 'rent';
  initialData?: any;
  isEditMode?: boolean;
}

export const FlatListingForm: React.FC<FlatListingFormProps> = ({ onBack, onSuccess, onTransactionTypeChange, initialTransactionType, initialData, isEditMode }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>(initialData?.type || initialData?.propertyInformation?.listingType?.toLowerCase() || initialTransactionType || 'sale');

  React.useEffect(() => {
    onTransactionTypeChange?.(transactionType);
  }, [transactionType, onTransactionTypeChange]);
  const [loading, setLoading] = useState(false);

  useFocusRetention();

  const [areaType, setAreaType] = useState<'sqft' | 'guthevari'>(initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'));

  // Data for Dropdowns
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [facingOptions, setFacingOptions] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [d, t, f] = await Promise.all([
          fetchCollection('districts'),
          fetchCollection('talukas'),
          fetchCollection('facing_directions')
        ]);
        setDistricts(d.map((i: any) => ({ value: i.label, label: i.label })));
        setTalukas(t.map((i: any) => ({ value: i.label, label: i.label })));
        setFacingOptions(f.map((i: any) => ({ value: i.label, label: i.label })));
      } catch (err) {
        console.error("Failed to load CMS data:", err);
      }
    };
    loadData();
  }, []);

  const baseSchema = transactionType === 'sale' ? sellPropertySchema : rentPropertySchema;
  const schema = useMemo(() => {
    if (transactionType === 'sale') {
      return baseSchema.extend({
        isNegotiable: z.boolean({ message: "Please select if price is negotiable" })
      });
    }
    return baseSchema;
  }, [baseSchema, transactionType]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const isAdminUser =
    user?.role === 'admin' ||
    user?.role === 'employee' ||
    user?.role === 'representative' ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<any>({
    resolver,
    defaultValues: {
      type: initialData?.type || initialData?.propertyInformation?.listingType?.toLowerCase() || initialTransactionType || 'sale',
      ownerName: initialData?.ownerName || initialData?.ownerDetails?.ownerName || (isAdminUser ? '' : user?.displayName || ''),
      email: initialData?.email || (isAdminUser ? '' : user?.email || ''),
      mobileNumber: initialData?.mobileNumber || initialData?.ownerDetails?.ownerPhone || '',
      alternateMobile: initialData?.alternateMobile || initialData?.ownerDetails?.ownerWhatsApp || '',
      isNegotiable: initialData?.isNegotiable !== undefined ? initialData.isNegotiable : true,
      carParking: initialData?.carParking !== undefined ? initialData.carParking : false,
      lift: initialData?.lift !== undefined ? initialData.lift : false,
      garden: initialData?.garden !== undefined ? initialData.garden : false,
      waterSupply: initialData?.waterSupply !== undefined ? initialData.waterSupply : false,
      powerBackup: initialData?.powerBackup !== undefined ? initialData.powerBackup : false,
      bachelorsAllowed: initialData?.bachelorsAllowed !== undefined ? initialData.bachelorsAllowed : false,
      familyPreferred: initialData?.familyPreferred !== undefined ? initialData.familyPreferred : true,
      petsAllowed: initialData?.petsAllowed !== undefined ? initialData.petsAllowed : false,
      workingProfessionalsAllowed: initialData?.workingProfessionalsAllowed !== undefined ? initialData.workingProfessionalsAllowed : false,
      furnishingStatus: initialData?.furnishingStatus || initialData?.additionalDetails?.furnishingStatus || 'Unfurnished',
      amenities: initialData?.amenities || initialData?.propertyInformation?.amenities || [],
      flatType: initialData?.flatType || '2BHK',
      parkingType: initialData?.parkingType || 'Covered',
      parkingNumber: initialData?.parkingNumber || '',
      foodPreference: initialData?.foodPreference || 'Both Allowed',
      hasLoan: initialData?.hasLoan !== undefined ? initialData.hasLoan : false,
      loanBankName: initialData?.loanBankName || '',
      loanAmount: initialData?.loanAmount || undefined,
      areaType: initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'),
      builtUpArea: initialData?.builtUpArea || initialData?.carpetArea || initialData?.layoutDetails?.areaSqFt || undefined,
      carpetArea: initialData?.carpetArea || 0,
      totalRooms: initialData?.totalRooms || initialData?.bedrooms || initialData?.propertyInformation?.bhk || 1,
      bedrooms: initialData?.bedrooms || initialData?.propertyInformation?.bhk || 2,
      bathrooms: initialData?.bathrooms || initialData?.propertyInformation?.bathrooms || 2,
      balconies: initialData?.balconies || 0,
      totalFloors: initialData?.totalFloors || initialData?.layoutDetails?.totalFloors || 1,
      floorNumber: initialData?.floorNumber || initialData?.layoutDetails?.floorNumber || 1,
      yearBuilt: initialData?.yearBuilt || new Date().getFullYear(),
      state: initialData?.state || 'Maharashtra',
      district: initialData?.district || initialData?.addressLocation?.district || 'Sangli',
      taluka: initialData?.taluka || initialData?.addressLocation?.taluka || 'Miraj',
      cityVillage: initialData?.cityVillage || initialData?.addressLocation?.village || '',
      pincode: initialData?.pincode || '416415',
      fullAddress: initialData?.fullAddress || initialData?.addressLocation?.address || '',
      propertyName: initialData?.propertyName || initialData?.title || initialData?.propertyInformation?.title || '',
      expectedPrice: initialData?.expectedPrice || initialData?.price || initialData?.pricingDetails?.price || undefined,
      monthlyRent: initialData?.monthlyRent || initialData?.price || initialData?.pricingDetails?.price || undefined,
      securityDeposit: initialData?.securityDeposit || initialData?.pricingDetails?.securityDeposit || 0,
      maintenanceCharges: initialData?.maintenanceCharges || initialData?.pricingDetails?.maintenanceCharges || 0,
      description: initialData?.description || initialData?.propertyInformation?.description || 'Spacious modern flat with excellent layout, premium ventilation, and close proximity to key areas.',
      images: initialData?.images || initialData?.mediaUpload?.images || [],
      videoPath: initialData?.videoPath || initialData?.mediaUpload?.videoPath || '',
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const builtUpArea = data.builtUpArea;
      const areaType = data.areaType || 'sqft';
      let totalGuntha = 0;
      if (builtUpArea && !isNaN(builtUpArea)) {
        totalGuntha = areaType === 'guthevari' ? builtUpArea : builtUpArea / 1089;
      }

      const payload = mapToFirebaseProperty(data, {
        totalGuntha,
        category: 'Flat',
        status: isEditMode && initialData ? initialData.status : 'pending',
        adminApproved: isEditMode && initialData ? (initialData.adminApproved !== undefined ? initialData.adminApproved : (initialData.status === 'approved' || initialData.status === 'active')) : false,
        isActive: isEditMode && initialData ? (initialData.isActive !== undefined ? initialData.isActive : (initialData.status === 'approved' || initialData.status === 'active')) : false,
        propertyCode: isEditMode && initialData ? (initialData.propertyCode || '') : '',
        isSoldOut: isEditMode && initialData ? Boolean(initialData.isSoldOut) : false,
        soldAt: isEditMode && initialData ? (initialData.soldAt || null) : null,
        soldPrice: isEditMode && initialData ? (initialData.soldPrice || null) : null,
        buyerName: isEditMode && initialData ? (initialData.buyerName || null) : null,
        buyerPhone: isEditMode && initialData ? (initialData.buyerPhone || null) : null,
        isFeatured: isEditMode && initialData ? Boolean(initialData.isFeatured) : false,
        viewsCount: isEditMode && initialData ? (initialData.viewsCount || 0) : 0,
        createdAt: isEditMode && initialData ? initialData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: isEditMode && initialData ? initialData.userId : (user?.uid || 'guest-user'),
      });
      
      if (isEditMode && initialData?.id) {
        const { updateDocument } = await import('../../services/firebase');
        await updateDocument('properties', initialData.id, payload);
        onSuccess(initialData.propertyCode || initialData.id);
      } else {
        const res = await createDocument('properties', payload);
        onSuccess(res?.propertyCode || '');
      }
    } catch (error: any) {
      console.error("Failed to submit property:", error);
      alert(error?.message || "Failed to submit property. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errs: any) => {
    console.error("Form validation errors:", errs);
    const errorFields = Object.keys(errs);
    if (errorFields.length > 0) {
      const msg = i18n.language?.startsWith('mr')
        ? `कृपया फॉर्म मधील सर्व माहिती अचूक भरा. (अप्राप्त/अवैध: ${errorFields.join(', ')})`
        : `Please fill all required form fields correctly. (Missing/Invalid: ${errorFields.join(', ')})`;
      alert(msg);
    }
    scrollToFirstError(errs);
  };

  const handleTransactionChange = (val: string) => {
    setTransactionType(val as 'sale' | 'rent');
    setValue('type', val);
  };

  const hasCarParking = watch('carParking');

  // Helper for Section Titles
  const SectionHeader = ({ icon: Icon, title, iconColorClass = "text-slate-800" }: any) => (
    <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50 rounded-t-2xl">
      <div className={iconColorClass}>
        <Icon className="w-5 h-5" fill="currentColor" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{title}</h3>
    </div>
  );

  return (
    <div className="bg-slate-50/50 rounded-2xl">
      {/* Top Header */}
      <div className="mb-6 flex justify-center">
        <div className="w-full max-w-sm">
          <SegmentedControl
            options={[
              { label: t('forms.sellCategory', { category: t('categories.flat') }), value: 'sale' },
              { label: t('forms.rentCategory', { category: t('categories.flat') }), value: 'rent' }
            ]}
            value={transactionType}
            onChange={handleTransactionChange}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          {/* Section 1: Owner Details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={User} title={t('forms.ownerDetails')} iconColorClass="text-slate-700" />
            <div className="p-6 flex flex-col gap-5">
              <Input icon={User} label={t('forms.ownerName')} placeholder={t('forms.ownerNamePlaceholder')} {...register('ownerName')} error={errors.ownerName?.message as string} />
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

          {/* Section 2: Property Information */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={Building} title={t('forms.propertyInfo')} iconColorClass="text-orange-500" />
            <div className="p-6 flex flex-col gap-5">
              <Input icon={Building} label={t('forms.propertyName')} placeholder={t('forms.propertyNamePlaceholderDynamic', { category: t('categories.flat') })} {...register('propertyName')} error={errors.propertyName?.message as string} />

              <AnimatePresence mode="wait">
                {transactionType === 'sale' ? (
                  <motion.div key="sale-price" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
                    <Input icon={IndianRupee} label={`${t('forms.expectedPrice')} (₹)`} type="number" placeholder={t('forms.expectedPricePlaceholder')} {...register('expectedPrice', { valueAsNumber: true })} error={errors.expectedPrice?.message as string} />

                    {/* Price Negotiable Selector */}
                    <div className="w-full flex flex-col gap-1.5 text-left">
                      <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
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
                  </motion.div>
                ) : (
                  <motion.div key="rent-price" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
                    <Input icon={IndianRupee} label={`${t('forms.monthlyRent')} (₹)`} type="number" placeholder={t('forms.monthlyRentPlaceholder')} {...register('monthlyRent', { valueAsNumber: true })} error={errors.monthlyRent?.message as string} />
                    <Input icon={IndianRupee} label={`${t('forms.securityDeposit')} (₹)`} type="number" placeholder={t('forms.securityDepositPlaceholder')} {...register('securityDeposit', { valueAsNumber: true })} error={errors.securityDeposit?.message as string} />
                    <Input icon={IndianRupee} label={`${t('forms.maintenanceCharges')} (₹)`} type="number" placeholder={t('forms.maintenanceChargesPlaceholder')} {...register('maintenanceCharges', { valueAsNumber: true })} error={errors.maintenanceCharges?.message as string} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Section 3: Layout Details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={LayoutGrid} title={t('forms.layoutDetails')} iconColorClass="text-amber-700" />
            <div className="p-6 flex flex-col gap-5 text-left">
              {/* Flat Type Configuration */}
              <div className="w-full">
                <Controller
                  name="flatType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('forms.flatType') || 'Flat Type / Configuration'}
                      icon={Bed}
                      options={[
                        { value: '1BHK', label: '1 BHK' },
                        { value: '2BHK', label: '2 BHK' },
                        { value: '3BHK', label: '3 BHK' },
                        { value: '4BHK', label: '4 BHK' },
                        { value: '4+BHK', label: '4+ BHK' },
                        { value: 'Studio', label: 'Studio' }
                      ]}
                      {...field}
                    />
                  )}
                />
              </div>

              {/* Area Type Toggle Buttons */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  {t('forms.areaType') || 'Area Type'}
                </label>
                <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setAreaType('sqft');
                      setValue('areaType', 'sqft');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${areaType === 'sqft'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t('forms.sqftLabel') || 'Square Feet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAreaType('guthevari');
                      setValue('areaType', 'guthevari');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${areaType === 'guthevari'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t('forms.guthevariLabel') || 'Guntha'}
                  </button>
                </div>
              </div>

              {/* Dynamic Area Size Input */}
              <Input
                icon={LayoutGrid}
                label={areaType === 'sqft' ? (i18n.language?.startsWith('mr') ? 'किती चौरस फूट?' : 'How many square feet?') : (i18n.language?.startsWith('mr') ? 'किती गुंठा?' : 'How many guntha?')}
                type="number"
                placeholder={areaType === 'sqft' ? (i18n.language?.startsWith('mr') ? 'चौरस फूट भरा' : 'Enter square feet') : (i18n.language?.startsWith('mr') ? 'गुंठा भरा' : 'Enter guntha')}
                {...register('builtUpArea', { valueAsNumber: true })}
                error={errors.builtUpArea?.message as string}
              />

              {/* Bedrooms */}
              <Input
                icon={Bed}
                label={t('forms.bedrooms') || 'Bedrooms'}
                type="number"
                placeholder={t('forms.bedroomsPlaceholder') || 'e.g. 2'}
                {...register('bedrooms', { valueAsNumber: true })}
                error={errors.bedrooms?.message as string}
              />

              {/* Bathrooms and Floor Number Row */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  icon={Bath}
                  label={t('forms.bathrooms') || 'Bathrooms'}
                  type="number"
                  placeholder={t('forms.bathroomsPlaceholder') || 'e.g. 2'}
                  {...register('bathrooms', { valueAsNumber: true })}
                  error={errors.bathrooms?.message as string}
                />
                <Input
                  icon={Layers}
                  label={t('forms.floorNumber') || 'Floor Number'}
                  type="number"
                  placeholder={t('forms.floorNumberPlaceholder') || 'e.g. 4'}
                  {...register('floorNumber', { valueAsNumber: true })}
                  error={errors.floorNumber?.message as string}
                />
              </div>

              {/* Total Floors and Year Built Row */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  icon={Building}
                  label={t('forms.totalFloorsInBuilding') || 'Total Floors'}
                  type="number"
                  placeholder={t('forms.totalFloorsPlaceholder') || 'e.g. 7'}
                  {...register('totalFloors', { valueAsNumber: true })}
                  error={errors.totalFloors?.message as string}
                />
                <Input
                  icon={Calendar}
                  label={t('forms.yearBuilt') || 'Year Built'}
                  type="number"
                  placeholder={t('forms.yearBuiltPlaceholder') || 'e.g. 2022'}
                  {...register('yearBuilt', { valueAsNumber: true })}
                  error={errors.yearBuilt?.message as string}
                />
              </div>
            </div>
          </section>

          {/* Section 4: Additional Details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={Settings} title={t('forms.additionalDetails')} iconColorClass="text-emerald-700" />
            <div className="p-6 flex flex-col gap-5">
              <Controller
                name="facingDirection"
                control={control}
                render={({ field }) => (
                  <Select label={t('forms.facingDirection')} options={facingOptions.map(opt => ({ value: opt.value, label: t(`facing.${opt.value.toLowerCase()}`, opt.label) as string }))} {...field} />
                )}
              />

              <Controller
                name="furnishingStatus"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ToggleSwitch
                    icon={Armchair}
                    label={t('forms.furnishedProperty')}
                    description={t('forms.furnishedDesc')}
                    checked={value === 'Furnished'}
                    onChange={(checked) => onChange(checked ? 'Furnished' : 'Unfurnished')}
                  />
                )}
              />

              <Controller
                name="lift"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ToggleSwitch
                    icon={ArrowUpDown}
                    label={t('forms.lift')}
                    description={t('forms.liftDesc')}
                    checked={value}
                    onChange={onChange}
                  />
                )}
              />

              <div className="flex flex-col gap-4">
                <Controller
                  name="carParking"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <ToggleSwitch
                      icon={CarFront}
                      label={t('forms.carParking')}
                      description={t('forms.carParkingDesc')}
                      checked={value}
                      onChange={onChange}
                    />
                  )}
                />

                <AnimatePresence>
                  {hasCarParking && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-5 pl-4 md:pl-12 border-l-2 border-slate-200 mt-2 overflow-hidden"
                    >
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
                        label={`${t('forms.parkingNumber')} (${t('forms.optional')})`}
                        placeholder={t('forms.parkingNumberPlaceholder')}
                        {...register('parkingNumber')}
                        error={errors.parkingNumber?.message as string}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {transactionType === 'rent' && (
                <>
                  <Controller
                    name="bachelorsAllowed"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <ToggleSwitch
                        icon={User}
                        label={t('forms.bachelorsAllowed')}
                        description={t('forms.bachelorsAllowedDesc')}
                        checked={value}
                        onChange={onChange}
                      />
                    )}
                  />

                  {/* Tenant Food Preference Selector */}
                  <div className="w-full flex flex-col gap-2 text-left mt-2">
                    <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                      {t('forms.tenantFoodPreference') || 'TENANT FOOD PREFERENCE'}
                    </label>
                    <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {t('forms.tenantFoodPreferenceDesc') || 'Select who is allowed based on eating preferences'}
                    </span>
                    <div className="flex flex-col gap-3 mt-1.5">
                      {[
                        { value: 'Vegetarian Only', label: t('forms.vegetarianOnly') || 'Vegetarian Only', dotColor: 'bg-emerald-500' },
                        { value: 'Non-Vegetarian Allowed', label: t('forms.nonVegetarianAllowed') || 'Non-Vegetarian Allowed', dotColor: 'bg-red-500' },
                        { value: 'Both Allowed', label: t('forms.bothAllowed') || 'Both Allowed', dotColor: 'bg-amber-500' }
                      ].map((option) => {
                        const isSelected = watch('foodPreference') === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setValue('foodPreference', option.value)}
                            className={`w-full py-4 px-5 text-sm font-semibold rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${isSelected
                                ? 'bg-[#111c2e]/10 border-[#111c2e] text-[#111c2e] font-bold shadow-sm'
                                : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50/50'
                              }`}
                          >
                            <span className={`w-3 h-3 rounded-full ${option.dotColor} flex-shrink-0`} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Property Loan Information */}
          {transactionType === 'sale' && (
            <LoanDetailsSection
              control={control}
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
            />
          )}

          {/* Section 5: Media Upload */}
          <MediaUploadSection 
            categoryType="Flat" 
            onChange={(urls) => setValue('images', urls)}
            onVideoChange={(url) => setValue('videoPath', url)}
          />

          {/* Section 6: Address & Location */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={MapPin} title={t('forms.addressLocation')} iconColorClass="text-indigo-600" />
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-5">
                <Controller name="district" control={control} render={({ field }) => <Select label={t('forms.district')} options={districts} {...field} error={errors.district?.message as string} />} />
                <Controller name="taluka" control={control} render={({ field }) => <Select label={t('forms.taluka')} options={talukas} {...field} error={errors.taluka?.message as string} />} />
              </div>
              <Input icon={Building} label={t('forms.cityVillage')} placeholder={t('forms.cityVillagePlaceholder')} {...register('cityVillage')} error={errors.cityVillage?.message as string} />
              <Input icon={MapPin} label={t('forms.fullAddress')} placeholder={t('forms.fullAddressPlaceholder')} {...register('fullAddress')} error={errors.fullAddress?.message as string} />
            </div>
          </section>
        </motion.div>

        {/* Submit / Navigation Action Bar */}
        <div className="sticky bottom-4 z-50 mt-4 flex gap-4">
          <Button type="button" variant="ghost" onClick={onBack} className="w-1/3 py-4 rounded-xl font-bold bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm flex items-center justify-center gap-2 text-lg">
            {t('forms.cancel')}
          </Button>
          <Button type="submit" isLoading={loading} className="w-2/3 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-slate-900 to-blue-600 hover:to-blue-700 shadow-xl flex items-center justify-center gap-2 text-lg">
            <Rocket className="w-5 h-5" />
            {transactionType === 'sale' ? t('forms.submitSellListing') : t('forms.submitRentListing')}
          </Button>
        </div>

      </form>
    </div>
  );
};
