import {
  fetchCollection,
  fetchDocument,
  createDocument,
  updateDocument,
  setExactDocument,
  subscribeToCollection,
  createNotification
} from './firebase';

export type UserRole = 'user' | 'seller' | 'buyer' | 'builder' | 'agent' | 'supplier' | 'representative' | 'admin';

export interface FirstPropertyData {
  category: 'House' | 'Flat' | 'Bungalow' | 'Plot' | 'Land';
  type: 'sale' | 'rent';
  title: string;
  propertyName?: string;
  expectedPrice?: number;
  monthlyRent?: number;
  isNegotiable?: boolean;
  district: string;
  taluka: string;
  cityVillage: string;
  fullAddress?: string;
  landmark?: string;
  builtUpArea?: number;
  carpetArea?: number;
  areaType?: 'sqft' | 'guthevari' | 'acre';
  flatType?: string; // 1BHK, 2BHK, 3BHK etc
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  totalFloors?: number;
  floorNumber?: number;
  furnishingStatus?: 'Unfurnished' | 'Semi-Furnished' | 'Fully-Furnished';
  facingDirection?: string;
  carParking?: boolean;
  description?: string;
  descriptionMr?: string;
  images?: string[];
  hasLoan?: boolean;
  waterSupply?: boolean;
  powerBackup?: boolean;
  // Category-specific fields
  plotAreaSqFt?: number;
  plotAreaGuntha?: number;
  plotDimensions?: string;
  roadWidth?: string;
  plotSanctionType?: string;
  boundaryWall?: string;
  landArea?: string;
  landType?: string;
  waterSource?: string;
  roadAccess?: string;
  electricity?: string;
  titleClear?: string;
  floorNo?: string;
}

export interface SellerDetails {
  sellerType: 'owner' | 'builder' | 'promoter';
  address?: string;
  cityVillage?: string;
  taluka?: string;
  district?: string;
  alternateMobile?: string;
  firstProperty: FirstPropertyData;
}

export interface BuyerDetails {
  propertyCategory: string; // 'House' | 'Flat' | 'Bungalow' | 'Plot' | 'Land' | 'Any'
  requirementType: 'sale' | 'rent';
  budgetMin?: number;
  budgetMax?: number;
  preferredDistrict?: string;
  preferredTaluka?: string;
  preferredCity?: string;
  urgencyTimeline?: 'immediate' | 'within_1_month' | 'within_3_months' | 'exploring';
  notes?: string;
}

export interface BuilderDetails {
  companyName: string;
  reraNumber?: string;
  experienceYears?: number;
  officeAddress?: string;
  cityVillage?: string;
  taluka?: string;
  district?: string;
  website?: string;
  ongoingProjectsCount?: number;
  completedProjectsCount?: number;
  specialization?: string;
  firstProject?: FirstPropertyData;
}

export interface SupplierDetails {
  businessName: string;
  category: string; // All, Cement & Steel, Sand & Aggregate, Bricks & Blocks, Tiles & Flooring, Sanitary & Plumbing, Electrical, Paints, Hardware
  gstNumber?: string;
  officeAddress?: string;
  operatingDistricts?: string[];
  operatingTalukas?: string[];
  productsOffered?: string[];
  deliveryAvailable?: boolean;
  notes?: string;
}

export interface AgentDetails {
  agencyName?: string;
  experienceYears?: number;
  operatingDistricts?: string[];
  operatingTalukas?: string[];
  reraNumber?: string;
  specialization?: string;
  notes?: string;
}

export interface RepresentativeDetails {
  qualification?: string;
  experience?: string;
  preferredDistrict?: string;
  preferredTaluka?: string;
  bio?: string;
}

export interface RoleInquiry {
  id?: string;
  userId: string;
  userCode?: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  requestedRole: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  sourceCollection?: string;
  isRoleInquiry?: boolean;
  type?: string;
  propertyName?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  sellerDetails?: SellerDetails;
  buyerDetails?: BuyerDetails;
  builderDetails?: BuilderDetails;
  agentDetails?: AgentDetails;
  supplierDetails?: SupplierDetails;
  representativeDetails?: RepresentativeDetails;
}

/**
 * Submit a new Role Upgrade Inquiry
 * Option B: Saves to 'enquiries' collection (which already has public/user write permissions in Firestore)
 * and mirrors/fallbacks gracefully without blocking the user.
 */
export const submitRoleInquiry = async (
  inquiryData: Omit<RoleInquiry, 'status' | 'createdAt'>
): Promise<any> => {
  const normMobile = String(inquiryData.userMobile || '').trim();
  const normName = String(inquiryData.userName || '').trim();
  const normEmail = String(inquiryData.userEmail || '').trim();
  const normUid = String(inquiryData.userId || '').trim();

  const isBuyerRole = inquiryData.requestedRole === 'buyer';
  const nowTimestamp = new Date().toISOString();

  const newInquiry: RoleInquiry = {
    ...inquiryData,
    userId: normUid,
    userName: normName,
    userMobile: normMobile,
    userEmail: normEmail || `${normMobile}@sahyadriland.com`,
    requestedRole: inquiryData.requestedRole,
    status: isBuyerRole ? 'approved' : 'pending',
    reviewedAt: isBuyerRole ? nowTimestamp : undefined,
    reviewedBy: isBuyerRole ? 'System (Auto-Approved)' : undefined,
    createdAt: nowTimestamp
  };

  let created: any = null;
  let sourceCollection = 'enquiries';

  const enquiryPayload = {
    ...newInquiry,
    isRoleInquiry: true,
    type: 'role_inquiry',
    propertyName: `Role Application: ${newInquiry.requestedRole.toUpperCase()}`,
    name: normName,
    email: normEmail || `${normMobile}@sahyadriland.com`,
    phone: normMobile,
    message: `Role request for ${newInquiry.requestedRole.toUpperCase()}`,
    sourceCollection: 'enquiries'
  };

  // 1. Primary write to 'role_inquiries' collection in Firestore
  try {
    created = await createDocument('role_inquiries', newInquiry);
    sourceCollection = 'role_inquiries';
  } catch (roleErr: any) {
    console.warn("Could not write to 'role_inquiries', trying 'enquiries':", roleErr?.message);
    try {
      created = await createDocument('enquiries', enquiryPayload);
      sourceCollection = 'enquiries';
    } catch (enqErr: any) {
      console.error("Firestore write failed for both 'role_inquiries' and 'enquiries':", enqErr);
      throw new Error(
        roleErr?.message || enqErr?.message || 'Failed to submit role inquiry to Firestore database. Please verify your internet connection.'
      );
    }
  }

  const safeCreated = created;
  if (!safeCreated) {
    throw new Error('Failed to create role inquiry in database.');
  }

  // Mirror write to enquiries if primary was role_inquiries (non-blocking)
  if (sourceCollection === 'role_inquiries') {
    createDocument('enquiries', enquiryPayload).catch(() => {});
  }

  const cleanMob = normMobile.replace(/[^0-9]/g, '').slice(-10);

  // 1b. Multi-Platform Synchronization: Mirror write directly to target mobile collection
  // (sellers, buyers, builders, agents) so that any mobile device/app immediately sees the request!
  try {
    const targetRole = newInquiry.requestedRole;
    const nowIso = new Date().toISOString();
    const mobileAppliedAt = nowIso.replace('Z', '') + '000';

    if (targetRole === 'seller') {
      const sellerDocId = cleanMob ? `seller_${cleanMob}` : `app_seller_${Date.now()}`;
      const mobileSellerPayload: any = {
        id: sellerDocId,
        name: normName,
        mobile: cleanMob || normMobile,
        role: 'seller',
        roleTitleMr: 'विक्रेता',
        status: 'pending',
        appliedAt: mobileAppliedAt,
        city: inquiryData.sellerDetails?.cityVillage || inquiryData.sellerDetails?.district || 'Sangli',
        district: inquiryData.sellerDetails?.district || 'Sangli',
        taluka: inquiryData.sellerDetails?.taluka || 'Miraj',
        propertyType: inquiryData.sellerDetails?.firstProperty?.category || 'घर / मालमत्ता',
        askingPrice: Number(inquiryData.sellerDetails?.firstProperty?.expectedPrice || inquiryData.sellerDetails?.firstProperty?.monthlyRent || 0),
        firmOrAgencyName: normName,
        titleClear: 'होय (Clear 7/12)',
        loanRequired: inquiryData.sellerDetails?.firstProperty?.hasLoan ? 'होय (Yes)' : 'नाही (No)',
        timeframe: 'लगेच (Immediate)',
        additionalDetails: inquiryData.sellerDetails?.firstProperty?.description || '',
        preferredLocations: null,
        referredByCode: null,
        referralCode: null,
        adminRemarks: null,
        reviewedAt: null,
        experienceYears: null,
        websiteUrl: null,
        officeAddress: null,
        category: null,
        reraNumber: null,
        completedProjects: null,
        budgetMin: null,
        budgetMax: null,
        specialization: null,
        ongoingProjects: null,
        userId: normUid,
        source: 'website'
      };
      await setExactDocument('sellers', sellerDocId, mobileSellerPayload);

      // Also create the first property immediately in 'properties' (pending approval)
      if (inquiryData.sellerDetails?.firstProperty) {
        const prop = inquiryData.sellerDetails.firstProperty;
        const onboardingPropDoc: any = {
          id: `prop-seller-${cleanMob || normUid || Date.now()}`,
          userId: normUid,
          ownerName: normName,
          mobileNumber: normMobile,
          ownerPhone: normMobile,
          phone: normMobile,
          cleanMobile: cleanMob,
          email: normEmail,
          alternateMobile: inquiryData.sellerDetails.alternateMobile || '',
          category: prop.category || 'House',
          type: prop.type || 'sale',
          status: 'pending',
          adminApproved: false,
          isActive: false,
          title: prop.title || prop.propertyName || `${prop.category} in ${prop.cityVillage || 'Sangli'}`,
          propertyName: prop.propertyName || prop.title,
          description: prop.description || `${prop.category} listed by applicant ${normName}`,
          expectedPrice: prop.expectedPrice,
          price: prop.expectedPrice || prop.monthlyRent || 0,
          monthlyRent: prop.monthlyRent,
          isNegotiable: prop.isNegotiable ?? true,
          district: prop.district || inquiryData.sellerDetails?.district || 'Sangli',
          taluka: prop.taluka || inquiryData.sellerDetails?.taluka || 'Miraj',
          cityVillage: prop.cityVillage || inquiryData.sellerDetails?.cityVillage || '',
          fullAddress: prop.fullAddress || '',
          builtUpArea: Number(prop.builtUpArea || 0),
          carpetArea: Number(prop.carpetArea || 0),
          flatType: prop.flatType,
          bedrooms: Number(prop.bedrooms || 0),
          bathrooms: Number(prop.bathrooms || 0),
          floorNo: prop.floorNo || '',
          totalFloors: prop.totalFloors || '',
          furnishingStatus: prop.furnishingStatus || 'Unfurnished',
          carParking: prop.carParking ?? false,
          plotAreaSqFt: Number(prop.plotAreaSqFt || 0),
          plotAreaGuntha: Number(prop.plotAreaGuntha || 0),
          plotDimensions: prop.plotDimensions || '',
          facingDirection: prop.facingDirection || '',
          roadWidth: prop.roadWidth || '',
          plotSanctionType: prop.plotSanctionType || '',
          boundaryWall: prop.boundaryWall || '',
          landArea: prop.landArea || '',
          landType: prop.landType || '',
          waterSource: prop.waterSource || '',
          roadAccess: prop.roadAccess || '',
          electricity: prop.electricity || '',
          titleClear: prop.titleClear || '',
          images: prop.images && prop.images.length > 0 ? prop.images : [],
          showPrice: true,
          showAddress: true,
          showOwnerName: true,
          showOwnerContact: true,
          showImages: true,
          createdAt: nowIso,
          source: 'seller_inquiry_onboarding',
          roleInquiryId: safeCreated?.id
        };
        try {
          await createDocument('properties', onboardingPropDoc);
        } catch (propErr) {
          console.warn('Could not auto-create pending property on inquiry submission:', propErr);
        }
      }
    } else if (targetRole === 'buyer') {
      const buyerDocId = cleanMob ? `buyer_${cleanMob}` : `app_buyer_${Date.now()}`;
      const mobileBuyerPayload: any = {
        id: buyerDocId,
        name: normName,
        mobile: cleanMob || normMobile,
        role: 'buyer',
        roleTitleMr: 'खरेदीदार',
        status: 'approved',
        adminRemarks: 'Auto-approved buyer account',
        appliedAt: mobileAppliedAt,
        reviewedAt: mobileAppliedAt,
        reviewedBy: 'System (Auto-Approved)',
        city: inquiryData.buyerDetails?.preferredCity || inquiryData.buyerDetails?.preferredDistrict || 'Sangli',
        preferredLocations: [inquiryData.buyerDetails?.preferredCity, inquiryData.buyerDetails?.preferredTaluka].filter(Boolean).join(', ') || 'Sangli',
        propertyType: inquiryData.buyerDetails?.propertyCategory || 'House',
        budgetMin: Number(inquiryData.buyerDetails?.budgetMin || 0),
        budgetMax: Number(inquiryData.buyerDetails?.budgetMax || 0),
        timeframe: inquiryData.buyerDetails?.urgencyTimeline === 'immediate' ? 'लगेच (Immediate)' : '१ ते ३ महिने (1-3 Months)',
        loanRequired: 'नाही (No)',
        titleClear: 'होय (Clear 7/12)',
        referredByCode: null,
        referralCode: null,
        askingPrice: null,
        category: null,
        additionalDetails: inquiryData.buyerDetails?.notes || null,
        firmOrAgencyName: null,
        websiteUrl: null,
        completedProjects: null,
        experienceYears: null,
        officeAddress: null,
        ongoingProjects: null,
        reraNumber: null,
        specialization: null,
        userId: normUid,
        source: 'website'
      };
      await setExactDocument('buyers', buyerDocId, mobileBuyerPayload);
    } else if (targetRole === 'builder') {
      const builderDocId = cleanMob ? `builder_${cleanMob}` : `app_builder_${Date.now()}`;
      const mobileBuilderPayload: any = {
        id: builderDocId,
        name: normName,
        mobile: cleanMob || normMobile,
        firmOrAgencyName: inquiryData.builderDetails?.companyName || normName,
        city: inquiryData.builderDetails?.cityVillage || inquiryData.builderDetails?.district || 'Sangli',
        district: inquiryData.builderDetails?.district || 'Sangli',
        taluka: inquiryData.builderDetails?.taluka || 'Miraj',
        officeAddress: inquiryData.builderDetails?.officeAddress || '',
        reraNumber: inquiryData.builderDetails?.reraNumber || '',
        status: 'pending',
        role: 'builder',
        roleTitleMr: 'बिल्डर',
        appliedAt: mobileAppliedAt,
        userId: normUid,
        source: 'website'
      };
      await setExactDocument('builders', builderDocId, mobileBuilderPayload);
    } else if (targetRole === 'agent') {
      const agentDocId = cleanMob ? `agent_${cleanMob}` : `app_agent_${Date.now()}`;
      const mobileAgentPayload: any = {
        id: agentDocId,
        name: normName,
        mobile: cleanMob || normMobile,
        email: normEmail,
        agencyName: inquiryData.agentDetails?.agencyName || normName,
        firmOrAgencyName: inquiryData.agentDetails?.agencyName || normName,
        city: inquiryData.agentDetails?.operatingTalukas?.[0] || 'Sangli',
        district: inquiryData.agentDetails?.operatingDistricts?.[0] || 'Sangli',
        taluka: inquiryData.agentDetails?.operatingTalukas?.[0] || 'Miraj',
        reraNumber: inquiryData.agentDetails?.reraNumber || '',
        status: 'pending',
        role: 'agent',
        roleTitleMr: 'एजंट पार्टनर',
        appliedAt: mobileAppliedAt,
        userId: normUid,
        source: 'website'
      };
      await setExactDocument('agents', agentDocId, mobileAgentPayload);
    }
  } catch (syncErr) {
    console.warn('Multi-platform sync error in submitRoleInquiry:', syncErr);
  }

  // 2. Generate Admin In-App Notification (non-blocking)
  try {
    await createNotification({
      type: 'inquiry',
      title: `New ${inquiryData.requestedRole.toUpperCase()} Application`,
      titleMr: `नवीन ${inquiryData.requestedRole.toUpperCase()} अर्ज`,
      message: `${normName} (${normMobile}) has applied for role "${inquiryData.requestedRole.toUpperCase()}".`,
      messageMr: `${normName} (${normMobile}) यांनी "${inquiryData.requestedRole.toUpperCase()}" भूमिकेसाठी अर्ज सादर केला आहे.`,
      link: '/admin/role-requests',
      metadata: {
        userId: normUid,
        userName: normName,
        userMobile: normMobile,
        requestedRole: inquiryData.requestedRole,
        inquiryId: safeCreated?.id || safeCreated?.uid
      }
    });
  } catch (notifErr) {
    console.warn('Could not generate notification for role inquiry:', notifErr);
  }

  // 3. Cache to localStorage for immediate UI reactivity and guest/mobile sessions
  if (typeof window !== 'undefined' && normUid) {
    try {
      localStorage.setItem(
        `sahyadri_role_inquiry_${normUid}`,
        JSON.stringify({ ...safeCreated, sourceCollection })
      );

      // Keep centralized local list for Admin -> Role Requests view (excluding dummy inq-local records)
      const rawLocalList = localStorage.getItem('sahyadri_local_role_inquiries');
      let localList: any[] = [];
      if (rawLocalList) {
        try {
          const parsed = JSON.parse(rawLocalList);
          if (Array.isArray(parsed)) {
            localList = parsed.filter(
              (item: any) =>
                item &&
                !String(item.id || '').startsWith('inq-local-') &&
                item.sourceCollection !== 'local' &&
                item.test !== true &&
                item.test !== 'true' &&
                item.userId !== normUid &&
                item.userMobile !== normMobile &&
                item.id !== safeCreated.id
            );
          }
        } catch {}
      }
      localList.unshift({ ...safeCreated, sourceCollection });
      localStorage.setItem('sahyadri_local_role_inquiries', JSON.stringify(localList));

      const rawSession = localStorage.getItem('sahyadri_user_session');
      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession);
          if (isBuyerRole) {
            parsed.role = 'buyer';
            parsed.status = 'active';
            parsed.hasPendingInquiry = false;
            parsed.roleInquiryStatus = 'approved';
          } else {
            parsed.pendingRole = inquiryData.requestedRole;
            parsed.hasPendingInquiry = true;
          }
          parsed.lastInquirySubmittedAt = new Date().toISOString();
          localStorage.setItem('sahyadri_user_session', JSON.stringify(parsed));
        } catch {}
      }

      if (isBuyerRole) {
        const approvalData = JSON.stringify({
          role: 'buyer',
          approvedAt: nowTimestamp,
          reviewedBy: 'System (Auto-Approved)'
        });
        if (normUid) localStorage.setItem(`sahyadri_role_approved_${normUid}`, approvalData);
        if (cleanMob) localStorage.setItem(`sahyadri_role_approved_${cleanMob}`, approvalData);
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('role_inquiry_updated', {
        detail: { userId: normUid, role: isBuyerRole ? 'buyer' : inquiryData.requestedRole, status: isBuyerRole ? 'approved' : 'pending' }
      }));
    } catch (cacheErr) {
      console.warn('Could not cache role inquiry to localStorage:', cacheErr);
    }
  }

  // 4. Update user record if permitted (persisting inquiry data on user profile as well)
  try {
    if (normUid) {
      if (isBuyerRole) {
        await updateDocument('users', normUid, {
          role: 'buyer',
          status: 'active',
          hasPendingInquiry: false,
          roleInquiryStatus: 'approved',
          approvedRoleAt: nowTimestamp,
          roleApprovedBy: 'System (Auto-Approved)',
          roleInquiry: newInquiry
        });
        if (cleanMob && cleanMob !== normUid) {
          updateDocument('users', cleanMob, {
            role: 'buyer',
            status: 'active',
            hasPendingInquiry: false,
            roleInquiryStatus: 'approved',
            approvedRoleAt: nowTimestamp,
            roleApprovedBy: 'System (Auto-Approved)'
          }).catch(() => {});
        }
      } else {
        await updateDocument('users', normUid, {
          pendingRole: inquiryData.requestedRole,
          pendingRoleInquiryId: safeCreated.id || safeCreated.uid,
          hasPendingInquiry: true,
          lastInquirySubmittedAt: nowTimestamp,
          roleInquiry: newInquiry
        });
      }
    }
  } catch (e) {
    console.warn('Could not update user doc with pending inquiry status:', e);
  }

  return { ...safeCreated, sourceCollection };
};

/**
 * Detect role from inquiry object across multiple legacy and current representations
 */
export const extractInquiryRole = (item: any): string => {
  if (!item) return '';
  let role = String(item.requestedRole || item.role || '').trim().toLowerCase();
  if (role) return role;

  if (typeof item.propertyName === 'string' && item.propertyName.includes('Role Application:')) {
    const parsed = item.propertyName.split('Role Application:')[1]?.trim()?.toLowerCase();
    if (parsed) return parsed;
  }
  if (typeof item.message === 'string' && item.message.includes('Role request for')) {
    const parsed = item.message.split('Role request for')[1]?.trim()?.toLowerCase();
    if (parsed) return parsed;
  }
  if (item.sellerDetails) return 'seller';
  if (item.builderDetails) return 'builder';
  if (item.agentDetails) return 'agent';
  if (item.supplierDetails) return 'supplier';
  if (item.buyerDetails) return 'buyer';
  if (item.representativeDetails) return 'representative';
  return '';
};

/**
 * Checks if a Firestore document is a valid role inquiry (filters out corrupted test docs)
 */
export const isRoleInquiryDocument = (item: any): boolean => {
  if (!item) return false;
  if (item.test === true || item.test === 'true') return false;
  const role = extractInquiryRole(item);
  const hasApplicant = Boolean(
    item.userName || item.name || item.fullName || item.userMobile || item.phone || item.mobile || item.userEmail || item.email
  );
  // Must have at least an applicant identifier OR a recognizable requested role to be considered valid
  if (!hasApplicant && !role) return false;

  if (item.isRoleInquiry === true || item.isRoleInquiry === 'true') return true;
  if (item.type === 'role_inquiry' || item.type === 'role') return true;
  if (role) return true;
  if (typeof item.propertyName === 'string' && item.propertyName.toLowerCase().includes('role application')) return true;
  if (typeof item.message === 'string' && item.message.toLowerCase().includes('role request')) return true;
  if (item.sellerDetails || item.builderDetails || item.agentDetails || item.supplierDetails || item.buyerDetails || item.representativeDetails) return true;
  return false;
};

/**
 * Generate a composite identity key for a role inquiry so mirror documents
 * (in 'role_inquiries' and 'enquiries') for the same applicant & role are unified.
 */
export const getInquiryIdentityKey = (item: any): string => {
  if (!item) return Math.random().toString();
  const rawMob = item.userMobile || item.phone || item.mobile || item.cleanMobile || '';
  const cleanMob = String(rawMob).replace(/[^0-9]/g, '').slice(-10);
  const role = extractInquiryRole(item);
  const uid = String(item.userId || item.uid || '').trim();
  const rawEmail = item.userEmail || item.email || '';
  const cleanEmail = String(rawEmail).trim().toLowerCase();

  if (cleanMob && role) return `mob_${cleanMob}_${role}`;
  if (cleanMob) return `mob_${cleanMob}`;
  if (uid && role) return `uid_${uid}_${role}`;
  if (uid) return `uid_${uid}`;
  if (cleanEmail && role) return `email_${cleanEmail}_${role}`;
  return String(item.id || item.uid || Math.random().toString());
};

/**
 * Merge two inquiry representations for the same user request.
 * Priority rule: APPROVED / ACCEPTED > REJECTED > PENDING.
 * If one copy has been approved by admin, it ALWAYS wins over any un-reviewed pending mirror copy!
 */
export const mergeInquiryRecords = (existing: RoleInquiry, incoming: RoleInquiry): RoleInquiry => {
  const getStatusWeight = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'accepted') return 3;
    if (s === 'rejected') return 2;
    if (s === 'pending') return 1;
    return 0;
  };

  const existingWeight = getStatusWeight(existing.status);
  const incomingWeight = getStatusWeight(incoming.status);

  let winner: RoleInquiry = existing;
  let secondary: RoleInquiry = incoming;

  if (incomingWeight > existingWeight) {
    winner = incoming;
    secondary = existing;
  } else if (incomingWeight === existingWeight) {
    const timeWin = new Date(existing.reviewedAt || existing.updatedAt || existing.createdAt || 0).getTime();
    const timeInc = new Date(incoming.reviewedAt || incoming.updatedAt || incoming.createdAt || 0).getTime();
    if (timeInc > timeWin) {
      winner = incoming;
      secondary = existing;
    }
  }

  const rawStatus = (winner.status || secondary.status || 'pending').toLowerCase();
  const normalizedStatus: 'pending' | 'approved' | 'rejected' =
    rawStatus === 'accepted' ? 'approved' : (rawStatus as any);

  const resolvedRole = extractInquiryRole(winner) || extractInquiryRole(secondary) || 'seller';

  return {
    ...secondary,
    ...winner,
    id: winner.id || secondary.id,
    requestedRole: resolvedRole as any,
    sourceCollection: winner.sourceCollection || secondary.sourceCollection,
    sellerDetails: winner.sellerDetails || secondary.sellerDetails,
    builderDetails: winner.builderDetails || secondary.builderDetails,
    supplierDetails: winner.supplierDetails || secondary.supplierDetails,
    agentDetails: winner.agentDetails || secondary.agentDetails,
    buyerDetails: winner.buyerDetails || secondary.buyerDetails,
    representativeDetails: winner.representativeDetails || secondary.representativeDetails,
    status: normalizedStatus,
    reviewedAt: winner.reviewedAt || secondary.reviewedAt,
    reviewedBy: winner.reviewedBy || secondary.reviewedBy,
    rejectionReason: winner.rejectionReason || secondary.rejectionReason
  };
};

/**
 * Normalizes any role document from mobile-targeted collections (sellers, buyers, builders, agents)
 * into the standard RoleInquiry interface so that mobile and website requests are 100% interoperable.
 */
export const normalizeMobileRoleDoc = (item: any, collectionName: string): RoleInquiry | null => {
  if (!item || item.test === true || item.test === 'true') return null;

  const rawMob = item.mobile || item.phone || item.userMobile || item.contactNumber || '';
  const cleanMob = String(rawMob).replace(/[^0-9]/g, '').slice(-10);
  const name = String(item.name || item.userName || item.contactPerson || item.ownerName || item.firmOrAgencyName || 'Applicant').trim();

  let role: UserRole = 'seller';
  if (collectionName === 'buyers' || item.role === 'buyer') role = 'buyer';
  else if (collectionName === 'sellers' || item.role === 'seller') role = 'seller';
  else if (collectionName === 'builders' || item.role === 'builder') role = 'builder';
  else if (collectionName === 'agents' || item.role === 'agent') role = 'agent';
  else if (collectionName === 'suppliers' || item.role === 'supplier') role = 'supplier';
  else if (collectionName === 'representatives' || item.role === 'representative') role = 'representative';

  const rawStatus = String(item.status || 'pending').toLowerCase();
  let status: 'pending' | 'approved' | 'rejected' = 'pending';
  if (rawStatus === 'approved' || rawStatus === 'accepted' || rawStatus === 'active' || rawStatus === 'verified') {
    status = 'approved';
  } else if (rawStatus === 'rejected' || rawStatus === 'declined' || rawStatus === 'inactive') {
    status = 'rejected';
  }

  const parseDate = (val: any): string => {
    if (!val) return new Date().toISOString();
    if (typeof val === 'object' && val.seconds) {
      return new Date(val.seconds * 1000).toISOString();
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const createdAt = parseDate(item.appliedAt || item.createdAt || item.updatedAt);
  const reviewedAt = item.reviewedAt ? parseDate(item.reviewedAt) : (status === 'approved' ? createdAt : undefined);

  const res: RoleInquiry = {
    id: String(item.id || item.uid || `${collectionName}_${cleanMob || Date.now()}`),
    userId: String(item.userId || item.uid || item.id || (cleanMob ? `user_${cleanMob}` : `user_${Date.now()}`)).trim(),
    userCode: item.referralCode || item.referredByCode || item.code || undefined,
    userName: name,
    userEmail: item.email || item.userEmail || (cleanMob ? `${cleanMob}@sahyadriland.com` : ''),
    userMobile: cleanMob || rawMob,
    requestedRole: role,
    status,
    createdAt,
    reviewedAt,
    reviewedBy: item.reviewedBy || (status === 'approved' ? (item.adminRemarks || 'Admin') : undefined),
    rejectionReason: status === 'rejected' ? (item.adminRemarks || item.rejectionReason) : undefined,
    sourceCollection: collectionName,
    isRoleInquiry: true
  };

  if (role === 'seller') {
    res.sellerDetails = {
      sellerType: 'owner',
      district: item.district || 'Sangli',
      taluka: item.taluka || '',
      cityVillage: item.city || '',
      firstProperty: {
        category: (item.propertyType?.includes('Plots') || item.propertyType?.includes('जमीन'))
          ? 'Land'
          : (item.propertyType?.includes('Bungalow') || item.propertyType?.includes('बंगला'))
          ? 'Bungalow'
          : (item.propertyType?.includes('Flats') || item.propertyType?.includes('फ्लॅट'))
          ? 'Flat'
          : 'House',
        type: 'sale',
        title: item.propertyType ? `${item.propertyType} in ${item.city || 'Sangli'}` : (item.name ? `Property of ${item.name}` : 'Property for Sale'),
        propertyName: item.propertyType || 'Property for Sale',
        expectedPrice: Number(item.askingPrice) || undefined,
        district: item.district || 'Sangli',
        taluka: item.taluka || '',
        cityVillage: item.city || '',
        description: item.additionalDetails || '',
        images: []
      }
    };
  } else if (role === 'buyer') {
    res.buyerDetails = {
      propertyCategory: item.propertyType || item.category || 'Any',
      requirementType: item.purpose?.toLowerCase() === 'rent' ? 'rent' : 'sale',
      budgetMin: Number(item.budgetMin) || undefined,
      budgetMax: Number(item.budgetMax) || undefined,
      preferredDistrict: item.district || 'Sangli',
      preferredTaluka: item.taluka || '',
      preferredCity: item.city || item.preferredLocations || '',
      urgencyTimeline: item.timeframe?.includes('लगेच') ? 'immediate' : 'within_1_month',
      notes: item.additionalDetails || ''
    };
  } else if (role === 'builder') {
    res.builderDetails = {
      companyName: item.firmOrAgencyName || item.firmName || item.name || '',
      reraNumber: item.reraNumber || '',
      experienceYears: Number(item.experienceYears) || 1,
      officeAddress: item.officeAddress || '',
      cityVillage: item.city || '',
      district: item.district || 'Sangli',
      taluka: item.taluka || '',
      ongoingProjectsCount: Number(item.ongoingProjects) || 0,
      completedProjectsCount: Number(item.completedProjects) || 0
    };
  } else if (role === 'agent') {
    res.agentDetails = {
      agencyName: item.firmOrAgencyName || item.agencyName || item.name || '',
      experienceYears: Number(item.experienceYears) || 1,
      reraNumber: item.reraNumber || '',
      specialization: item.specialization || ''
    };
  }

  return res;
};

/**
 * Fetch latest inquiry submitted by a user across mobile and other devices.
 * Matches by Firebase UID, mobile number (last 10 digits), or email address.
 */
export const fetchUserRoleInquiry = async (
  userId?: string,
  userMobile?: string,
  userEmail?: string
): Promise<RoleInquiry | null> => {
  if (!userId && !userMobile && !userEmail) return null;

  const matchedInquiries: any[] = [];
  const rawMobile = userMobile ? String(userMobile) : '';
  let cleanMobile = rawMobile ? rawMobile.replace(/[^0-9]/g, '').slice(-10) : '';
  if (!cleanMobile && userEmail) {
    const rawEmail = String(userEmail);
    const digits = rawEmail.split('@')[0].replace(/[^0-9]/g, '');
    if (digits.length >= 10) cleanMobile = digits.slice(-10);
  }
  const cleanEmail = userEmail ? String(userEmail).trim().toLowerCase() : '';
  const cleanUid = userId ? String(userId).trim() : '';

  const isUserMatch = (i: any) => {
    if (!i || i.test === true || i.test === 'true') return false;
    const itemUid = String(i.userId || i.uid || '').trim();
    if (cleanUid && itemUid && itemUid === cleanUid) return true;
    if (cleanMobile) {
      const rawItemMob = i.userMobile || i.phone || i.mobile || i.cleanMobile || '';
      const itemMobile = String(rawItemMob).replace(/[^0-9]/g, '').slice(-10);
      if (itemMobile && itemMobile === cleanMobile) return true;
    }
    if (cleanEmail) {
      const itemEmail = String(i.userEmail || i.email || '').trim().toLowerCase();
      if (itemEmail && itemEmail === cleanEmail) return true;
    }
    return false;
  };

  // 1. Fetch from 'role_inquiries' collection FIRST (primary)
  try {
    const list = await fetchCollection('role_inquiries');
    const userInquiries = list
      .filter((i: any) => isRoleInquiryDocument(i) && isUserMatch(i))
      .map((i: any) => ({
        ...i,
        requestedRole: extractInquiryRole(i) || i.requestedRole,
        status: (i.status === 'accepted' ? 'approved' : i.status) || 'pending',
        sourceCollection: 'role_inquiries'
      }));
    matchedInquiries.push(...userInquiries);
  } catch (err) {}

  // 2. Fetch from 'enquiries' collection SECOND
  try {
    const list = await fetchCollection('enquiries');
    const userInquiries = list
      .filter((i: any) => isRoleInquiryDocument(i) && isUserMatch(i))
      .map((i: any) => ({
        ...i,
        requestedRole: extractInquiryRole(i) || i.requestedRole,
        status: (i.status === 'accepted' ? 'approved' : i.status) || 'pending',
        sourceCollection: 'enquiries'
      }));
    matchedInquiries.push(...userInquiries);
  } catch (err) {}

  // 2b. Fetch from mobile collections ('sellers', 'buyers', 'builders', 'agents')
  try {
    const [sellers, buyers, builders, agents] = await Promise.all([
      fetchCollection('sellers').catch(() => []),
      fetchCollection('buyers').catch(() => []),
      fetchCollection('builders').catch(() => []),
      fetchCollection('agents').catch(() => [])
    ]);

    sellers.forEach((item: any) => {
      const norm = normalizeMobileRoleDoc(item, 'sellers');
      if (norm && isUserMatch(norm)) matchedInquiries.push(norm);
    });

    buyers.forEach((item: any) => {
      const norm = normalizeMobileRoleDoc(item, 'buyers');
      if (norm && isUserMatch(norm)) matchedInquiries.push(norm);
    });

    builders.forEach((item: any) => {
      const norm = normalizeMobileRoleDoc(item, 'builders');
      if (norm && isUserMatch(norm)) matchedInquiries.push(norm);
    });

    agents.forEach((item: any) => {
      const norm = normalizeMobileRoleDoc(item, 'agents');
      if (norm && isUserMatch(norm)) matchedInquiries.push(norm);
    });
  } catch (err) {}

  // 3. Check local approval tokens or cached inquiry
  if (typeof window !== 'undefined') {
    try {
      const tokenKeys = [
        cleanUid && `sahyadri_role_approved_${cleanUid}`,
        cleanMobile && `sahyadri_role_approved_${cleanMobile}`,
        cleanUid && `sahyadri_role_inquiry_${cleanUid}`
      ].filter(Boolean) as string[];

      for (const tk of tokenKeys) {
        const raw = localStorage.getItem(tk);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.id === 'string' && parsed.id.startsWith('inq-local-')) {
              localStorage.removeItem(tk);
              continue;
            }
            if (parsed && (parsed.role || parsed.requestedRole)) {
              matchedInquiries.push({
                id: parsed.id || 'cached-token',
                userId: cleanUid,
                userMobile: cleanMobile,
                userEmail: cleanEmail,
                userName: parsed.userName || 'User',
                requestedRole: parsed.role || parsed.requestedRole,
                status: parsed.status || 'approved',
                reviewedAt: parsed.approvedAt || parsed.reviewedAt || new Date().toISOString(),
                sourceCollection: parsed.sourceCollection || 'role_inquiries'
              });
            }
          } catch {}
        }
      }

      const rawAll = localStorage.getItem('sahyadri_local_role_inquiries');
      if (rawAll) {
        try {
          const parsedAll = JSON.parse(rawAll);
          if (Array.isArray(parsedAll)) {
            const valid = parsedAll.filter((i: any) => 
              i && 
              !String(i.id || '').startsWith('inq-local-') && 
              i.sourceCollection !== 'local' &&
              i.test !== true && 
              i.test !== 'true'
            );
            if (valid.length !== parsedAll.length) {
              localStorage.setItem('sahyadri_local_role_inquiries', JSON.stringify(valid));
            }
            const matched = valid.filter(isUserMatch).map((i: any) => ({
              ...i,
              status: (i.status === 'accepted' ? 'approved' : i.status) || 'pending',
              sourceCollection: i.sourceCollection || 'role_inquiries'
            }));
            matchedInquiries.push(...matched);
          }
        } catch {}
      }
    } catch {}
  }

  if (matchedInquiries.length === 0) return null;

  // Deduplicate and prioritize approved/rejected over pending
  const uniqueMap = new Map<string, RoleInquiry>();
  matchedInquiries.forEach((item) => {
    const key = getInquiryIdentityKey(item);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    } else {
      uniqueMap.set(key, mergeInquiryRecords(uniqueMap.get(key)!, item));
    }
  });

  const sorted = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
    const isAppA = a.status === 'approved' || a.status === 'accepted';
    const isAppB = b.status === 'approved' || b.status === 'accepted';
    if (isAppA && !isAppB) return -1;
    if (isAppB && !isAppA) return 1;
    if (a.status === 'rejected' && b.status === 'pending') return -1;
    if (b.status === 'rejected' && a.status === 'pending') return 1;

    const timeA = new Date(a.reviewedAt || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.reviewedAt || b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return sorted[0] || null;
};

/**
 * Real-time listener for a user's role inquiry across all devices (Mobile/Desktop/Tablet).
 * Subscribes to live Firestore events so when Admin accepts or rejects, the user's dashboard
 * updates immediately on any device without a page refresh!
 */
export const subscribeToUserRoleInquiry = (
  userInfo: { uid?: string; mobile?: string; email?: string | null },
  callback: (inquiry: RoleInquiry | null) => void
): (() => void) => {
  if (!userInfo || (!userInfo.uid && !userInfo.mobile && !userInfo.email)) {
    callback(null);
    return () => {};
  }

  const rawMobile = userInfo.mobile ? String(userInfo.mobile) : '';
  let cleanMobile = rawMobile ? rawMobile.replace(/[^0-9]/g, '').slice(-10) : '';
  if (!cleanMobile && userInfo.email) {
    const rawEmail = String(userInfo.email);
    const digits = rawEmail.split('@')[0].replace(/[^0-9]/g, '');
    if (digits.length >= 10) cleanMobile = digits.slice(-10);
  }
  const cleanEmail = userInfo.email ? String(userInfo.email).trim().toLowerCase() : '';
  const cleanUid = userInfo.uid ? String(userInfo.uid).trim() : '';

  const isUserMatch = (i: any) => {
    if (!i || i.test === true || i.test === 'true') return false;
    const itemUid = String(i.userId || i.uid || '').trim();
    if (cleanUid && itemUid && itemUid === cleanUid) return true;
    if (cleanMobile) {
      const rawItemMob = i.userMobile || i.phone || i.mobile || i.cleanMobile || '';
      const itemMobile = String(rawItemMob).replace(/[^0-9]/g, '').slice(-10);
      if (itemMobile && itemMobile === cleanMobile) return true;
    }
    if (cleanEmail) {
      const itemEmail = String(i.userEmail || i.email || '').trim().toLowerCase();
      if (itemEmail && itemEmail === cleanEmail) return true;
    }
    return false;
  };

  let roleInquiriesList: any[] = [];
  let enquiriesList: any[] = [];
  let sellersList: any[] = [];
  let buyersList: any[] = [];
  let buildersList: any[] = [];
  let agentsList: any[] = [];

  const updateAndNotify = () => {
    const matched: any[] = [];

    roleInquiriesList.forEach((item) => {
      if (isRoleInquiryDocument(item) && isUserMatch(item)) {
        matched.push({
          ...item,
          requestedRole: extractInquiryRole(item) || item.requestedRole,
          status: (item.status === 'accepted' ? 'approved' : item.status) || 'pending',
          sourceCollection: 'role_inquiries'
        });
      }
    });

    enquiriesList.forEach((item) => {
      if (isRoleInquiryDocument(item) && isUserMatch(item)) {
        matched.push({
          ...item,
          requestedRole: extractInquiryRole(item) || item.requestedRole,
          status: (item.status === 'accepted' ? 'approved' : item.status) || 'pending',
          sourceCollection: 'enquiries'
        });
      }
    });

    sellersList.forEach((item) => {
      const norm = normalizeMobileRoleDoc(item, 'sellers');
      if (norm && isUserMatch(norm)) matched.push(norm);
    });

    buyersList.forEach((item) => {
      const norm = normalizeMobileRoleDoc(item, 'buyers');
      if (norm && isUserMatch(norm)) matched.push(norm);
    });

    buildersList.forEach((item) => {
      const norm = normalizeMobileRoleDoc(item, 'builders');
      if (norm && isUserMatch(norm)) matched.push(norm);
    });

    agentsList.forEach((item) => {
      const norm = normalizeMobileRoleDoc(item, 'agents');
      if (norm && isUserMatch(norm)) matched.push(norm);
    });

    // Check local storage approval tokens
    if (typeof window !== 'undefined') {
      try {
        const tokenKeys = [
          cleanUid && `sahyadri_role_approved_${cleanUid}`,
          cleanMobile && `sahyadri_role_approved_${cleanMobile}`,
          cleanUid && `sahyadri_role_inquiry_${cleanUid}`
        ].filter(Boolean) as string[];

        for (const tk of tokenKeys) {
          const raw = localStorage.getItem(tk);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed.id === 'string' && parsed.id.startsWith('inq-local-')) {
                localStorage.removeItem(tk);
                continue;
              }
              if (parsed && (parsed.role || parsed.requestedRole)) {
                matched.push({
                  id: parsed.id || 'cached-token',
                  userId: cleanUid,
                  userMobile: cleanMobile,
                  userEmail: cleanEmail,
                  userName: parsed.userName || 'User',
                  requestedRole: parsed.role || parsed.requestedRole,
                  status: parsed.status || 'approved',
                  reviewedAt: parsed.approvedAt || parsed.reviewedAt || new Date().toISOString(),
                  sourceCollection: parsed.sourceCollection || 'role_inquiries'
                });
              }
            } catch {}
          }
        }
      } catch {}
    }

    if (matched.length === 0) {
      callback(null);
      return;
    }

    const uniqueMap = new Map<string, RoleInquiry>();
    matched.forEach((item) => {
      const key = getInquiryIdentityKey(item);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      } else {
        uniqueMap.set(key, mergeInquiryRecords(uniqueMap.get(key)!, item));
      }
    });

    const sorted = Array.from(uniqueMap.values()).sort((a: any, b: any) => {
      const isAppA = a.status === 'approved' || a.status === 'accepted';
      const isAppB = b.status === 'approved' || b.status === 'accepted';
      if (isAppA && !isAppB) return -1;
      if (isAppB && !isAppA) return 1;
      if (a.status === 'rejected' && b.status === 'pending') return -1;
      if (b.status === 'rejected' && a.status === 'pending') return 1;

      const timeA = new Date(a.reviewedAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.reviewedAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    callback(sorted[0] || null);
  };

  const unsubRole = subscribeToCollection('role_inquiries', (list) => {
    roleInquiriesList = list;
    updateAndNotify();
  });

  const unsubEnquiries = subscribeToCollection('enquiries', (list) => {
    enquiriesList = list;
    updateAndNotify();
  });

  const unsubSellers = subscribeToCollection('sellers', (list) => {
    sellersList = list;
    updateAndNotify();
  });

  const unsubBuyers = subscribeToCollection('buyers', (list) => {
    buyersList = list;
    updateAndNotify();
  });

  const unsubBuilders = subscribeToCollection('builders', (list) => {
    buildersList = list;
    updateAndNotify();
  });

  const unsubAgents = subscribeToCollection('agents', (list) => {
    agentsList = list;
    updateAndNotify();
  });

  const handleCustomEvent = () => {
    updateAndNotify();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleCustomEvent);
    window.addEventListener('role_inquiry_updated', handleCustomEvent);
    setTimeout(updateAndNotify, 10);
  }

  return () => {
    if (typeof unsubRole === 'function') unsubRole();
    if (typeof unsubEnquiries === 'function') unsubEnquiries();
    if (typeof unsubSellers === 'function') unsubSellers();
    if (typeof unsubBuyers === 'function') unsubBuyers();
    if (typeof unsubBuilders === 'function') unsubBuilders();
    if (typeof unsubAgents === 'function') unsubAgents();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleCustomEvent);
      window.removeEventListener('role_inquiry_updated', handleCustomEvent);
    }
  };
};

/**
 * Subscribe to all role inquiries (for Admin) from both role_inquiries and enquiries collections
 * Deduplicates using composite key so mirror records for the same applicant don't create false pending rows.
 */
export const subscribeToRoleInquiries = (callback: (inquiries: RoleInquiry[]) => void) => {
  let roleInquiriesList: RoleInquiry[] = [];
  let enquiriesList: RoleInquiry[] = [];
  let sellersList: RoleInquiry[] = [];
  let buyersList: RoleInquiry[] = [];
  let buildersList: RoleInquiry[] = [];
  let agentsList: RoleInquiry[] = [];

  const getLocalInquiries = (): RoleInquiry[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('sahyadri_local_role_inquiries');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item: any) => isRoleInquiryDocument(item) && !String(item.id || '').startsWith('inq-local-') && item.sourceCollection !== 'local')
            .map((item: any) => ({
              ...item,
              userName: item.userName || item.name || item.fullName || 'Applicant',
              userMobile: String(item.userMobile || item.phone || item.mobile || ''),
              userEmail: item.userEmail || item.email || '',
              requestedRole: (extractInquiryRole(item) || item.requestedRole || 'seller') as any,
              status: (item.status === 'accepted' ? 'approved' : item.status) || 'pending',
              sourceCollection: item.sourceCollection || 'role_inquiries'
            }));
        }
      }
    } catch {}
    return [];
  };

  const notify = () => {
    const localList = getLocalInquiries();
    const mergedMap = new Map<string, RoleInquiry>();
    [...roleInquiriesList, ...enquiriesList, ...sellersList, ...buyersList, ...buildersList, ...agentsList, ...localList].forEach((item) => {
      if (!item) return;
      if (item.sourceCollection !== 'sellers' && item.sourceCollection !== 'buyers' && item.sourceCollection !== 'builders' && item.sourceCollection !== 'agents' && !isRoleInquiryDocument(item)) return;
      const key = getInquiryIdentityKey(item);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      } else {
        mergedMap.set(key, mergeInquiryRecords(mergedMap.get(key)!, item));
      }
    });

    const sorted = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt || b.reviewedAt || 0).getTime() - new Date(a.createdAt || a.reviewedAt || 0).getTime()
    );
    callback(sorted);
  };

  let unsubRole: any = null;
  try {
    unsubRole = subscribeToCollection('role_inquiries', (list: any[]) => {
      roleInquiriesList = list
        .filter((item: any) => isRoleInquiryDocument(item))
        .map((item: any) => ({
          ...item,
          userName: item.userName || item.name || item.fullName || 'Applicant',
          userMobile: String(item.userMobile || item.phone || item.mobile || ''),
          userEmail: item.userEmail || item.email || '',
          requestedRole: (extractInquiryRole(item) || item.requestedRole || 'seller') as any,
          status: (item.status === 'accepted' ? 'approved' : item.status) || 'pending',
          sourceCollection: 'role_inquiries'
        }));
      notify();
    });
  } catch {}

  let unsubEnquiries: any = null;
  try {
    unsubEnquiries = subscribeToCollection('enquiries', (list: any[]) => {
      enquiriesList = list
        .filter((item: any) => isRoleInquiryDocument(item))
        .map((item: any) => ({
          ...item,
          userName: item.userName || item.name || item.fullName || 'Applicant',
          userMobile: String(item.userMobile || item.phone || item.mobile || ''),
          userEmail: item.userEmail || item.email || '',
          requestedRole: (extractInquiryRole(item) || item.requestedRole || 'seller') as any,
          status: (item.status === 'accepted' ? 'approved' : item.status) || 'pending',
          sourceCollection: 'enquiries'
        }));
      notify();
    });
  } catch {}

  let unsubSellers: any = null;
  try {
    unsubSellers = subscribeToCollection('sellers', (list: any[]) => {
      sellersList = list
        .map((item: any) => normalizeMobileRoleDoc(item, 'sellers'))
        .filter(Boolean) as RoleInquiry[];
      notify();
    });
  } catch {}

  let unsubBuyers: any = null;
  try {
    unsubBuyers = subscribeToCollection('buyers', (list: any[]) => {
      buyersList = list
        .map((item: any) => normalizeMobileRoleDoc(item, 'buyers'))
        .filter(Boolean) as RoleInquiry[];
      notify();
    });
  } catch {}

  let unsubBuilders: any = null;
  try {
    unsubBuilders = subscribeToCollection('builders', (list: any[]) => {
      buildersList = list
        .map((item: any) => normalizeMobileRoleDoc(item, 'builders'))
        .filter(Boolean) as RoleInquiry[];
      notify();
    });
  } catch {}

  let unsubAgents: any = null;
  try {
    unsubAgents = subscribeToCollection('agents', (list: any[]) => {
      agentsList = list
        .map((item: any) => normalizeMobileRoleDoc(item, 'agents'))
        .filter(Boolean) as RoleInquiry[];
      notify();
    });
  } catch {}

  const handleCustomUpdate = () => {
    notify();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleCustomUpdate);
    window.addEventListener('role_inquiry_updated', handleCustomUpdate);
    setTimeout(notify, 10);
  }

  return () => {
    if (typeof unsubRole === 'function') unsubRole();
    if (typeof unsubEnquiries === 'function') unsubEnquiries();
    if (typeof unsubSellers === 'function') unsubSellers();
    if (typeof unsubBuyers === 'function') unsubBuyers();
    if (typeof unsubBuilders === 'function') unsubBuilders();
    if (typeof unsubAgents === 'function') unsubAgents();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleCustomUpdate);
      window.removeEventListener('role_inquiry_updated', handleCustomUpdate);
    }
  };
};

/**
 * Admin accepts / approves a role inquiry
 * 1. Sets inquiry status to 'approved' across both 'role_inquiries' and 'enquiries' collections
 * 2. Updates user's role in 'users' collection to the requested role (by UID, mobile, and email)
 * 3. If requestedRole === 'seller' and firstProperty is provided, creates the property
 *    in 'properties' collection in 'pending' status awaiting manual Admin approval!
 * 4. If requestedRole === 'agent', ensures record in 'agents' collection
 * 5. If requestedRole === 'builder', ensures project and record in 'builders' collection
 * 6. If requestedRole === 'supplier', ensures record in 'suppliers' collection
 * 7. If requestedRole === 'representative', ensures record in 'representatives' collection
 */
export const approveRoleInquiry = async (
  inquiry: RoleInquiry,
  adminUser?: { uid?: string; email?: string | null; displayName?: string | null }
): Promise<{ success: boolean; propertyCreated?: any; error?: string }> => {
  if (!inquiry.id) throw new Error('Inquiry ID is required');

  try {
    const now = new Date().toISOString();
    const reviewer = adminUser?.email || adminUser?.displayName || 'Admin';
    const resolvedRole = extractInquiryRole(inquiry) || inquiry.requestedRole || 'seller';
    const cleanMobile = (inquiry.userMobile || (inquiry as any).phone || (inquiry as any).mobile || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanEmail = (inquiry.userEmail || (inquiry as any).email || '').trim().toLowerCase();
    const userId = (inquiry.userId || (inquiry as any).uid || '').trim();

    const targetCollection = (inquiry as any).sourceCollection || ((inquiry as any).isRoleInquiry ? 'enquiries' : 'role_inquiries');

    const updatePayload = {
      status: 'approved',
      requestedRole: resolvedRole,
      reviewedAt: now,
      reviewedBy: reviewer
    };

    // 1. Update the role inquiry status in its source collection (with fallback)
    try {
      await updateDocument(targetCollection, inquiry.id, updatePayload);
    } catch {
      const alt = targetCollection === 'enquiries' ? 'role_inquiries' : 'enquiries';
      try {
        await updateDocument(alt, inquiry.id, updatePayload);
      } catch {}
    }

    // 1b. Dual Collection Synchronization:
    // Update any mirror documents in both 'role_inquiries' and 'enquiries' collections
    const isRecordMatch = (item: any) => {
      if (item.id === inquiry.id) return true;
      if (userId && (item.userId === userId || item.uid === userId)) return true;
      if (cleanMobile) {
        const itemMob = (item.userMobile || item.phone || item.mobile || item.cleanMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (itemMob && itemMob === cleanMobile) return true;
      }
      if (cleanEmail) {
        const itemEmail = (item.userEmail || item.email || '').trim().toLowerCase();
        if (itemEmail && itemEmail === cleanEmail) return true;
      }
      return false;
    };

    try {
      const rList = await fetchCollection('role_inquiries');
      for (const item of rList) {
        if (isRecordMatch(item) && item.id && item.status !== 'approved') {
          updateDocument('role_inquiries', item.id, updatePayload).catch(() => {});
        }
      }
    } catch {}

    try {
      const eList = await fetchCollection('enquiries');
      for (const item of eList) {
        if (isRoleInquiryDocument(item) && isRecordMatch(item) && item.id && item.status !== 'approved') {
          updateDocument('enquiries', item.id, updatePayload).catch(() => {});
        }
      }
    } catch {}

    // 1c. Multi-Platform Synchronization for Mobile Collections (sellers, buyers, builders, agents):
    try {
      if (cleanMobile) {
        if (resolvedRole === 'seller' || inquiry.sellerDetails) {
          await setExactDocument('sellers', `seller_${cleanMobile}`, {
            status: 'approved',
            adminRemarks: 'Approved by Admin',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
        if (resolvedRole === 'buyer' || inquiry.buyerDetails) {
          await setExactDocument('buyers', `buyer_${cleanMobile}`, {
            status: 'approved',
            adminRemarks: 'Approved by Admin',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
        if (resolvedRole === 'builder' || inquiry.builderDetails) {
          await setExactDocument('builders', `builder_${cleanMobile}`, {
            status: 'approved',
            statusMr: 'मंजूर',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
        if (resolvedRole === 'agent' || inquiry.agentDetails) {
          await setExactDocument('agents', `agent_${cleanMobile}`, {
            status: 'approved',
            statusMr: 'मंजूर',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
      }
      if (inquiry.id) {
        if (inquiry.id.startsWith('seller_') || targetCollection === 'sellers') {
          await setExactDocument('sellers', inquiry.id, {
            status: 'approved',
            adminRemarks: 'Approved by Admin',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        } else if (inquiry.id.startsWith('buyer_') || targetCollection === 'buyers') {
          await setExactDocument('buyers', inquiry.id, {
            status: 'approved',
            adminRemarks: 'Approved by Admin',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        } else if (inquiry.id.startsWith('builder_') || targetCollection === 'builders') {
          await setExactDocument('builders', inquiry.id, {
            status: 'approved',
            statusMr: 'मंजूर',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        } else if (inquiry.id.startsWith('agent_') || targetCollection === 'agents') {
          await setExactDocument('agents', inquiry.id, {
            status: 'approved',
            statusMr: 'मंजूर',
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
      }
    } catch (mobileSyncErr) {
      console.warn('Could not sync approval to mobile collection:', mobileSyncErr);
    }

    // 2. Synchronize the user record in 'users' collection across UID, mobile number, and email
    const userUpdatePayload = {
      role: resolvedRole,
      status: 'active',
      hasPendingInquiry: false,
      roleInquiryStatus: 'approved',
      approvedRoleAt: now,
      roleApprovedBy: reviewer
    };

    if (userId) {
      updateDocument('users', userId, userUpdatePayload).catch((err) => {
        console.warn('Could not update users by userId:', err);
      });
    }

    if (cleanMobile) {
      updateDocument('users', cleanMobile, userUpdatePayload).catch(() => {});
    }

    // Also scan users collection to ensure any record with matching mobile or email is updated
    try {
      const uList = await fetchCollection('users');
      for (const u of uList) {
        const uMob = (u.mobile || u.phoneNumber || u.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const uEmail = (u.email || '').trim().toLowerCase();
        if (u.id && ((cleanMobile && uMob === cleanMobile) || (cleanEmail && uEmail === cleanEmail))) {
          updateDocument('users', u.id, userUpdatePayload).catch(() => {});
        }
      }
    } catch {}

    // 3. Update localStorage session and tokens immediately for instant mobile & desktop reactivity
    if (typeof window !== 'undefined') {
      try {
        const approvalData = JSON.stringify({
          role: resolvedRole,
          approvedAt: now,
          reviewedBy: reviewer
        });

        if (userId) {
          localStorage.setItem(`sahyadri_role_approved_${userId}`, approvalData);
        }
        if (cleanMobile) {
          localStorage.setItem(`sahyadri_role_approved_${cleanMobile}`, approvalData);
        }

        const userSessionRaw = localStorage.getItem('sahyadri_user_session');
        if (userSessionRaw) {
          const userSession = JSON.parse(userSessionRaw);
          const sessMob = (userSession.mobile || userSession.phone || '').replace(/[^0-9]/g, '').slice(-10);
          if (
            userSession.uid === userId ||
            (cleanMobile && sessMob === cleanMobile) ||
            (cleanEmail && userSession.email?.toLowerCase() === cleanEmail)
          ) {
            userSession.role = resolvedRole;
            userSession.status = 'active';
            userSession.hasPendingInquiry = false;
            userSession.roleInquiryStatus = 'approved';
            localStorage.setItem('sahyadri_user_session', JSON.stringify(userSession));
          }
        }

        // Update local inquiry cache
        const rawLocalInqs = localStorage.getItem('sahyadri_local_role_inquiries');
        if (rawLocalInqs) {
          const parsed = JSON.parse(rawLocalInqs);
          const updated = parsed.map((item: any) =>
            isRecordMatch(item)
              ? { ...item, status: 'approved', reviewedAt: now, reviewedBy: reviewer }
              : item
          );
          localStorage.setItem('sahyadri_local_role_inquiries', JSON.stringify(updated));
        }

        if (userId) {
          const cachedInq = localStorage.getItem(`sahyadri_role_inquiry_${userId}`);
          if (cachedInq) {
            const parsed = JSON.parse(cachedInq);
            parsed.status = 'approved';
            parsed.reviewedAt = now;
            parsed.reviewedBy = reviewer;
            localStorage.setItem(`sahyadri_role_inquiry_${userId}`, JSON.stringify(parsed));
          }
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(
          new CustomEvent('role_inquiry_updated', {
            detail: { userId, mobile: cleanMobile, role: resolvedRole, status: 'approved' }
          })
        );
      } catch (e) {
        console.warn('Could not update localStorage approval state:', e);
      }
    }

    // 4. Generate in-app user notification
    try {
      await createNotification({
        type: 'inquiry',
        title: `Role Approved: ${resolvedRole.toUpperCase()}`,
        titleMr: `भूमिका मंजूर: ${resolvedRole.toUpperCase()}`,
        message: `Congratulations! Your request to become a verified ${resolvedRole} has been approved by Admin.`,
        messageMr: `अभिनंदन! आपला ${resolvedRole} पदासाठीचा अर्ज ॲडमिनने मंजूर केला आहे.`,
        link: `/${resolvedRole}/dashboard`,
        metadata: {
          userId: inquiry.userId,
          userMobile: inquiry.userMobile,
          status: 'approved',
          role: resolvedRole,
          reviewedAt: now
        }
      });
    } catch (notifErr) {
      console.warn('Could not create approval notification:', notifErr);
    }

    let createdPropertyDoc = null;

    // 5. If applicant requested 'seller' and submitted their first property details:
    if (resolvedRole === 'seller') {
      let prop: any = inquiry.sellerDetails?.firstProperty;
      let sellerAltMobile = inquiry.sellerDetails?.alternateMobile || '';

      // Fallback lookup from Firestore if not present on the in-memory inquiry object
      if (!prop) {
        try {
          if (inquiry.id) {
            const rawDoc = await fetchDocument('role_inquiries', inquiry.id);
            if (rawDoc?.sellerDetails?.firstProperty) {
              prop = rawDoc.sellerDetails.firstProperty;
              sellerAltMobile = rawDoc.sellerDetails.alternateMobile || sellerAltMobile;
            }
          }
          if (!prop) {
            const rList = await fetchCollection('role_inquiries');
            const match = rList.find((r: any) =>
              (inquiry.id && r.id === inquiry.id) ||
              (userId && (r.userId === userId || r.uid === userId)) ||
              (cleanMobile && (r.userMobile || r.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanMobile)
            );
            if (match?.sellerDetails?.firstProperty) {
              prop = match.sellerDetails.firstProperty;
              sellerAltMobile = match.sellerDetails.alternateMobile || sellerAltMobile;
            }
          }
        } catch (lookupErr) {
          console.warn('Fallback lookup for seller firstProperty failed:', lookupErr);
        }
      }

      if (prop) {
        // Check if property is already created in 'properties'
        let existingProp: any = null;
        try {
          const props = await fetchCollection('properties');
          existingProp = props.find((p: any) =>
            (p.roleInquiryId && p.roleInquiryId === inquiry.id) ||
            (p.source === 'seller_inquiry_onboarding' &&
              ((userId && (p.userId === userId || p.ownerId === userId)) ||
               (cleanMobile && (p.mobileNumber || p.phone || p.ownerPhone || '').replace(/[^0-9]/g, '').slice(-10) === cleanMobile)))
          );
        } catch {}

        if (existingProp && existingProp.id) {
          createdPropertyDoc = existingProp;
          console.log('Onboarding property already exists in properties collection:', existingProp.id);
        } else {
          const targetPropId = `prop-seller-${cleanMobile || userId || Date.now()}-${Date.now().toString().slice(-4)}`;
          const newPropertyDoc: any = {
            id: targetPropId,
            userId: userId || cleanMobile,
            ownerName: inquiry.userName,
            mobileNumber: inquiry.userMobile,
            ownerPhone: inquiry.userMobile,
            phone: inquiry.userMobile,
            cleanMobile: cleanMobile,
            email: inquiry.userEmail,
            alternateMobile: sellerAltMobile,
            category: prop.category || 'House',
            type: prop.type || 'sale',
            status: 'pending',
            adminApproved: false,
            isActive: false,
            propertyName: prop.propertyName || prop.title,
            title: prop.title || prop.propertyName || `${prop.category || 'Property'} in ${prop.cityVillage || prop.taluka || 'Sangli'}`,
            titleMr: prop.titleMr || prop.title || prop.propertyName,
            description: prop.description || `${prop.category} listed by verified seller ${inquiry.userName}`,
            descriptionMr: prop.descriptionMr || prop.description || '',

            // Pricing
            expectedPrice: prop.expectedPrice || (prop.type === 'sale' ? (prop.price || 0) : undefined),
            price: prop.expectedPrice || prop.monthlyRent || prop.price || 0,
            monthlyRent: prop.monthlyRent || (prop.type === 'rent' ? (prop.price || 0) : undefined),
            isNegotiable: prop.isNegotiable ?? true,

            // Location
            state: 'Maharashtra',
            district: prop.district || inquiry.sellerDetails?.district || 'Sangli',
            taluka: prop.taluka || inquiry.sellerDetails?.taluka || 'Miraj',
            cityVillage: prop.cityVillage || inquiry.sellerDetails?.cityVillage || '',
            fullAddress: prop.fullAddress || '',
            location: `${prop.cityVillage ? prop.cityVillage + ', ' : ''}${prop.taluka || 'Miraj'}, ${prop.district || 'Sangli'}`,
            locationMr: `${prop.cityVillage ? prop.cityVillage + ', ' : ''}${prop.taluka || 'Miraj'}, ${prop.district || 'Sangli'}`,
            landmark: prop.landmark || '',

            // Layout
            areaType: prop.areaType || 'sqft',
            builtUpArea: Number(prop.builtUpArea || 0),
            carpetArea: Number(prop.carpetArea || 0),
            flatType: prop.flatType || (prop.bedrooms ? `${prop.bedrooms}BHK` : '2BHK'),
            bedrooms: Number(prop.bedrooms || 0),
            bathrooms: Number(prop.bathrooms || 0),
            balconies: Number(prop.balconies || 0),
            totalFloors: Number(prop.totalFloors || 0),
            floorNumber: Number(prop.floorNumber || 0),
            floorNo: prop.floorNo || '',
            furnishingStatus: prop.furnishingStatus || 'Unfurnished',
            facingDirection: prop.facingDirection || 'East',

            // Facilities
            carParking: prop.carParking ?? false,
            waterSupply: prop.waterSupply ?? true,
            powerBackup: prop.powerBackup ?? false,
            hasLoan: prop.hasLoan ?? false,

            // Plot specific
            plotAreaSqFt: Number(prop.plotAreaSqFt || 0),
            plotAreaGuntha: Number(prop.plotAreaGuntha || 0),
            plotDimensions: prop.plotDimensions || '',
            roadWidth: prop.roadWidth || '',
            plotSanctionType: prop.plotSanctionType || '',
            boundaryWall: prop.boundaryWall || '',

            // Land specific
            landArea: prop.landArea || '',
            landType: prop.landType || '',
            waterSource: prop.waterSource || '',
            roadAccess: prop.roadAccess || '',
            electricity: prop.electricity || '',
            titleClear: prop.titleClear || '',

            // Media
            images:
              prop.images && prop.images.length > 0
                ? prop.images
                : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'],

            // Settings & Visibility
            showPrice: true,
            showAddress: true,
            showOwnerName: true,
            showOwnerContact: true,
            showImages: true,

            createdAt: now,
            source: 'seller_inquiry_onboarding',
            roleInquiryId: inquiry.id
          };

          try {
            createdPropertyDoc = await createDocument('properties', newPropertyDoc);
            console.log('Successfully created onboarding property in properties collection:', createdPropertyDoc);
          } catch (err) {
            console.error('Could not auto-create seller first property in properties:', err);
          }
        }
      }
    }

    // 6. If role is 'agent', ensure entry in 'agents' collection
    if (resolvedRole === 'agent') {
      try {
        const agentDoc = {
          uid: userId || cleanMobile,
          userId: userId || cleanMobile,
          code: inquiry.userCode || `AG-${Math.floor(1000 + Math.random() * 9000)}`,
          name: inquiry.userName,
          mobile: inquiry.userMobile,
          email: inquiry.userEmail,
          agencyName: inquiry.agentDetails?.agencyName || '',
          experienceYears: inquiry.agentDetails?.experienceYears || 1,
          operatingDistricts: inquiry.agentDetails?.operatingDistricts || ['Sangli'],
          operatingTalukas: inquiry.agentDetails?.operatingTalukas || ['Miraj'],
          reraNumber: inquiry.agentDetails?.reraNumber || '',
          specialization: inquiry.agentDetails?.specialization || 'Residential Properties',
          status: 'active',
          role: 'agent',
          createdAt: now,
          totalClientsHandled: 0,
          totalPropertiesListed: 0,
          totalDealsClosed: 0,
          totalSiteVisits: 0
        };
        await createDocument('agents', agentDoc);
      } catch (err) {
        console.warn('Could not mirror agent doc to agents collection:', err);
      }
    }

    // 7. If role is 'builder', handle initial project and mirror to 'builders'
    if (resolvedRole === 'builder') {
      if (inquiry.builderDetails?.firstProject) {
        const prop = inquiry.builderDetails.firstProject;
        const newPropertyDoc: any = {
          userId: userId || cleanMobile,
          ownerName: inquiry.builderDetails.companyName || inquiry.userName,
          mobileNumber: inquiry.userMobile,
          ownerPhone: inquiry.userMobile,
          phone: inquiry.userMobile,
          cleanMobile: cleanMobile,
          email: inquiry.userEmail,
          alternateMobile: '',
          category: prop.category || 'Flat',
          type: prop.type || 'sale',
          status: 'pending',
          adminApproved: false,
          isActive: false,
          isBuilderProject: true,
          companyName: inquiry.builderDetails.companyName,
          reraNumber: inquiry.builderDetails.reraNumber || '',
          title: prop.title,
          propertyName: prop.propertyName || prop.title,
          expectedPrice: prop.expectedPrice,
          monthlyRent: prop.monthlyRent,
          isNegotiable: prop.isNegotiable ?? true,
          description: prop.description || `${prop.title} by ${inquiry.builderDetails.companyName}`,
          district: prop.district,
          taluka: prop.taluka,
          cityVillage: prop.cityVillage,
          location: `${prop.cityVillage ? prop.cityVillage + ', ' : ''}${prop.taluka}, ${prop.district}`,
          landmark: prop.landmark || '',
          areaType: prop.areaType || 'sqft',
          builtUpArea: Number(prop.builtUpArea || 0),
          carpetArea: Number(prop.carpetArea || 0),
          flatType: prop.flatType || (prop.bedrooms ? `${prop.bedrooms}BHK` : '2BHK'),
          bedrooms: Number(prop.bedrooms || 0),
          bathrooms: Number(prop.bathrooms || 0),
          balconies: Number(prop.balconies || 0),
          totalFloors: Number(prop.totalFloors || 0),
          floorNumber: Number(prop.floorNumber || 0),
          furnishingStatus: prop.furnishingStatus || 'Unfurnished',
          carParking: prop.carParking ?? true,
          waterSupply: prop.waterSupply ?? true,
          powerBackup: prop.powerBackup ?? true,
          hasLoan: prop.hasLoan ?? false,
          images:
            prop.images && prop.images.length > 0
              ? prop.images
              : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
          showPrice: true,
          showAddress: true,
          showOwnerName: true,
          showOwnerContact: true,
          showImages: true,
          createdAt: now,
          source: 'builder_inquiry_onboarding'
        };
        try {
          createdPropertyDoc = await createDocument('properties', newPropertyDoc);
        } catch {}
      }

      try {
        const builderDoc = {
          uid: userId || cleanMobile,
          userId: userId || cleanMobile,
          companyName: inquiry.builderDetails?.companyName || inquiry.userName,
          contactPerson: inquiry.userName,
          mobile: inquiry.userMobile,
          email: inquiry.userEmail,
          reraNumber: inquiry.builderDetails?.reraNumber || '',
          experienceYears: inquiry.builderDetails?.experienceYears || 1,
          officeAddress: inquiry.builderDetails?.officeAddress || '',
          district: inquiry.builderDetails?.district || 'Sangli',
          taluka: inquiry.builderDetails?.taluka || 'Miraj',
          website: inquiry.builderDetails?.website || '',
          status: 'active',
          role: 'builder',
          createdAt: now
        };
        await createDocument('builders', builderDoc);
      } catch (err) {
        console.warn('Could not mirror builder doc:', err);
      }
    }

    // 8. If role is 'supplier', ensure entry in 'suppliers' collection
    if (resolvedRole === 'supplier') {
      try {
        const supplierDoc = {
          uid: userId || cleanMobile,
          userId: userId || cleanMobile,
          businessName: inquiry.supplierDetails?.businessName || inquiry.userName,
          contactPerson: inquiry.userName,
          mobile: inquiry.userMobile,
          email: inquiry.userEmail,
          category: inquiry.supplierDetails?.category || 'Building Materials',
          gstNumber: inquiry.supplierDetails?.gstNumber || '',
          officeAddress: inquiry.supplierDetails?.officeAddress || '',
          operatingDistricts: inquiry.supplierDetails?.operatingDistricts || ['Sangli'],
          operatingTalukas: inquiry.supplierDetails?.operatingTalukas || ['Miraj'],
          deliveryAvailable: inquiry.supplierDetails?.deliveryAvailable ?? true,
          productsOffered: inquiry.supplierDetails?.productsOffered || [],
          status: 'active',
          role: 'supplier',
          createdAt: now
        };
        await createDocument('suppliers', supplierDoc);
      } catch (err) {
        console.warn('Could not mirror supplier doc to suppliers collection:', err);
      }
    }

    // 9. If role is 'representative', ensure entry in 'representatives' collection
    if (resolvedRole === 'representative') {
      try {
        const repDoc = {
          uid: userId || cleanMobile,
          userId: userId || cleanMobile,
          code: inquiry.userCode || `REP-${Math.floor(1000 + Math.random() * 9000)}`,
          name: inquiry.userName,
          mobile: inquiry.userMobile,
          email: inquiry.userEmail,
          district: inquiry.representativeDetails?.preferredDistrict || 'Sangli',
          taluka: inquiry.representativeDetails?.preferredTaluka || 'Miraj',
          qualification: inquiry.representativeDetails?.qualification || '',
          experience: inquiry.representativeDetails?.experience || '',
          status: 'active',
          role: 'representative',
          createdAt: now
        };
        await createDocument('representatives', repDoc);
      } catch (err) {
        console.warn('Could not mirror rep doc to representatives collection:', err);
      }
    }

    return { success: true, propertyCreated: createdPropertyDoc };
  } catch (error: any) {
    console.error('approveRoleInquiry failed:', error);
    return { success: false, error: error?.message || 'Approval failed' };
  }
};

/**
 * Admin rejects a role inquiry with reason across both collections and user profiles
 */
export const rejectRoleInquiry = async (
  inquiryId: string,
  userId?: string,
  reason?: string,
  adminUser?: { email?: string | null; displayName?: string | null },
  sourceCollection: string = 'enquiries',
  inquiryObj?: RoleInquiry
): Promise<boolean> => {
  try {
    const now = new Date().toISOString();
    const rejectionReason = reason || 'Application not approved by Admin';
    const reviewer = adminUser?.email || adminUser?.displayName || 'Admin';

    const cleanMob = (
      inquiryObj?.userMobile ||
      (inquiryObj as any)?.phone ||
      (inquiryObj as any)?.mobile ||
      ''
    )
      .replace(/[^0-9]/g, '')
      .slice(-10);
    const cleanEmail = (inquiryObj?.userEmail || (inquiryObj as any)?.email || '').trim().toLowerCase();
    const targetUserId = (userId || inquiryObj?.userId || (inquiryObj as any)?.uid || '').trim();

    const updatePayload = {
      status: 'rejected',
      rejectionReason,
      reviewedAt: now,
      reviewedBy: reviewer
    };

    // 1. Direct update in source collection with fallback
    try {
      if (['sellers', 'buyers', 'builders', 'agents'].includes(sourceCollection) || inquiryId.startsWith('seller_') || inquiryId.startsWith('buyer_') || inquiryId.startsWith('builder_') || inquiryId.startsWith('agent_')) {
        await setExactDocument(sourceCollection, inquiryId, {
          status: 'rejected',
          adminRemarks: rejectionReason,
          reviewedAt: now,
          reviewedBy: reviewer
        });
      } else {
        await updateDocument(sourceCollection, inquiryId, updatePayload);
      }
    } catch {
      const alt = sourceCollection === 'enquiries' ? 'role_inquiries' : 'enquiries';
      try {
        await updateDocument(alt, inquiryId, updatePayload);
      } catch {}
    }

    // 2. Dual collection mirror synchronization
    const isRecordMatch = (item: any) => {
      if (item.id === inquiryId) return true;
      if (targetUserId && (item.userId === targetUserId || item.uid === targetUserId)) return true;
      if (cleanMob) {
        const itemMob = (item.userMobile || item.phone || item.mobile || item.cleanMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (itemMob && itemMob === cleanMob) return true;
      }
      if (cleanEmail) {
        const itemEmail = (item.userEmail || item.email || '').trim().toLowerCase();
        if (itemEmail && itemEmail === cleanEmail) return true;
      }
      return false;
    };

    try {
      const rList = await fetchCollection('role_inquiries');
      for (const item of rList) {
        if (isRecordMatch(item) && item.id && item.status !== 'rejected') {
          updateDocument('role_inquiries', item.id, updatePayload).catch(() => {});
        }
      }
    } catch {}

    try {
      const eList = await fetchCollection('enquiries');
      for (const item of eList) {
        if (isRoleInquiryDocument(item) && isRecordMatch(item) && item.id && item.status !== 'rejected') {
          updateDocument('enquiries', item.id, updatePayload).catch(() => {});
        }
      }
    } catch {}

    // 2b. Multi-Platform Synchronization for Mobile Collections (sellers, buyers, builders, agents):
    try {
      const resolvedRole = (inquiryObj?.requestedRole || (inquiryObj as any)?.role || '').toLowerCase();
      if (cleanMob) {
        if (resolvedRole === 'seller' || inquiryObj?.sellerDetails) {
          await setExactDocument('sellers', `seller_${cleanMob}`, {
            status: 'rejected',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
        if (resolvedRole === 'buyer' || inquiryObj?.buyerDetails) {
          await setExactDocument('buyers', `buyer_${cleanMob}`, {
            status: 'rejected',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
        if (resolvedRole === 'builder' || inquiryObj?.builderDetails) {
          await setExactDocument('builders', `builder_${cleanMob}`, {
            status: 'rejected',
            statusMr: 'नाकारले',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
        if (resolvedRole === 'agent' || inquiryObj?.agentDetails) {
          await setExactDocument('agents', `agent_${cleanMob}`, {
            status: 'rejected',
            statusMr: 'नाकारले',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
      }
      if (inquiryId) {
        if (inquiryId.startsWith('seller_') || sourceCollection === 'sellers') {
          await setExactDocument('sellers', inquiryId, {
            status: 'rejected',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        } else if (inquiryId.startsWith('buyer_') || sourceCollection === 'buyers') {
          await setExactDocument('buyers', inquiryId, {
            status: 'rejected',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        } else if (inquiryId.startsWith('builder_') || sourceCollection === 'builders') {
          await setExactDocument('builders', inquiryId, {
            status: 'rejected',
            statusMr: 'नाकारले',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        } else if (inquiryId.startsWith('agent_') || sourceCollection === 'agents') {
          await setExactDocument('agents', inquiryId, {
            status: 'rejected',
            statusMr: 'नाकारले',
            adminRemarks: rejectionReason,
            reviewedAt: now,
            reviewedBy: reviewer
          });
        }
      }
    } catch (mobileSyncErr) {
      console.warn('Could not sync rejection to mobile collection:', mobileSyncErr);
    }

    // 3. User document synchronization
    const userUpdatePayload = {
      hasPendingInquiry: false,
      roleInquiryStatus: 'rejected',
      lastInquiryRejectedAt: now,
      lastInquiryRejectionReason: rejectionReason,
      lastInquiryRole: inquiryObj?.requestedRole || 'role'
    };

    if (targetUserId) {
      updateDocument('users', targetUserId, userUpdatePayload).catch(() => {});
    }
    if (cleanMob) {
      updateDocument('users', cleanMob, userUpdatePayload).catch(() => {});
    }

    try {
      const uList = await fetchCollection('users');
      for (const u of uList) {
        const uMob = (u.mobile || u.phoneNumber || u.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const uEmail = (u.email || '').trim().toLowerCase();
        if (u.id && ((cleanMob && uMob === cleanMob) || (cleanEmail && uEmail === cleanEmail))) {
          updateDocument('users', u.id, userUpdatePayload).catch(() => {});
        }
      }
    } catch {}

    // 4. Update localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const rejectionData = JSON.stringify({
          role: inquiryObj?.requestedRole,
          reason: rejectionReason,
          reviewedAt: now
        });

        if (targetUserId) {
          localStorage.setItem(`sahyadri_role_rejected_${targetUserId}`, rejectionData);
          const cacheKey = `sahyadri_role_inquiry_${targetUserId}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.status = 'rejected';
            parsed.rejectionReason = rejectionReason;
            parsed.reviewedAt = now;
            localStorage.setItem(cacheKey, JSON.stringify(parsed));
          }
        }

        if (cleanMob) {
          localStorage.setItem(`sahyadri_role_rejected_${cleanMob}`, rejectionData);
        }

        const rawLocalInqs = localStorage.getItem('sahyadri_local_role_inquiries');
        if (rawLocalInqs) {
          const parsed = JSON.parse(rawLocalInqs);
          const updated = parsed.map((item: any) =>
            isRecordMatch(item)
              ? { ...item, status: 'rejected', rejectionReason, reviewedAt: now, reviewedBy: reviewer }
              : item
          );
          localStorage.setItem('sahyadri_local_role_inquiries', JSON.stringify(updated));
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(
          new CustomEvent('role_inquiry_updated', {
            detail: { userId: targetUserId, mobile: cleanMob, status: 'rejected', reason: rejectionReason }
          })
        );
      } catch {}
    }

    // 5. Generate in-app user notification
    try {
      await createNotification({
        type: 'inquiry',
        title: `Role Request Declined`,
        titleMr: `भूमिका अर्ज नाकारण्यात आला आहे`,
        message: `Your request for ${inquiryObj?.requestedRole?.toUpperCase() || 'role'} was not approved by Admin. Reason: ${rejectionReason}`,
        messageMr: `आपला ${inquiryObj?.requestedRole?.toUpperCase() || ''} पदाचा अर्ज नाकारला आहे. कारण: ${rejectionReason}`,
        link: '/role-inquiry',
        metadata: {
          userId: targetUserId,
          userMobile: inquiryObj?.userMobile,
          status: 'rejected',
          reason: rejectionReason,
          reviewedAt: now
        }
      });
    } catch (notifErr) {
      console.warn('Could not generate rejection notification:', notifErr);
    }

    return true;
  } catch (err) {
    console.error('rejectRoleInquiry failed:', err);
    return false;
  }
};
