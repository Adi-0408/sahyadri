import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { sellPropertySchema, rentPropertySchema } from '../../schemas/property.schema';
import { Button } from '../../components/ui/Button';
import { fetchCollection, createDocument } from '../../services/firebase';
import { useAuth } from '../../app/providers/AuthProvider';
import { scrollToFirstError } from '../../utils/validation';
import { useFocusRetention } from '../../hooks/useFocusRetention';
import { mapToFirebaseProperty } from '../../utils/propertyMapper';

// Modular Reusable Form Sections
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { OwnerDetailsSection } from '../../components/property-form/OwnerDetailsSection';
import { PropertyInformationSection } from '../../components/property-form/PropertyInformationSection';
import { PlotDetailsSection } from '../../components/property-form/PlotDetailsSection';
import { FacingDetailsSection } from '../../components/property-form/FacingDetailsSection';
import { MediaUploadSection } from '../../components/property-form/MediaUploadSection';
import { AddressDetailsSection } from '../../components/property-form/AddressDetailsSection';
import { LoanDetailsSection } from '../../components/property-form/LoanDetailsSection';

interface PlotListingFormProps {
  onBack: () => void;
  onSuccess: (propertyCode: string) => void;
  onTransactionTypeChange?: (type: 'sale' | 'rent') => void;
  initialTransactionType?: 'sale' | 'rent';
  initialData?: any;
  isEditMode?: boolean;
}

export const PlotListingForm: React.FC<PlotListingFormProps> = ({ onBack, onSuccess, onTransactionTypeChange, initialTransactionType, initialData, isEditMode }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [transactionType, setTransactionType] = useState<'sale' | 'rent'>(initialData?.type || initialData?.propertyInformation?.listingType?.toLowerCase() || initialTransactionType || 'sale');

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
        // Fallbacks
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
        priceType: z.enum(['total_price', 'price_per_guntha']),
        priceAmount: z.number().min(1, "Price is required and must be positive"),
        expectedPrice: z.number().optional().or(z.literal(0)).or(z.string().optional()),
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
      description: initialData?.description || initialData?.propertyInformation?.description || 'Prime residential plot with excellent road connectivity and clean title, ready for immediate construction.',
      priceType: initialData?.priceType || (initialData?.pricingDetails?.isPricePerGuntha ? 'price_per_guntha' : 'total_price'),
      priceAmount: initialData?.priceAmount || initialData?.price || initialData?.pricingDetails?.price || undefined,
      isNegotiable: initialData?.isNegotiable !== undefined ? initialData.isNegotiable : true,

      // Plot details specific defaults
      areaType: initialData?.areaType || (initialData?.layoutDetails?.isAreaInGuntha ? 'guthevari' : 'sqft'),
      builtUpArea: initialData?.builtUpArea || initialData?.carpetArea || initialData?.layoutDetails?.areaSqFt || initialData?.layoutDetails?.plotArea || undefined,
      carpetArea: initialData?.carpetArea || 0,
      totalRooms: initialData?.totalRooms || initialData?.bedrooms || initialData?.propertyInformation?.bhk || 1, // Mock layout fields to satisfy flat/house schema
      bedrooms: initialData?.bedrooms || initialData?.propertyInformation?.bhk || 0,
      bathrooms: initialData?.bathrooms || initialData?.propertyInformation?.bathrooms || 0,
      balconies: initialData?.balconies || 0,
      totalFloors: initialData?.totalFloors || initialData?.layoutDetails?.totalFloors || 1,
      floorNumber: initialData?.floorNumber || initialData?.layoutDetails?.floorNumber || 0,
      yearBuilt: initialData?.yearBuilt || new Date().getFullYear(),

      // Dropdowns & Toggle Defaults
      landType: initialData?.landType || initialData?.propertyInformation?.landType || 'NA',
      occupancyClass: initialData?.occupancyClass || initialData?.propertyInformation?.occupancyClass || 'Class 1',
      roadAvailable: initialData?.roadAvailable !== undefined ? initialData.roadAvailable : false,
      roadTouch: initialData?.roadTouch !== undefined ? initialData.roadTouch : false,
      gatedCommunity: initialData?.gatedCommunity !== undefined ? initialData.gatedCommunity : false,
      cornerPlot: initialData?.cornerPlot !== undefined ? initialData.cornerPlot : false,
      boundaryWall: initialData?.boundaryWall !== undefined ? initialData.boundaryWall : false,
      roadType: initialData?.roadType || initialData?.additionalDetails?.roadType || 'Registered Road',
      facingDirection: initialData?.facingDirection || initialData?.additionalDetails?.facingDirection || 'East',
      furnishingStatus: initialData?.furnishingStatus || initialData?.additionalDetails?.furnishingStatus || 'Unfurnished',
      carParking: initialData?.carParking !== undefined ? initialData.carParking : false,
      lift: initialData?.lift !== undefined ? initialData.lift : false,
      garden: initialData?.garden !== undefined ? initialData.garden : false,
      waterSupply: initialData?.waterSupply !== undefined ? initialData.waterSupply : false,
      powerBackup: initialData?.powerBackup !== undefined ? initialData.powerBackup : false,

      // Address defaults
      state: initialData?.state || 'Maharashtra',
      district: initialData?.district || initialData?.addressLocation?.district || 'Sangli',
      taluka: initialData?.taluka || initialData?.addressLocation?.taluka || 'Miraj',
      cityVillage: initialData?.cityVillage || initialData?.addressLocation?.village || '',
      pincode: initialData?.pincode || '416415',
      fullAddress: initialData?.fullAddress || initialData?.addressLocation?.address || '',

      // Rent details defaults
      monthlyRent: initialData?.monthlyRent || initialData?.price || initialData?.pricingDetails?.price || undefined,
      securityDeposit: initialData?.securityDeposit || initialData?.pricingDetails?.securityDeposit || undefined,
      bachelorsAllowed: initialData?.bachelorsAllowed !== undefined ? initialData.bachelorsAllowed : true,
      familyPreferred: initialData?.familyPreferred !== undefined ? initialData.familyPreferred : true,
      petsAllowed: initialData?.petsAllowed !== undefined ? initialData.petsAllowed : true,
      workingProfessionalsAllowed: initialData?.workingProfessionalsAllowed !== undefined ? initialData.workingProfessionalsAllowed : true,

      // Loan defaults
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
        category: 'Plot',
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
      console.error("Failed to submit plot:", error);
      alert(error?.message || "Failed to submit plot. Please check your inputs.");
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
              { label: t('forms.sellCategory', { category: t('categories.plot') }), value: 'sale' },
              { label: t('forms.rentCategory', { category: t('categories.plot') }), value: 'rent' }
            ]}
            value={transactionType}
            onChange={(val) => handleTransactionChange(val as 'sale' | 'rent')}
          />
        </div>
      </div>

      {/* Form Area */}
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
            categoryType="Plot"
          />

          {/* Property Information */}
          <PropertyInformationSection
            register={register}
            errors={errors}
            categoryType="Plot"
            transactionType={transactionType}
            watch={watch}
            setValue={setValue}
          />

          {/* Plot Details */}
          <PlotDetailsSection
            register={register}
            errors={errors}
            control={control}
            watch={watch}
          />


          {/* Facing Details */}
          <FacingDetailsSection
            control={control}
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

          {/* Media Upload */}
          <MediaUploadSection 
            categoryType="Plot" 
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
