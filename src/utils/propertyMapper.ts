export const mapToFirebaseProperty = (flatData: any, additionalContext: any) => {
  const merged = { ...flatData, ...additionalContext };

  const ownerDetails = {
    ownerName: merged.ownerDetails?.ownerName || merged.ownerName || '',
    ownerPhone: merged.ownerDetails?.ownerPhone || merged.mobileNumber || merged.ownerPhone || '',
    ownerWhatsApp: merged.ownerDetails?.ownerWhatsApp || merged.alternateMobile || merged.ownerWhatsApp || '',
  };

  const propertyInformation = {
    title: merged.propertyInformation?.title || merged.propertyName || merged.title || '',
    description: merged.propertyInformation?.description || merged.description || '',
    propertyType: merged.propertyInformation?.propertyType || merged.category || '',
    listingType: merged.propertyInformation?.listingType || (merged.type === 'sale' ? 'Sell' : 'Rent'),
    bhk: merged.propertyInformation?.bhk || merged.bedrooms || merged.bhk || 0,
    bathrooms: merged.propertyInformation?.bathrooms || merged.bathrooms || 0,
    amenities: merged.propertyInformation?.amenities || merged.amenities || [],
    reraNumber: merged.propertyInformation?.reraNumber || merged.reraNumber || '',
    gutNumber: merged.propertyInformation?.gutNumber || merged.gutNumber || '',
    surveyNumber: merged.propertyInformation?.surveyNumber || merged.surveyNumber || '',
  };

  const layoutDetails = {
    areaSqFt: merged.layoutDetails?.areaSqFt || merged.builtUpArea || merged.areaSqFt || 0,
    isAreaInGuntha: merged.layoutDetails?.isAreaInGuntha !== undefined ? merged.layoutDetails.isAreaInGuntha : (merged.areaType === 'guthevari'),
    plotArea: merged.layoutDetails?.plotArea || merged.plotArea || merged.builtUpArea || 0,
    carpetArea: merged.layoutDetails?.carpetArea || merged.carpetArea || 0,
    totalFloors: merged.layoutDetails?.totalFloors || merged.totalFloors || 0,
    floorNumber: merged.layoutDetails?.floorNumber || merged.floorNumber || 0,
    liftAvailable: merged.layoutDetails?.liftAvailable || (merged.lift ? 'Yes' : 'No'),
    roadWidth: merged.layoutDetails?.roadWidth || merged.roadWidth || 0,
  };

  const pricingDetails = {
    price: merged.pricingDetails?.price || merged.price || merged.expectedPrice || merged.monthlyRent || 0,
    isNegotiable: merged.pricingDetails?.isNegotiable || (merged.isNegotiable ? 'Yes' : 'No'),
    isPricePerGuntha: merged.pricingDetails?.isPricePerGuntha !== undefined ? merged.pricingDetails.isPricePerGuntha : (merged.priceType === 'price_per_guntha'),
    expectedPrice: merged.pricingDetails?.expectedPrice || merged.expectedPrice || 0,
    monthlyRent: merged.pricingDetails?.monthlyRent || merged.monthlyRent || 0,
    securityDeposit: merged.pricingDetails?.securityDeposit || merged.securityDeposit || 0,
    maintenanceCharges: merged.pricingDetails?.maintenanceCharges || merged.maintenanceCharges || 0,
  };

  const addressLocation = {
    district: merged.addressLocation?.district || merged.district || '',
    taluka: merged.addressLocation?.taluka || merged.taluka || '',
    village: merged.addressLocation?.village || merged.cityVillage || '',
    address: merged.addressLocation?.address || merged.fullAddress || merged.address || '',
    latitude: merged.addressLocation?.latitude || merged.latitude || null,
    longitude: merged.addressLocation?.longitude || merged.longitude || null,
  };

  const mediaUpload = {
    images: merged.mediaUpload?.images || merged.images || [],
    videoPath: merged.mediaUpload?.videoPath || merged.videoPath || '',
  };

  const additionalDetails = {
    facingDirection: merged.additionalDetails?.facingDirection || merged.facingDirection || '',
    furnishingStatus: merged.additionalDetails?.furnishingStatus || merged.furnishingStatus || '',
    carParking: merged.additionalDetails?.carParking !== undefined ? merged.additionalDetails.carParking : !!merged.carParking,
    parkingType: merged.additionalDetails?.parkingType || merged.parkingType || '',
    lift: merged.additionalDetails?.lift !== undefined ? merged.additionalDetails.lift : !!merged.lift,
    waterSupply: merged.additionalDetails?.waterSupply !== undefined ? merged.additionalDetails.waterSupply : !!merged.waterSupply,
    powerBackup: merged.additionalDetails?.powerBackup !== undefined ? merged.additionalDetails.powerBackup : !!merged.powerBackup,
    amenities: merged.additionalDetails?.amenities || merged.amenities || [],
  };

  const visibilitySettings = {
    fields: {
      expectedPrice: merged.visibilitySettings?.fields?.expectedPrice !== undefined ? merged.visibilitySettings.fields.expectedPrice : true,
      mobileNumber: merged.visibilitySettings?.fields?.mobileNumber !== undefined ? merged.visibilitySettings.fields.mobileNumber : true,
      ownerName: merged.visibilitySettings?.fields?.ownerName !== undefined ? merged.visibilitySettings.fields.ownerName : true,
    },
    sections: {
      addressDetails: merged.visibilitySettings?.sections?.addressDetails !== undefined ? merged.visibilitySettings.sections.addressDetails : true,
      facilitiesUtilities: merged.visibilitySettings?.sections?.facilitiesUtilities !== undefined ? merged.visibilitySettings.sections.facilitiesUtilities : true,
      mediaGallery: merged.visibilitySettings?.sections?.mediaGallery !== undefined ? merged.visibilitySettings.sections.mediaGallery : true,
    }
  };

  return {
    ...merged, // keep flat fields for backward compatibility
    ownerDetails,
    propertyInformation,
    layoutDetails,
    pricingDetails,
    addressLocation,
    mediaUpload,
    additionalDetails,
    visibilitySettings,
    // Root level fields matching spec
    userId: merged.userId || 'guest-user',
    ownerId: merged.ownerId || merged.userId || 'guest-user', // Android compatibility
    status: merged.status || 'pending',
    adminApproved: merged.adminApproved !== undefined 
      ? Boolean(merged.adminApproved) 
      : (merged.status === 'approved' || merged.status === 'active'),
    isActive: merged.isActive !== undefined 
      ? Boolean(merged.isActive) 
      : (merged.status === 'approved' || merged.status === 'active'),
    listingType: propertyInformation.listingType, // Root-level listing type for Android
    propertyCode: merged.propertyCode || '',
    isSoldOut: Boolean(merged.isSoldOut),
    soldAt: merged.soldAt || null,
    soldPrice: merged.soldPrice || null,
    buyerName: merged.buyerName || null,
    buyerPhone: merged.buyerPhone || null,
    isFeatured: Boolean(merged.isFeatured),
    viewsCount: merged.viewsCount || 0,
    favoriteCount: merged.favoriteCount || 0,
    createdAt: merged.createdAt || new Date().toISOString(),
    updatedAt: merged.updatedAt || new Date().toISOString(),
  };
};
