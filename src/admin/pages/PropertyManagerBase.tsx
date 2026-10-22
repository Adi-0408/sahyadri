import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { subscribeToCollection, updateDocument, deleteDocument, createDocument, fetchCollection, getCachedCollection } from '../../services/firebase';
import { syncApprovedRoleInquiriesWithProperties } from '../../services/roleInquiry';
import { useAuth } from '../../app/providers/AuthProvider';
import { Card as UICard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Dialog } from '../../components/ui/Dialog';
import {
  Check,
  X,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Search,
  ChevronDown,
  PlusCircle,
  Home,
  Building,
  Building2,
  Warehouse,
  Mountain,
  Tractor,
  MoreVertical,
  Edit,
  Tag,
  MapPin,
  Compass,
  SlidersHorizontal,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';

import { HouseListingForm } from '../../public-pages/Properties/HouseListingForm';
import { FlatListingForm } from '../../public-pages/Properties/FlatListingForm';
import { BungalowListingForm } from '../../public-pages/Properties/BungalowListingForm';
import { PlotListingForm } from '../../public-pages/Properties/PlotListingForm';
import { LandListingForm } from '../../public-pages/Properties/LandListingForm';

interface PropertyManagerBaseProps {
  filterType: 'sale' | 'rent';
  title: string;
  subtitle: string;
}

export interface FieldMetadata {
  id: string;
  label: string;
}

export interface SectionMetadata {
  id: string;
  label: string;
  fields: FieldMetadata[];
}

const PROPERTY_SECTIONS_METADATA: SectionMetadata[] = [
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
      { id: 'description', label: 'Description' },
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
      { id: 'builtUpArea', label: 'Area Size' },
      { id: 'carpetArea', label: 'Carpet Area' },
      { id: 'totalRooms', label: 'Total Rooms' },
      { id: 'bedrooms', label: 'Bedrooms' },
      { id: 'bathrooms', label: 'Bathrooms' },
      { id: 'balconies', label: 'Balconies' },
      { id: 'floorNumber', label: 'Floor Number' },
      { id: 'totalFloors', label: 'Total Floors' },
      { id: 'yearBuilt', label: 'Year Built' },
      { id: 'flatType', label: 'Flat Configuration' }
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
  },
  {
    id: 'mediaGallery',
    label: 'Media Gallery',
    fields: [
      { id: 'images', label: 'Property Photos / Images' }
    ]
  }
];

const isFieldApplicable = (category: string, type: 'sale' | 'rent', fieldId: string): boolean => {
  const cat = category ? category.toLowerCase() : '';

  // 1. Transaction Type (Sale vs Rent) Filter
  const rentOnlyFields = [
    'monthlyRent', 'securityDeposit', 'maintenanceCharges',
    'bachelorsAllowed', 'familyPreferred', 'petsAllowed', 'workingProfessionalsAllowed', 'foodPreference'
  ];
  const saleOnlyFields = [
    'priceType', 'priceAmount', 'expectedPrice', 'isNegotiable',
    'hasLoan', 'loanBankName', 'loanAmount'
  ];

  if (type === 'sale' && rentOnlyFields.includes(fieldId)) return false;
  if (type === 'rent' && saleOnlyFields.includes(fieldId)) return false;

  // 2. Category-Specific Filters
  if (cat === 'plot') {
    const validPlotFields = [
      'ownerName', 'mobileNumber', 'alternateMobile', 'email',
      'propertyName', 'description', 'gutNumber', 'priceType', 'priceAmount', 'isNegotiable', 'monthlyRent', 'securityDeposit',
      'builtUpArea', 'landType', 'occupancyClass', 'isSharedRoad', 'gatedCommunity', 'cornerPlot', 'boundaryWall',
      'facingDirection', 'roadTouch', 'roadType', 'roadAvailable',
      'hasLoan', 'loanBankName', 'loanAmount',
      'state', 'district', 'taluka', 'cityVillage', 'pincode', 'landmark', 'fullAddress',
      'images'
    ];
    return validPlotFields.includes(fieldId);
  }

  if (cat === 'land') {
    const validLandFields = [
      'ownerName', 'mobileNumber', 'alternateMobile', 'email',
      'propertyName', 'description', 'gutNumber', 'priceType', 'priceAmount', 'isNegotiable', 'monthlyRent', 'securityDeposit',
      'builtUpArea', 'landType', 'electricityConnection', 'fencingAvailable',
      'waterSourceAvailable', 'waterSourceType', 'facingDirection', 'roadTouch', 'roadType', 'roadAvailable',
      'hasLoan', 'loanBankName', 'loanAmount',
      'state', 'district', 'taluka', 'cityVillage', 'pincode', 'landmark', 'fullAddress',
      'images'
    ];
    return validLandFields.includes(fieldId);
  }

  // Residential (Flat, House, Bungalow)
  const validResidentialFields = [
    'ownerName', 'mobileNumber', 'alternateMobile', 'email',
    'propertyName', 'description', 'expectedPrice', 'isNegotiable', 'monthlyRent', 'securityDeposit', 'maintenanceCharges',
    'builtUpArea', 'carpetArea', 'totalRooms', 'bedrooms', 'bathrooms', 'balconies', 'floorNumber', 'totalFloors', 'yearBuilt', 'flatType',
    'facingDirection', 'furnishingStatus', 'terrace', 'carParking', 'parkingType', 'parkingCapacity', 'parkingNumber', 'lift', 'garden', 'waterSupply', 'powerBackup',
    'bachelorsAllowed', 'familyPreferred', 'petsAllowed', 'workingProfessionalsAllowed', 'foodPreference',
    'hasLoan', 'loanBankName', 'loanAmount',
    'state', 'district', 'taluka', 'cityVillage', 'pincode', 'landmark', 'fullAddress',
    'images'
  ];

  if (!validResidentialFields.includes(fieldId)) return false;

  // floorNumber is Flat-only
  if (fieldId === 'floorNumber' && cat !== 'flat') return false;

  return true;
};

const isFieldFilled = (prop: any, fieldId: string): boolean => {
  if (!prop) return false;
  if (!isFieldApplicable(prop.category, prop.type, fieldId)) return false;
  const value = prop[fieldId];
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; count?: number }[];
  searchable?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  searchable = false,
  placeholder = "Search...",
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOpt = options.find(o => o.value === value);
  const displayText = selectedOpt ? selectedOpt.label : (placeholder || 'Select...');
  const isFiltered = value !== 'All';

  const filteredOptions = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 w-full text-left ${isOpen ? 'z-50' : 'z-20'}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider font-bold text-slate-800 flex items-center gap-1.5">
          {Icon && (
            <Icon className={`w-4 h-4 transition-colors ${isFiltered ? 'text-slate-950' : 'text-slate-600'}`} />
          )}
          <span>{label}</span>
        </label>
        {isFiltered && (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Filtered
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={`w-full min-w-0 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-semibold transition-all duration-150 flex items-center justify-between cursor-pointer border shadow-2xs group bg-white ${
          isOpen
            ? 'border-slate-900 ring-2 ring-slate-900/10 text-slate-950'
            : isFiltered
              ? 'border-slate-800 bg-slate-50 text-slate-950 font-bold'
              : 'border-slate-300 text-slate-900 hover:border-slate-400 hover:bg-slate-50/60'
        }`}
        style={{ backgroundColor: isFiltered && !isOpen ? '#f8fafc' : '#ffffff', color: '#0f172a' }}
      >
        <span className="truncate flex items-center gap-2 min-w-0 flex-1">
          {Icon && (
            <Icon className={`w-4 h-4 shrink-0 transition-colors ${
              isFiltered ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
            }`} />
          )}
          <span className="truncate font-semibold text-slate-900 text-sm">
            {displayText}
          </span>
          {selectedOpt?.count !== undefined && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors ${
              isFiltered
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-800 border border-slate-200'
            }`}>
              {selectedOpt.count}
            </span>
          )}
        </span>

        <div className="flex items-center gap-2 ml-2 shrink-0">
          {isFiltered && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('All');
                setIsOpen(false);
              }}
              title="Reset to All"
              className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 flex flex-col ring-1 ring-black/5 animate-in fade-in duration-150"
          style={{ backgroundColor: '#ffffff', opacity: 1 }}
        >
          {searchable && (
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-500 font-medium focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20 transition-all shadow-2xs"
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <div 
            className="overflow-y-auto max-h-56 p-2 space-y-1 bg-white admin-sidebar-scroll"
            style={{ backgroundColor: '#ffffff' }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center bg-white">
                <Search className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-sm text-slate-600 font-medium">No options found</p>
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs font-bold'
                        : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 bg-white'
                    }`}
                    style={isSelected ? { backgroundColor: '#0f172a', color: '#ffffff' } : { backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="truncate text-inherit">{opt.label}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {opt.count !== undefined && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-150 text-slate-800 border border-slate-200'
                        }`}>
                          {opt.count}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const isSectionVisible = (prop: any, sectionId: string): boolean => {
  if (!prop) return false;
  if (prop.visibilitySettings?.sections) {
    return prop.visibilitySettings.sections[sectionId] !== false;
  }
  // Backward compatibility fallback
  if (sectionId === 'facilitiesUtilities' && prop.showAmenities === false) return false;
  if (sectionId === 'mediaGallery' && prop.showImages === false) return false;
  return true;
};

const isFieldVisible = (prop: any, sectionId: string, fieldId: string): boolean => {
  if (!prop) return false;
  if (!isSectionVisible(prop, sectionId)) return false;
  if (prop.visibilitySettings?.fields) {
    return prop.visibilitySettings.fields[fieldId] !== false;
  }
  // Backward compatibility fallback
  if (fieldId === 'priceAmount' || fieldId === 'expectedPrice' || fieldId === 'monthlyRent' || fieldId === 'securityDeposit' || fieldId === 'maintenanceCharges') {
    if (prop.showPrice === false) return false;
  }
  if (fieldId === 'fullAddress' || fieldId === 'landmark' || fieldId === 'pincode') {
    if (prop.showAddress === false) return false;
  }
  if (fieldId === 'ownerName') {
    if (prop.showOwnerName === false) return false;
  }
  if (fieldId === 'mobileNumber' || fieldId === 'alternateMobile' || fieldId === 'email') {
    if (prop.showOwnerContact === false) return false;
  }
  if (fieldId === 'gutNumber') {
    if (prop.showExactLocation === false) return false;
  }
  return true;
};

export const PropertyManagerBase: React.FC<PropertyManagerBaseProps> = ({ filterType, title }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const location = useLocation();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedCollection('properties');
      if (Array.isArray(cached) && cached.length > 0) {
        const f = (filterType || '').toLowerCase().trim();
        return cached.filter((p: any) => {
          const t = (p.type || '').toLowerCase().trim();
          if (f === 'sale' || f === 'sell') return t === 'sale' || t === 'sell' || t === 'buy';
          if (f === 'rent') return t === 'rent' || t === 'rental';
          return t === f;
        });
      }
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => properties.length === 0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search & dropdown selections
  const [selectedPropertyType, setSelectedPropertyType] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedTaluka, setSelectedTaluka] = useState('All');
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);

  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

  // Active property references
  const [activeProp, setActiveProp] = useState<any>(null);
  const [actionProp, setActionProp] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'hide' | 'hold' | 'request_info' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [visibilityProp, setVisibilityProp] = useState<any>(null);
  const [visibilityState, setVisibilityState] = useState<any>({ sections: {}, fields: {} });
  const [visibilitySearch, setVisibilitySearch] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeDetailImg, setActiveDetailImg] = useState<string>('');
  const [deletePropId, setDeletePropId] = useState<string | null>(null);
  const [soldOutProp, setSoldOutProp] = useState<{ id: string, isSoldOut: boolean } | null>(null);

  // Dropdown menus
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (openDropdownId && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openDropdownId]);

  const handleMarkSoldOut = (propId: string, currentIsSoldOut: boolean) => {
    setSoldOutProp({ id: propId, isSoldOut: currentIsSoldOut });
  };

  const confirmSoldOut = async () => {
    if (!soldOutProp) return;
    try {
      await updateDocument('properties', soldOutProp.id, { isSoldOut: !soldOutProp.isSoldOut });
      setSoldOutProp(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update property status");
    }
  };

  const renderPropertyDetailSections = (prop: any) => {
    return PROPERTY_SECTIONS_METADATA.map((section) => {
      if (section.id === 'mediaGallery') return null;

      // Filter fields that are applicable, filled, and visible
      const validFields = section.fields.filter((field) => {
        if (!isFieldApplicable(prop.category, prop.type, field.id)) return false;
        if (!isFieldFilled(prop, field.id)) return false;
        return isFieldVisible(prop, section.id, field.id);
      }).map((field) => {
        const rawVal = prop[field.id];
        let formattedValue = String(rawVal);

        // Value formatting
        if (
          ['priceAmount', 'expectedPrice', 'monthlyRent', 'securityDeposit', 'maintenanceCharges', 'loanAmount'].includes(field.id) &&
          typeof rawVal === 'number'
        ) {
          formattedValue = `₹${rawVal.toLocaleString('en-IN')}`;
        } else if (field.id === 'builtUpArea' || field.id === 'carpetArea') {
          formattedValue = `${rawVal} sqft`;
        } else if (typeof rawVal === 'boolean') {
          formattedValue = rawVal ? t('forms.yes') : t('forms.no');
        } else if (typeof rawVal === 'string' && field.id === 'priceType') {
          formattedValue = rawVal.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }

        return {
          id: field.id,
          label: field.label,
          value: formattedValue,
        };
      });

      if (validFields.length === 0) return null;

      // Special layout for ownerDetails to keep it distinct
      const isOwnerCard = section.id === 'ownerDetails';
      const cardBgClass = isOwnerCard
        ? "bg-slate-950 border-slate-800 text-slate-300"
        : "bg-slate-50 border-slate-200 text-slate-700";
      const titleColorClass = isOwnerCard ? "text-primary" : "text-primary";
      const labelColorClass = isOwnerCard ? "text-slate-500" : "text-slate-400";
      const valColorClass = isOwnerCard ? "text-white" : "text-slate-850";

      return (
        <div key={section.id} className={`p-4 rounded-xl border space-y-3 ${cardBgClass}`}>
          <h4 className={`text-xs uppercase tracking-widest font-bold ${titleColorClass}`}>
            {t(`details.sections.${section.id}`)}
          </h4>
          {section.id === 'propertyInfo' && validFields.some(f => f.id === 'description') ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                {validFields.filter(f => f.id !== 'description').map((field) => (
                  <div key={field.id} className="flex flex-col">
                    <span className={`text-[10px] font-semibold uppercase ${labelColorClass}`}>{t(`details.fields.${field.id}`)}</span>
                    <span className={`font-bold mt-0.5 ${valColorClass}`}>{field.value}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const descField = validFields.find(f => f.id === 'description');
                return descField ? (
                  <div className="pt-2.5 border-t border-slate-200/60 mt-1 flex flex-col text-xs">
                    <span className={`text-[10px] font-semibold uppercase ${labelColorClass}`}>{t(`details.fields.${descField.id}`)}</span>
                    <span className="font-semibold text-slate-700 leading-relaxed mt-1 whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200/50">{descField.value}</span>
                  </div>
                ) : null;
              })()}
            </div>
          ) : section.id === 'addressDetails' && validFields.some(f => f.id === 'fullAddress') ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                {validFields.filter(f => f.id !== 'fullAddress').map((field) => (
                  <div key={field.id} className="flex flex-col">
                    <span className={`text-[10px] font-semibold uppercase ${labelColorClass}`}>{t(`details.fields.${field.id}`)}</span>
                    <span className={`font-bold mt-0.5 ${valColorClass}`}>{field.value}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const addrField = validFields.find(f => f.id === 'fullAddress');
                return addrField ? (
                  <div className="pt-2.5 border-t border-slate-200/60 mt-1 flex flex-col text-xs">
                    <span className={`text-[10px] font-semibold uppercase ${labelColorClass}`}>{t(`details.fields.${addrField.id}`)}</span>
                    <span className="font-semibold text-slate-700 leading-relaxed mt-1 whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200/50">{addrField.value}</span>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              {validFields.map((field) => (
                <div key={field.id} className="flex flex-col">
                  <span className={`text-[10px] font-semibold uppercase ${labelColorClass}`}>{t(`details.fields.${field.id}`)}</span>
                  <span className={`font-bold mt-0.5 ${valColorClass}`}>{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Add Property Modal state
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [addStep, setAddStep] = useState(0);
  const [addCategory, setAddCategory] = useState('Flat');
  const [addTransactionType, setAddTransactionType] = useState<'sale' | 'rent'>('sale');

  useEffect(() => {
    syncApprovedRoleInquiriesWithProperties().catch(() => {});
  }, []);

  // Fetch properties from Firestore
  useEffect(() => {
    if (properties.length === 0) setLoading(true);
    const unsubscribe = subscribeToCollection('properties', (list) => {
      // Filter by transaction type (sale/rent)
      const typeFiltered = list.filter((p: any) => {
        const t = (p.type || '').toLowerCase().trim();
        const f = (filterType || '').toLowerCase().trim();
        if (f === 'sale' || f === 'sell') {
          return t === 'sale' || t === 'sell' || t === 'buy' || !t;
        }
        if (f === 'rent') {
          return t === 'rent' || t === 'rental';
        }
        return t === f;
      });
      setProperties(typeFiltered);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [filterType]);

  // Fetch districts and talukas from Firestore
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const dsts = await fetchCollection('districts');
        const tks = await fetchCollection('talukas');
        setDistricts(dsts.filter((d: any) => d.active !== false));
        setTalukas(tks.filter((t: any) => t.active !== false));
      } catch (e) {
        console.error("Failed to load locations in PropertyManagerBase:", e);
      }
    };
    loadLocations();
  }, []);

  // Filter properties synchronously by tabs, search, and dynamic selectors via useMemo
  const filteredProperties = useMemo(() => {
    const path = location.pathname;
    let list = [...properties];

    if (path.includes('/pending')) {
      list = list.filter((p) => p.status === 'pending');
    } else if (path.includes('/approved')) {
      list = list.filter((p) => p.status === 'approved' || p.status === 'active');
    } else if (path.includes('/rejected')) {
      list = list.filter((p) => p.status === 'rejected');
    } else if (path.includes('/hidden')) {
      list = list.filter((p) => p.status === 'hidden');
    }

    if (selectedPropertyType !== 'All') {
      list = list.filter((p) => {
        const pType = (p.propertyType || p.category || '').toLowerCase();
        return pType === selectedPropertyType.toLowerCase();
      });
    }

    if (selectedDistrict !== 'All') {
      list = list.filter((p) => p.district?.toLowerCase() === selectedDistrict.toLowerCase());
    }

    if (selectedTaluka !== 'All') {
      list = list.filter((p) => p.taluka?.toLowerCase() === selectedTaluka.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        (p.title || p.propertyName || '').toLowerCase().includes(q) ||
        (p.location || p.fullAddress || '').toLowerCase().includes(q) ||
        (p.ownerName || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [properties, location.pathname, searchQuery, selectedPropertyType, selectedDistrict, selectedTaluka]);

  useEffect(() => {
    setCurrentPage(1);
  }, [location.pathname, searchQuery, selectedPropertyType, selectedDistrict, selectedTaluka]);



  const handlePerformAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType || !actionProp) return;

    if (actionType !== 'approve' && actionType !== 'hide' && !remarks.trim()) {
      alert("Please enter a reason or remarks.");
      return;
    }

    let newStatus = 'pending';

    if (actionType === 'approve') {
      newStatus = 'approved';
    } else if (actionType === 'reject') {
      newStatus = 'rejected';
    } else if (actionType === 'hide') {
      newStatus = 'hidden';
    } else if (actionType === 'hold' || actionType === 'request_info') {
      newStatus = 'onhold';
    }

    try {
      const updatePayload: any = { status: newStatus };

      // Set adminApproved and isActive flags for cross-platform compatibility (Android/Mobile)
      if (actionType === 'approve') {
        updatePayload.adminApproved = true;
        updatePayload.isActive = true;
      } else if (actionType === 'reject' || actionType === 'hide') {
        updatePayload.adminApproved = false;
        updatePayload.isActive = false;
      } else if (actionType === 'hold' || actionType === 'request_info') {
        updatePayload.isActive = false;
      }

      if (actionType === 'reject') updatePayload.rejectionReason = remarks;
      if (actionType === 'hold' || actionType === 'request_info') {
        updatePayload.holdRemarks = remarks;
        if (actionType === 'request_info') updatePayload.infoRequested = true;
      }

      await updateDocument('properties', actionProp.id, updatePayload);

      await createDocument('admin_logs', {
        adminId: user?.uid || 'admin-123',
        adminName: user?.displayName || 'Super Admin',
        actionType,
        propertyId: actionProp.id,
        propertyName: actionProp.title || actionProp.propertyName || 'Property',
        timestamp: new Date().toISOString(),
        remarks: remarks || `${actionType} without remarks`
      });

      setIsActionModalOpen(false);
      setRemarks('');
      setActionProp(null);
      setActionType(null);
    } catch (err) {
      console.error("Failed to perform admin action:", err);
    }
  };

  const handleDelete = (propId: string) => {
    setDeletePropId(propId);
  };

  const confirmDelete = async () => {
    if (!deletePropId) return;
    try {
      await deleteDocument('properties', deletePropId);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletePropId(null);
    }
  };

  // Visibility Controls
  const openVisibilityPanel = (prop: any) => {
    setVisibilityProp(prop);
    setVisibilitySearch('');

    const initialSections: Record<string, boolean> = {};
    const initialFields: Record<string, boolean> = {};
    const initialExpanded: Record<string, boolean> = {};

    PROPERTY_SECTIONS_METADATA.forEach(sec => {
      initialSections[sec.id] = true;
      initialExpanded[sec.id] = true; // Default expand all initially
      sec.fields.forEach(f => {
        initialFields[f.id] = true;
      });
    });

    if (prop.visibilitySettings) {
      if (prop.visibilitySettings.sections) {
        Object.assign(initialSections, prop.visibilitySettings.sections);
      }
      if (prop.visibilitySettings.fields) {
        Object.assign(initialFields, prop.visibilitySettings.fields);
      }
    } else {
      // Compatibility with old flat fields
      if (prop.showPrice === false) {
        initialFields['priceAmount'] = false;
        initialFields['expectedPrice'] = false;
        initialFields['monthlyRent'] = false;
        initialFields['securityDeposit'] = false;
        initialFields['maintenanceCharges'] = false;
      }
      if (prop.showAddress === false) {
        initialFields['fullAddress'] = false;
        initialFields['landmark'] = false;
        initialFields['pincode'] = false;
      }
      if (prop.showOwnerName === false) {
        initialFields['ownerName'] = false;
      }
      if (prop.showOwnerContact === false) {
        initialFields['mobileNumber'] = false;
        initialFields['alternateMobile'] = false;
        initialFields['email'] = false;
      }
      if (prop.showExactLocation === false) {
        initialFields['gutNumber'] = false;
        initialFields['landmark'] = false;
      }
      if (prop.showAmenities === false) {
        initialSections['facilitiesUtilities'] = false;
      }
      if (prop.showImages === false) {
        initialSections['mediaGallery'] = false;
      }
    }

    setVisibilityState({
      sections: initialSections,
      fields: initialFields
    });
    setExpandedSections(initialExpanded);
    setIsVisibilityOpen(true);
  };

  const handleSaveVisibility = async () => {
    if (!visibilityProp) return;
    try {
      await updateDocument('properties', visibilityProp.id, {
        visibilitySettings: visibilityState
      });
      setIsVisibilityOpen(false);
      setVisibilityProp(null);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSectionVisibility = (sectionId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setVisibilityState((prev: any) => {
      const updatedSections = { ...prev.sections, [sectionId]: newVal };
      const updatedFields = { ...prev.fields };
      const section = PROPERTY_SECTIONS_METADATA.find(s => s.id === sectionId);
      if (section) {
        section.fields.forEach(f => {
          updatedFields[f.id] = newVal;
        });
      }
      return { sections: updatedSections, fields: updatedFields };
    });
  };

  const toggleFieldVisibility = (sectionId: string, fieldId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setVisibilityState((prev: any) => {
      const updatedFields = { ...prev.fields, [fieldId]: newVal };
      const updatedSections = { ...prev.sections };
      if (newVal) {
        updatedSections[sectionId] = true;
      }
      return { sections: updatedSections, fields: updatedFields };
    });
  };

  const openAction = (prop: any, type: 'approve' | 'reject' | 'hide' | 'hold' | 'request_info') => {
    setActionProp(prop);
    setActionType(type);
    setRemarks('');
    setIsActionModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'approved': 'bg-emerald-50 border-emerald-200 text-emerald-700',
      'active': 'bg-emerald-50 border-emerald-200 text-emerald-700',
      'pending': 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse',
      'rejected': 'bg-rose-50 border-rose-200 text-rose-700',
      'hidden': 'bg-orange-50 border-orange-200 text-orange-700',
      'onhold': 'bg-blue-50 border-blue-200 text-blue-700',
    };
    return map[status] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const getPropertyName = (prop: any) => prop.propertyCode ? `[${prop.propertyCode}] ${prop.title || prop.propertyName || 'Untitled'}` : (prop.title || prop.propertyName || 'Untitled');
  const getPropertyPrice = (prop: any) => {
    if (filterType === 'rent') return prop.monthlyRent || prop.price || 0;
    return prop.expectedPrice || prop.price || 0;
  };
  const getPropertyLocation = (prop: any) => prop.location || prop.fullAddress || prop.cityVillage || '—';

  const handleDistrictChange = (val: string) => {
    setSelectedDistrict(val);
    setSelectedTaluka('All');
  };



  const typeCounts = {
    All: properties.length,
    Flat: properties.filter(p => (p.propertyType || p.category || '').toLowerCase() === 'flat').length,
    House: properties.filter(p => (p.propertyType || p.category || '').toLowerCase() === 'house').length,
    Bungalow: properties.filter(p => (p.propertyType || p.category || '').toLowerCase() === 'bungalow').length,
    Plot: properties.filter(p => (p.propertyType || p.category || '').toLowerCase() === 'plot').length,
    Land: properties.filter(p => (p.propertyType || p.category || '').toLowerCase() === 'land').length,
  };

  const propertyTypeOptions = [
    { value: 'All', label: t('admin.sidebar.allProperties'), count: typeCounts.All },
    { value: 'Flat', label: t('categories.flat'), count: typeCounts.Flat },
    { value: 'House', label: t('categories.house'), count: typeCounts.House },
    { value: 'Bungalow', label: t('categories.bungalow'), count: typeCounts.Bungalow },
    { value: 'Plot', label: t('categories.plot'), count: typeCounts.Plot },
    { value: 'Land', label: t('categories.land'), count: typeCounts.Land },
  ];

  const districtOptions = [
    { value: 'All', label: t('admin.propertyManager.allDistricts') },
    ...districts.map((d) => ({ value: d.label, label: d.label }))
  ];

  const activeDistrictObj = districts.find(d => d.label === selectedDistrict);
  const filteredTalukasOptions = activeDistrictObj
    ? talukas.filter(t => t.districtId === activeDistrictObj.id)
    : talukas;

  const talukaOptions = [
    { value: 'All', label: t('admin.propertyManager.allTalukas') },
    ...filteredTalukasOptions.map((t) => ({ value: t.label, label: t.label }))
  ];



  const basePath = filterType === 'rent' ? '/admin/property-rent' : '/admin/property-sell';

  const currentTab = (() => {
    if (location.pathname.includes('/pending')) return 'pending';
    if (location.pathname.includes('/approved')) return 'approved';
    if (location.pathname.includes('/rejected')) return 'rejected';
    if (location.pathname.includes('/hidden')) return 'hidden';
    return 'all';
  })();

  const statusCounts = {
    all: properties.length,
    pending: properties.filter((p) => p.status === 'pending').length,
    approved: properties.filter((p) => p.status === 'approved' || p.status === 'active').length,
    rejected: properties.filter((p) => p.status === 'rejected').length,
    hidden: properties.filter((p) => p.status === 'hidden').length,
  };

  const statusTabs = [
    {
      id: 'all',
      label: t('admin.sidebar.allProperties', 'All Properties'),
      count: statusCounts.all,
      path: basePath,
      badgeColor: 'bg-slate-200/90 text-slate-700',
      activeBadgeColor: 'bg-slate-900 text-white',
      dotColor: 'bg-slate-400',
    },
    {
      id: 'pending',
      label: t('admin.sidebar.pendingApproval', 'Pending Approval'),
      count: statusCounts.pending,
      path: `${basePath}/pending`,
      badgeColor: statusCounts.pending > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-200/90 text-slate-700',
      activeBadgeColor: 'bg-amber-500 text-slate-950 font-bold',
      dotColor: 'bg-amber-500',
    },
    {
      id: 'approved',
      label: t('admin.sidebar.approved', 'Approved'),
      count: statusCounts.approved,
      path: `${basePath}/approved`,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      activeBadgeColor: 'bg-emerald-600 text-white font-bold',
      dotColor: 'bg-emerald-500',
    },
    {
      id: 'rejected',
      label: t('admin.sidebar.rejected', 'Rejected'),
      count: statusCounts.rejected,
      path: `${basePath}/rejected`,
      badgeColor: 'bg-rose-100 text-rose-800',
      activeBadgeColor: 'bg-rose-600 text-white font-bold',
      dotColor: 'bg-rose-500',
    },
    {
      id: 'hidden',
      label: t('admin.sidebar.hidden', 'Hidden'),
      count: statusCounts.hidden,
      path: `${basePath}/hidden`,
      badgeColor: 'bg-slate-200/90 text-slate-700',
      activeBadgeColor: 'bg-slate-700 text-white font-bold',
      dotColor: 'bg-slate-400',
    },
  ];

  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = selectedPropertyType !== 'All' || selectedDistrict !== 'All' || selectedTaluka !== 'All';
  const activeFilterCount = (selectedPropertyType !== 'All' ? 1 : 0) + (selectedDistrict !== 'All' ? 1 : 0) + (selectedTaluka !== 'All' ? 1 : 0);
  const clearAllFilters = () => {
    setSelectedPropertyType('All');
    setSelectedDistrict('All');
    setSelectedTaluka('All');
  };

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 w-full">
        <div className="shrink-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
          <div className="flex-1 sm:w-72 lg:w-80 relative min-w-[180px]">
            <Input
              placeholder={t('admin.propertyManager.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="w-full text-sm py-2.5 font-medium bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 shadow-2xs focus:border-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setAddStep(0);
              setAddCategory('Flat');
              setAddTransactionType(filterType);
              setIsAddPropertyOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>{t('admin.propertyManager.addProperty')}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs (Inside Section) */}
      <div className="w-full overflow-x-auto pb-1.5 custom-scrollbar">
        <div className="inline-flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200/90 rounded-2xl min-w-max shadow-2xs">
          {statusTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all duration-150 cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    isActive
                      ? 'bg-orange-500 ring-2 ring-orange-500/20'
                      : tab.dotColor || 'bg-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-colors ${
                    isActive
                      ? tab.activeBadgeColor || 'bg-slate-900 text-white'
                      : tab.badgeColor || 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Premium Search and Filters Toolbar */}
      <div 
        className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.03)] p-5 sm:p-6 transition-all space-y-5 relative z-30"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Toolbar Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-4 h-4 text-amber-400 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {t('admin.propertyManager.filterTitle', 'Listing Filters')}
                </h3>
                {hasActiveFilters && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {activeFilterCount} {t('admin.propertyManager.activeFilters', 'Filters Active')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {t('admin.propertyManager.filterSubtitle', 'Filter listings by property configuration and location')}
              </p>
            </div>
          </div>

          {/* Quick Clear All Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600 stroke-[2.5]" />
              <span>{t('admin.propertyManager.resetFilters', 'Reset Filters')}</span>
            </button>
          )}
        </div>

        {/* Dropdowns Row - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 w-full">
          <SearchableSelect
            label={t('admin.propertyManager.propertyType')}
            value={selectedPropertyType}
            onChange={setSelectedPropertyType}
            options={propertyTypeOptions}
            searchable={true}
            placeholder={t('admin.propertyManager.searchType')}
            icon={Building2}
          />
          <SearchableSelect
            label={t('admin.propertyManager.district')}
            value={selectedDistrict}
            onChange={handleDistrictChange}
            options={districtOptions}
            searchable={true}
            placeholder={t('admin.propertyManager.searchDistrict')}
            icon={MapPin}
          />
          <SearchableSelect
            label={t('admin.propertyManager.taluka')}
            value={selectedTaluka}
            onChange={setSelectedTaluka}
            options={talukaOptions}
            searchable={true}
            placeholder={t('admin.propertyManager.searchTaluka')}
            icon={Compass}
          />
        </div>

        {/* Footer info & Active Filter Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-sm">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {t('admin.propertyManager.showingCount', { filtered: filteredProperties.length, total: properties.length })}
            </span>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider mr-1">
                Active:
              </span>
              {selectedPropertyType !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-950 text-white shadow-2xs">
                  <Building2 className="w-3 h-3 text-amber-400 stroke-[2.5]" />
                  {selectedPropertyType}
                  <button
                    type="button"
                    onClick={() => setSelectedPropertyType('All')}
                    className="hover:text-rose-300 ml-0.5 cursor-pointer"
                    title="Remove Filter"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </span>
              )}
              {selectedDistrict !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-950 text-white shadow-2xs">
                  <MapPin className="w-3 h-3 text-amber-400 stroke-[2.5]" />
                  {selectedDistrict}
                  <button
                    type="button"
                    onClick={() => handleDistrictChange('All')}
                    className="hover:text-rose-300 ml-0.5 cursor-pointer"
                    title="Remove Filter"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </span>
              )}
              {selectedTaluka !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-950 text-white shadow-2xs">
                  <Compass className="w-3 h-3 text-amber-400 stroke-[2.5]" />
                  {selectedTaluka}
                  <button
                    type="button"
                    onClick={() => setSelectedTaluka('All')}
                    className="hover:text-rose-300 ml-0.5 cursor-pointer"
                    title="Remove Filter"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Properties Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative z-10 w-full min-w-0">
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[760px] sm:min-w-[800px]">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.image')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.title')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.type')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.district')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.taluka')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.owner')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.date')}</th>
                  <th className="px-3.5 sm:px-4 py-3 whitespace-nowrap">{t('admin.propertyManager.table.status')}</th>
                  <th className="px-3.5 sm:px-4 py-3 text-right whitespace-nowrap">{t('admin.propertyManager.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
                {paginatedProperties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-400 font-semibold">
                      {t('admin.propertyManager.noProperties')}
                    </td>
                  </tr>
                ) : (
                  paginatedProperties.map((prop, index) => {
                    const isNearBottom = paginatedProperties.length > 3 && index >= paginatedProperties.length - 3;
                    return (
                    <tr
                      key={prop.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onDoubleClick={() => {
                        setOpenDropdownId(null);
                        setActiveProp(prop);
                        setActiveDetailImg(prop.images?.[0] || '');
                        setIsDetailOpen(true);
                      }}
                    >
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5">
                        <div className="relative w-12 h-9">
                          {prop.images?.[0] ? (
                            <img
                              src={prop.images[0]}
                              alt=""
                              className={`w-full h-full rounded-lg object-cover border border-slate-200 ${prop.isSoldOut ? 'grayscale-[40%]' : ''}`}
                            />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4 opacity-40" />
                            </div>
                          )}
                          {prop.isSoldOut && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden rounded-lg">
                              <div className="bg-red-600/90 text-white w-[140%] py-0.5 text-center transform -rotate-12 shadow-sm border-y-[0.5px] border-red-500 backdrop-blur-sm">
                                <span className="text-[5px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 drop-shadow-md leading-none">
                                  {isMr ? 'विकले' : 'SOLD OUT'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 font-semibold text-slate-900 max-w-[180px] truncate">{getPropertyName(prop)}</td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 capitalize text-slate-800 font-medium">
                        {prop.propertyType || prop.category ? t(`categories.${(prop.propertyType || prop.category || '').toLowerCase()}`) : '—'}
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 text-slate-800 font-medium">{prop.district || '—'}</td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 text-slate-800 font-medium">{prop.taluka || '—'}</td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 text-slate-800 font-medium max-w-[140px] truncate">{prop.ownerName || '—'}</td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 text-slate-700 font-medium whitespace-nowrap">
                        {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border ${getStatusBadge(prop.status)}`}>
                            {t(`admin.status.${prop.status}`)}
                          </span>
                          {prop.isSoldOut && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-extrabold border bg-purple-50 border-purple-200 text-purple-700 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              {isMr ? 'विकले' : 'Sold Out'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 sm:px-4 py-3 sm:py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 3-dot dropdown menu */}
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === prop.id ? null : prop.id);
                              }}
                              className={`p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer transition-all hover:bg-slate-100 ${openDropdownId === prop.id ? 'bg-slate-100 text-slate-900' : ''
                                }`}
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdownId === prop.id && (
                              <div
                                ref={dropdownRef}
                                className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-100 text-left animate-fade-in`}
                              >
                                <div className="py-1">
                                  {/* View Details */}
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setActiveProp(prop);
                                      setActiveDetailImg(prop.images?.[0] || '');
                                      setIsDetailOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    {t('admin.propertyManager.dropdown.viewDetails')}
                                  </button>

                                  {/* Visibility Controls */}
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      openVisibilityPanel(prop);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                  >
                                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                                    {t('admin.propertyManager.dropdown.visibilityControls')}
                                  </button>

                                  {/* Edit Property */}
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      navigate(`/admin/property-edit/${prop.id}`);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left border-t border-slate-100 mt-1 pt-2"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                    {t('admin.propertyManager.dropdown.editProperty')}
                                  </button>

                                  {/* Mark Sold Out */}
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleMarkSoldOut(prop.id, !!prop.isSoldOut);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                  >
                                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                                    {prop.isSoldOut ? t('admin.propertyManager.dropdown.markAvailable') : t('admin.propertyManager.dropdown.markSoldOut')}
                                  </button>
                                </div>

                                <div className="py-1">
                                  {/* Approve */}
                                  {(prop.status === 'pending' || prop.status === 'rejected' || prop.status === 'hidden') && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        openAction(prop, 'approve');
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                    >
                                      <Check className="w-3.5 h-3.5 text-slate-400" />
                                      {t('admin.propertyManager.dropdown.approve')}
                                    </button>
                                  )}

                                  {/* Reject */}
                                  {(prop.status === 'pending' || prop.status === 'approved' || prop.status === 'active') && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        openAction(prop, 'reject');
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                    >
                                      <X className="w-3.5 h-3.5 text-slate-400" />
                                      {t('admin.propertyManager.dropdown.reject')}
                                    </button>
                                  )}

                                  {/* Hide */}
                                  {prop.status !== 'hidden' && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        openAction(prop, 'hide');
                                      }}
                                      className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                    >
                                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                      {t('admin.propertyManager.dropdown.hide')}
                                    </button>
                                  )}
                                </div>

                                <div className="py-1">
                                  {/* Delete */}
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleDelete(prop.id);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    {t('admin.propertyManager.dropdown.delete')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-white gap-4">
              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredProperties.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProperties.length)} of {filteredProperties.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center px-2 text-xs font-bold text-slate-700">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <button
                  type="button"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </UICard>
      )}

      {/* Details Preview Modal */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={activeProp ? getPropertyName(activeProp) : ''}
        maxWidth="max-w-3xl"
      >
        {activeProp && (
          <div className="flex flex-col gap-6 text-slate-655 text-left max-h-[80vh] overflow-y-auto pr-2 no-scrollbar">
            {/* 1. Media Gallery Section */}
            {isSectionVisible(activeProp, 'mediaGallery') && (
              <div className="flex flex-col gap-2">
                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-100 flex items-center justify-center">
                  {(activeDetailImg || activeProp.images?.[0]) ? (
                    <img
                      src={activeDetailImg || activeProp.images?.[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
                      <ImageIcon className="w-10 h-10 opacity-40" />
                      <span className="text-xs font-semibold text-slate-400">
                        {isMr ? 'कोणतेही छायाचित्र उपलब्ध नाही' : 'No Images Uploaded'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Image Thumbnails Gallery */}
                {activeProp.images && activeProp.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 mt-1 no-scrollbar">
                    {activeProp.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveDetailImg(img)}
                        className={`w-20 aspect-[16/10] rounded-lg overflow-hidden border shrink-0 cursor-pointer transition-all ${(activeDetailImg || activeProp.images?.[0]) === img ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Price/Location/Area Badges */}
            <div className="grid grid-cols-3 gap-2 py-3 text-center border-y border-slate-200 text-slate-600">
              <div className="text-xs">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">
                  {activeProp.type === 'rent' ? t('details.fields.monthlyRent') : t('properties.budgetLabel')}
                </p>
                <span className="font-bold text-slate-900 font-serif text-xs">
                  {isFieldVisible(activeProp, 'propertyInfo', activeProp.type === 'rent' ? 'monthlyRent' : 'expectedPrice') ? (
                    `₹${getPropertyPrice(activeProp).toLocaleString('en-IN')}`
                  ) : (
                    t('details.ownerDetailsHidden')
                  )}
                </span>
                {activeProp.type === 'rent' && <span className="text-[10px] text-slate-500 font-normal">{t('properties.monthlyShort')}</span>}
              </div>
              <div className="text-xs">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">{t('details.fields.district')}</p>
                <span className="font-bold text-slate-850 truncate block px-1 text-xs">
                  {isFieldVisible(activeProp, 'addressDetails', 'cityVillage') ? (
                    getPropertyLocation(activeProp)
                  ) : (
                    t('details.ownerDetailsHidden')
                  )}
                </span>
              </div>
              <div className="text-xs">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">{t('forms.areaSizeLabel')}</p>
                <span className="font-bold text-slate-850 text-xs">
                  {isFieldVisible(activeProp, 'layoutDetails', 'builtUpArea') ? (
                    `${activeProp.builtUpArea || activeProp.area || '—'} ${activeProp.areaType || 'sqft'}`
                  ) : (
                    t('details.ownerDetailsHidden')
                  )}
                </span>
              </div>
            </div>

            {renderPropertyDetailSections(activeProp)}

            {/* Rejection / Hold warnings */}
            {activeProp.status === 'rejected' && activeProp.rejectionReason && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                <strong>{t('admin.propertyManager.modal.rejectReason')}:</strong> {activeProp.rejectionReason}
              </div>
            )}

            {activeProp.status === 'onhold' && activeProp.holdRemarks && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs">
                <strong>{t('admin.propertyManager.modal.holdRemarks')}:</strong> {activeProp.holdRemarks}
              </div>
            )}

            {/* Visibility Status Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> {t('admin.propertyManager.visibilityStatusTitle')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
                {PROPERTY_SECTIONS_METADATA.map((sec) => {
                  const filledFields = sec.fields.filter(f => isFieldFilled(activeProp, f.id));
                  if (filledFields.length === 0) return null;

                  const isSecVisible = isSectionVisible(activeProp, sec.id);
                  const totalFields = filledFields.length;
                  const visibleFields = filledFields.filter(f => isFieldVisible(activeProp, sec.id, f.id)).length;
                  return (
                    <div key={sec.id} className="flex flex-col gap-1 p-2 rounded-lg border border-slate-100 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 truncate max-w-[85%]">{t(`details.sections.${sec.id}`)}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSecVisible ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      </div>
                      <span className="text-slate-400 font-semibold text-[9px]">
                        {isSecVisible ? t('admin.propertyManager.fieldsOn', { count: `${visibleFields}/${totalFields}` }) : t('admin.propertyManager.sectionOff')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons in Detail View */}
            <div className="border-t border-slate-200 pt-4 flex flex-wrap gap-2 justify-between items-center mt-4">
              {activeProp.status !== 'approved' && activeProp.status !== 'active' ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { openAction(activeProp, 'approve'); setIsDetailOpen(false); }}
                    className="py-1.5 px-3 bg-emerald-600 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-emerald-700 cursor-pointer">
                    {t('admin.propertyManager.dropdown.approve')}
                  </button>
                  <button type="button" onClick={() => { openAction(activeProp, 'reject'); setIsDetailOpen(false); }}
                    className="py-1.5 px-3 bg-rose-600 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-rose-700 cursor-pointer">
                    {t('admin.propertyManager.dropdown.reject')}
                  </button>
                  <button type="button" onClick={() => { openAction(activeProp, 'hide'); setIsDetailOpen(false); }}
                    className="py-1.5 px-3 bg-orange-500 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-lg hover:bg-orange-600 cursor-pointer">
                    {t('admin.propertyManager.dropdown.hide')}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-emerald-600 font-bold">🟢 {t('admin.propertyManager.listingLive')}</div>
              )}
              <Button onClick={() => setIsDetailOpen(false)} variant="glass" className="py-1.5 px-4 rounded-xl text-xs border-slate-200">
                {t('admin.propertyManager.closeDetails')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Admin Action Modal (Approve, Reject, Hide, Hold, Request Info) */}
      <Dialog
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setRemarks('');
          setActionProp(null);
          setActionType(null);
        }}
        title={
          actionType === 'approve' ? t('admin.propertyManager.modal.approveTitle') :
            actionType === 'reject' ? t('admin.propertyManager.modal.rejectTitle') :
              actionType === 'hide' ? t('admin.propertyManager.modal.hideTitle') :
                actionType === 'hold' ? t('admin.propertyManager.modal.holdTitle') :
                  t('admin.propertyManager.modal.requestInfoTitle')
        }
      >
        <form onSubmit={handlePerformAction} className="flex flex-col gap-4 text-left">
          {actionType === 'approve' ? (
            <p className="text-sm text-slate-600">
              {t('admin.propertyManager.modal.approveDesc')}
            </p>
          ) : actionType === 'hide' ? (
            <p className="text-sm text-slate-600">
              {t('admin.propertyManager.modal.hideDesc')}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                {actionType === 'reject' ? t('admin.propertyManager.modal.rejectReason') :
                  actionType === 'hold' ? t('admin.propertyManager.modal.holdRemarks') :
                    t('admin.propertyManager.modal.infoRequested')} *
              </label>
              <Textarea
                placeholder={t('admin.propertyManager.modal.remarksPlaceholder')}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required
                className="w-full text-slate-900 border border-slate-200"
              />
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setIsActionModalOpen(false);
                setRemarks('');
                setActionProp(null);
                setActionType(null);
              }}
              className="py-2 px-4 rounded-xl text-xs border-slate-200"
            >
              {t('admin.propertyManager.modal.cancel')}
            </Button>
            <Button
              type="submit"
              className={`py-2 px-5 rounded-xl text-xs font-bold ${actionType === 'approve' ? 'bg-green-500 text-white hover:bg-green-600' :
                actionType === 'reject' ? 'bg-red-500 text-white hover:bg-red-600' :
                  actionType === 'hide' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                    actionType === 'hold' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                      'bg-blue-50 text-white hover:bg-blue-600'
                }`}
            >
              {t('admin.propertyManager.modal.confirm')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Visibility Controls Modal */}
      <Dialog
        isOpen={isVisibilityOpen}
        onClose={() => { setIsVisibilityOpen(false); setVisibilityProp(null); }}
        title={t('admin.propertyManager.dropdown.visibilityControls')}
      >
        <div className="flex flex-col gap-5 text-left">
          <p className="text-xs text-slate-500 leading-relaxed">
            {t('admin.propertyManager.visibilityDesc1')}
            {t('admin.propertyManager.visibilityDesc2')}
          </p>

          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin.propertyManager.searchVisibilityPlaceholder')}
              value={visibilitySearch}
              onChange={(e) => setVisibilitySearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold text-slate-800"
            />
            {visibilitySearch && (
              <button
                onClick={() => setVisibilitySearch('')}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-655 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Master Controls */}
          <div className="flex flex-wrap gap-2 justify-between items-center text-[10px] text-slate-500 font-bold border-b border-slate-100 pb-3">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const expanded: Record<string, boolean> = {};
                  PROPERTY_SECTIONS_METADATA.forEach(s => { expanded[s.id] = true; });
                  setExpandedSections(expanded);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 cursor-pointer"
              >
                {t('admin.propertyManager.expandAll')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpandedSections({});
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 cursor-pointer"
              >
                {t('admin.propertyManager.collapseAll')}
              </button>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setVisibilityState(() => {
                    const sections: Record<string, boolean> = {};
                    const fields: Record<string, boolean> = {};
                    PROPERTY_SECTIONS_METADATA.forEach(s => {
                      sections[s.id] = true;
                      s.fields.forEach(f => { fields[f.id] = true; });
                    });
                    return { sections, fields };
                  });
                }}
                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer border border-emerald-100"
              >
                {t('admin.propertyManager.showAllFields')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibilityState(() => {
                    const sections: Record<string, boolean> = {};
                    const fields: Record<string, boolean> = {};
                    PROPERTY_SECTIONS_METADATA.forEach(s => {
                      sections[s.id] = false;
                      s.fields.forEach(f => { fields[f.id] = false; });
                    });
                    return { sections, fields };
                  });
                }}
                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer border border-rose-100"
              >
                {t('admin.propertyManager.hideAllFields')}
              </button>
            </div>
          </div>

          {/* Accordion List Container */}
          {(() => {
            const filteredMetadata = PROPERTY_SECTIONS_METADATA.map(section => {
              const filledFields = section.fields.filter(field => isFieldFilled(activeProp, field.id));
              const matchSectionName = t(`details.sections.${section.id}`).toLowerCase().includes(visibilitySearch.toLowerCase());
              const filteredFields = filledFields.filter(field =>
                t(`details.fields.${field.id}`).toLowerCase().includes(visibilitySearch.toLowerCase())
              );
              if (filledFields.length > 0 && (matchSectionName || filteredFields.length > 0)) {
                return {
                  ...section,
                  fields: matchSectionName ? filledFields : filteredFields
                };
              }
              return null;
            }).filter(Boolean) as SectionMetadata[];

            return (
              <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1 no-scrollbar text-xs">
                {filteredMetadata.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-semibold">{t('admin.propertyManager.noMatchingVisibility')}</div>
                ) : (
                  filteredMetadata.map((section) => {
                    const isExpanded = !!expandedSections[section.id];
                    const isSectionVisible = visibilityState.sections[section.id] !== false;

                    const totalSectionFields = section.fields.length;
                    const visibleSectionFields = section.fields.filter(f => visibilityState.fields[f.id] !== false).length;

                    return (
                      <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white transition-all duration-200 shrink-0">
                        {/* Section Header */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-100 select-none">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !isExpanded }))}
                              className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-all cursor-pointer"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            <input
                              type="checkbox"
                              checked={isSectionVisible}
                              onChange={() => toggleSectionVisibility(section.id, isSectionVisible)}
                              className="w-4 h-4 accent-primary rounded cursor-pointer"
                              id={`sec-chk-${section.id}`}
                            />

                            <label htmlFor={`sec-chk-${section.id}`} className="font-bold text-slate-800 cursor-pointer flex items-center gap-2">
                              {t(`details.sections.${section.id}`)}
                              <span className="text-[10px] text-slate-450 font-normal">
                                {t('admin.propertyManager.visibleCount', { visible: visibleSectionFields, total: totalSectionFields })}
                              </span>
                            </label>
                          </div>

                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isSectionVisible
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                            {isSectionVisible ? t('admin.propertyManager.sectionOn') : t('admin.propertyManager.sectionOff')}
                          </span>
                        </div>

                        {/* Fields List */}
                        {isExpanded && (
                          <div className="p-2.5 bg-white divide-y divide-slate-55 flex flex-col gap-2">
                            {section.fields.map((field) => {
                              const isFieldVisible = visibilityState.fields[field.id] !== false;
                              return (
                                <label
                                  key={field.id}
                                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all duration-150 pl-6 ${isFieldVisible
                                    ? 'bg-emerald-50/20 border-emerald-100/50 hover:bg-emerald-50/40'
                                    : 'bg-rose-50/20 border-rose-100/50 hover:bg-rose-50/40'
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isFieldVisible}
                                    disabled={!isSectionVisible}
                                    onChange={() => toggleFieldVisibility(section.id, field.id, isFieldVisible)}
                                    className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer disabled:opacity-50"
                                  />
                                  <span className={`text-xs font-semibold flex-1 ${isFieldVisible ? 'text-slate-700' : 'text-slate-400 line-through'} ${!isSectionVisible ? 'opacity-50' : ''}`}>
                                    {t(`details.fields.${field.id}`)}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isFieldVisible
                                    ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50'
                                    : 'bg-rose-100/50 text-rose-700 border-rose-200/50'
                                    } ${!isSectionVisible ? 'opacity-50' : ''}`}>
                                    {isFieldVisible ? t('admin.status.active') : t('admin.status.hidden')}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}

          {/* Footer buttons */}
          <div className="border-t border-slate-200 pt-4 flex gap-3 justify-end">
            <Button type="button" variant="glass" onClick={() => { setIsVisibilityOpen(false); setVisibilityProp(null); }} className="py-2 px-4 rounded-xl text-xs border-slate-200">
              {t('admin.propertyManager.modal.cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveVisibility} className="py-2 px-5 rounded-xl text-xs text-white font-bold cursor-pointer">
              {t('admin.propertyManager.saveVisibility')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Custom Delete Confirmation Modal */}
      <Dialog
        isOpen={deletePropId !== null}
        onClose={() => setDeletePropId(null)}
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold text-lg md:text-xl font-serif">
            <Trash2 className="w-5.5 h-5.5" />
            {t('admin.propertyManager.deleteTitle')}
          </div>
        }
      >
        <div className="flex flex-col gap-6 text-sm">
          <p className="text-slate-600 leading-relaxed font-sans">
            {t('admin.propertyManager.deleteDesc')}
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => setDeletePropId(null)}
              variant="glass"
              className="py-2.5 px-4 rounded-xl text-xs text-slate-700 font-bold border-slate-200"
            >
              {t('admin.propertyManager.modal.cancel')}
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              variant="danger"
              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
            >
              {t('admin.propertyManager.deleteConfirm')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Custom Sold Out Confirmation Modal */}
      <Dialog
        isOpen={soldOutProp !== null}
        onClose={() => setSoldOutProp(null)}
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg md:text-xl font-serif">
            <Tag className="w-5.5 h-5.5 text-primary" />
            {isMr ? 'स्टेटस अपडेट करा' : t('admin.propertyManager.statusChange', 'Update Status')}
          </div>
        }
      >
        <div className="flex flex-col gap-6 text-sm">
          <p className="text-slate-600 leading-relaxed font-sans text-base">
            {isMr
              ? (soldOutProp?.isSoldOut 
                  ? "तुम्हाला नक्की ही प्रॉपर्टी 'उपलब्ध' (Available) म्हणून मार्क करायची आहे का?" 
                  : "तुम्हाला नक्की ही प्रॉपर्टी 'विकली गेली' (Sold Out) म्हणून मार्क करायची आहे का?")
              : (soldOutProp?.isSoldOut 
                  ? "Are you sure you want to mark this property as available?" 
                  : "Are you sure you want to mark this property as sold out?")}
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => setSoldOutProp(null)}
              variant="glass"
              className="py-2.5 px-4 rounded-xl text-xs text-slate-700 font-bold border-slate-200"
            >
              {isMr ? 'रद्द करा' : t('admin.propertyManager.modal.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={confirmSoldOut}
              variant="primary"
              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-slate-800"
            >
              {isMr ? 'नक्की करा' : t('admin.propertyManager.modal.confirm', 'Confirm')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Add Property Modal ── */}
      {isAddPropertyOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsAddPropertyOpen(false); } }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-serif">
                    {addStep === 0 ? t('admin.propertyManager.selectCategory') : `${addTransactionType === 'sale' ? t('forms.sellProperty') : t('forms.rentProperty')} ${t(`categories.${addCategory.toLowerCase()}`)}`}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {addStep === 0 ? t('admin.propertyManager.chooseCategoryDesc') : t('admin.propertyManager.fillDetailsDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPropertyOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form / Step Area */}
            <div className="p-6">
              {addStep === 0 ? (
                <div className="flex flex-col gap-6 text-left">
                  {/* Category Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'house', label: t('categories.house'), rawLabel: 'House', icon: Home, bg: 'bg-blue-50', color: 'text-blue-500', desc: t('admin.propertyManager.categories.houseDesc') },
                      { id: 'flat', label: t('categories.flat'), rawLabel: 'Flat', icon: Building, bg: 'bg-purple-50', color: 'text-purple-500', desc: t('admin.propertyManager.categories.flatDesc') },
                      { id: 'bungalow', label: t('categories.bungalow'), rawLabel: 'Bungalow', icon: Warehouse, bg: 'bg-amber-50', color: 'text-amber-500', desc: t('admin.propertyManager.categories.bungalowDesc') },
                      { id: 'plot', label: t('categories.plot'), rawLabel: 'Plot', icon: Mountain, bg: 'bg-emerald-50', color: 'text-emerald-500', desc: t('admin.propertyManager.categories.plotDesc') },
                      { id: 'land', label: t('categories.land'), rawLabel: 'Land', icon: Tractor, bg: 'bg-orange-50', color: 'text-orange-500', desc: t('admin.propertyManager.categories.landDesc') }
                    ].map((opt) => {
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setAddCategory(opt.rawLabel);
                            setAddStep(1);
                          }}
                          className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:shadow-lg transition-all duration-300 ease-out gap-3 relative overflow-hidden text-center cursor-pointer"
                        >
                          <div className={`p-4 rounded-2xl ${opt.bg} ${opt.color} transition-transform duration-300 group-hover:scale-110`}>
                            <IconComp className="w-8 h-8" strokeWidth={1.8} />
                          </div>
                          <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-slate-450 leading-normal max-w-[180px]">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                (() => {
                  const formProps = {
                    onBack: () => setAddStep(0),
                    onSuccess: (code: string) => {
                      alert(`Property successfully created with code: ${code}`);
                      setIsAddPropertyOpen(false);
                      setAddStep(0);
                    },
                    initialTransactionType: addTransactionType,
                    onTransactionTypeChange: setAddTransactionType
                  };

                  switch (addCategory) {
                    case "House":
                      return <HouseListingForm {...formProps} />;
                    case "Flat":
                      return <FlatListingForm {...formProps} />;
                    case "Bungalow":
                      return <BungalowListingForm {...formProps} />;
                    case "Plot":
                      return <PlotListingForm {...formProps} />;
                    case "Land":
                      return <LandListingForm {...formProps} />;
                    default:
                      return <HouseListingForm {...formProps} />;
                  }
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyManagerBase;
