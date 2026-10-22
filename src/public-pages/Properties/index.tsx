import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchCollection, subscribeToCollection, getCachedCollection } from '../../services/firebase';
import {
  syncApprovedRoleInquiriesWithProperties,
  subscribeToRoleInquiries,
  synthesizePropertyFromInquiry
} from '../../services/roleInquiry';
import { MapPin, BedDouble, Bath, Heart, Ruler, Search, ArrowLeft, LayoutGrid, Building, Home, Warehouse, Mountain, Tractor } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { useTranslation } from 'react-i18next';
import { isMobileDevice } from '../../utils/device';

interface PillOption {
  value: string;
  label: string;
}

interface PillSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PillOption[];
  colorSchema: 'sky' | 'violet' | 'emerald' | 'amber' | 'orange';
}

const PillSelector: React.FC<PillSelectorProps> = ({ label, value, onChange, options, colorSchema }) => {
  const activeClasses = {
    sky: 'border-[#0ea5e9] text-[#0284c7] bg-[#f0f9ff]',
    violet: 'border-[#8b5cf6] text-[#7c3aed] bg-[#f5f3ff]',
    emerald: 'border-[#10b981] text-[#059669] bg-[#ecfdf5]',
    amber: 'border-[#f59e0b] text-[#d97706] bg-[#fffbeb]',
    orange: 'border-[#f97316] text-[#ea580c] bg-[#fff7ed]',
  }[colorSchema];

  return (
    <div className="flex flex-col gap-2.5 text-left w-full">
      <label className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-slate-500">
        {label}
      </label>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const isActive = String(opt.value) === String(value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-4 py-2 rounded-full border text-[11px] font-bold transition-all duration-250 cursor-pointer ${isActive
                ? `${activeClasses} border-2`
                : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const Properties: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  const categoryOptions = [
    { value: 'All', label: isMr ? 'सर्व' : (t('properties.all', 'All') as string), icon: LayoutGrid },
    { value: 'Flat', label: t('categories.flat', 'Flat') as string, icon: Building },
    { value: 'House', label: t('categories.house', 'House') as string, icon: Home },
    { value: 'Bungalow', label: t('categories.bungalow', 'Bungalow') as string, icon: Warehouse },
    { value: 'Plot', label: t('categories.plot', 'Plot') as string, icon: Mountain },
    { value: 'Land', label: t('categories.land', 'Land') as string, icon: Tractor }
  ];

  const bhkMobileOptions = [
    { value: 'All', label: t('properties.any', 'Any') as string },
    { value: '1', label: '1 BHK' },
    { value: '2', label: '2 BHK' },
    { value: '3', label: '3 BHK' },
    { value: '4', label: '4+ BHK' }
  ];

  const builtAreaMobileOptions = [
    { value: 'All', label: t('properties.any', 'Any') as string },
    { value: 'under-500', label: t('properties.areaUnder500', '<500 sqft') as string },
    { value: '500-1000', label: t('properties.area500To1000', '500-1000') as string },
    { value: '1000-2000', label: t('properties.area1000To2000', '1000-2000') as string },
    { value: '2000+', label: t('properties.area2000Plus', '2000+') as string }
  ];

  const floorMobileOptions = [
    { value: 'All', label: t('properties.any', 'Any') as string },
    { value: '0', label: t('floor.ground', 'Ground') as string },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3+', label: '3+' }
  ];

  const parkingMobileOptions = [
    { value: 'All', label: t('properties.any', 'Any') as string },
    { value: 'No Parking', label: t('parking.noParking', 'No Parking') as string },
    { value: 'Open', label: t('parking.openParking', 'Open Parking') as string },
    { value: 'Covered', label: t('parking.coveredParking', 'Covered Parking') as string },
    { value: 'Both', label: t('parking.bothTypes', 'Both Types') as string }
  ];

  const furnishingMobileOptions = [
    { value: 'All', label: t('properties.any', 'Any') as string },
    { value: 'Unfurnished', label: t('properties.unfurnished', 'Unfurnished') as string },
    { value: 'Semi-Furnished', label: t('properties.semiFurnished', 'Semi Furnished') as string },
    { value: 'Furnished', label: t('forms.fullyFurnished', 'Fully Furnished') as string }
  ];

  const facingMobileOptions = [
    { value: 'All', label: t('properties.any', 'Any') as string },
    { value: 'East', label: t('facing.east', 'East') as string },
    { value: 'West', label: t('facing.west', 'West') as string },
    { value: 'North', label: t('facing.north', 'North') as string },
    { value: 'South', label: t('facing.south', 'South') as string }
  ];

  const occupancyMobileOptions = [
    { value: 'All', label: t('properties.all', 'All') as string },
    { value: 'Class 1', label: t('occupancy.class1', 'Class 1') as string },
    { value: 'Class 2', label: t('occupancy.class2', 'Class 2') as string },
    { value: 'Class 3', label: t('occupancy.class3', 'Class 3') as string }
  ];

  const bhkDesktopOptions = [
    { value: 'All', label: (isMr ? 'सर्व BHK' : 'Any BHK') as string },
    { value: '1', label: '1 BHK' },
    { value: '2', label: '2 BHK' },
    { value: '3', label: '3 BHK' },
    { value: '4', label: '4+ BHK' }
  ];

  const builtAreaDesktopOptions = [
    { value: 'All', label: t('properties.anyArea', 'Any Area') as string },
    { value: 'under-500', label: t('properties.areaUnder500', '<500 sqft') as string },
    { value: '500-1000', label: t('properties.area500To1000', '500-1000') as string },
    { value: '1000-2000', label: t('properties.area1000To2000', '1000-2000') as string },
    { value: '2000+', label: t('properties.area2000Plus', '2000+') as string }
  ];

  const floorDesktopOptions = [
    { value: 'All', label: t('properties.anyFloors', 'Any Floors') as string },
    { value: '0', label: t('floor.ground', 'Ground') as string },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3+', label: '3+' }
  ];

  const parkingDesktopOptions = [
    { value: 'All', label: t('properties.anyParkingType', 'Any Parking Type') as string },
    { value: 'No Parking', label: t('parking.noParking', 'No Parking') as string },
    { value: 'Open', label: t('parking.openParking', 'Open Parking') as string },
    { value: 'Covered', label: t('parking.coveredParking', 'Covered Parking') as string },
    { value: 'Both', label: t('parking.bothTypes', 'Both Types') as string }
  ];

  const furnishingDesktopOptions = [
    { value: 'All', label: t('properties.anyFurnishing', 'Any Furnishing') as string },
    { value: 'Unfurnished', label: t('properties.unfurnished', 'Unfurnished') as string },
    { value: 'Semi-Furnished', label: t('properties.semiFurnished', 'Semi-Furnished') as string },
    { value: 'Furnished', label: t('properties.furnished', 'Furnished') as string }
  ];

  const facingDesktopOptions = [
    { value: 'All', label: t('properties.anyFacing', 'Any Facing') as string },
    { value: 'East', label: t('facing.east', 'East') as string },
    { value: 'West', label: t('facing.west', 'West') as string },
    { value: 'North', label: t('facing.north', 'North') as string },
    { value: 'South', label: t('facing.south', 'South') as string }
  ];

  const occupancyDesktopOptions = [
    { value: 'All', label: (isMr ? 'सर्व कब्जेदार वर्ग' : 'Any Occupancy Class') as string },
    { value: 'Class 1', label: t('occupancy.class1', 'Class 1') as string },
    { value: 'Class 2', label: t('occupancy.class2', 'Class 2') as string },
    { value: 'Class 3', label: t('occupancy.class3', 'Class 3') as string }
  ];
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMobileDeviceActive, setIsMobileDeviceActive] = useState(false);

  useEffect(() => {
    setIsMobileDeviceActive(isMobileDevice());
  }, []);

  // Instant Cache Rehydration: initialize state from cached properties immediately so UI NEVER flashes empty
  const [properties, setProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedCollection('properties');
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.filter((p: any) => 
          p.isSoldOut === true || 
          p.status === 'sold' || 
          p.status === 'approved' || 
          p.status === 'active' ||
          (p.adminApproved === true && p.isActive !== false)
        );
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => properties.length === 0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(searchParams.get('filter_open') === 'true');
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);


  // Filters State
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [type, setType] = useState(searchParams.get('type') || 'All');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [priceRange, setPriceRange] = useState(searchParams.get('price') || 'All');
  const [beds, setBeds] = useState(searchParams.get('beds') || 'All');
  const [showSavedOnly, setShowSavedOnly] = useState(searchParams.get('filter') === 'saved');

  // Dynamic Filters State
  const [builtUpArea, setBuiltUpArea] = useState(searchParams.get('builtUpArea') || 'All');
  const [totalFloors, setTotalFloors] = useState(searchParams.get('totalFloors') || 'All');
  const [facingDirection, setFacingDirection] = useState(searchParams.get('facingDirection') || 'All');
  const [furnishingStatus, setFurnishingStatus] = useState(searchParams.get('furnishingStatus') || 'All');
  const [carParking, setCarParking] = useState(searchParams.get('carParking') || 'All');
  const [parkingType, setParkingType] = useState(searchParams.get('parkingType') || 'All');
  const [waterSourceAvailable, setWaterSourceAvailable] = useState(searchParams.get('waterSourceAvailable') || 'All');
  const [waterSourceType, setWaterSourceType] = useState(searchParams.get('waterSourceType') || 'All');
  const [occupancyClass, setOccupancyClass] = useState(searchParams.get('occupancyClass') || 'All');

  // Load properties (real-time subscription), districts, talukas
  useEffect(() => {
    // 1. Fetch static master metadata
    Promise.all([
      fetchCollection('districts'),
      fetchCollection('talukas')
    ]).then(([districtList, talukaList]) => {
      setDistricts(districtList || []);
      setTalukas(talukaList || []);
    }).catch((err) => {
      console.error("Failed to load master metadata:", err);
    });

    syncApprovedRoleInquiriesWithProperties().catch(() => {});

    // 2. Real-time subscription to properties collection:
    // Guarantees instant synchronization: the second an admin approves or updates
    // a property (from mobile or admin), it is instantly reflected on the web!
    const unsubscribe = subscribeToCollection('properties', (list) => {
      const approvedList = (list || []).filter((p: any) => 
        p.isSoldOut === true || 
        p.status === 'sold' || 
        p.status === 'approved' || 
        p.status === 'active' ||
        (p.adminApproved === true && p.isActive !== false)
      );
      setProperties((prev) => {
        const propMap = new Map();
        approvedList.forEach((p) => propMap.set(p.id, p));
        prev.forEach((p) => {
          if ((p.source === 'approved_role_inquiry_sync' || p.source === 'user_role_sync') && !propMap.has(p.id)) {
            propMap.set(p.id, p);
          }
        });
        return Array.from(propMap.values());
      });
      setIsLoading(false);

      // Clean up stale saved properties that do not exist in the database
      const saved = localStorage.getItem('luminous_saved_properties');
      if (saved) {
        try {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) {
            const validIds = arr.filter(id => (list || []).some((p: any) => p.id === id));
            if (validIds.length !== arr.length) {
              localStorage.setItem('luminous_saved_properties', JSON.stringify(validIds));
              window.dispatchEvent(new Event('saved_properties_changed'));
            }
          }
        } catch { }
      }
    });

    // 3. Real-time listener for approved role inquiries:
    // Guarantees newly accepted requests are instantly visible even before server write confirms
    const unsubInqs = subscribeToRoleInquiries((inqList) => {
      const approvedInqs = (inqList || []).filter(
        (i) => i && ((i.status as string) === 'approved' || (i.status as string) === 'accepted')
      );
      if (approvedInqs.length > 0) {
        setProperties((prev) => {
          const propMap = new Map();
          prev.forEach((p) => propMap.set(p.id, p));
          approvedInqs.forEach((inq) => {
            const hasProp = Array.from(propMap.values()).some(
              (p: any) =>
                p.roleInquiryId === inq.id ||
                p.id === inq.id ||
                p.id === `prop-inquiry-${inq.id}`
            );
            if (!hasProp) {
              const synthesized = synthesizePropertyFromInquiry(inq);
              if (synthesized) {
                propMap.set(synthesized.id, synthesized);
              }
            }
          });
          return Array.from(propMap.values());
        });
        setIsLoading(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubInqs === 'function') unsubInqs();
    };
  }, []);

  // Load saved properties ids with real-time sync listeners
  useEffect(() => {
    const loadSaved = () => {
      const saved = localStorage.getItem('luminous_saved_properties');
      if (saved) {
        try {
          setSavedIds(JSON.parse(saved));
        } catch {
          setSavedIds([]);
        }
      } else {
        setSavedIds([]);
      }
    };
    loadSaved();
    window.addEventListener('saved_properties_changed', loadSaved);
    window.addEventListener('storage', loadSaved);
    return () => {
      window.removeEventListener('saved_properties_changed', loadSaved);
      window.removeEventListener('storage', loadSaved);
    };
  }, []);

  // Sync state with URL params
  useEffect(() => {
    const currentType = searchParams.get('type') || 'All';
    setQuery(searchParams.get('query') || '');
    setType(currentType);
    setCategory(searchParams.get('category') || 'All');
    setPriceRange(searchParams.get('price') || 'All');
    setBeds(searchParams.get('beds') || 'All');
    setShowSavedOnly(searchParams.get('filter') === 'saved');
    setBuiltUpArea(searchParams.get('builtUpArea') || 'All');
    setTotalFloors(searchParams.get('totalFloors') || 'All');
    setFacingDirection(searchParams.get('facingDirection') || 'All');
    setFurnishingStatus(searchParams.get('furnishingStatus') || 'All');
    setCarParking(searchParams.get('carParking') || 'All');
    setParkingType(searchParams.get('parkingType') || 'All');
    setWaterSourceAvailable(searchParams.get('waterSourceAvailable') || 'All');
    setWaterSourceType(searchParams.get('waterSourceType') || 'All');
    setOccupancyClass(searchParams.get('occupancyClass') || 'All');

    setShowFilters(searchParams.get('filter_open') === 'true');
  }, [searchParams]);

  // Apply filters synchronously via useMemo — ZERO 0ms empty flash, instant updates
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    const statusParam = searchParams.get('status');
    if (statusParam === 'sold') {
      result = result.filter(p => p.isSoldOut === true || p.status === 'sold');
    } else {
      // Show available properties
      result = result.filter(p => !p.isSoldOut && p.status !== 'sold');
    }

    if (query) {
      const q = query.toLowerCase().trim();

      // Find matching district IDs or labels from the master lists
      const matchedDistrictIds = districts
        .filter(d => (d.id && d.id.toLowerCase().includes(q)) || (d.label && d.label.toLowerCase().includes(q)))
        .map(d => d.id.toLowerCase());
      const matchedDistrictLabels = districts
        .filter(d => (d.id && d.id.toLowerCase().includes(q)) || (d.label && d.label.toLowerCase().includes(q)))
        .map(d => d.label.toLowerCase());

      // Find matching taluka IDs or labels from the master lists
      const matchedTalukaIds = talukas
        .filter(t => (t.id && t.id.toLowerCase().includes(q)) || (t.label && t.label.toLowerCase().includes(q)))
        .map(t => t.id.toLowerCase());
      const matchedTalukaLabels = talukas
        .filter(t => (t.id && t.id.toLowerCase().includes(q)) || (t.label && t.label.toLowerCase().includes(q)))
        .map(t => t.label.toLowerCase());

      result = result.filter((p) => {
        const pTitle = (p.title || '').toLowerCase();
        const pLoc = (p.location || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const pCode = (p.propertyCode || '').toLowerCase();
        const pDst = (p.district || '').toLowerCase();
        const pTk = (p.taluka || '').toLowerCase();
        
        const pAddrDst = (p.addressLocation?.district || '').toLowerCase();
        const pAddrTk = (p.addressLocation?.taluka || '').toLowerCase();
        const pAddrVlg = (p.addressLocation?.village || '').toLowerCase();
        const pAddrAddr = (p.addressLocation?.address || '').toLowerCase();
        const pAddrArea = (p.addressLocation?.area || '').toLowerCase();
        const pFullAddr = (p.fullAddress || '').toLowerCase();
        const pAddrField = (p.address || '').toLowerCase();
        const pCityVlg = (p.cityVillage || '').toLowerCase();

        // 1. Matches keyword in title, location, description, property code, or address-related fields
        const matchesKeyword = 
          pTitle.includes(q) ||
          pLoc.includes(q) ||
          pDesc.includes(q) ||
          pCode.includes(q) ||
          pAddrVlg.includes(q) ||
          pAddrAddr.includes(q) ||
          pAddrArea.includes(q) ||
          pFullAddr.includes(q) ||
          pAddrField.includes(q) ||
          pCityVlg.includes(q);

        // 2. Matches district name, code (id) or description
        const matchesDistrict = 
          pDst.includes(q) ||
          pAddrDst.includes(q) ||
          matchedDistrictLabels.includes(pDst) ||
          matchedDistrictLabels.includes(pAddrDst) ||
          (p.districtId && matchedDistrictIds.includes(p.districtId.toLowerCase())) ||
          (p.districtCode && matchedDistrictIds.includes(p.districtCode.toLowerCase()));

        // 3. Matches taluka name, code (id) or description
        const matchesTaluka = 
          pTk.includes(q) ||
          pAddrTk.includes(q) ||
          matchedTalukaLabels.includes(pTk) ||
          matchedTalukaLabels.includes(pAddrTk) ||
          (p.talukaId && matchedTalukaIds.includes(p.talukaId.toLowerCase())) ||
          (p.talukaCode && matchedTalukaIds.includes(p.talukaCode.toLowerCase()));

        return matchesKeyword || matchesDistrict || matchesTaluka;
      });
    }

    if (type !== 'All' && type.toLowerCase() !== 'all') {
      const targetType = type.toLowerCase();
      result = result.filter((p) => {
        const pType = (p.type || p.listingType || p.propertyInformation?.listingType || '').toLowerCase();
        if (targetType === 'sale' || targetType === 'sell') {
          return pType === 'sale' || pType === 'sell' || pType === 'buy' || p.purpose === 'Buy' || p.listingType === 'Sell';
        }
        if (targetType === 'rent') {
          return pType === 'rent' || pType === 'rental' || pType === 'paying guest' || p.purpose === 'Rent' || p.listingType === 'Rent';
        }
        return pType === targetType;
      });
    }

    if (category !== 'All' && category.toLowerCase() !== 'all') {
      const targetCat = category.toLowerCase();
      result = result.filter((p) => {
        const pCat = (p.category || p.propertyType || p.propertyInformation?.propertyType || '').toLowerCase();
        if (targetCat === 'land' || targetCat === 'plot') {
          return pCat === 'land' || pCat === 'plot';
        }
        return pCat === targetCat;
      });
    }

    const districtParam = searchParams.get('district');
    if (districtParam && districtParam !== 'All') {
      result = result.filter((p) => p.district?.toLowerCase() === districtParam.toLowerCase());
    }

    const talukaParam = searchParams.get('taluka');
    if (talukaParam && talukaParam !== 'All') {
      result = result.filter((p) => p.taluka?.toLowerCase() === talukaParam.toLowerCase());
    }

    if (beds !== 'All') {
      const bedCount = parseInt(beds);
      result = result.filter((p) => p.beds >= bedCount);
    }

    if (priceRange !== 'All') {
      if (priceRange === 'under-1m') {
        result = result.filter((p) => p.price < 1000000);
      } else if (priceRange === '1m-5m') {
        result = result.filter((p) => p.price >= 1000000 && p.price <= 5000000);
      } else if (priceRange === '5m-10m') {
        result = result.filter((p) => p.price >= 5000000 && p.price <= 10000000);
      } else if (priceRange === 'over-10m') {
        result = result.filter((p) => p.price > 10000000);
      }
    }

    // Dynamic filters when type is Buy (Sale) and a specific category is selected
    if (type.toLowerCase() === 'sale' && category !== 'All' && category.toLowerCase() !== 'all') {
      if (builtUpArea !== 'All') {
        if (['flat', 'house', 'bungalow', 'plot'].includes(category.toLowerCase())) {
          if (builtUpArea === 'under-500') {
            result = result.filter((p) => (p.builtUpArea || p.area || 0) < 500);
          } else if (builtUpArea === '500-1000') {
            result = result.filter((p) => {
              const val = p.builtUpArea || p.area || 0;
              return val >= 500 && val <= 1000;
            });
          } else if (builtUpArea === '1000-2000') {
            result = result.filter((p) => {
              const val = p.builtUpArea || p.area || 0;
              return val >= 1000 && val <= 2000;
            });
          } else if (builtUpArea === '2000+') {
            result = result.filter((p) => (p.builtUpArea || p.area || 0) >= 2000);
          }
        } else {
          const minAreaValue = parseInt(builtUpArea);
          result = result.filter((p) => (p.builtUpArea || p.area || 0) >= minAreaValue);
        }
      }

      if (['house', 'bungalow', 'flat'].includes(category.toLowerCase()) && totalFloors !== 'All') {
        if (['flat', 'house', 'bungalow'].includes(category.toLowerCase())) {
          if (totalFloors === '3+') {
            result = result.filter((p) => (p.floorNumber !== undefined && category.toLowerCase() === 'flat' ? p.floorNumber : p.totalFloors || 0) >= 3);
          } else {
            const fl = parseInt(totalFloors);
            result = result.filter((p) => (p.floorNumber !== undefined && category.toLowerCase() === 'flat' ? p.floorNumber : p.totalFloors || 0) === fl);
          }
        } else {
          const floorsCount = parseInt(totalFloors);
          if (floorsCount === 3) {
            result = result.filter((p) => (p.totalFloors || 0) >= 3);
          } else {
            result = result.filter((p) => (p.totalFloors || 0) === floorsCount);
          }
        }
      }

      if (facingDirection !== 'All') {
        result = result.filter((p) => p.facingDirection?.toLowerCase() === facingDirection.toLowerCase());
      }

      if (['house', 'bungalow', 'flat'].includes(category.toLowerCase()) && furnishingStatus !== 'All') {
        result = result.filter((p) => p.furnishingStatus?.toLowerCase() === furnishingStatus.toLowerCase());
      }

      if (['house', 'bungalow', 'flat'].includes(category.toLowerCase()) && carParking !== 'All') {
        const wantsParking = carParking === 'true';
        result = result.filter((p) => !!p.carParking === wantsParking);
      }

      if (['flat', 'house', 'bungalow'].includes(category.toLowerCase()) && parkingType !== 'All') {
        if (parkingType === 'No Parking') {
          result = result.filter((p) => !p.carParking);
        } else if (parkingType === 'Open') {
          result = result.filter((p) => p.carParking && p.parkingType?.toLowerCase() === 'open');
        } else if (parkingType === 'Covered') {
          result = result.filter((p) => p.carParking && p.parkingType?.toLowerCase() === 'covered');
        } else if (parkingType === 'Both') {
          result = result.filter((p) => p.carParking && ['open', 'covered'].includes(p.parkingType?.toLowerCase()));
        }
      }

      if (category.toLowerCase() === 'land') {
        if (waterSourceAvailable !== 'All') {
          const wantsWater = waterSourceAvailable === 'true';
          result = result.filter((p) => !!p.waterSourceAvailable === wantsWater);
        }
        if (waterSourceType !== 'All') {
          result = result.filter((p) => p.waterSourceType?.toLowerCase() === waterSourceType.toLowerCase());
        }
      }

      if (category.toLowerCase() === 'plot' && occupancyClass !== 'All') {
        result = result.filter((p) => p.occupancyClass?.toLowerCase() === occupancyClass.toLowerCase());
      }
    }

    if (showSavedOnly) {
      result = result.filter((p) => savedIds.includes(p.id));
    }

    return result;
  }, [properties, query, type, category, priceRange, beds, showSavedOnly, savedIds, builtUpArea, totalFloors, facingDirection, furnishingStatus, carParking, parkingType, waterSourceAvailable, waterSourceType, occupancyClass, searchParams, districts, talukas]);

  const updateURLParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleSavedToggle = (e: React.MouseEvent, propId: string) => {
    e.stopPropagation();
    let currentSaved = [...savedIds];
    if (currentSaved.includes(propId)) {
      currentSaved = currentSaved.filter((id) => id !== propId);
    } else {
      currentSaved.push(propId);
    }
    setSavedIds(currentSaved);
    localStorage.setItem('luminous_saved_properties', JSON.stringify(currentSaved));

    // Dispatch event to Navbar
    window.dispatchEvent(new Event('saved_properties_changed'));
  };

  const toggleShowSavedOnly = () => {
    const newParams = new URLSearchParams(searchParams);
    if (!showSavedOnly) {
      newParams.set('filter', 'saved');
    } else {
      newParams.delete('filter');
    }
    setSearchParams(newParams);
  };

  const toggleFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    const nextVal = !showFilters;
    newParams.set('filter_open', nextVal ? 'true' : 'false');
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 pt-24 sm:pt-28 pb-16 px-4 sm:px-6 md:px-12 relative overflow-hidden">

      {/* Background Blurs */}
      <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/3 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/3 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8">

        {/* Go Back Button */}
        <div className="w-full flex justify-start mb-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 group cursor-pointer font-bold text-xs sm:text-sm"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{t('details.goBack', 'Go Back')}</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left w-full">
          <div className="space-y-2.5">
            {/* Removed Portfolio text per request */}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold text-slate-900 mt-1">
              {showSavedOnly ? t('properties.yourSavedProperties') : searchParams.get('status') === 'sold' ? t('home.soldOutProperties', 'विक्री झालेल्या मालमत्ता') : type === 'sale' ? t('properties.propertiesForSale') : type === 'rent' ? t('properties.propertiesForRent') : t('properties.allProperties')}
            </h1>

            {/* Type selector tabs: All / For Sale (Buy) / For Rent */}
            {!showSavedOnly && searchParams.get('status') !== 'sold' && (
              <div className="flex items-center gap-2 pt-0.5">
                {[
                  { value: 'All', label: isMr ? 'सर्व मालमत्ता' : 'All Properties' },
                  { value: 'sale', label: isMr ? 'विक्री / खरेदी' : 'For Sale' },
                  { value: 'rent', label: isMr ? 'भाड्याने' : 'For Rent' }
                ].map((tab) => {
                  const isActive = type.toLowerCase() === tab.value.toLowerCase();
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setType(tab.value);
                        updateURLParams('type', tab.value);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto shrink-0">
            {/* Search Input Bar */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  const newParams = new URLSearchParams(searchParams);
                  if (e.target.value.trim()) {
                    newParams.set('query', e.target.value.trim());
                  } else {
                    newParams.delete('query');
                  }
                  setSearchParams(newParams);
                }}
                placeholder={t('nav.searchPlaceholder', 'मालमत्ता, गाव, कोड शोधा...')}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-primary/50 text-xs text-slate-900 pl-9 pr-4 py-2.5 rounded-xl outline-none transition-all placeholder-slate-400 font-semibold shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3 w-full justify-end">
              {/* Filter Toggle Button */}
              {type.toLowerCase() === 'sale' && (
                <Button
                  variant={showFilters ? 'primary' : 'glass'}
                  onClick={toggleFilters}
                  className={`py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 font-bold cursor-pointer border ${showFilters
                    ? 'text-white border-transparent'
                    : 'text-slate-900 dark:text-slate-900 border-slate-200/80'
                    }`}
                >
                  {t('properties.filter')}
                </Button>
              )}

              {/* Saved properties Toggle */}
              <Button
                variant={showSavedOnly ? 'primary' : 'glass'}
                onClick={toggleShowSavedOnly}
                className="p-2.5 rounded-xl flex items-center justify-center cursor-pointer border border-slate-200/80 w-10 h-10 shrink-0"
                title={showSavedOnly ? t('properties.showingSaved') : t('properties.showSaved')}
              >
                <Heart className={`w-4 h-4 ${showSavedOnly ? 'fill-white text-white' : 'text-primary'}`} />
              </Button>
            </div>
          </div>
        </div>


        {/* Category Pills Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar w-full">
          {categoryOptions.map((opt) => {
            const isSelected = category.toLowerCase() === opt.value.toLowerCase();
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCategory(opt.value);
                  updateURLParams('category', opt.value);
                  if (opt.value === 'All') {
                    if (category.toLowerCase() === 'all' && type.toLowerCase() !== 'all') {
                      setType('All');
                      updateURLParams('type', 'All');
                    }
                  }
                }}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Advanced Filters Panel - Only show for Buy (Sale) properties when filter is open */}
        {showFilters && type.toLowerCase() === 'sale' && (
          <Card className="p-4 sm:p-6 bg-white border-slate-200 text-left animate-fadeIn relative z-30">
            {/* No category selected hint */}
            {category.toLowerCase() === 'all' ? (
              <div className="text-center py-6 flex flex-col items-center gap-3.5">
                <p className="text-slate-500 text-xs font-medium">
                  {t('properties.selectTypeForAdvanced', 'Please select a Property Type above to see advanced filters.')}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {categoryOptions.filter(opt => opt.value !== 'All').map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCategory(opt.value);
                        updateURLParams('category', opt.value);
                      }}
                      className="px-3.5 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-slate-50 hover:bg-primary/5 hover:border-primary/40 hover:text-primary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${isMobileDeviceActive ? '' : (category.toLowerCase() === 'flat' ? 'md:grid-cols-3' : 'md:grid-cols-2')} gap-6 animate-fadeIn`}>
                {['flat', 'house', 'bungalow', 'plot'].includes(category.toLowerCase()) ? (
                  <>
                    {/* ================= MOBILE VIEW (PILLS Selector) ================= */}
                    <div className={`${isMobileDeviceActive ? '' : 'md:hidden'} flex flex-col gap-6 w-full animate-fadeIn col-span-1`}>

                      {/* Layout Details */}
                      <div className="flex flex-col gap-5 p-5 bg-[#f8fafc] rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 font-serif">
                            {category.toLowerCase() === 'plot'
                              ? (t('forms.layout', 'Layout') as string)
                              : (t('forms.layoutDetails', 'Layout Details') as string)}
                          </h4>
                        </div>

                        {category.toLowerCase() !== 'plot' ? (
                          <>
                            <PillSelector
                              label="BHK"
                              value={beds}
                              onChange={(val) => {
                                setBeds(val);
                                updateURLParams('beds', val);
                              }}
                              options={bhkMobileOptions}
                              colorSchema="sky"
                            />

                            <PillSelector
                              label={t('forms.builtArea', 'Built Area') as string}
                              value={builtUpArea}
                              onChange={(val) => {
                                setBuiltUpArea(val);
                                updateURLParams('builtUpArea', val);
                              }}
                              options={builtAreaMobileOptions}
                              colorSchema="violet"
                            />

                            {category.toLowerCase() === 'flat' && (
                              <PillSelector
                                label={t('forms.floor', 'Floor') as string}
                                value={totalFloors}
                                onChange={(val) => {
                                  setTotalFloors(val);
                                  updateURLParams('totalFloors', val);
                                }}
                                options={floorMobileOptions}
                                colorSchema="emerald"
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <PillSelector
                              label={t('properties.plotArea', 'Plot Area') as string}
                              value={builtUpArea}
                              onChange={(val) => {
                                setBuiltUpArea(val);
                                updateURLParams('builtUpArea', val);
                              }}
                              options={builtAreaMobileOptions}
                              colorSchema="sky"
                            />

                            <PillSelector
                              label={t('forms.occupancyClass', 'Occupancy Class') as string}
                              value={occupancyClass}
                              onChange={(val) => {
                                setOccupancyClass(val);
                                updateURLParams('occupancyClass', val);
                              }}
                              options={occupancyMobileOptions}
                              colorSchema="violet"
                            />
                          </>
                        )}
                      </div>

                      {/* Parking Details */}
                      {category.toLowerCase() === 'flat' && (
                        <div className="flex flex-col gap-5 p-5 bg-[#f8fafc] rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                              <span className="font-bold text-xs">P</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 font-serif">
                              {t('forms.parkingDetails', 'Parking Details') as string}
                            </h4>
                          </div>

                          <PillSelector
                            label={t('forms.parkingType', 'Parking Type') as string}
                            value={parkingType}
                            onChange={(val) => {
                              setParkingType(val);
                              updateURLParams('parkingType', val);
                            }}
                            options={parkingMobileOptions}
                            colorSchema="amber"
                          />
                        </div>
                      )}

                      {/* Additional Details / Direction */}
                      <div className="flex flex-col gap-5 p-5 bg-[#f8fafc] rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          {category.toLowerCase() === 'plot' ? (
                            <>
                              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 font-serif">
                                {t('forms.direction', 'Direction') as string}
                              </h4>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 font-serif">
                                {t('forms.additionalDetails', 'Additional Details') as string}
                              </h4>
                            </>
                          )}
                        </div>

                        {category.toLowerCase() !== 'plot' ? (
                          <>
                            <PillSelector
                              label={t('properties.furnishingStatus', 'Furnishing Status') as string}
                              value={furnishingStatus}
                              onChange={(val) => {
                                setFurnishingStatus(val);
                                updateURLParams('furnishingStatus', val);
                              }}
                              options={furnishingMobileOptions}
                              colorSchema="orange"
                            />

                            <PillSelector
                              label={t('forms.facingDirection', 'Facing Direction') as string}
                              value={facingDirection}
                              onChange={(val) => {
                                setFacingDirection(val);
                                updateURLParams('facingDirection', val);
                              }}
                              options={facingMobileOptions}
                              colorSchema="sky"
                            />
                          </>
                        ) : (
                          <PillSelector
                            label={t('properties.roadFacing', 'Road Facing') as string}
                            value={facingDirection}
                            onChange={(val) => {
                              setFacingDirection(val);
                              updateURLParams('facingDirection', val);
                            }}
                            options={facingMobileOptions}
                            colorSchema="sky"
                          />
                        )}
                      </div>

                    </div>

                    {/* ================= DESKTOP VIEW (DROPDOWNS Select) ================= */}
                    {!isMobileDeviceActive && (
                      <div className="hidden md:contents">

                        {/* Layout Details */}
                        <div className="flex flex-col gap-4 text-left col-span-1">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif border-l-2 border-primary pl-2">
                            {category.toLowerCase() === 'plot'
                              ? (t('forms.layout', 'Layout') as string)
                              : (t('forms.layoutDetails', 'Layout Details') as string)}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {category.toLowerCase() !== 'plot' ? (
                              <>
                                <Select
                                  label="BHK"
                                  value={beds}
                                  onChange={(e) => {
                                    setBeds(e.target.value);
                                    updateURLParams('beds', e.target.value);
                                  }}
                                  options={bhkDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />

                                <Select
                                  label={t('forms.builtArea', 'Built Area') as string}
                                  value={builtUpArea}
                                  onChange={(e) => {
                                    setBuiltUpArea(e.target.value);
                                    updateURLParams('builtUpArea', e.target.value);
                                  }}
                                  options={builtAreaDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />

                                {category.toLowerCase() === 'flat' && (
                                  <div className="sm:col-span-2">
                                    <Select
                                      label={t('forms.floor', 'Floor') as string}
                                      value={totalFloors}
                                      onChange={(e) => {
                                        setTotalFloors(e.target.value);
                                        updateURLParams('totalFloors', e.target.value);
                                      }}
                                      options={floorDesktopOptions}
                                      className="py-2.5 text-xs font-semibold"
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <Select
                                  label={t('properties.plotArea', 'Plot Area') as string}
                                  value={builtUpArea}
                                  onChange={(e) => {
                                    setBuiltUpArea(e.target.value);
                                    updateURLParams('builtUpArea', e.target.value);
                                  }}
                                  options={builtAreaDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />

                                <Select
                                  label={t('forms.occupancyClass', 'Occupancy Class') as string}
                                  value={occupancyClass}
                                  onChange={(e) => {
                                    setOccupancyClass(e.target.value);
                                    updateURLParams('occupancyClass', e.target.value);
                                  }}
                                  options={occupancyDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Parking Details */}
                        {category.toLowerCase() === 'flat' && (
                          <div className="flex flex-col gap-4 text-left col-span-1">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif border-l-2 border-primary pl-2">
                              {t('forms.parkingDetails', 'Parking Details') as string}
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                              <Select
                                label={t('forms.parkingType', 'Parking Type') as string}
                                value={parkingType}
                                onChange={(e) => {
                                  setParkingType(e.target.value);
                                  updateURLParams('parkingType', e.target.value);
                                }}
                                options={parkingDesktopOptions}
                                className="py-2.5 text-xs font-semibold"
                              />
                            </div>
                          </div>
                        )}

                        {/* Additional Details */}
                        <div className="flex flex-col gap-4 text-left col-span-1">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif border-l-2 border-primary pl-2">
                            {category.toLowerCase() === 'plot'
                              ? (t('forms.direction', 'Direction') as string)
                              : (t('forms.additionalDetails', 'Additional Details') as string)}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {category.toLowerCase() !== 'plot' ? (
                              <>
                                <Select
                                  label={t('properties.furnishingStatus', 'Furnishing Status') as string}
                                  value={furnishingStatus}
                                  onChange={(e) => {
                                    setFurnishingStatus(e.target.value);
                                    updateURLParams('furnishingStatus', e.target.value);
                                  }}
                                  options={furnishingDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />

                                <Select
                                  label={t('forms.facingDirection', 'Facing Direction') as string}
                                  value={facingDirection}
                                  onChange={(e) => {
                                    setFacingDirection(e.target.value);
                                    updateURLParams('facingDirection', e.target.value);
                                  }}
                                  options={facingDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />
                              </>
                            ) : (
                              <div className="sm:col-span-2">
                                <Select
                                  label={t('properties.roadFacing', 'Road Facing') as string}
                                  value={facingDirection}
                                  onChange={(e) => {
                                    setFacingDirection(e.target.value);
                                    updateURLParams('facingDirection', e.target.value);
                                  }}
                                  options={facingDesktopOptions}
                                  className="py-2.5 text-xs font-semibold"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* ================= ORIGINAL FILTERS FOR OTHER CATEGORIES (Bungalow, Plot, Land, etc.) ================= */}
                    {/* Layout Details */}
                    <div className="flex flex-col gap-4 text-left">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif border-l-2 border-primary pl-2">
                        {t('forms.layoutDetails', 'Layout Details') as string}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Area Size Filter - Relevant for all categories */}
                        <Select
                          label={t('forms.builtArea', 'Built Area') as string}
                          value={builtUpArea}
                          onChange={(e) => {
                            setBuiltUpArea(e.target.value);
                            updateURLParams('builtUpArea', e.target.value);
                          }}
                          options={[
                            { value: 'All', label: t('properties.anyArea', 'Any Area') as string },
                            { value: '500', label: '500+ sqft' },
                            { value: '1000', label: '1000+ sqft' },
                            { value: '1500', label: '1500+ sqft' },
                            { value: '2000', label: '2000+ sqft' },
                            { value: '2500', label: '2500+ sqft' },
                          ]}
                          className="py-2.5 text-xs font-semibold"
                        />

                        {/* BHK Filter - Relevant for House, Bungalow, Flat */}
                        {['house', 'bungalow', 'flat'].includes(category.toLowerCase()) && (
                          <Select
                            label="BHK"
                            value={beds}
                            onChange={(e) => {
                              setBeds(e.target.value);
                              updateURLParams('beds', e.target.value);
                            }}
                            options={[
                              { value: 'All', label: 'Any BHK' },
                              { value: '1', label: '1 BHK' },
                              { value: '2', label: '2 BHK' },
                              { value: '3', label: '3 BHK' },
                              { value: '4', label: '4+ BHK' }
                            ]}
                            className="py-2.5 text-xs font-semibold"
                          />
                        )}
                      </div>
                    </div>

                    {/* Additional Details (shown for all categories except Land) */}
                    {category.toLowerCase() !== 'land' && (
                      <div className="flex flex-col gap-4 text-left">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif border-l-2 border-primary pl-2">
                          {category.toLowerCase() === 'plot'
                            ? (t('forms.direction', 'Direction') as string)
                            : (t('forms.additionalDetails', 'Additional Details') as string)}
                        </h3>
                        <div className={`grid grid-cols-1 ${['flat', 'house', 'bungalow'].includes(category.toLowerCase())
                          ? 'sm:grid-cols-2'
                          : 'sm:grid-cols-1'
                          } gap-4`}>
                          {/* Facing Direction Filter - Relevant for all categories */}
                          <Select
                            label={t('forms.facingDirection', 'Facing Direction') as string}
                            value={facingDirection}
                            onChange={(e) => {
                              setFacingDirection(e.target.value);
                              updateURLParams('facingDirection', e.target.value);
                            }}
                            options={[
                              { value: 'All', label: t('properties.anyFacing', 'Any Facing') as string },
                              { value: 'East', label: t('facing.east', 'East') as string },
                              { value: 'West', label: t('facing.west', 'West') as string },
                              { value: 'North', label: t('facing.north', 'North') as string },
                              { value: 'South', label: t('facing.south', 'South') as string }
                            ]}
                            className="py-2.5 text-xs font-semibold"
                          />

                          {/* Furnishing Status Filter - Relevant for House, Bungalow, Flat */}
                          {['house', 'bungalow', 'flat'].includes(category.toLowerCase()) && (
                            <Select
                              label={t('properties.furnishingStatus', 'Furnishing Status') as string}
                              value={furnishingStatus}
                              onChange={(e) => {
                                setFurnishingStatus(e.target.value);
                                updateURLParams('furnishingStatus', e.target.value);
                              }}
                              options={[
                                { value: 'All', label: t('properties.anyFurnishing', 'Any Furnishing') as string },
                                { value: 'Furnished', label: t('properties.furnished', 'Furnished') as string },
                                { value: 'Semi-Furnished', label: t('properties.semiFurnished', 'Semi-Furnished') as string },
                                { value: 'Unfurnished', label: t('properties.unfurnished', 'Unfurnished') as string }
                              ]}
                              className="py-2.5 text-xs font-semibold"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Water Facility - Only shown when category is Land */}
                    {category.toLowerCase() === 'land' && (
                      <div className="flex flex-col gap-4 text-left animate-fadeIn">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-serif border-l-2 border-primary pl-2">
                          {t('forms.waterFacility', 'Water Facility') as string}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Water Source Available Selector */}
                          <Select
                            label={t('forms.waterSourceAvailable', 'Water Source Available') as string}
                            value={waterSourceAvailable}
                            onChange={(e) => {
                              setWaterSourceAvailable(e.target.value);
                              updateURLParams('waterSourceAvailable', e.target.value);
                            }}
                            options={[
                              { value: 'All', label: t('properties.anyWaterSource', 'Any Water Source') as string },
                              { value: 'true', label: t('forms.yes', 'Yes') as string },
                              { value: 'false', label: t('forms.no', 'No') as string }
                            ]}
                            className="py-2.5 text-xs font-semibold"
                          />

                          {/* Water Source Type Selector */}
                          <Select
                            label={t('forms.waterSourceType', 'Water Source Type') as string}
                            value={waterSourceType}
                            onChange={(e) => {
                              setWaterSourceType(e.target.value);
                              updateURLParams('waterSourceType', e.target.value);
                            }}
                            options={[
                              { value: 'All', label: t('properties.anyWaterSourceType', 'Any Type') as string },
                              { value: 'Well', label: t('waterSource.well', 'Well / Open Well') as string },
                              { value: 'Borewell', label: t('waterSource.borewell', 'Borewell') as string },
                              { value: 'Canal', label: t('waterSource.canal', 'Irrigation Canal') as string },
                              { value: 'River', label: t('waterSource.river', 'River Water Intake') as string },
                              { value: 'Municipal Water', label: t('waterSource.municipal', 'Municipal Tap Line') as string },
                              { value: 'Other', label: t('waterSource.other', 'Other Water Source') as string }
                            ]}
                            className="py-2.5 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Listings Grid */}
        {isLoading && filteredProperties.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-5 sm:gap-8 relative z-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 relative z-0 flex flex-col items-center justify-center gap-3">
            <span className="text-slate-600 text-sm font-medium">{t('properties.noPropertiesFound')}</span>
            {(type !== 'All' || category !== 'All' || query) && (
              <Button
                variant="outline"
                onClick={() => {
                  setType('All');
                  setCategory('All');
                  setQuery('');
                  setSearchParams(new URLSearchParams());
                }}
                className="rounded-full text-xs font-bold cursor-pointer"
              >
                {isMr ? 'सर्व मालमत्ता दाखवा' : 'Show All Properties'}
              </Button>
            )}
          </div>
        ) : (
          <div
            key={`${type}-${category}-${searchParams.get('status') || ''}-${showSavedOnly}`}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-5 sm:gap-8 relative z-0 animate-fade-in"
          >
            {filteredProperties.map((prop) => {
              const isSaved = savedIds.includes(prop.id);
              return (
                <Card
                  key={prop.id}
                  className="group relative overflow-hidden flex flex-col h-full bg-white border-slate-200 cursor-pointer hover:border-primary/20 transition-all duration-300"
                  onClick={() => navigate(`/property/${prop.id}`)}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden relative bg-slate-100 group-hover:shadow-inner transition-all duration-300">
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                    <img
                      src={optimizeCloudinaryUrl((prop.images && prop.images[0]) || '/hero-background.jpg', 600)}
                      alt={prop.title}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${prop.isSoldOut ? 'grayscale-[40%]' : ''}`}
                    />

                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      {prop.propertyCode && (
                        <div className="bg-[#111c2e] text-white text-[10px] font-mono font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                          {prop.propertyCode}
                        </div>
                      )}
                    </div>
                    {prop.isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden">
                        <div className="bg-red-600/90 text-white w-[120%] py-2 text-center transform -rotate-12 shadow-xl border-y-2 border-red-500 backdrop-blur-sm shadow-red-500/30">
                          <span className="text-sm font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 drop-shadow-md">
                            <span className="text-[10px]">🔴</span>
                            {isMr ? 'विकले' : 'SOLD OUT'}
                            <span className="text-[10px]">🔴</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Category pill */}
                    <div className="absolute bottom-4 left-4 bg-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider text-primary border border-slate-200 uppercase z-10">
                      {t(`categories.${prop.category.toLowerCase()}`, prop.category) as string}
                    </div>

                    {/* Sale / Rent Badge */}
                    <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      {prop.type === 'rent' ? t('properties.forRent') : t('properties.forSale')}
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={(e) => handleSavedToggle(e, prop.id)}
                      className="absolute bottom-4 right-4 p-2.5 rounded-full bg-white backdrop-blur-md text-slate-900 border border-slate-200 hover:bg-slate-950 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                    </button>
                  </div>

                  <div className="p-6 text-left flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-serif text-slate-900 font-bold group-hover:text-primary transition-colors mb-2 line-clamp-1 flex items-center gap-2 flex-wrap">
                        <span>{isMr ? prop.titleMr || prop.title : prop.title}</span>
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isMr ? prop.locationMr || prop.location : prop.location}</span>
                      </div>

                      {/* Negotiable status badge */}
                      {prop.type === 'sale' && prop.isNegotiable !== undefined && (
                        <div className="mb-4">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${prop.isNegotiable
                            ? 'bg-green-500/10 text-green-700 border-green-200'
                            : 'bg-red-500/10 text-red-700 border-red-200'
                            }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {prop.isNegotiable ? t('negotiable') : t('fixedPrice')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-auto">
                      <span className="text-primary font-serif font-bold text-lg ">
                        Rs {prop.price ? prop.price.toLocaleString() : 'N/A'}
                        {prop.type === 'rent' && <span className="text-xs text-slate-600 font-sans">{t('properties.monthlyShort')}</span>}
                      </span>
                      <div className="flex gap-4 text-slate-600 text-xs">
                        <div className="flex items-center gap-1" title="Bedrooms">
                          <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                          <span>{prop.beds}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Bathrooms">
                          <Bath className="w-3.5 h-3.5 text-slate-500" />
                          <span>{prop.baths}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Area size">
                          <Ruler className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t('properties.areaSize', { count: prop.area })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
