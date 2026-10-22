import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Rocket, LayoutGrid, Building, Calendar, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { sellPropertySchema, rentPropertySchema } from '../../schemas/property.schema';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { fetchCollection, createDocument } from '../../services/firebase';
import { useAuth } from '../../app/providers/AuthProvider';
import { scrollToFirstError } from '../../utils/validation';
import { useFocusRetention } from '../../hooks/useFocusRetention';
import { mapToFirebaseProperty } from '../../utils/propertyMapper';

// Modular Reusable Form Sections
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { OwnerDetailsSection } from '../../components/property-form/OwnerDetailsSection';
import { PropertyInformationSection } from '../../components/property-form/PropertyInformationSection';
import { AdditionalDetailsSection } from '../../components/property-form/AdditionalDetailsSection';
import { ParkingDetailsSection } from '../../components/property-form/ParkingDetailsSection';
import { MediaUploadSection } from '../../components/property-form/MediaUploadSection';
import { AddressDetailsSection } from '../../components/property-form/AddressDetailsSection';
import { LoanDetailsSection } from '../../components/property-form/LoanDetailsSection';

interface BungalowListingFormProps {
  onBack: () => void;
  onSuccess: (propertyCode: string) => void;
  onTransactionTypeChange?: (type: 'sale' | 'rent') => void;
  initialTransactionType?: 'sale' | 'rent';
  initialData?: any;
  isEditMode?: boolean;
}

export const BungalowListingForm: React.FC<BungalowListingFormProps> = ({ onBack, onSuccess, onTransactionTypeChange, initialTransactionType, initialData, isEditMode }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>(initialData?.type || initialData?.propertyInformation?.listingType?.toLowerCase() || initialTransactionType || 'sale');
  const [plotAreaType, setPlotAreaType] = useState<'sqft' | 'guthevari'>(initialData?.plotAreaType || 'sqft');
  const [constructionAreaType, setConstructionAreaType] = useState<'sqft' | 'guthevari'>(initialData?.constructionAreaType || 'sqft');

  React.useEffect(() => {
    onTransactionTypeChange?.(transactionType);
  }, [transactionType, onTransactionTypeChange]);
  const [loading, setLoading] = useState(false);

  useFocusRetention();

  // Dropdown options from CMS
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);
  const [facingOptions, setFacingOptions] = useState<any[]>([]);

  useEffect(() => {
    const loadCMSData = async () => {
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
        // Fallbacks if Firebase fails/is unconfigured
        setDistricts([{ value: 'Sangli', label: 'Sangli' }, { value: 'Kolhapur', label: 'Kolhapur' }]);
        setTalukas([{ value: 'Miraj', label: 'Miraj' }, { value: 'Tasgaon', label: 'Tasgaon' }]);
        setFacingOptions([
          { value: 'East', label: 'East' },
          { value: 'West', label: 'West' },
          { value: 'North', label: 'North' },
          { value: 'South', label: 'South' }
        ]);
      }
    };
    loadCMSData();
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
      propertyName: initialData?.propertyName || initialData?.title || initialData?.propertyInformation?.title || '',
      description: initialData?.description || initialData?.propertyInformation?.description || 'Spacious independent bungalow with premium interior, private lawn, and serene surrounding.',
      isNegotiable: initialData?.isNegotiable !== undefined ? initialData.isNegotiable : true,
      
      // Standard layout defaults
      areaType: initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'),
      plotAreaType: initialData?.plotAreaType || 'sqft',
      plotArea: initialData?.plotArea || 0,
      constructionAreaType: initialData?.constructionAreaType || 'sqft',
      hallCount: initialData?.hallCount || 0,
      kitchenCount: initialData?.kitchenCount || 0,
      floorDetails: initialData?.floorDetails || [],
      landType: initialData?.landType || '',
      occupancyClass: initialData?.occupancyClass || '',
      builtUpArea: initialData?.builtUpArea || initialData?.carpetArea || initialData?.layoutDetails?.areaSqFt || undefined,
      carpetArea: initialData?.carpetArea || 0,
      totalRooms: initialData?.totalRooms || initialData?.bedrooms || initialData?.propertyInformation?.bhk || undefined,
      bedrooms: initialData?.bedrooms || initialData?.propertyInformation?.bhk || undefined,
      bathrooms: initialData?.bathrooms || initialData?.propertyInformation?.bathrooms || undefined,
      balconies: initialData?.balconies || 0,
      totalFloors: initialData?.totalFloors || initialData?.layoutDetails?.totalFloors || undefined,
      floorNumber: initialData?.floorNumber || initialData?.layoutDetails?.floorNumber || 0, // Bungalows default floorNumber to 0 (ground) to satisfy Flat-focused schema
      yearBuilt: initialData?.yearBuilt || new Date().getFullYear(),

      // Amenities & features
      facingDirection: initialData?.facingDirection || initialData?.additionalDetails?.facingDirection || 'East',
      furnishingStatus: initialData?.furnishingStatus || initialData?.additionalDetails?.furnishingStatus || 'Unfurnished',
      carParking: initialData?.carParking !== undefined ? initialData.carParking : false,
      lift: initialData?.lift !== undefined ? initialData.lift : false, // Bungalows rarely have passenger elevators, default to false
      garden: initialData?.garden !== undefined ? initialData.garden : false,
      terrace: initialData?.terrace !== undefined ? initialData.terrace : false,
      waterSupply: initialData?.waterSupply !== undefined ? initialData.waterSupply : true,
      powerBackup: initialData?.powerBackup !== undefined ? initialData.powerBackup : true,
      
      // Address defaults
      state: initialData?.state || 'Maharashtra',
      district: initialData?.district || initialData?.addressLocation?.district || 'Sangli',
      taluka: initialData?.taluka || initialData?.addressLocation?.taluka || 'Miraj',
      cityVillage: initialData?.cityVillage || initialData?.addressLocation?.village || '',
      pincode: initialData?.pincode || '416415',
      fullAddress: initialData?.fullAddress || initialData?.addressLocation?.address || '',
      
      // Rent details
      bachelorsAllowed: initialData?.bachelorsAllowed !== undefined ? initialData.bachelorsAllowed : false,
      familyPreferred: initialData?.familyPreferred !== undefined ? initialData.familyPreferred : true,
      petsAllowed: initialData?.petsAllowed !== undefined ? initialData.petsAllowed : true,
      workingProfessionalsAllowed: initialData?.workingProfessionalsAllowed !== undefined ? initialData.workingProfessionalsAllowed : true,
      expectedPrice: initialData?.expectedPrice || initialData?.price || initialData?.pricingDetails?.price || undefined,
      monthlyRent: initialData?.monthlyRent || initialData?.price || initialData?.pricingDetails?.price || undefined,
      securityDeposit: initialData?.securityDeposit || initialData?.pricingDetails?.securityDeposit || 0,
      maintenanceCharges: initialData?.maintenanceCharges || initialData?.pricingDetails?.maintenanceCharges || 0,
      
      // Parking options
      parkingType: initialData?.parkingType || 'Covered',
      parkingCapacity: initialData?.parkingCapacity || 1,
      hasLoan: initialData?.hasLoan !== undefined ? initialData.hasLoan : false,
      loanBankName: initialData?.loanBankName || '',
      loanAmount: initialData?.loanAmount || undefined,
      images: initialData?.images || initialData?.mediaUpload?.images || [],
      videoPath: initialData?.videoPath || initialData?.mediaUpload?.videoPath || '',
    }
  });

  const handleTransactionChange = (val: 'sale' | 'rent') => {
    setTransactionType(val);
    setValue('type', val);
  };

  const hasCarParking = watch('carParking');
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
      const builtUpArea = data.builtUpArea;
      const plotArea = data.plotArea;
      const plotAreaType = data.plotAreaType || 'sqft';
      let totalGuntha = 0;
      if (plotArea && !isNaN(plotArea)) {
        totalGuntha = plotAreaType === 'guthevari' ? plotArea : plotArea / 1089;
      } else if (builtUpArea && !isNaN(builtUpArea)) {
        const cAreaType = data.constructionAreaType || 'sqft';
        totalGuntha = cAreaType === 'guthevari' ? builtUpArea : builtUpArea / 1089;
      }

      const payload = mapToFirebaseProperty(data, {
        totalGuntha,
        category: 'Bungalow',
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

  return (
    <div className="bg-slate-50/50 rounded-2xl">
      {/* Top Header */}
      <div className="mb-6 flex justify-center">
        <div className="w-full max-w-sm">
          <SegmentedControl
            options={[
              { label: t('forms.sellCategory', { category: t('categories.bungalow') }), value: 'sale' },
              { label: t('forms.rentCategory', { category: t('categories.bungalow') }), value: 'rent' }
            ]}
            value={transactionType}
            onChange={(val) => handleTransactionChange(val as 'sale' | 'rent')}
          />
        </div>
      </div>

      {/* Main Listing Form */}
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-6">
        <motion.div 
          layout
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col gap-6"
        >
          {/* Owner details */}
          <OwnerDetailsSection 
            register={register} 
            errors={errors} 
            categoryType="Bungalow" 
          />

          {/* Hidden inputs for custom state fields */}
          <input type="hidden" {...register('plotAreaType')} />
          <input type="hidden" {...register('constructionAreaType')} />
          <input type="hidden" {...register('isNegotiable')} />
          <input type="hidden" {...register('bedrooms', { valueAsNumber: true })} />
          <input type="hidden" {...register('bathrooms', { valueAsNumber: true })} />
          <input type="hidden" {...register('hallCount', { valueAsNumber: true })} />
          <input type="hidden" {...register('kitchenCount', { valueAsNumber: true })} />
          <input type="hidden" {...register('totalRooms', { valueAsNumber: true })} />

          {/* Property information */}
          <PropertyInformationSection 
            register={register} 
            errors={errors} 
            categoryType="Bungalow" 
            transactionType={transactionType} 
            watch={watch}
            setValue={setValue}
          />

          {/* Layout Details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 bg-orange-50/30 border-b border-orange-100/50 rounded-t-2xl">
              <div className="text-amber-700">
                <LayoutGrid className="w-5 h-5" fill="currentColor" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-serif tracking-wide">{t('forms.layoutDetails') || 'Layout Details'}</h3>
            </div>
            <div className="p-6 flex flex-col gap-5 text-left">
              
              {/* Plot Area */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  {i18n.language?.startsWith('mr') ? 'प्लॉट साईज' : 'Plot Size'}
                </label>
                <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setPlotAreaType('sqft');
                      setValue('plotAreaType', 'sqft');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                      plotAreaType === 'sqft'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t('forms.sqftLabel') || 'Square Feet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlotAreaType('guthevari');
                      setValue('plotAreaType', 'guthevari');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                      plotAreaType === 'guthevari'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t('forms.guthevariLabel') || 'Guntha'}
                  </button>
                </div>
              </div>
              <Input 
                icon={LayoutGrid} 
                label={plotAreaType === 'sqft' ? (i18n.language?.startsWith('mr') ? 'प्लॉट साईज (चौरस फूट)' : 'Plot Size (Sqft)') : (i18n.language?.startsWith('mr') ? 'प्लॉट साईज (गुंठा)' : 'Plot Size (Guntha)')} 
                type="number" 
                placeholder={plotAreaType === 'sqft' ? (i18n.language?.startsWith('mr') ? 'चौरस फूट भरा' : 'Enter square feet') : (i18n.language?.startsWith('mr') ? 'गुंठा भरा' : 'Enter guntha')} 
                {...register('plotArea', { valueAsNumber: true })} 
                error={errors.plotArea?.message as string} 
              />

              {/* Construction Area */}
              <div className="w-full flex flex-col gap-1.5 text-left mt-2">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  {i18n.language?.startsWith('mr') ? 'बांधकाम साईज' : 'Construction Size'}
                </label>
                <div className="flex p-1 bg-slate-100 rounded-2xl relative w-full max-w-md border border-slate-200/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setConstructionAreaType('sqft');
                      setValue('constructionAreaType', 'sqft');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                      constructionAreaType === 'sqft'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t('forms.sqftLabel') || 'Square Feet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConstructionAreaType('guthevari');
                      setValue('constructionAreaType', 'guthevari');
                    }}
                    className={`flex-1 py-3.5 px-6 text-sm font-bold rounded-xl transition-colors duration-200 cursor-pointer flex items-center justify-center ${
                      constructionAreaType === 'guthevari'
                        ? 'bg-[#111c2e] text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t('forms.guthevariLabel') || 'Guntha'}
                  </button>
                </div>
              </div>
              <Input 
                icon={LayoutGrid} 
                label={constructionAreaType === 'sqft' ? (i18n.language?.startsWith('mr') ? 'बांधकाम साईज (चौरस फूट)' : 'Construction Size (Sqft)') : (i18n.language?.startsWith('mr') ? 'बांधकाम साईज (गुंठा)' : 'Construction Size (Guntha)')} 
                type="number" 
                placeholder={constructionAreaType === 'sqft' ? (i18n.language?.startsWith('mr') ? 'चौरस फूट भरा' : 'Enter square feet') : (i18n.language?.startsWith('mr') ? 'गुंठा भरा' : 'Enter guntha')} 
                {...register('builtUpArea', { valueAsNumber: true })} 
                error={errors.builtUpArea?.message as string} 
              />

              {/* Total Floors & Year Built Row */}
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  icon={Calendar} 
                  label={t('forms.yearBuilt') || 'Year Built'} 
                  type="number" 
                  placeholder={t('forms.yearBuiltPlaceholder') || 'e.g. 2022'} 
                  {...register('yearBuilt', { valueAsNumber: true })} 
                  error={errors.yearBuilt?.message as string} 
                />
                <Input 
                  icon={Building} 
                  label={t('forms.totalFloors') || 'Total Floors'} 
                  type="number" 
                  placeholder={t('forms.totalFloorsPlaceholder') || 'e.g. 2'} 
                  {...register('totalFloors', { valueAsNumber: true })} 
                  error={errors.totalFloors?.message as string} 
                />
              </div>

              {/* Floor-wise Details */}
              {totalFloors > 0 && (
                <div className="mt-2 flex flex-col gap-4 border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-slate-700">{i18n.language?.startsWith('mr') ? 'मजल्यांनुसार तपशील' : 'Floor-wise Details'}</h4>
                  {Array.from({ length: totalFloors }).map((_, index) => {
                    const getFloorName = (idx: number, isMarathi: boolean) => {
                      if (isMarathi) {
                        if (idx === 0) return 'तळमजला';
                        if (idx === 1) return 'पहिला मजला';
                        if (idx === 2) return 'दुसरा मजला';
                        if (idx === 3) return 'तिसरा मजला';
                        if (idx === 4) return 'चौथा मजला';
                        return `${idx} वा मजला`;
                      }
                      if (idx === 0) return 'Ground Floor';
                      if (idx === 1) return 'First Floor';
                      if (idx === 2) return 'Second Floor';
                      if (idx === 3) return 'Third Floor';
                      return `Floor ${idx}`;
                    };
                    return (
                      <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-4">
                        <h5 className="font-bold text-base text-slate-800 flex items-center gap-2">
                          <Layers className="w-5 h-5 text-orange-500" />
                          {getFloorName(index, i18n.language?.startsWith('mr'))}
                        </h5>
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
                            label={i18n.language?.startsWith('mr') ? 'बेडरूम संख्या' : 'Bedroom Count'} 
                            type="number" 
                            placeholder="0" 
                            {...register(`floorDetails.${index}.bedrooms`, { valueAsNumber: true })} 
                          />
                          <Input 
                            label={i18n.language?.startsWith('mr') ? 'बाथरूम संख्या' : 'Bathroom Count'} 
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

              {/* Land Type & Occupancy Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Controller
                  name="landType"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      label={i18n.language?.startsWith('mr') ? 'जमिनीचा प्रकार' : 'Land Type'}
                      placeholder={i18n.language?.startsWith('mr') ? 'निवडा' : 'Select'}
                      options={[
                        { value: 'Residential', label: i18n.language?.startsWith('mr') ? 'निवासी (Residential)' : 'Residential' },
                        { value: 'Commercial', label: i18n.language?.startsWith('mr') ? 'व्यावसायिक (Commercial)' : 'Commercial' },
                        { value: 'Agricultural', label: i18n.language?.startsWith('mr') ? 'शेती (Agricultural)' : 'Agricultural' },
                        { value: 'NA', label: i18n.language?.startsWith('mr') ? 'NA (अकृषिक)' : 'NA' },
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
                      label={i18n.language?.startsWith('mr') ? 'कब्जेदार वर्ग' : 'Occupant Class'}
                      placeholder={i18n.language?.startsWith('mr') ? 'निवडा' : 'Select'}
                      options={[
                        { value: 'Class 1', label: i18n.language?.startsWith('mr') ? 'वर्ग १ (Class 1)' : 'Class 1' },
                        { value: 'Class 2', label: i18n.language?.startsWith('mr') ? 'वर्ग २ (Class 2)' : 'Class 2' },
                      ]}
                      {...field}
                    />
                  )}
                />
              </div>

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

          {/* Additional switches / amenities */}
          <AdditionalDetailsSection 
            control={control} 
            categoryType="Bungalow" 
            transactionType={transactionType} 
            facingOptions={facingOptions}
          />

           {/* Conditional parking capacity */}
          <ParkingDetailsSection 
            control={control} 
            register={register} 
            errors={errors} 
            visible={hasCarParking} 
          />

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

          {/* Media upload */}
          <MediaUploadSection 
            categoryType="Bungalow" 
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
