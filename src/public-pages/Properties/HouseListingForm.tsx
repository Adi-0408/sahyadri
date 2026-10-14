import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import {
  Settings, LayoutGrid, Layers, Calendar,
  Armchair, CarFront, Rocket, User, Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { sellPropertySchema, rentPropertySchema } from '../../schemas/property.schema';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { fetchCollection, createDocument } from '../../services/firebase';
import { useAuth } from '../../app/providers/AuthProvider';
import { scrollToFirstError } from '../../utils/validation';
import { useFocusRetention } from '../../hooks/useFocusRetention';
import { mapToFirebaseProperty } from '../../utils/propertyMapper';

// Modular Sections
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { OwnerDetailsSection } from '../../components/property-form/OwnerDetailsSection';
import { PropertyInformationSection } from '../../components/property-form/PropertyInformationSection';
import { MediaUploadSection } from '../../components/property-form/MediaUploadSection';
import { AddressDetailsSection } from '../../components/property-form/AddressDetailsSection';
import { LoanDetailsSection } from '../../components/property-form/LoanDetailsSection';

interface HouseListingFormProps {
  onBack: () => void;
  onSuccess: (propertyCode: string) => void;
  onTransactionTypeChange?: (type: 'sale' | 'rent') => void;
  initialTransactionType?: 'sale' | 'rent';
  initialData?: any;
  isEditMode?: boolean;
}

export const HouseListingForm: React.FC<HouseListingFormProps> = ({ onBack, onSuccess, onTransactionTypeChange, initialTransactionType, initialData, isEditMode }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>(initialData?.type || initialData?.propertyInformation?.listingType?.toLowerCase() || initialTransactionType || 'sale');

  React.useEffect(() => {
    onTransactionTypeChange?.(transactionType);
  }, [transactionType, onTransactionTypeChange]);
  const [loading, setLoading] = useState(false);

  useFocusRetention();

  // Dynamic dropdown options from CMS
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);

  // States for custom button group selectors
  const [areaType, setAreaType] = useState<'sqft' | 'guthevari'>(initialData?.areaType || initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [d, t] = await Promise.all([
          fetchCollection('districts'),
          fetchCollection('talukas')
        ]);
        setDistricts(d.map((i: any) => ({ value: i.label, label: i.label })));
        setTalukas(t.map((i: any) => ({ value: i.label, label: i.label })));
      } catch (err) {
        console.error("Failed to load CMS data:", err);
        // Standard fallbacks if Firestore fails
        setDistricts([{ value: 'Sangli', label: 'Sangli' }]);
        setTalukas([{ value: 'Miraj', label: 'Miraj' }]);
      }
    };
    loadData();
  }, []);

  const baseSchema = transactionType === 'sale' ? sellPropertySchema : rentPropertySchema;
  const schema = useMemo(() => {
    const extended = baseSchema.extend({
      areaType: z.string().optional(),
      hasLoan: z.boolean().optional(),
      loanBankName: z.string().optional(),
      loanAmount: z.number().optional().or(z.literal(0)).or(z.string().optional())
    });

    if (transactionType === 'sale') {
      return extended.extend({
        isNegotiable: z.boolean({
          message: i18n.language?.startsWith('mr')
            ? "किंमत तडजोड करण्यायोग्य आहे की नाही ते निवडा"
            : "Please select if price is negotiable"
        })
      });
    }
    return extended;
  }, [baseSchema, transactionType, i18n.language]);

  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<any>({
    resolver,
    defaultValues: {
      type: initialData?.type || initialData?.propertyInformation?.listingType?.toLowerCase() || initialTransactionType || 'sale',
      ownerName: initialData?.ownerName || initialData?.ownerDetails?.ownerName || user?.displayName || '',
      email: initialData?.email || user?.email || '',
      mobileNumber: initialData?.mobileNumber || initialData?.ownerDetails?.ownerPhone || '',
      alternateMobile: initialData?.alternateMobile || initialData?.ownerDetails?.ownerWhatsApp || '',
      propertyName: initialData?.propertyName || initialData?.title || initialData?.propertyInformation?.title || '',
      expectedPrice: initialData?.expectedPrice || initialData?.price || initialData?.pricingDetails?.price || undefined,
      monthlyRent: initialData?.monthlyRent || initialData?.price || initialData?.pricingDetails?.price || undefined,
      securityDeposit: initialData?.securityDeposit || initialData?.pricingDetails?.securityDeposit || 0,
      maintenanceCharges: initialData?.maintenanceCharges || initialData?.pricingDetails?.maintenanceCharges || 0,
      isNegotiable: initialData?.isNegotiable !== undefined ? initialData.isNegotiable : true,
      
      // Layout details
      areaType: initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'),
      builtUpArea: initialData?.builtUpArea || initialData?.carpetArea || initialData?.layoutDetails?.areaSqFt || undefined,
      totalRooms: initialData?.totalRooms || initialData?.bedrooms || initialData?.propertyInformation?.bhk || undefined,
      bedrooms: initialData?.bedrooms || initialData?.propertyInformation?.bhk || 3,
      bathrooms: initialData?.bathrooms || initialData?.propertyInformation?.bathrooms || undefined,
      balconies: initialData?.balconies || 0,
      totalFloors: initialData?.totalFloors || initialData?.layoutDetails?.totalFloors || undefined,
      floorNumber: initialData?.floorNumber || initialData?.layoutDetails?.floorNumber || 0,
      yearBuilt: initialData?.yearBuilt || undefined,

      // Additional details
      facingDirection: initialData?.facingDirection || initialData?.additionalDetails?.facingDirection || 'East',
      furnishingStatus: initialData?.furnishingStatus || initialData?.additionalDetails?.furnishingStatus || 'Unfurnished',
      carParking: initialData?.carParking !== undefined ? initialData.carParking : false,
      lift: initialData?.lift !== undefined ? initialData.lift : false,
      garden: initialData?.garden !== undefined ? initialData.garden : false,
      waterSupply: initialData?.waterSupply !== undefined ? initialData.waterSupply : true,
      powerBackup: initialData?.powerBackup !== undefined ? initialData.powerBackup : true,
      hasLoan: initialData?.hasLoan !== undefined ? initialData.hasLoan : false,
      loanBankName: initialData?.loanBankName || '',
      loanAmount: initialData?.loanAmount || undefined,
      bachelorsAllowed: initialData?.bachelorsAllowed !== undefined ? initialData.bachelorsAllowed : false,
      familyPreferred: initialData?.familyPreferred !== undefined ? initialData.familyPreferred : true,
      petsAllowed: initialData?.petsAllowed !== undefined ? initialData.petsAllowed : true,
      workingProfessionalsAllowed: initialData?.workingProfessionalsAllowed !== undefined ? initialData.workingProfessionalsAllowed : true,
      foodPreference: initialData?.foodPreference || 'Both Allowed',
      
      // Address & location
      state: initialData?.state || 'Maharashtra',
      district: initialData?.district || initialData?.addressLocation?.district || 'Sangli',
      taluka: initialData?.taluka || initialData?.addressLocation?.taluka || 'Miraj',
      cityVillage: initialData?.cityVillage || initialData?.addressLocation?.village || '',
      pincode: initialData?.pincode || '416415',
      fullAddress: initialData?.fullAddress || initialData?.addressLocation?.address || '',
      description: initialData?.description || initialData?.propertyInformation?.description || 'Beautiful independent house with excellent layout, ventilation, and prime location.', // Satisfies schema constraint
      amenities: initialData?.amenities || initialData?.propertyInformation?.amenities || [],
      images: initialData?.images || initialData?.mediaUpload?.images || [],
      videoPath: initialData?.videoPath || initialData?.mediaUpload?.videoPath || '',
    }
  });

  const totalFloors = watch('totalFloors') || 1;
  const floorDetails = watch('floorDetails') || [];

  React.useEffect(() => {
    let tBed = 0, tBath = 0, tHall = 0, tKit = 0;
    if (Array.isArray(floorDetails)) {
      floorDetails.forEach((f: any) => {
        tBed += (f?.bedrooms || 0);
        tBath += (f?.bathrooms || 0);
        tHall += (f?.hallCount || 0);
        tKit += (f?.kitchenCount || 0);
      });
    }
    setValue('bedrooms', tBed);
    setValue('bathrooms', tBath);
    setValue('hallCount', tHall);
    setValue('kitchenCount', tKit);
    setValue('totalRooms', Math.max(1, tBed + tHall + tKit));
  }, [floorDetails, setValue]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = mapToFirebaseProperty(data, {
        category: 'House',
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
        // Make sure required sub-fields match
        bedrooms: data.bedrooms || 3,
        carpetArea: data.builtUpArea || 0
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

  const handleTransactionChange = (val: 'sale' | 'rent') => {
    setTransactionType(val);
    setValue('type', val);
  };

  // Form Section Header Helper
  const SectionHeader = ({ icon: Icon, title, iconColorClass = "text-slate-700" }: any) => (
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
              { label: t('forms.sellCategory', { category: t('categories.house') }), value: 'sale' },
              { label: t('forms.rentCategory', { category: t('categories.house') }), value: 'rent' }
            ]}
            value={transactionType}
            onChange={(val) => handleTransactionChange(val as 'sale' | 'rent')}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          
          {/* Owner details */}
          <OwnerDetailsSection 
            register={register} 
            errors={errors} 
            categoryType="House" 
          />

          {/* Property information */}
          <PropertyInformationSection 
            register={register} 
            errors={errors} 
            categoryType="House"
            watch={watch}
            setValue={setValue}
            transactionType={transactionType} 
          />

          {/* Layout Details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={LayoutGrid} title={t('forms.layoutDetails') || 'Layout Details'} iconColorClass="text-amber-600" />
            <div className="p-6 flex flex-col gap-5 text-left">
              
              {/* Hidden inputs for custom state fields */}
              <input type="hidden" {...register('areaType')} />
              <input type="hidden" {...register('isNegotiable')} />
              <input type="hidden" {...register('bedrooms', { valueAsNumber: true })} />
              <input type="hidden" {...register('bathrooms', { valueAsNumber: true })} />
              <input type="hidden" {...register('hallCount', { valueAsNumber: true })} />
              <input type="hidden" {...register('kitchenCount', { valueAsNumber: true })} />
              <input type="hidden" {...register('totalRooms', { valueAsNumber: true })} />

              {/* Area Type Toggle Buttons */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  {i18n.language?.startsWith('mr') ? 'क्षेत्रफळ प्रकार' : 'Area Type'}
                </label>
                <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setAreaType('sqft');
                      setValue('areaType', 'sqft');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                      areaType === 'sqft'
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
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                      areaType === 'guthevari'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t('forms.guthevariLabel') || 'Guthevari'}
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

              {/* Bathrooms and Floors Row */}
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  icon={Calendar} 
                  label={t('forms.yearBuilt') || 'Year Built'} 
                  type="number" 
                  placeholder={i18n.language?.startsWith('mr') ? 'उदा. २०२१' : 'e.g. 2021'} 
                  {...register('yearBuilt', { valueAsNumber: true })} 
                  error={errors.yearBuilt?.message as string} 
                />
                <Input 
                  icon={Layers} 
                  label={t('forms.totalFloors') || 'Total Floors'} 
                  type="number" 
                  placeholder={i18n.language?.startsWith('mr') ? 'उदा. २' : 'e.g. 2'} 
                  {...register('totalFloors', { valueAsNumber: true })} 
                  error={errors.totalFloors?.message as string} 
                />
              </div>

              {/* Floor-wise Details */}
              {totalFloors > 0 && (
                <div className="mt-2 flex flex-col gap-4 border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-slate-700">{i18n.language?.startsWith('mr') ? 'मजल्यांनुसार तपशील' : 'Floor-wise Details'}</h4>
                  {Array.from({ length: totalFloors }).map((_, index) => {
                    const floorLabel = index === 0 
                      ? (i18n.language?.startsWith('mr') ? 'तळमजला' : 'Ground Floor')
                      : (i18n.language?.startsWith('mr') ? `${index} ला मजला` : `Floor ${index}`);
                    
                    return (
                      <div key={`floor-${index}`} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-5 h-5 text-orange-500" />
                          <h5 className="font-bold text-slate-800 text-sm">{floorLabel}</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label={i18n.language?.startsWith('mr') ? 'हॉल संख्या' : 'Hall Count'} 
                            type="number" 
                            placeholder="0" 
                            {...register(`floorDetails.${index}.hallCount`, { valueAsNumber: true })} 
                          />
                          <Input 
                            label={i18n.language?.startsWith('mr') ? 'किचन संख्या' : 'Kitchen Count'} 
                            type="number" 
                            placeholder="0" 
                            {...register(`floorDetails.${index}.kitchenCount`, { valueAsNumber: true })} 
                          />
                          <Input 
                            label={i18n.language?.startsWith('mr') ? 'बेडरूम संख्या' : 'Bedrooms'} 
                            type="number" 
                            placeholder="0" 
                            {...register(`floorDetails.${index}.bedrooms`, { valueAsNumber: true })} 
                          />
                          <Input 
                            label={i18n.language?.startsWith('mr') ? 'बाथरूम संख्या' : 'Bathrooms'} 
                            type="number" 
                            placeholder="0" 
                            {...register(`floorDetails.${index}.bathrooms`, { valueAsNumber: true })} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Price Negotiable Selector */}
              {transactionType === 'sale' && (
                <div className="w-full flex flex-col gap-3 text-left mt-4">
                  <label className="text-sm font-bold text-slate-500">
                    {i18n.language?.startsWith('mr') ? 'किंमत वाटाघाटी करण्यायोग्य' : 'Price Negotiable'}
                  </label>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <button
                      type="button"
                      onClick={() => setValue('isNegotiable', false)}
                      className={`py-3 px-6 text-sm font-bold rounded-2xl border transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                        watch('isNegotiable') === false
                          ? 'bg-[#111c2e] text-white border-[#111c2e] shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {i18n.language?.startsWith('mr') ? 'नाही' : 'No'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('isNegotiable', true)}
                      className={`py-3 px-6 text-sm font-bold rounded-2xl border transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                        watch('isNegotiable') === true
                          ? 'bg-[#111c2e] text-white border-[#111c2e] shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {i18n.language?.startsWith('mr') ? 'होय' : 'Yes'}
                    </button>
                  </div>
                  {errors.isNegotiable && (
                    <span className="text-red-500 text-xs mt-1 font-bold">
                      {errors.isNegotiable.message as string}
                    </span>
                  )}
                </div>
              )}
            </div>

          </section>

          {/* Section 4: Additional Details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={Settings} title={t('forms.additionalDetails') || 'Additional Details'} iconColorClass="text-emerald-600" />
            <div className="p-6 flex flex-col gap-5 text-left">
              
              {/* Facing Direction */}
              <Controller
                name="facingDirection"
                control={control}
                render={({ field }) => (
                  <Select 
                    label={t('forms.facingDirection') || 'Facing Direction'} 
                    options={[
                      { value: 'East', label: i18n.language?.startsWith('mr') ? 'पूर्व' : 'East' },
                      { value: 'West', label: i18n.language?.startsWith('mr') ? 'पश्चिम' : 'West' },
                      { value: 'North', label: i18n.language?.startsWith('mr') ? 'उत्तर' : 'North' },
                      { value: 'South', label: i18n.language?.startsWith('mr') ? 'दक्षिण' : 'South' }
                    ]} 
                    {...field} 
                  />
                )}
              />

              {/* Furnishing Status Toggle */}
              <Controller
                name="furnishingStatus"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ToggleSwitch
                    icon={Armchair}
                    label={i18n.language?.startsWith('mr') ? 'पूर्ण फर्निश्ड' : 'Fully Furnished'}
                    description={i18n.language?.startsWith('mr') ? 'घरात वॉर्डरोब, बेड, सोफा, किचन, एसी इत्यादी सुविधा आहेत का.' : 'Does the property include wardrobes, beds, sofa, kitchen, AC, etc.'}
                    checked={value === 'Furnished'}
                    onChange={(checked) => onChange(checked ? 'Furnished' : 'Unfurnished')}
                  />
                )}
              />

              {/* Car Parking Toggle */}
              <Controller
                name="carParking"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ToggleSwitch
                    icon={CarFront}
                    label={i18n.language?.startsWith('mr') ? 'राखीव कार पार्किंग' : 'Reserved Car Parking'}
                    description={i18n.language?.startsWith('mr') ? 'राखीव बंद किंवा खुली पार्किंग जागा' : 'Dedicated closed or open parking spot'}
                    checked={value}
                    onChange={onChange}
                  />
                )}
              />
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

          {/* Section: Tenant Preferences */}
          {transactionType === 'rent' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <SectionHeader icon={Users} title={t('forms.tenantPreferences')} iconColorClass="text-pink-500" />
              <div className="p-6 flex flex-col gap-5">
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
                          className={`w-full py-4 px-5 text-sm font-semibold rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected
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
              </div>
            </section>
          )}

          {/* Media upload */}
          <MediaUploadSection 
            categoryType="House" 
            onChange={(urls) => setValue('images', urls)}
            onVideoChange={(url) => setValue('videoPath', url)}
          />

          {/* Address and location details */}
          <AddressDetailsSection 
            register={register} 
            errors={errors} 
            control={control} 
            districts={districts} 
            talukas={talukas} 
          />
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
