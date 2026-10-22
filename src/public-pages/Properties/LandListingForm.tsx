import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  LayoutGrid, Check, Rocket,
  Navigation, Ruler
} from 'lucide-react';
import * as z from 'zod';
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
import { WaterFacilitySection } from '../../components/property-form/WaterFacilitySection';
import { MediaUploadSection } from '../../components/property-form/MediaUploadSection';
import { AddressDetailsSection } from '../../components/property-form/AddressDetailsSection';
import { LoanDetailsSection } from '../../components/property-form/LoanDetailsSection';

interface LandListingFormProps {
  onBack: () => void;
  onSuccess: (propertyCode: string) => void;
  onTransactionTypeChange?: (type: 'sale' | 'rent') => void;
  initialTransactionType?: 'sale' | 'rent';
  initialData?: any;
  isEditMode?: boolean;
}

export const LandListingForm: React.FC<LandListingFormProps> = ({ onBack, onSuccess, onTransactionTypeChange, initialTransactionType, initialData, isEditMode }) => {
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
  const [facingOptions, setFacingOptions] = useState<any[]>([]);

  // States for custom button group selectors
  const [areaType, setAreaType] = useState<'sqft' | 'guthevari'>(initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'));

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
        // Standard fallbacks if Firestore fails
        setDistricts([{ value: 'Sangli', label: 'Sangli' }]);
        setTalukas([{ value: 'Miraj', label: 'Miraj' }]);
        setFacingOptions([
          { value: 'East', label: 'East' },
          { value: 'West', label: 'West' },
          { value: 'North', label: 'North' },
          { value: 'South', label: 'South' }
        ]);
      }
    };
    loadData();
  }, []);

  const baseSchema = transactionType === 'sale' ? sellPropertySchema : rentPropertySchema;
  const schema = useMemo(() => {
    const extended = baseSchema.extend({
      areaType: z.string().optional(),
      negotiable: z.boolean().optional(),
      hasLoan: z.boolean().optional(),
      loanBankName: z.string().optional(),
      loanAmount: z.number().optional().or(z.literal(0)).or(z.string().optional()),
      roadDistance: z.string().optional().or(z.number().optional()),
      roadDistanceUnit: z.string().optional(),
      waterSourceType: z.string().optional(),
      waterSourceAvailable: z.boolean().optional()
    });

    if (transactionType === 'sale') {
      return extended.extend({
        priceType: z.enum(['total_price', 'price_per_guntha']),
        priceAmount: z.number().min(1, i18n.language?.startsWith('mr') ? "किंमत आवश्यक आहे आणि ती पॉझिटिव्ह असणे आवश्यक आहे" : "Price is required and must be positive"),
        expectedPrice: z.number().optional().or(z.literal(0)).or(z.string().optional()),
        isNegotiable: z.boolean({ message: i18n.language?.startsWith('mr') ? "किंमत तडजोड करण्यायोग्य आहे की नाही ते निवडा" : "Please select if price is negotiable" })
      });
    }
    return extended;
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
      priceType: initialData?.priceType || (initialData?.pricingDetails?.isPricePerGuntha ? 'price_per_guntha' : 'total_price'),
      priceAmount: initialData?.priceAmount || initialData?.price || initialData?.pricingDetails?.price || undefined,
      isNegotiable: initialData?.isNegotiable !== undefined ? initialData.isNegotiable : true,
      expectedPrice: initialData?.expectedPrice || initialData?.price || initialData?.pricingDetails?.price || undefined,
      monthlyRent: initialData?.monthlyRent || initialData?.price || initialData?.pricingDetails?.price || undefined,
      securityDeposit: initialData?.securityDeposit || initialData?.pricingDetails?.securityDeposit || 0,
      maintenanceCharges: initialData?.maintenanceCharges || initialData?.pricingDetails?.maintenanceCharges || 0,
      
      // Layout details
      areaType: initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'),
      builtUpArea: initialData?.builtUpArea || initialData?.carpetArea || initialData?.layoutDetails?.areaSqFt || initialData?.layoutDetails?.plotArea || undefined,
      totalRooms: initialData?.totalRooms || initialData?.bedrooms || initialData?.propertyInformation?.bhk || 1,
      bedrooms: initialData?.bedrooms || initialData?.propertyInformation?.bhk || 0,
      bathrooms: initialData?.bathrooms || initialData?.propertyInformation?.bathrooms || 0,
      balconies: initialData?.balconies || 0,
      totalFloors: initialData?.totalFloors || initialData?.layoutDetails?.totalFloors || 1,
      floorNumber: initialData?.floorNumber || initialData?.layoutDetails?.floorNumber || 0,
      yearBuilt: initialData?.yearBuilt || new Date().getFullYear(),

      // Dropdowns & Toggle Defaults
      landType: initialData?.landType || initialData?.propertyInformation?.landType || 'Bagayat',
      occupancyClass: initialData?.occupancyClass || initialData?.propertyInformation?.occupancyClass || 'Class 1',
      roadTouch: initialData?.roadTouch !== undefined ? initialData.roadTouch : false,
      roadDistance: initialData?.roadDistance || initialData?.layoutDetails?.roadDistance || '',
      roadDistanceUnit: initialData?.roadDistanceUnit || initialData?.layoutDetails?.roadDistanceUnit || 'Meter',
      waterSourceAvailable: initialData?.waterSourceAvailable !== undefined ? initialData.waterSourceAvailable : false,
      waterSourceType: initialData?.waterSourceType || initialData?.additionalDetails?.waterSourceType || 'River',
      facingDirection: initialData?.facingDirection || initialData?.additionalDetails?.facingDirection || 'East',
      furnishingStatus: initialData?.furnishingStatus || initialData?.additionalDetails?.furnishingStatus || 'Unfurnished',
      carParking: initialData?.carParking !== undefined ? initialData.carParking : false,
      lift: initialData?.lift !== undefined ? initialData.lift : false,
      garden: initialData?.garden !== undefined ? initialData.garden : false,
      waterSupply: initialData?.waterSupply !== undefined ? initialData.waterSupply : false,
      powerBackup: initialData?.powerBackup !== undefined ? initialData.powerBackup : false,
      hasLoan: initialData?.hasLoan !== undefined ? initialData.hasLoan : false,
      loanBankName: initialData?.loanBankName || '',
      loanAmount: initialData?.loanAmount || undefined,
      
      // Address & location
      state: initialData?.state || 'Maharashtra',
      district: initialData?.district || initialData?.addressLocation?.district || 'Sangli',
      taluka: initialData?.taluka || initialData?.addressLocation?.taluka || 'Miraj',
      cityVillage: initialData?.cityVillage || initialData?.addressLocation?.village || '',
      pincode: initialData?.pincode || '416415',
      fullAddress: initialData?.fullAddress || initialData?.addressLocation?.address || '',
      description: initialData?.description || initialData?.propertyInformation?.description || 'Fertile agricultural land block / prime commercial development space with clear title boundaries.', // Satisfies schema constraint
      amenities: initialData?.amenities || initialData?.propertyInformation?.amenities || [],
      images: initialData?.images || initialData?.mediaUpload?.images || [],
      videoPath: initialData?.videoPath || initialData?.mediaUpload?.videoPath || '',
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      let expectedPrice = data.priceAmount;
      let calculatedTotalPrice = undefined;
      let calculatedPricePerGuntha = undefined;

      if (transactionType === 'sale') {
        const builtUpArea = data.builtUpArea;
        const areaType = data.areaType || 'sqft';
        let totalGuntha = 0;
        if (builtUpArea && !isNaN(builtUpArea)) {
          totalGuntha = areaType === 'guthevari' ? builtUpArea : builtUpArea / 1089;
        }

        if (data.priceType === 'total_price') {
          expectedPrice = data.priceAmount;
          calculatedTotalPrice = data.priceAmount;
          if (totalGuntha > 0) {
            calculatedPricePerGuntha = Math.round(data.priceAmount / totalGuntha);
          }
        } else if (data.priceType === 'price_per_guntha') {
          calculatedPricePerGuntha = data.priceAmount;
          if (totalGuntha > 0) {
            calculatedTotalPrice = Math.round(data.priceAmount * totalGuntha);
            expectedPrice = calculatedTotalPrice;
          } else {
            expectedPrice = data.priceAmount;
          }
        }
      }

      const payload = mapToFirebaseProperty(data, {
        category: 'Land',
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
        ...(transactionType === 'sale' ? {
          expectedPrice,
          calculatedTotalPrice,
          calculatedPricePerGuntha,
          price: expectedPrice
        } : {
          price: data.monthlyRent
        })
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

  const landTypes = [
    { value: 'Bagayat', label: i18n.language?.startsWith('mr') ? 'बागायात' : 'Bagayat' },
    { value: 'Jirayat', label: i18n.language?.startsWith('mr') ? 'जिरायत' : 'Jirayat' },
    { value: 'Padik', label: i18n.language?.startsWith('mr') ? 'पडिक' : 'Padik' },
    { value: 'Dongral', label: i18n.language?.startsWith('mr') ? 'डोंगराळ' : 'Dongral' }
  ];

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
              { label: t('forms.sellCategory', { category: t('categories.land') }), value: 'sale' },
              { label: t('forms.rentCategory', { category: t('categories.land') }), value: 'rent' }
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
            categoryType="Land" 
          />

          {/* Property Information */}
          <PropertyInformationSection 
            register={register} 
            errors={errors} 
            categoryType="Land" 
            transactionType={transactionType} 
            watch={watch}
            setValue={setValue}
          />

          {/* Layout details */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SectionHeader icon={LayoutGrid} title={t('forms.layoutDetails') || 'Layout Details'} iconColorClass="text-amber-600" />
            <div className="p-6 flex flex-col gap-5 text-left">
              
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

              {/* Land Type Pill Selector */}
              <div className="w-full flex flex-col gap-1.5 text-left">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  {i18n.language?.startsWith('mr') ? 'जमिनीचा प्रकार' : 'Land Type'}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {landTypes.map((item) => {
                    const isActive = watch('landType') === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setValue('landType', item.value)}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                          isActive
                            ? 'bg-[#111c2e]/10 border-[#111c2e] text-[#111c2e] font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {isActive && <Check className="w-4 h-4 text-[#111c2e]" />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Occupancy Class Select */}
              <Controller
                name="occupancyClass"
                control={control}
                render={({ field }) => (
                  <Select 
                    label={i18n.language?.startsWith('mr') ? 'धारणाधिकार वर्ग' : 'Occupancy Class'} 
                    options={[
                      { value: 'Class 1', label: i18n.language?.startsWith('mr') ? 'वर्ग 1' : 'Class 1' },
                      { value: 'Class 2', label: i18n.language?.startsWith('mr') ? 'वर्ग 2' : 'Class 2' },
                      { value: 'Class 3', label: i18n.language?.startsWith('mr') ? 'वर्ग 3' : 'Class 3' }
                    ]} 
                    {...field} 
                  />
                )}
              />

              {/* Goot Touch Road Toggle */}
              <Controller
                name="roadTouch"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ToggleSwitch
                    icon={Navigation}
                    label={i18n.language?.startsWith('mr') ? 'जमिनीला उपलब्ध रस्ता' : 'Road Access to Land'}
                    description={i18n.language?.startsWith('mr') ? 'जमीन थेट मुख्य रस्त्याला जोडलेली आहे का' : 'Is the land directly connected to a main road?'}
                    checked={!!value}
                    onChange={onChange}
                  />
                )}
              />

              {/* Distance from Road Layout */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input 
                    icon={Ruler} 
                    label={i18n.language?.startsWith('mr') ? 'रस्त्यापासून जमिनीचे अंतर' : 'Distance from Road'} 
                    placeholder={i18n.language?.startsWith('mr') ? 'अंतर प्रविष्ट करा' : 'Enter distance'} 
                    {...register('roadDistance')} 
                    error={errors.roadDistance?.message as string} 
                  />
                </div>
                <div className="col-span-1">
                  <Controller
                    name="roadDistanceUnit"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        label={i18n.language?.startsWith('mr') ? 'एकक' : 'Unit'} 
                        options={[
                          { value: 'Meter', label: i18n.language?.startsWith('mr') ? 'मीटर' : 'Meter' },
                          { value: 'Foot', label: i18n.language?.startsWith('mr') ? 'फूट' : 'Foot' },
                          { value: 'Km', label: i18n.language?.startsWith('mr') ? 'किमी' : 'Km' }
                        ]} 
                        {...field} 
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Water source & Facing details */}
          <WaterFacilitySection 
            control={control}
            watch={watch}
            setValue={setValue}
            facingOptions={facingOptions}
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
            categoryType="Land" 
            onChange={(urls) => setValue('images', urls)}
            onVideoChange={(url) => setValue('videoPath', url)}
          />

          {/* Address details */}
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
