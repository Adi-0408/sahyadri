import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createDocument, subscribeToDocument, getCachedCollection } from '../../services/firebase';
import {
  MapPin, BedDouble, Bath, Ruler, Heart, MessageSquare, ArrowLeft, CheckCircle,
  Compass, ShieldAlert, Phone, Shield, Droplet, Bolt, Trees, Home, Utensils,
  Building, ArrowUpDown, CarFront, User, IndianRupee, Layers, Calendar,
  GitFork, Columns, Hammer, Zap, Armchair, Landmark, Users, Mail, ShoppingBag, Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Dialog } from '../../components/ui/Dialog';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { useAuth } from '../../app/providers/AuthProvider';


const FieldIconMap: Record<string, any> = {
  ownerName: User,
  mobileNumber: Phone,
  alternateMobile: Phone,
  email: Mail,
  propertyName: Home,
  gutNumber: Compass,
  priceType: IndianRupee,
  priceAmount: IndianRupee,
  expectedPrice: IndianRupee,
  isNegotiable: ArrowUpDown,
  monthlyRent: IndianRupee,
  securityDeposit: IndianRupee,
  maintenanceCharges: IndianRupee,
  builtUpArea: Ruler,
  carpetArea: Ruler,
  totalRooms: Home,
  bedrooms: BedDouble,
  bathrooms: Bath,
  balconies: Columns,
  floorNumber: Layers,
  totalFloors: Layers,
  yearBuilt: Calendar,
  flatType: Layers,
  landType: Compass,
  occupancyClass: ShieldAlert,
  isSharedRoad: GitFork,
  roadAvailable: GitFork,
  roadTouch: GitFork,
  roadType: GitFork,
  gatedCommunity: Columns,
  cornerPlot: Compass,
  boundaryWall: Hammer,
  electricityConnection: Zap,
  fencingAvailable: ShieldAlert,
  facingDirection: Compass,
  furnishingStatus: Armchair,
  terrace: Landmark,
  carParking: CarFront,
  parkingType: CarFront,
  parkingCapacity: CarFront,
  parkingNumber: CarFront,
  lift: ArrowUpDown,
  garden: Trees,
  waterSupply: Droplet,
  powerBackup: Bolt,
  bachelorsAllowed: Users,
  familyPreferred: Users,
  petsAllowed: Users,
  workingProfessionalsAllowed: Users,
  foodPreference: Utensils,
  hasLoan: Landmark,
  loanBankName: Landmark,
  loanAmount: IndianRupee,
  state: MapPin,
  district: MapPin,
  taluka: MapPin,
  cityVillage: Building,
  pincode: MapPin,
  landmark: MapPin,
  fullAddress: MapPin
};

const DETAILS_SECTIONS = [
  {
    id: 'ownerDetails',
    label: 'Owner Details',
    fields: [
      { id: 'ownerName', label: 'Owner Name' },
      { id: 'mobileNumber', label: 'Mobile Number' },
      { id: 'alternateMobile', label: 'Alternate Mobile Number' },
      { id: 'email', label: 'Email Address' }
    ]
  },
  {
    id: 'propertyInfo',
    label: 'Property Information',
    fields: [
      { id: 'propertyName', label: 'Property Title / Name' },
      { id: 'gutNumber', label: 'Gut Number / Gat Number' },
      { id: 'priceType', label: 'Price Type (Sale)' },
      { id: 'priceAmount', label: 'Price Amount (Sale)' },
      { id: 'expectedPrice', label: 'Expected Price (Sale)' },
      { id: 'isNegotiable', label: 'Is Negotiable (Sale)' },
      { id: 'monthlyRent', label: 'Monthly Rent' },
      { id: 'securityDeposit', label: 'Security Deposit' },
      { id: 'maintenanceCharges', label: 'Maintenance Charges' }
    ]
  },
  {
    id: 'layoutDetails',
    label: 'Layout Details',
    fields: [
      { id: 'plotArea', label: 'Plot Area' },
      { id: 'builtUpArea', label: 'Construction Area' },
      { id: 'carpetArea', label: 'Carpet Area' },
      { id: 'totalRooms', label: 'Total Rooms' },
      { id: 'hallCount', label: 'Hall Count' },
      { id: 'kitchenCount', label: 'Kitchen Count' },
      { id: 'bedrooms', label: 'Bedrooms' },
      { id: 'bathrooms', label: 'Bathrooms' },
      { id: 'balconies', label: 'Balconies' },
      { id: 'floorNumber', label: 'Floor Number' },
      { id: 'totalFloors', label: 'Total Floors' },
      { id: 'floorDetails', label: 'Floor Details' },
      { id: 'yearBuilt', label: 'Year Built' },
      { id: 'flatType', label: 'Flat Configuration' },
      { id: 'landType', label: 'Land Type' },
      { id: 'occupancyClass', label: 'Occupancy Class' },
      { id: 'isNegotiable', label: 'Price Negotiable' }
    ]
  },
  {
    id: 'plotLandDetails',
    label: 'Plot & Land Details',
    fields: [
      { id: 'landType', label: 'Land Type' },
      { id: 'occupancyClass', label: 'Occupancy Class' },
      { id: 'isSharedRoad', label: 'Shared Road' },
      { id: 'roadAvailable', label: 'Access Road Available' },
      { id: 'roadTouch', label: 'Road Touch' },
      { id: 'roadType', label: 'Road Type' },
      { id: 'gatedCommunity', label: 'Gated Community' },
      { id: 'cornerPlot', label: 'Corner Plot' },
      { id: 'boundaryWall', label: 'Boundary Wall' },
      { id: 'electricityConnection', label: 'Electricity Connection' },
      { id: 'fencingAvailable', label: 'Fencing Available' }
    ]
  },
  {
    id: 'facilitiesUtilities',
    label: 'Facilities & Amenities',
    fields: [
      { id: 'facingDirection', label: 'Facing Direction' },
      { id: 'furnishingStatus', label: 'Furnishing Status' },
      { id: 'terrace', label: 'Private Terrace' },
      { id: 'carParking', label: 'Reserved Car Parking' },
      { id: 'parkingType', label: 'Parking Type' },
      { id: 'parkingCapacity', label: 'Parking Capacity' },
      { id: 'parkingNumber', label: 'Parking Number' },
      { id: 'lift', label: 'Lift' },
      { id: 'garden', label: 'Garden' },
      { id: 'waterSupply', label: 'Water Supply' },
      { id: 'powerBackup', label: 'Power Backup' },
      { id: 'bachelorsAllowed', label: 'Bachelors Allowed' },
      { id: 'familyPreferred', label: 'Family Preferred' },
      { id: 'petsAllowed', label: 'Pets Allowed' },
      { id: 'workingProfessionalsAllowed', label: 'Working Professionals Allowed' },
      { id: 'foodPreference', label: 'Food Preference' }
    ]
  },
  {
    id: 'loanDetails',
    label: 'Bank Loan Information',
    fields: [
      { id: 'hasLoan', label: 'Has Existing Loan' },
      { id: 'loanBankName', label: 'Loan Bank Name' },
      { id: 'loanAmount', label: 'Loan Amount' }
    ]
  },
  {
    id: 'addressDetails',
    label: 'Address & Location',
    fields: [
      { id: 'state', label: 'State' },
      { id: 'district', label: 'District' },
      { id: 'taluka', label: 'Taluka' },
      { id: 'cityVillage', label: 'City / Village' },
      { id: 'pincode', label: 'Pincode' },
      { id: 'landmark', label: 'Landmark' },
      { id: 'fullAddress', label: 'Full Address' }
    ]
  }
];

export const Details: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'contact'>('details');

  const [property, setProperty] = useState<any>(() => {
    if (!id) return null;
    const cached = getCachedCollection('properties');
    if (cached && Array.isArray(cached)) {
      return cached.find((p: any) => p.id === id || p.propertyCode === id || (p.id && p.id.startsWith(id))) || null;
    }
    return null;
  });
  const [activeImage, setActiveImage] = useState<string>(() => property?.images?.[0] || '');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState<boolean>(() => !property);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);

  useEffect(() => {
    if (property?.images) {
      const idx = property.images.indexOf(activeImage);
      if (idx !== -1) {
        setLightboxIndex(idx);
      }
    }
  }, [activeImage, property]);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const handlePrevImage = () => {
    if (!property?.images) return;
    const newIdx = (lightboxIndex - 1 + property.images.length) % property.images.length;
    setLightboxIndex(newIdx);
    setActiveImage(property.images[newIdx]);
  };

  const handleNextImage = () => {
    if (!property?.images) return;
    const newIdx = (lightboxIndex + 1) % property.images.length;
    setLightboxIndex(newIdx);
    setActiveImage(property.images[newIdx]);
  };

  // Auto slide hero images
  useEffect(() => {
    if (!property?.images || property.images.length <= 1 || isLightboxOpen) return;

    const interval = setInterval(() => {
      const nextIdx = (lightboxIndex + 1) % property.images.length;
      setLightboxIndex(nextIdx);
      setActiveImage(property.images[nextIdx]);
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [property?.images, lightboxIndex, isLightboxOpen]);

  // Forms states
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('I would like to inquire about this property.');
  const [inquirySuccess, setInquirySuccess] = useState(false);

  // Visit states
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitName, setVisitName] = useState('');
  const [visitEmail, setVisitEmail] = useState('');
  const [visitPhone, setVisitPhone] = useState('');
  const [visitSuccess, setVisitSuccess] = useState(false);

  // Purchase / Buy Property states
  const [isGuestBuyModalOpen, setIsGuestBuyModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseOfferedPrice, setPurchaseOfferedPrice] = useState<any>('');
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const [purchaseBuyerName, setPurchaseBuyerName] = useState('');
  const [purchaseBuyerMobile, setPurchaseBuyerMobile] = useState('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const handleBuyClick = () => {
    if (!user) {
      setIsGuestBuyModalOpen(true);
    } else {
      setPurchaseBuyerName(user.displayName || '');
      setPurchaseBuyerMobile(user.mobile || '');
      setPurchaseOfferedPrice(property?.expectedPrice || property?.price || '');
      setIsPurchaseModalOpen(true);
    }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseBuyerName.trim() || !purchaseBuyerMobile.trim()) return;

    setIsSubmittingPurchase(true);
    try {
      const cleanMobile = purchaseBuyerMobile.replace(/[^0-9]/g, '').slice(-10);
      const nowIso = new Date().toISOString();
      const propPrice = Number(property?.expectedPrice || property?.price || 0);
      const offered = Number(purchaseOfferedPrice || propPrice);

      const inquiryPayload = {
        isPurchaseIntent: true,
        type: 'purchase_request',
        propertyId: property?.id || id,
        propertyCode: property?.propertyCode || '',
        propertyName: property?.title || property?.propertyName || 'Property Listing',
        propertyCategory: property?.category || 'House',
        propertyLocation: property?.cityVillage ? `${property.cityVillage}, ${property.taluka}` : (property?.location || 'Sangli'),
        price: propPrice,
        offeredPrice: offered,
        buyerId: user?.uid || cleanMobile,
        buyerName: purchaseBuyerName.trim(),
        buyerPhone: cleanMobile,
        name: purchaseBuyerName.trim(),
        phone: cleanMobile,
        message: purchaseMessage.trim() || `I am interested in purchasing this property. Offered price: ₹${offered.toLocaleString('en-IN')}`,
        status: 'pending',
        createdAt: nowIso
      };

      await createDocument('enquiries', inquiryPayload);
      setPurchaseSuccess(true);
    } catch (err) {
      console.error('Purchase request error:', err);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    if (!property) setLoading(true);
    const unsubscribe = subscribeToDocument('properties', id, (doc) => {
      if (doc) {
        setProperty(doc);
        if (doc.images && doc.images.length > 0) {
          setActiveImage((prev) => {
            if (!prev || !doc.images.includes(prev)) {
              return doc.images[0];
            }
            return prev;
          });
        }
      } else {
        setProperty((prev: any) => prev || null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const updateSaved = () => {
      const saved = localStorage.getItem('luminous_saved_properties');
      if (saved) {
        try {
          const arr = JSON.parse(saved);
          setIsSaved(arr.includes(id));
        } catch {
          setIsSaved(false);
        }
      } else {
        setIsSaved(false);
      }
    };
    updateSaved();
    window.addEventListener('saved_properties_changed', updateSaved);
    window.addEventListener('storage', updateSaved);
    return () => {
      window.removeEventListener('saved_properties_changed', updateSaved);
      window.removeEventListener('storage', updateSaved);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 pt-32 px-6 flex flex-col items-center gap-6">
        <h2 className="text-3xl font-serif">{t('details.notFound')}</h2>
        <p className="text-slate-600">{t('details.notFoundDesc')}</p>
        <Button onClick={() => navigate('/properties')} variant="primary">
          {t('details.backToListings')}
        </Button>
      </div>
    );
  }

  const isApproved = (property.status === 'approved' || property.status === 'active') && property.adminApproved !== false && property.isActive !== false;
  const isOwnerOrAdmin = user && (isAdmin || user.uid === property.userId);

  // Visibility Flags
  const isSectionVisible = (sectionId: string): boolean => {
    if (property.visibilitySettings?.sections) {
      return property.visibilitySettings.sections[sectionId] !== false;
    }
    // Backward compatibility fallbacks
    if (sectionId === 'facilitiesUtilities' && property.showAmenities === false) return false;
    if (sectionId === 'mediaGallery' && property.showImages === false) return false;
    return true;
  };

  const isFieldVisible = (sectionId: string, fieldId: string): boolean => {
    if (!isSectionVisible(sectionId)) return false;
    if (property.visibilitySettings?.fields) {
      return property.visibilitySettings.fields[fieldId] !== false;
    }
    // Backward compatibility fallbacks
    if (fieldId === 'priceAmount' || fieldId === 'expectedPrice' || fieldId === 'monthlyRent' || fieldId === 'securityDeposit' || fieldId === 'maintenanceCharges') {
      if (property.showPrice === false) return false;
    }
    if (fieldId === 'fullAddress' || fieldId === 'landmark' || fieldId === 'pincode') {
      if (property.showAddress === false) return false;
    }
    if (fieldId === 'ownerName') {
      if (property.showOwnerName === false) return false;
    }
    if (fieldId === 'mobileNumber' || fieldId === 'alternateMobile' || fieldId === 'email') {
      if (property.showOwnerContact === false) return false;
    }
    if (fieldId === 'gutNumber') {
      if (property.showExactLocation === false) return false;
    }
    return true;
  };

  const showOwnerName = isFieldVisible('ownerDetails', 'ownerName');
  const showOwnerContact = isFieldVisible('ownerDetails', 'mobileNumber');
  const showAmenities = isSectionVisible('facilitiesUtilities');
  const showImages = isSectionVisible('mediaGallery');

  if (!isApproved && !isOwnerOrAdmin) {
    return (
      <div className="min-h-screen text-slate-900 bg-slate-50 pt-32 px-6 flex flex-col items-center justify-center text-center gap-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3">{t('details.verificationPending', 'Verification Pending')}</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6 font-sans">
            {t('details.verificationPendingDesc', 'This property listing is currently undergoing verification or is not publicly active. If you are the owner, please ensure you are signed in with the correct account to view the status.')}
          </p>
          <div className="flex flex-col gap-3 w-full">
            {!user ? (
              <Button onClick={() => navigate('/login')} variant="primary" className="w-full font-bold">
                {t('details.signInToVerify', 'Sign In to Verify Ownership')}
              </Button>
            ) : null}
            <Button onClick={() => navigate('/properties')} variant="glass" className="w-full text-slate-700 font-bold border-slate-300">
              {t('details.backToListings')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveToggle = () => {
    if (!id) return;
    const saved = localStorage.getItem('luminous_saved_properties');
    let arr = [];
    if (saved) {
      try {
        arr = JSON.parse(saved);
      } catch {
        arr = [];
      }
    }

    if (arr.includes(id)) {
      arr = arr.filter((x: string) => x !== id);
      setIsSaved(false);
    } else {
      arr.push(id);
      setIsSaved(true);
    }
    localStorage.setItem('luminous_saved_properties', JSON.stringify(arr));

    // Trigger navbar sync
    window.dispatchEvent(new Event('saved_properties_changed'));
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryPhone.trim()) return;

    try {
      await createDocument('enquiries', {
        propertyId: property?.id || '',
        propertyName: property?.title || (i18n.language?.startsWith('mr') ? 'मालमत्ता चौकशी' : 'Property Inquiry'),
        name: inquiryName.trim(),
        email: inquiryEmail.trim() || 'N/A',
        phone: inquiryPhone.trim(),
        message: inquiryMsg.trim() || 'I would like to inquire about this property.',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setInquirySuccess(true);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryPhone('');
      setInquiryMsg('');
      setTimeout(() => {
        setInquirySuccess(false);
        setIsInquiryOpen(false);
      }, 4000);
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
    }
  };

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate || !visitTime || !visitName || !visitEmail || !visitPhone) return;

    try {
      await createDocument('visit_requests', {
        propertyId: property.id,
        propertyName: property.title,
        name: visitName,
        email: visitEmail,
        phone: visitPhone,
        date: visitDate,
        time: visitTime,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setVisitSuccess(true);
      setTimeout(() => {
        setIsVisitOpen(false);
        setVisitSuccess(false);
        setVisitDate('');
        setVisitTime('');
        setVisitName('');
        setVisitEmail('');
        setVisitPhone('');
      }, 2000);
    } catch (error) {
      console.error("Failed to schedule visit:", error);
    }
  };

  const whatsappLink = `https://wa.me/918328712712?text=${encodeURIComponent(
    t('details.whatsappInquiryText', { title: property.title, price: property.price ? property.price.toLocaleString() : 'N/A' })
  )}`;

  // Construct specs dynamically
  const specs = [];
  if (property.category === 'Flat' || property.category === 'House' || property.category === 'Bungalow') {
    if (isFieldVisible('layoutDetails', 'flatType') && (property.flatType || property.beds)) {
      specs.push({ label: 'BHK', value: property.flatType || `${property.beds} BHK`, icon: BedDouble });
    }
    if (isFieldVisible('layoutDetails', 'builtUpArea') && (property.builtUpArea || property.area)) {
      specs.push({ label: 'Super Area', value: `${property.builtUpArea || property.area} sqft`, icon: Ruler });
    }
    if (isFieldVisible('facilitiesUtilities', 'furnishingStatus') && (property.furnishingStatus || property.furnishedStatus || property.furnished)) {
      specs.push({ label: 'Furnished', value: property.furnishingStatus || (property.furnishedStatus) || (property.furnished ? 'Furnished' : 'Unfurnished'), icon: Building });
    }
    if (isFieldVisible('layoutDetails', 'bathrooms') && (property.baths || property.bathrooms)) {
      specs.push({ label: 'Bathrooms', value: `${property.baths || property.bathrooms || 0} Baths`, icon: Bath });
    }
    if (isFieldVisible('facilitiesUtilities', 'facingDirection') && property.facingDirection) {
      specs.push({ label: 'Facing', value: property.facingDirection, icon: Compass });
    }
    if (isSectionVisible('propertyInfo')) {
      specs.push({ label: 'Status', value: property.availabilityStatus || 'Available', icon: Home });
    }
    if (isSectionVisible('layoutDetails') && property.foodPreference) {
      specs.push({ label: 'Food Pref', value: property.foodPreference, icon: Utensils });
    }
  } else {
    // Land/Plot
    if (isFieldVisible('layoutDetails', 'builtUpArea') && (property.builtUpArea || property.area)) {
      specs.push({ label: 'Area', value: `${property.builtUpArea || property.area} sqft`, icon: Ruler });
    }
    if (isFieldVisible('plotLandDetails', 'landType') && property.landType) {
      specs.push({ label: 'Type', value: property.landType || 'Agricultural', icon: Compass });
    }
    if (isFieldVisible('facilitiesUtilities', 'facingDirection') && property.facingDirection) {
      specs.push({ label: 'Facing', value: property.facingDirection, icon: Compass });
    }
  }

  // Construct amenities dynamically
  const amenitiesList = [];
  if (isSectionVisible('facilitiesUtilities')) {
    if (isFieldVisible('facilitiesUtilities', 'lift') && property.lift) {
      amenitiesList.push({ label: t('details.fields.lift', 'Lift'), icon: ArrowUpDown });
    }
    if (isFieldVisible('facilitiesUtilities', 'carParking') && (property.carParking || property.parking)) {
      amenitiesList.push({ label: t('details.fields.carParking', 'Parking'), icon: CarFront });
    }
    if (isFieldVisible('facilitiesUtilities', 'waterSupply') && (property.waterSupply || property.waterStorage)) {
      amenitiesList.push({ label: t('details.fields.waterSourceAvailable', 'Water Storage'), icon: Droplet });
    }
    if (isFieldVisible('facilitiesUtilities', 'powerBackup') && property.powerBackup) {
      amenitiesList.push({ label: t('details.fields.powerBackup', 'Power Backup'), icon: Bolt });
    }
    if (isFieldVisible('facilitiesUtilities', 'garden') && property.garden) {
      amenitiesList.push({ label: t('details.fields.garden', 'Garden'), icon: Trees });
    }
    if (property.security || property.gatedSecurity) {
      amenitiesList.push({ label: t('details.fields.security', 'Security'), icon: Shield });
    }
  }

  // Fallbacks if list is empty but section is visible
  if (isSectionVisible('facilitiesUtilities') && amenitiesList.length === 0) {
    amenitiesList.push({ label: t('details.fields.security', 'Security'), icon: Shield });
    amenitiesList.push({ label: t('details.fields.waterSourceAvailable', 'Water Storage'), icon: Droplet });
    if (property.carParking) amenitiesList.push({ label: t('details.fields.carParking', 'Parking'), icon: CarFront });
  }

  const renderDetailSections = () => {
    // Process sections dynamically
    const processedSections = DETAILS_SECTIONS.map((section) => {
      // Filter fields that are visible and have valid values
      const validFields = section.fields
        .filter((field) => {
          // Check visibility
          if (!isFieldVisible(section.id, field.id)) return false;

          const val = property[field.id];
          // Hide empty, null, undefined, false
          if (val === undefined || val === null || val === '' || val === false) {
            return false;
          }
          return true;
        })
        .map((field) => {
          const rawVal = property[field.id];
          let formattedValue = String(rawVal);

          // Value formatting based on field types
          if (
            ['priceAmount', 'expectedPrice', 'monthlyRent', 'securityDeposit', 'maintenanceCharges', 'loanAmount'].includes(field.id) &&
            typeof rawVal === 'number'
          ) {
            formattedValue = `₹${rawVal.toLocaleString('en-IN')}`;
          } else if (field.id === 'plotArea') {
            const areaType = property.plotAreaType === 'guthevari' ? 'Guntha' : t('properties.sqftShort', 'sqft');
            formattedValue = `${rawVal} ${areaType}`;
          } else if (field.id === 'builtUpArea' || field.id === 'carpetArea') {
            const areaType = property.constructionAreaType || property.areaType || 'sqft';
            const unit = areaType === 'guthevari' ? 'Guntha' : t('properties.sqftShort', 'sqft');
            formattedValue = `${rawVal} ${unit}`;
          } else if (field.id === 'floorDetails' && Array.isArray(rawVal) && rawVal.length > 0) {
            formattedValue = rawVal.map((f, i) => `Flr ${i+1}: ${f.hallCount || 0}H, ${f.kitchenCount || 0}K, ${f.bedrooms || 0}B, ${f.bathrooms || 0}Bath`).join(' | ');
          } else if (typeof rawVal === 'boolean') {
            formattedValue = rawVal ? t('forms.yes', 'Yes') : t('forms.no', 'No');
          } else if (typeof rawVal === 'string' && field.id === 'priceType') {
            const valStr = rawVal.toLowerCase();
            if (valStr.includes('negotiable')) {
              formattedValue = t('negotiable', 'Negotiable');
            } else if (valStr.includes('fixed')) {
              formattedValue = t('fixedPrice', 'Fixed Price');
            } else {
              formattedValue = rawVal.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            }
          } else if (typeof rawVal === 'string' && field.id === 'facingDirection') {
            formattedValue = t('facing.' + rawVal.toLowerCase(), rawVal);
          } else if (typeof rawVal === 'string' && field.id === 'furnishingStatus') {
            const valStr = rawVal.toLowerCase();
            if (valStr.includes('semi')) {
              formattedValue = t('properties.semiFurnished', 'Semi-Furnished');
            } else if (valStr.includes('un')) {
              formattedValue = t('properties.unfurnished', 'Unfurnished');
            } else if (valStr.includes('furnish')) {
              formattedValue = t('properties.furnished', 'Furnished');
            }
          } else if (typeof rawVal === 'string' && field.id === 'landType') {
            const valStr = rawVal.toLowerCase();
            if (valStr.includes('agri')) {
              formattedValue = t('landType.agricultural', 'Agricultural Land');
            } else if (valStr === 'na' || valStr.includes('non')) {
              formattedValue = t('landType.na', 'Non-Agricultural (NA)');
            } else if (valStr.includes('comm')) {
              formattedValue = t('landType.commercial', 'Commercial Land');
            } else if (valStr.includes('indus')) {
              formattedValue = t('landType.industrial', 'Industrial Land');
            }
          } else if (typeof rawVal === 'string' && field.id === 'district') {
            formattedValue = t('districts.' + rawVal, rawVal);
          } else if (typeof rawVal === 'string' && field.id === 'taluka') {
            formattedValue = t('talukas.' + rawVal, rawVal);
          }

          const FieldIcon = FieldIconMap[field.id] || Home;

          return {
            id: field.id,
            label: t('details.fields.' + field.id, field.label),
            value: formattedValue,
            icon: FieldIcon,
          };
        });

      return {
        id: section.id,
        label: t('details.sections.' + section.id, section.label),
        fields: validFields,
      };
    })
      .filter((section) => section.fields.length > 0); // Hide empty sections

    if (processedSections.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left font-sans">
        {processedSections.map((section) => {
          const fieldCount = section.fields.length;
          return (
            <Card
              key={section.id}
              className="p-6 bg-[#111c2e]/[0.05] hover:bg-[#111c2e]/[0.09] border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1.5 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-950 mb-4 border-b border-[#111c2e]/15 pb-2.5 flex items-center justify-between gap-2.5">
                  <span>{section.label}</span>
                  <span className="text-[10px] bg-[#111c2e]/15 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                    {fieldCount} {fieldCount === 1 ? t('details.detailUnit', 'detail') : t('details.detailsUnit', 'details')}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {section.fields.map((field, idx) => {
                    const IconComponent = field.icon;
                    const isFullWidth = field.id === 'fullAddress' || field.id === 'description';
                    // Add vertical divider on the right of the first column
                    const borderClass = !isFullWidth && idx % 2 === 0 && idx < section.fields.length - 1
                      ? "border-r border-slate-200/80 pr-4"
                      : idx % 2 !== 0 && !isFullWidth
                        ? "pl-2"
                        : "";
                    return (
                      <div
                        key={field.id}
                        className={`flex flex-col pb-2 border-b border-slate-200/40 border-dashed hover:bg-white/50 p-1.5 rounded-lg transition-colors duration-150 ${borderClass} ${isFullWidth ? 'col-span-2' : ''}`}
                      >
                        <div className="flex items-center gap-1.5 text-slate-950 shrink-0">
                          <IconComponent className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                          <span className="font-bold text-[11px] truncate">{field.label}</span>
                        </div>
                        <span className={`font-black text-sm text-black mt-1.5 ${field.id === 'fullAddress' || field.id === 'description' ? 'break-words' : 'truncate'}`}>
                          {field.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 pt-16 pb-24 sm:pb-16 px-0 relative overflow-hidden text-left">
      <div className="w-full">

        {/* Verification Status Alert Banner for Owner/Admin */}
        {!isApproved && isOwnerOrAdmin && (
          <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans ${property.status === 'rejected'
              ? 'bg-red-50 border-red-200 text-red-800'
              : property.status === 'onhold'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            <div className="flex gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${property.status === 'rejected'
                  ? 'bg-red-500/10 text-red-650'
                  : property.status === 'onhold'
                    ? 'bg-amber-500/10 text-amber-650'
                    : 'bg-blue-500/10 text-blue-650'
                }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider">
                  {t('details.listingStatus', 'Listing Status')}: {
                    property.status === 'rejected'
                      ? t('details.statusRejected', 'Rejected')
                      : property.status === 'onhold'
                        ? t('details.statusOnHold', 'On Hold')
                        : t('details.statusPending', 'Pending Verification')
                  }
                </h4>
                <p className="text-xs mt-1.5 opacity-90 leading-relaxed max-w-2xl text-slate-700">
                  {property.status === 'rejected' && (
                    <>{t('details.rejectedDesc', 'This property listing has been rejected.')} <strong>{t('details.reasonLabel', 'Reason')}:</strong> {property.rejectionReason || t('details.noReasonProvided', 'No reason provided.')}</>
                  )}
                  {property.status === 'onhold' && (
                    <>{t('details.onHoldDesc', 'This property listing is on hold.')} {property.infoRequested ? <strong>{t('details.infoRequestedLabel', 'Additional information requested')}:</strong> : <strong>{t('details.remarksLabel', 'Remarks')}:</strong>} {property.holdRemarks || t('details.noRemarksProvided', 'No remarks provided.')}</>
                  )}
                  {property.status === 'pending' && (
                    <>{t('details.pendingDesc', 'This listing is awaiting admin review and verification. It is currently hidden from other users.')}</>
                  )}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={() => navigate(`/admin/properties/${property.status === 'onhold' ? 'onhold' : 'pending'}`)}
                variant="primary"
                className="text-xs font-bold py-2 px-4 rounded-xl shadow-md shrink-0"
              >
                {t('details.goToQueue', 'Go to Verification Queue')}
              </Button>
            )}
          </div>
        )}
        {/* Premium Property View Layout Container - Full Screen Edge-to-Edge */}
        <div className="bg-white w-full border-t border-b border-slate-200 overflow-hidden mt-0">

          {/* Main Hero Gallery Section */}
          <div className="relative aspect-[16/5] w-full bg-slate-900 overflow-hidden group">

            {/* Go Back Button Overlay */}
            <div className="absolute top-4 left-4 md:left-6 z-30">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-primary transition-all bg-white/95 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-200 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> 
                <span className="hidden sm:inline">{isMr ? 'मागे जा' : 'Go Back'}</span>
                <span className="sm:hidden">{isMr ? 'मागे' : 'Back'}</span>
              </button>
            </div>

            {/* Gallery Control Actions Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2 sm:gap-3 z-30">
              {!property.isSoldOut && (
                <button
                  onClick={handleBuyClick}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500"
                  title={isMr ? 'मालमत्ता खरेदी करा (Buy Property)' : 'Buy this Property'}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isMr ? 'खरेदी करा' : 'Buy Now'}</span>
                </button>
              )}
              <button
                onClick={handleSaveToggle}
                className="bg-white/95 hover:bg-white p-2 rounded-full shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-200"
                title={isSaved ? t('details.savedToFavorites', 'Saved to Favorites') : t('details.saveToFavorites', 'Save to Favorites')}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-slate-650'}`} />
              </button>
            </div>

            {/* Main Active Gallery Image */}
            {activeImage && showImages ? (
              <div className="w-full h-full relative cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
                <img src={optimizeCloudinaryUrl(activeImage, 1200)} alt={property.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${property.isSoldOut ? 'grayscale-[40%]' : ''}`} />
                
                {property.propertyCode && (
                  <div className="absolute top-16 left-4 md:left-6 flex gap-2 z-20">
                    <div className="bg-[#111c2e] text-white text-sm font-mono font-black px-4 py-1.5 rounded-xl uppercase tracking-wider shadow-lg">
                      {property.propertyCode}
                    </div>
                  </div>
                )}
                {property.isSoldOut && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden">
                    <div className="bg-red-600/90 text-white w-[120%] py-4 text-center transform -rotate-[8deg] shadow-2xl border-y-[4px] border-red-500 backdrop-blur-sm shadow-red-500/30">
                      <span className="text-3xl font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 drop-shadow-lg">
                        <span className="text-xl">🔴</span>
                        {isMr ? 'विकले' : 'SOLD OUT'}
                        <span className="text-xl">🔴</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Arrow navigation if multiple images exist */}
                {property.images && property.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-md z-20 hover:scale-105 transition-all cursor-pointer"
                    >
                      ←
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-md z-20 hover:scale-105 transition-all cursor-pointer"
                    >
                      →
                    </button>
                  </>
                )}


                {property.images && property.images.length > 0 && (
                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg">
                    <span>{property.images.indexOf(activeImage) + 1} / {property.images.length}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-800/90 backdrop-blur-md">
                <Shield className="w-12 h-12 text-slate-500 mb-2" />
                <span className="text-sm font-bold uppercase tracking-wider">{t('details.imagesHiddenByOwner', 'Images Hidden by Owner')}</span>
                <span className="text-xs text-slate-500 mt-1">{t('details.contactOwnerForVisuals', 'Contact owner or broker for visuals')}</span>
              </div>
            )}
          </div>



          {/* Premium Sub-Navigation Menu Bar - Centered & Compact */}
          <div className="bg-[#2d2d2d] text-white flex justify-between items-center w-full px-4 sm:px-8 shadow-md select-none border-b border-slate-800">
            <div className="flex justify-center items-center gap-px mx-auto sm:mx-0">
              {[
                { id: 'details', label: 'Details', icon: Layers },
                { id: 'contact', label: 'Contact', icon: Phone }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 px-6 sm:px-10 flex items-center justify-center gap-2 hover:bg-slate-800 transition-all duration-200 uppercase text-[9px] sm:text-[11px] font-bold tracking-widest cursor-pointer ${isActive ? 'bg-white text-slate-900 font-extrabold shadow-inner' : 'text-slate-300'
                      }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{tab.id === 'details' ? t('details.tabDetails', 'Details') : t('details.tabContact', 'Contact')}</span>
                  </button>
                );
              })}
            </div>
            {!property.isSoldOut && (
              <button
                onClick={handleBuyClick}
                className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg shadow hover:shadow-md transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isMr ? 'खरेदी करा (Buy Property)' : 'Buy Property'}</span>
              </button>
            )}
          </div>

          {/* Tab Contents Container */}
          <div className="p-8 sm:p-12 min-h-[350px]">
            {/* TAB: DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* 3-Column Specifications + Amenities Grid */}
                <div className="space-y-4">
                  <h3 className="text-xl font-serif text-slate-900 font-bold border-b border-slate-100 pb-2 text-left">{t('details.propertyDetailsHeading', 'Property Details')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left font-sans">
                    {/* Detail section cards */}
                    {renderDetailSections()
                      ? renderDetailSections()!.props.children
                      : (
                        <div className="col-span-3 text-center p-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 font-medium">
                          {t('details.noDetailsAvailable', 'No additional details available.')}
                        </div>
                      )
                    }

                    {/* Amenities card — same size as other detail cards */}
                    {showAmenities && amenitiesList.length > 0 && (
                      <Card className="p-6 bg-[#111c2e]/[0.05] hover:bg-[#111c2e]/[0.09] border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1.5 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between">
                        <div>
                          <h3 className="text-base md:text-lg font-black text-slate-950 mb-4 border-b border-[#111c2e]/15 pb-2.5 flex items-center justify-between gap-2.5">
                            <span>{t('details.sections.facilitiesUtilities', 'Amenities & Utilities')}</span>
                            <span className="text-[10px] bg-[#111c2e]/15 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                              {amenitiesList.length} {amenitiesList.length === 1 ? t('details.featureUnit', 'feature') : t('details.featuresUnit', 'features')}
                            </span>
                          </h3>
                          <div className="flex flex-wrap gap-3">
                            {amenitiesList.map((amenity, idx) => {
                              const AmenityIcon = amenity.icon;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                  <AmenityIcon className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                                  <span className="font-extrabold text-xs text-slate-950">{amenity.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                  
                  {/* Action Buttons at the bottom of Details tab */}
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 pb-2">
                    {!property.isSoldOut && (
                      <button 
                        onClick={handleBuyClick}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto min-w-[260px]"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        {isMr ? 'मालमत्ता खरेदी करा (Buy Property)' : 'Buy Property'}
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.preventDefault(); setActiveTab('contact'); }} 
                      className="bg-[#111c2e] hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto min-w-[260px]"
                    >
                      <Mail className="w-5 h-5" />
                      {t('details.tabContact', 'Contact')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONTACT */}
            {activeTab === 'contact' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
                {/* Left (Owner/Realtor Details Card) */}
                <div className="lg:col-span-1 bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-6 text-left font-sans">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#111c2e] text-white flex items-center justify-center font-bold text-base tracking-wider shrink-0 shadow-md">
                      {showOwnerName && property.ownerName ? property.ownerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'OW'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-950 text-base">
                        {showOwnerName
                          ? (property.ownerName || t('details.propertyOwner', 'Property Owner'))
                          : t('details.sections.ownerDetails', 'Owner Details')}
                      </h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('details.directPropertyOwner', 'Direct Property Owner')}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {!property.isSoldOut && (
                      <button
                        onClick={handleBuyClick}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-md"
                      >
                        <ShoppingBag className="w-4 h-4 text-white" />
                        {isMr ? 'थेट खरेदी प्रस्ताव पाठवा (Send Purchase Offer)' : 'Send Direct Purchase Offer'}
                      </button>
                    )}

                    <a
                      href={showOwnerContact ? `https://wa.me/${property.mobileNumber || property.ownerPhone || '918328712712'}?text=${encodeURIComponent(t('details.whatsappInquiryText', { title: property.title, price: property.price ? property.price.toLocaleString() : 'N/A' }))}` : whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full"
                    >
                      <button className="w-full border border-emerald-600 text-emerald-700 hover:bg-green-50 text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white">
                        <MessageSquare className="w-4 h-4 fill-current text-emerald-600" /> {t('details.messageViaWhatsapp', 'Message via WhatsApp')}
                      </button>
                    </a>

                    <button
                      onClick={() => window.open(`tel:${showOwnerContact ? (property.mobileNumber || property.ownerPhone || '918328712712') : '918328712712'}`)}
                      className="w-full bg-[#111c2e] hover:bg-slate-800 text-white text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-md"
                    >
                      <Phone className="w-4 h-4 fill-current text-white" /> {t('details.callAction', 'Call')} {showOwnerContact ? t('details.ownerUnit', 'Owner') : t('details.supportUnit', 'Support')}
                    </button>
                  </div>
                </div>

                {/* Right / Inquiry Form */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-left">
                  <h3 className="text-lg font-serif text-slate-900 font-bold mb-4">{t('details.sendDirectMessage', 'Send a Direct Message')}</h3>
                  <form onSubmit={handleInquirySubmit} className="space-y-4 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details.fullName', 'Full Name')}</label>
                        <Input
                          className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl"
                          placeholder={t('details.enterName', 'Your Name')}
                          value={inquiryName}
                          onChange={(e) => setInquiryName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details.phoneNumber', 'Mobile Number')}</label>
                        <Input
                          type="tel"
                          maxLength={10}
                          className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl"
                          placeholder={t('forms.mobileNumberPlaceholder', '१० अंकी मोबाईल नंबर')}
                          value={inquiryPhone}
                          onChange={(e) => setInquiryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{t('details.messageLabel', 'Message')}</label>
                      <Textarea
                        className="w-full px-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl resize-none"
                        rows={4}
                        value={inquiryMsg}
                        onChange={(e) => setInquiryMsg(e.target.value)}
                        required
                      />
                    </div>
                    {inquirySuccess ? (
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 text-center text-xs font-bold">
                        {t('details.inquirySuccess', 'Inquiry submitted successfully!')}
                      </div>
                    ) : (
                      <div className="pt-2">
                        <Button type="submit" className="w-full bg-[#111c2e] hover:bg-slate-800 text-white py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md">
                          {t('details.submitInquiry', 'Send Inquiry')}
                        </Button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>


      {/* Book Visit Modal */}
      <Dialog
        isOpen={isVisitOpen}
        onClose={() => setIsVisitOpen(false)}
        title={t('details.scheduleTour')}
      >
        {visitSuccess ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center text-sm text-green-400">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
            {t('details.tourSuccess')}
          </div>
        ) : (
          <form onSubmit={handleVisitSubmit} className="flex flex-col gap-4 text-left">
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              {t('details.tourDesc')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label={t('details.preferredDate')}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
              <Input
                type="time"
                label={t('details.preferredTime')}
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                required
              />
            </div>
            <Input
              label={t('details.fullName')}
              placeholder={t('details.enterName')}
              value={visitName}
              onChange={(e) => setVisitName(e.target.value)}
              required
            />
            <Input
              type="email"
              label={t('details.emailAddress')}
              placeholder={t('details.enterEmail')}
              value={visitEmail}
              onChange={(e) => setVisitEmail(e.target.value)}
              required
            />
            <Input
              type="tel"
              maxLength={10}
              label={t('details.phoneNumber')}
              placeholder={t('details.enterPhone')}
              value={visitPhone}
              onChange={(e) => setVisitPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
            />

            <div className="flex gap-3 justify-end mt-4">
              <Button type="button" variant="glass" onClick={() => setIsVisitOpen(false)} className="py-2.5 px-4 rounded-xl text-xs border-slate-200">
                {t('details.cancel')}
              </Button>
              <Button type="submit" variant="primary" className="py-2.5 px-5 rounded-xl text-xs text-white font-bold">
                {t('details.bookSchedule')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Inquiry Modal */}
      <Dialog
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        title={t('details.inquireTitle')}
      >
        {/* Owner Profile Header */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center gap-3 mb-6 shadow-sm text-left">
          <div className="w-12 h-12 rounded-full bg-[#111c2e] text-white flex items-center justify-center font-bold text-sm tracking-wider shrink-0">
            {showOwnerName && property.ownerName ? property.ownerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'OW'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{showOwnerName ? (property.ownerName || t('details.propertyOwner', 'Property Owner')) : t('details.ownerDetailsHidden', 'Owner Details Hidden')}</h4>
            <p className="text-xs text-slate-500 font-semibold">{t('details.directPropertyOwner', 'Direct Property Owner')}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-6 text-left">
          {t('details.inquireDesc')}
        </p>

        {inquirySuccess ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center text-sm text-green-400">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
            {t('details.inquirySuccess')}
          </div>
        ) : (
          <form onSubmit={handleInquirySubmit} className="flex flex-col gap-4 text-left">
            <Input
              label={t('details.fullName')}
              placeholder={t('details.enterName')}
              value={inquiryName}
              onChange={(e) => setInquiryName(e.target.value)}
              required
            />
            <Input
              type="email"
              label={t('details.emailAddress')}
              placeholder={t('details.enterEmail')}
              value={inquiryEmail}
              onChange={(e) => setInquiryEmail(e.target.value)}
            />
            <Input
              type="tel"
              maxLength={10}
              label={t('details.phoneNumber')}
              placeholder={t('details.enterPhone')}
              value={inquiryPhone}
              onChange={(e) => setInquiryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
            />
            <Textarea
              label={t('details.messageLabel')}
              placeholder={t('details.messageLabel')}
              value={inquiryMsg}
              onChange={(e) => setInquiryMsg(e.target.value)}
              required
            />

            <div className="flex gap-3 justify-end mt-4">
              <Button type="button" variant="glass" onClick={() => setIsInquiryOpen(false)} className="py-2.5 px-4 rounded-xl text-xs border-slate-200">
                {t('details.cancel')}
              </Button>
              <Button type="submit" variant="primary" className="py-2.5 px-5 rounded-xl text-xs text-white font-bold bg-[#111c2e] hover:bg-slate-800 border-none">
                {t('details.submitInquiry')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Guest Buy Modal: Prompt Guest to Register as Buyer */}
      <Dialog
        isOpen={isGuestBuyModalOpen}
        onClose={() => setIsGuestBuyModalOpen(false)}
        title={isMr ? 'खरेदीदार खाते तयार करा (Create Buyer Account)' : 'Create Buyer Account to Purchase'}
      >
        <div className="flex flex-col gap-4 text-left font-sans">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-start gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {isMr ? 'शिफारस: खरेदीदार (Buyer) रोल निवडा' : 'Recommended: Select Buyer Role'}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {isMr
                  ? 'ही मालमत्ता खरेदी करण्यासाठी किंवा थेट खरेदी प्रस्ताव पाठवण्यासाठी, कृपया खरेदीदार म्हणून खाते तयार करा. खरेदीदारांसाठी कोणतीही ॲडमिन मंजुरी आवश्यक नाही - खाते त्वरित सक्रिय होते!'
                  : 'To purchase this property or submit direct purchase offers, please create an account as Buyer. No Admin approval required for buyers — your account activates immediately!'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900">{isMr ? 'खरेदीदारांसाठी विशेष फायदे:' : 'Buyer Account Benefits:'}</div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{isMr ? 'कोणतीही ॲडमिन मंजुरी नाही (Instant Auto-Approved)' : 'Zero waiting time — instant auto-approval'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{isMr ? 'खरेदी केलेल्या आणि स्वारस्य असलेल्या मालमत्तांचा डॅशबोर्ड' : 'Dedicated Buyer Dashboard for bought & interested properties'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>{isMr ? 'मालकांशी थेट संपर्क आणि सुरक्षित व्यवहार' : 'Direct interaction with owners and verified deals'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-end mt-2">
            <Button
              type="button"
              variant="glass"
              onClick={() => setIsGuestBuyModalOpen(false)}
              className="py-2 px-3.5 rounded-xl text-xs border-slate-200"
            >
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsGuestBuyModalOpen(false);
                navigate(`/login?redirect=${encodeURIComponent(`/property/${id}?action=buy`)}`);
              }}
              variant="outline"
              className="py-2 px-3.5 rounded-xl text-xs border-slate-300 font-semibold"
            >
              {isMr ? 'आधीच खाते आहे? लॉगिन' : 'Already have account? Login'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsGuestBuyModalOpen(false);
                navigate(`/register?role=buyer&action=buy&propId=${id}&propTitle=${encodeURIComponent(property.title || '')}&redirect=${encodeURIComponent(`/property/${id}?action=buy`)}`);
              }}
              className="py-2 px-4 rounded-xl text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md border-none flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isMr ? 'खरेदीदार नोंदणी करा' : 'Register as Buyer'}</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Property Purchase Intent / Buy Offer Modal */}
      <Dialog
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title={isMr ? 'मालमत्ता खरेदी प्रस्ताव (Property Purchase Offer)' : 'Submit Purchase Offer'}
      >
        {purchaseSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              {isMr ? 'खरेदी प्रस्ताव यशस्वीरीत्या सादर केला गेला!' : 'Purchase Offer Submitted Successfully!'}
            </h4>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-6">
              {isMr
                ? 'आपला खरेदी प्रस्ताव नोंदवला गेला आहे. ही मालमत्ता आता आपल्या खरेदीदार डॅशबोर्डमध्ये "स्वारस्य असलेल्या मालमत्ता" (Interested Properties) विभागात जोडली गेली आहे.'
                : 'Your purchase offer has been recorded. This property has been added to your Buyer Dashboard under "Interested Properties".'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                variant="glass"
                className="py-2.5 px-4 rounded-xl text-xs border-slate-200"
              >
                {isMr ? 'बंद करा' : 'Close'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsPurchaseModalOpen(false);
                  navigate('/buyer/dashboard');
                }}
                className="py-2.5 px-5 rounded-xl text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md border-none flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isMr ? 'खरेदीदार डॅशबोर्ड पहा (Buyer Dashboard)' : 'Go to Buyer Dashboard'}</span>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-4 text-left font-sans">
            {/* Property Summary Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {property.propertyCode ? `[${property.propertyCode}] ` : ''}{isMr ? property.titleMr || property.title : property.title}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {isMr ? property.locationMr || property.location : property.location}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{isMr ? 'किंमत' : 'Price'}</div>
                <div className="text-sm font-bold text-emerald-700">
                  ₹{Number(property.price || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Price Offer Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                {isMr ? 'प्रस्तावित खरेदी किंमत (Offered Price in ₹)' : 'Proposed Offer Price (₹)'}
              </label>
              <Input
                type="number"
                placeholder={property.price ? String(property.price) : '0'}
                value={purchaseOfferedPrice}
                onChange={(e) => setPurchaseOfferedPrice(e.target.value)}
                required
                className="w-full font-mono text-sm"
              />
              <p className="text-[10px] text-slate-500">
                {isMr ? 'सूचीबद्ध किंमत: ' : 'Listed Price: '} ₹{Number(property.price || 0).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Buyer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  {isMr ? 'आपले पूर्ण नाव' : 'Your Full Name'}
                </label>
                <Input
                  value={purchaseBuyerName}
                  onChange={(e) => setPurchaseBuyerName(e.target.value)}
                  placeholder={isMr ? 'नाव प्रविष्ट करा' : 'Enter name'}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  {isMr ? 'मोबाईल नंबर' : 'Mobile Number'}
                </label>
                <Input
                  type="tel"
                  maxLength={10}
                  value={purchaseBuyerMobile}
                  onChange={(e) => setPurchaseBuyerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={isMr ? '१० अंकी मोबाईल' : '10-digit mobile'}
                  required
                />
              </div>
            </div>

            {/* Buyer Message / Offer Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                {isMr ? 'खरेदी संदेश / अटी (Purchase Message / Terms)' : 'Message to Owner / Notes'}
              </label>
              <Textarea
                rows={3}
                value={purchaseMessage}
                onChange={(e) => setPurchaseMessage(e.target.value)}
                placeholder={isMr ? 'उदा. मला ही मालमत्ता त्वरित खरेदी करायची आहे, कृपया पुढील प्रक्रियेसाठी संपर्क साधावा.' : 'E.g. I am interested in buying this property immediately.'}
                className="resize-none text-xs"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                {isMr
                  ? 'हा प्रस्ताव सादर केल्यावर तुमचे खाते थेट खरेदीदार (Buyer) म्हणून सक्रिय राहील आणि डॅशबोर्डवर दिसेल.'
                  : 'Submitting this offer automatically records your buyer profile with zero admin delay.'}
              </span>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <Button
                type="button"
                variant="glass"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="py-2.5 px-4 rounded-xl text-xs border-slate-200"
                disabled={isSubmittingPurchase}
              >
                {isMr ? 'रद्द करा' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPurchase}
                className="py-2.5 px-5 rounded-xl text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md border-none flex items-center gap-2"
              >
                {isSubmittingPurchase ? (
                  <span>{isMr ? 'नोंदणी करत आहे...' : 'Submitting...'}</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isMr ? 'खरेदी प्रस्ताव पाठवा' : 'Submit Purchase Offer'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Lightbox / Full Image View Modal */}
      {isLightboxOpen && property.images && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between items-center p-4 md:p-8 backdrop-blur-md select-none animate-in fade-in duration-200">
          {/* Header */}
          <div className="w-full max-w-7xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white pb-4 border-b border-white/10">
            <div className="flex items-start sm:items-center gap-3 md:gap-4">
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer text-xs md:text-sm border border-white/15 shrink-0 mt-1 sm:mt-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{isMr ? 'मागे जा' : 'Go Back'}</span>
                <span className="sm:hidden">{isMr ? 'मागे' : 'Back'}</span>
              </button>
              <div>
                <h4 className="font-serif text-lg md:text-xl font-bold truncate max-w-xs sm:max-w-md">
                  {property.propertyCode ? `[${property.propertyCode}] ` : ''}{isMr ? property.titleMr || property.title : property.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                  <span>{isMr ? property.locationMr || property.location : property.location}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold bg-white/10 px-3 py-1.5 rounded-lg">
                {lightboxIndex + 1} / {property.images.length}
              </span>
            </div>
          </div>

          {/* Main Image View */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center py-6">
            {property.images.length > 1 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-2 md:left-4 z-10 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10"
              >
                ←
              </button>
            )}

            <img
              src={optimizeCloudinaryUrl(property.images[lightboxIndex], 1200)}
              alt=""
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl transition-all duration-300"
            />

            {property.images.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-2 md:right-4 z-10 p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer border border-white/10"
              >
                →
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {property.images.length > 1 && (
            <div className="w-full max-w-4xl overflow-x-auto no-scrollbar flex justify-center gap-3 py-4">
              {property.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setLightboxIndex(idx);
                    setActiveImage(img);
                  }}
                  className={`w-20 md:w-24 aspect-[16/10] rounded-lg overflow-hidden border shrink-0 cursor-pointer transition-all ${lightboxIndex === idx ? 'border-primary ring-2 ring-primary scale-105' : 'border-white/20 opacity-50 hover:opacity-100'
                    }`}
                >
                  <img src={optimizeCloudinaryUrl(img, 200)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
