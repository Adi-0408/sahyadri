import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Home,
  Package,
  Briefcase,
  ShoppingCart,
  Search,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
  RefreshCw,
  FolderGit2,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  subscribeToCollection
} from '../../../services/firebase';
import { cleanAndDeduplicateUsers } from '../../../services/roleInquiry';

interface WorkItem {
  id: string;
  type: 'project' | 'property' | 'supply' | 'client' | 'purchase' | 'enquiry';
  title: string;
  category?: string;
  subType?: string;
  price?: number | string;
  unit?: string;
  location?: string;
  status?: string;
  date?: string;
  image?: string;
  link?: string;
  raw: any;
}

interface RoleUserWithWork {
  id: string;
  uid: string;
  name: string;
  mobile: string;
  cleanMobile: string;
  email: string;
  role: string;
  userCode?: string;
  companyName?: string;
  district?: string;
  taluka?: string;
  city?: string;
  address?: string;
  createdAt?: string;
  status: string;
  // Aggregated work lists
  properties: WorkItem[];
  projects: WorkItem[];
  supplies: WorkItem[];
  clients: WorkItem[];
  purchases: WorkItem[];
  enquiries: WorkItem[];
  totalWorkCount: number;
}

const ROLE_BADGES: Record<string, { label: string; labelMr: string; color: string; bg: string; border: string; icon: any }> = {
  builder: {
    label: 'Builder / Developer',
    labelMr: 'बिल्डर / डेव्हलपर',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: Building2
  },
  seller: {
    label: 'Property Seller',
    labelMr: 'मालमत्ता विक्रेता',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Home
  },
  supplier: {
    label: 'Material Supplier',
    labelMr: 'साहित्य पुरवठादार',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: Package
  },
  agent: {
    label: 'Real Estate Agent',
    labelMr: 'एजंट पार्टनर',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Briefcase
  },
  buyer: {
    label: 'Property Buyer',
    labelMr: 'खरेदीदार',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: ShoppingCart
  },
  representative: {
    label: 'Representative',
    labelMr: 'प्रतिनिधी',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: ShieldCheck
  },
  user: {
    label: 'Standard User',
    labelMr: 'सामान्य वापरकर्ता',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    icon: Users
  }
};

export const RoleActivityManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  // Raw collections
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [agentClients, setAgentClients] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [supplierProfiles, setSupplierProfiles] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [workFilter, setWorkFilter] = useState<'all' | 'with_work' | 'no_work'>('all');
  const [sortBy, setSortBy] = useState<'most_work' | 'newest' | 'name'>('most_work');

  // Expanded user cards state
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  // Detail Modal State
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);

  // Helper date parser
  const parseDate = (item: any): Date | null => {
    if (!item) return null;
    const raw = item.createdAt || item.date || item.timestamp || item.appliedAt || item.updatedAt;
    if (raw) {
      if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
      if (typeof raw === 'object' && typeof raw.seconds === 'number') {
        return new Date(raw.seconds * 1000);
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    if (item.id && typeof item.id === 'string') {
      const match = item.id.match(/(\d{10,13})$/);
      if (match) {
        const ts = parseInt(match[1], 10);
        const d = new Date(ts > 1e11 ? ts : ts * 1000);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return null;
  };

  const cleanPhone = (val: any): string => {
    if (!val) return '';
    return String(val).replace(/[^0-9]/g, '').slice(-10);
  };

  const cleanText = (val: any): string => {
    if (!val) return '';
    return String(val).trim().toLowerCase();
  };

  // Live real-time subscriptions
  useEffect(() => {
    setLoading(true);

    const unsubUsers = subscribeToCollection('users', async (userList) => {
      try {
        const { cleanedUsers } = await cleanAndDeduplicateUsers(userList || []);
        setUsers(cleanedUsers.length > 0 ? cleanedUsers : (userList || []));
      } catch {
        setUsers(userList || []);
      }
    });

    const unsubProps = subscribeToCollection('properties', (list) => {
      setProperties(list || []);
    });

    const unsubProjects = subscribeToCollection('projects', (list) => {
      setProjects(list || []);
    });

    const unsubSupplies = subscribeToCollection('supplier_products', (list) => {
      setSupplies(list || []);
    });

    const unsubSuppliers = subscribeToCollection('suppliers', (list) => {
      setSupplierProfiles(list || []);
    });

    const unsubClients = subscribeToCollection('agent_clients', (list) => {
      setAgentClients(list || []);
    });

    const unsubPurchases = subscribeToCollection('purchases', (list) => {
      setPurchases(list || []);
    });

    const unsubEnquiries = subscribeToCollection('enquiries', (list) => {
      setEnquiries(list || []);
      setLoading(false);
    });

    return () => {
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubProps === 'function') unsubProps();
      if (typeof unsubProjects === 'function') unsubProjects();
      if (typeof unsubSupplies === 'function') unsubSupplies();
      if (typeof unsubSuppliers === 'function') unsubSuppliers();
      if (typeof unsubClients === 'function') unsubClients();
      if (typeof unsubPurchases === 'function') unsubPurchases();
      if (typeof unsubEnquiries === 'function') unsubEnquiries();
    };
  }, []);

  // Aggregate users and link with their respective work
  const aggregatedUsers = useMemo<RoleUserWithWork[]>(() => {
    const userMap = new Map<string, RoleUserWithWork>();

    // 1. Add all base users from users collection
    users.forEach((u) => {
      if (!u) return;
      const uid = String(u.id || u.uid || '').trim();
      const mob = cleanPhone(u.mobile || u.phone || u.phoneNumber);
      const email = cleanText(u.email);
      const key = uid || mob || email;
      if (!key) return;

      const role = String(u.role || 'user').toLowerCase().trim();

      userMap.set(key, {
        id: uid || `user-${Date.now()}`,
        uid: uid,
        name: u.name || u.displayName || u.fullName || (isMr ? 'वापरकर्ता' : 'User'),
        mobile: u.mobile || u.phone || mob,
        cleanMobile: mob,
        email: u.email || '',
        role: role,
        userCode: u.userCode || u.code || undefined,
        companyName: u.companyName || u.firmName || u.businessName || '',
        district: u.district || '',
        taluka: u.taluka || '',
        city: u.city || u.village || '',
        address: u.address || u.officeAddress || '',
        createdAt: u.createdAt || '',
        status: u.status || 'active',
        properties: [],
        projects: [],
        supplies: [],
        clients: [],
        purchases: [],
        enquiries: [],
        totalWorkCount: 0
      });
    });

    // 2. Discover / hydrate suppliers from 'suppliers' collection
    supplierProfiles.forEach((sup) => {
      const sId = String(sup.userId || sup.uid || sup.id || '').trim();
      const sMob = cleanPhone(sup.mobile || sup.phone);
      const sEmail = cleanText(sup.email);
      const sName = sup.businessName || sup.firmName || sup.name || '';

      let matchedKey = '';
      for (const [k, u] of userMap.entries()) {
        if (
          (sId && (u.uid === sId || u.id === sId)) ||
          (sMob && u.cleanMobile === sMob) ||
          (sEmail && cleanText(u.email) === sEmail)
        ) {
          matchedKey = k;
          break;
        }
      }

      if (matchedKey) {
        const u = userMap.get(matchedKey)!;
        u.role = 'supplier';
        if (!u.companyName && sName) u.companyName = sName;
        if (!u.district && sup.operatingDistrict) u.district = sup.operatingDistrict;
        if (!u.taluka && sup.operatingTaluka) u.taluka = sup.operatingTaluka;
        if (!u.address && sup.officeAddress) u.address = sup.officeAddress;
      } else if (sMob || sId || sName) {
        const newKey = sId || sMob || `supplier-${sName}`;
        userMap.set(newKey, {
          id: sId || newKey,
          uid: sId || newKey,
          name: sName || (isMr ? 'साहित्य पुरवठादार' : 'Material Supplier'),
          mobile: sup.mobile || sMob,
          cleanMobile: sMob,
          email: sup.email || '',
          role: 'supplier',
          companyName: sName,
          district: sup.operatingDistrict || sup.district || '',
          taluka: sup.operatingTaluka || sup.taluka || '',
          city: sup.city || '',
          address: sup.officeAddress || sup.address || '',
          createdAt: sup.createdAt || '',
          status: sup.status || 'active',
          properties: [],
          projects: [],
          supplies: [],
          clients: [],
          purchases: [],
          enquiries: [],
          totalWorkCount: 0
        });
      }
    });

    // 3. Discover builder accounts who have posted projects
    projects.forEach((proj) => {
      const bId = String(proj.builderId || proj.userId || '').trim();
      const bMob = cleanPhone(proj.mobile || proj.phone || proj.contactPhone);
      const bEmail = cleanText(proj.email || proj.builderEmail);
      const bName = proj.builderName || proj.developer || proj.companyName || '';

      // Find existing user or create discovered builder user
      let matchedKey = '';
      for (const [k, u] of userMap.entries()) {
        if (u.role === 'supplier') continue; // suppliers don't build projects
        if (
          (bId && (u.uid === bId || u.id === bId)) ||
          (bMob && u.cleanMobile === bMob) ||
          (bEmail && cleanText(u.email) === bEmail)
        ) {
          matchedKey = k;
          break;
        }
      }

      if (matchedKey) {
        const u = userMap.get(matchedKey)!;
        if (u.role === 'user') u.role = 'builder';
        if (!u.companyName && bName) u.companyName = bName;
      } else if (bMob || bId || bName) {
        const newKey = bId || bMob || `builder-${bName}`;
        userMap.set(newKey, {
          id: bId || newKey,
          uid: bId || newKey,
          name: bName || (isMr ? 'बिल्डर' : 'Builder'),
          mobile: proj.mobile || bMob,
          cleanMobile: bMob,
          email: proj.email || '',
          role: 'builder',
          companyName: bName,
          district: proj.district || '',
          taluka: proj.taluka || '',
          city: proj.city || '',
          address: proj.address || '',
          createdAt: proj.createdAt || '',
          status: 'active',
          properties: [],
          projects: [],
          supplies: [],
          clients: [],
          purchases: [],
          enquiries: [],
          totalWorkCount: 0
        });
      }
    });

    // 4. Discover suppliers from supplier_products
    supplies.forEach((prod) => {
      const sId = String(prod.supplierId || prod.userId || '').trim();
      const sMob = cleanPhone(prod.supplierMobile || prod.mobile || prod.phone);
      const sEmail = cleanText(prod.email || prod.supplierEmail);
      const sName = prod.supplierName || prod.businessName || '';

      let matchedKey = '';
      for (const [k, u] of userMap.entries()) {
        if (
          (sId && (u.uid === sId || u.id === sId)) ||
          (sMob && u.cleanMobile === sMob) ||
          (sEmail && cleanText(u.email) === sEmail)
        ) {
          matchedKey = k;
          break;
        }
      }

      if (matchedKey) {
        const u = userMap.get(matchedKey)!;
        u.role = 'supplier';
        if (!u.companyName && sName) u.companyName = sName;
      } else if (sMob || sId || sName) {
        const newKey = sId || sMob || `supplier-${sName}`;
        userMap.set(newKey, {
          id: sId || newKey,
          uid: sId || newKey,
          name: sName || (isMr ? 'साहित्य पुरवठादार' : 'Material Supplier'),
          mobile: prod.supplierMobile || sMob,
          cleanMobile: sMob,
          email: prod.email || '',
          role: 'supplier',
          companyName: sName,
          district: prod.district || '',
          taluka: prod.taluka || '',
          city: prod.city || '',
          address: prod.address || '',
          createdAt: prod.createdAt || '',
          status: 'active',
          properties: [],
          projects: [],
          supplies: [],
          clients: [],
          purchases: [],
          enquiries: [],
          totalWorkCount: 0
        });
      }
    });

    // 5. Link projects to Builders
    projects.forEach((proj) => {
      const bId = String(proj.builderId || proj.userId || '').trim();
      const bMob = cleanPhone(proj.mobile || proj.phone || proj.contactPhone);
      const bEmail = cleanText(proj.email || proj.builderEmail);
      const bName = cleanText(proj.builderName || proj.developer || proj.companyName);

      const workItem: WorkItem = {
        id: proj.id || `proj-${Math.random()}`,
        type: 'project',
        title: proj.title || proj.name || 'Untitled Project',
        category: proj.projectType || proj.category || 'Residential Scheme',
        subType: proj.flatType || proj.configuration || '',
        price: proj.startingPrice || proj.price || 0,
        location: [proj.city, proj.taluka, proj.district].filter(Boolean).join(', ') || proj.address || '',
        status: proj.status || 'upcoming',
        date: proj.createdAt || '',
        image: proj.imageLink || (Array.isArray(proj.images) ? proj.images[0] : ''),
        link: `/project/${proj.id}`,
        raw: proj
      };

      for (const u of userMap.values()) {
        if (u.role === 'supplier' || u.role === 'buyer') continue;
        if (
          (bId && (u.uid === bId || u.id === bId)) ||
          (bMob && u.cleanMobile === bMob) ||
          (bEmail && cleanText(u.email) === bEmail) ||
          (bName && cleanText(u.name) === bName) ||
          (bName && cleanText(u.companyName) === bName)
        ) {
          u.projects.push(workItem);
          break;
        }
      }
    });

    // 6. Link properties to Sellers, Builders & Agents (SUPPLIERS EXCLUDED)
    properties.forEach((prop) => {
      const pUid = String(prop.userId || prop.ownerId || prop.builderId || prop.agentId || '').trim();
      const pMob = cleanPhone(prop.mobileNumber || prop.ownerPhone || prop.phone || prop.cleanMobile);
      const pEmail = cleanText(prop.email || prop.ownerEmail);
      const pOwner = cleanText(prop.ownerName);

      const workItem: WorkItem = {
        id: prop.id || `prop-${Math.random()}`,
        type: 'property',
        title: prop.title || prop.propertyName || 'Property Listing',
        category: prop.category || prop.propertyType || 'House',
        subType: prop.type === 'rent' ? 'For Rent' : 'For Sale',
        price: prop.expectedPrice || prop.price || prop.monthlyRent || 0,
        location: [prop.cityVillage || prop.location, prop.taluka, prop.district].filter(Boolean).join(', ') || prop.fullAddress || '',
        status: prop.status || 'pending',
        date: prop.createdAt || '',
        image: Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : (prop.imageUrl || ''),
        link: `/property/${prop.id}`,
        raw: prop
      };

      let matched = false;
      for (const u of userMap.values()) {
        // A supplier ONLY lists supplies/materials (cement, steel, etc.), NEVER properties/houses!
        // A buyer only makes purchases/enquiries, never lists properties!
        if (u.role === 'supplier' || u.role === 'buyer') {
          continue;
        }

        if (
          (pUid && (u.uid === pUid || u.id === pUid)) ||
          (pMob && u.cleanMobile === pMob) ||
          (pEmail && cleanText(u.email) === pEmail) ||
          (pOwner && cleanText(u.name) === pOwner && pOwner.length >= 3)
        ) {
          if (u.role === 'builder') {
            u.projects.push(workItem);
          } else {
            u.properties.push(workItem);
          }
          matched = true;
          break;
        }
      }

      // If owner is not found in users, create a seller user on the fly so admin can see who posted it!
      if (!matched && (pMob || pOwner)) {
        const fallbackKey = `seller-${pUid || pMob || pOwner}`;
        const newSeller: RoleUserWithWork = {
          id: pUid || fallbackKey,
          uid: pUid || fallbackKey,
          name: prop.ownerName || (isMr ? 'मालमत्ता मालक' : 'Property Owner'),
          mobile: prop.ownerPhone || prop.mobileNumber || pMob,
          cleanMobile: pMob,
          email: prop.email || '',
          role: 'seller',
          district: prop.district || '',
          taluka: prop.taluka || '',
          city: prop.cityVillage || '',
          address: prop.fullAddress || '',
          createdAt: prop.createdAt || '',
          status: 'active',
          properties: [workItem],
          projects: [],
          supplies: [],
          clients: [],
          purchases: [],
          enquiries: [],
          totalWorkCount: 1
        };
        userMap.set(fallbackKey, newSeller);
      }
    });

    // 7. Link supplier products (Cement, Steel, Bricks, Sand, etc.)
    supplies.forEach((prod) => {
      const sId = String(prod.supplierId || prod.userId || '').trim();
      const sMob = cleanPhone(prod.supplierMobile || prod.mobile || prod.phone);
      const sEmail = cleanText(prod.email || prod.supplierEmail);
      const sName = cleanText(prod.supplierName || prod.businessName);

      const workItem: WorkItem = {
        id: prod.id || `supply-${Math.random()}`,
        type: 'supply',
        title: prod.name || prod.productName || 'Construction Supply',
        category: prod.category || 'Building Material',
        subType: prod.unit ? `Unit: ${prod.unit}` : '',
        price: prod.price || 0,
        unit: prod.unit || '',
        location: [prod.district, prod.taluka, prod.city].filter(Boolean).join(', ') || prod.address || '',
        status: prod.inStock === false ? 'Out of Stock' : 'In Stock',
        date: prod.createdAt || '',
        image: prod.imageUrl || '',
        link: '/materials',
        raw: prod
      };

      let matched = false;
      for (const u of userMap.values()) {
        if (
          (sId && (u.uid === sId || u.id === sId)) ||
          (sMob && u.cleanMobile === sMob) ||
          (sEmail && cleanText(u.email) === sEmail) ||
          (sName && (cleanText(u.name) === sName || cleanText(u.companyName) === sName))
        ) {
          u.supplies.push(workItem);
          matched = true;
          break;
        }
      }

      if (!matched && (sMob || sName || sId)) {
        const fallbackKey = `supplier-${sId || sMob || sName}`;
        userMap.set(fallbackKey, {
          id: sId || fallbackKey,
          uid: sId || fallbackKey,
          name: prod.supplierName || sName || (isMr ? 'साहित्य पुरवठादार' : 'Material Supplier'),
          mobile: prod.supplierMobile || sMob,
          cleanMobile: sMob,
          email: prod.email || '',
          role: 'supplier',
          companyName: sName,
          district: prod.district || '',
          taluka: prod.taluka || '',
          city: prod.city || '',
          address: prod.address || '',
          createdAt: prod.createdAt || '',
          status: 'active',
          properties: [],
          projects: [],
          supplies: [workItem],
          clients: [],
          purchases: [],
          enquiries: [],
          totalWorkCount: 1
        });
      }
    });

    // 7. Link agent clients
    agentClients.forEach((client) => {
      const aId = String(client.agentId || client.userId || '').trim();
      const aMob = cleanPhone(client.agentMobile || client.phone);

      const workItem: WorkItem = {
        id: client.id || `client-${Math.random()}`,
        type: 'client',
        title: client.clientName || client.name || 'Client Lead',
        category: 'Client Portfolio',
        subType: client.propertyCategory || client.requirement || '',
        price: client.budget || 0,
        location: [client.city, client.district].filter(Boolean).join(', ') || '',
        status: client.status || 'active',
        date: client.createdAt || '',
        raw: client
      };

      for (const u of userMap.values()) {
        if (
          (aId && (u.uid === aId || u.id === aId)) ||
          (aMob && u.cleanMobile === aMob)
        ) {
          u.clients.push(workItem);
          break;
        }
      }
    });

    // 8. Link purchases & inquiries to Buyers
    purchases.forEach((pur) => {
      const bId = String(pur.buyerId || pur.userId || '').trim();
      const bMob = cleanPhone(pur.userMobile || pur.mobile || pur.phone);

      const workItem: WorkItem = {
        id: pur.id || `pur-${Math.random()}`,
        type: 'purchase',
        title: pur.propertyTitle || pur.propertyName || 'Purchased Property',
        category: pur.propertyCategory || 'Property Purchase',
        price: pur.price || pur.amount || 0,
        location: pur.location || '',
        status: pur.status || 'Purchased',
        date: pur.createdAt || pur.purchasedAt || '',
        link: pur.propertyId ? `/property/${pur.propertyId}` : undefined,
        raw: pur
      };

      for (const u of userMap.values()) {
        if (
          (bId && (u.uid === bId || u.id === bId)) ||
          (bMob && u.cleanMobile === bMob)
        ) {
          u.purchases.push(workItem);
          break;
        }
      }
    });

    enquiries.forEach((enq) => {
      const bId = String(enq.userId || '').trim();
      const bMob = cleanPhone(enq.phone || enq.userMobile || enq.mobile);

      const workItem: WorkItem = {
        id: enq.id || `enq-${Math.random()}`,
        type: 'enquiry',
        title: enq.propertyName || enq.propertyTitle || enq.subject || 'Property Inquiry',
        category: 'Customer Inquiry',
        price: enq.budget || 0,
        location: enq.city || enq.location || '',
        status: enq.status || 'Pending',
        date: enq.createdAt || '',
        link: enq.propertyId ? `/property/${enq.propertyId}` : undefined,
        raw: enq
      };

      for (const u of userMap.values()) {
        if (
          (bId && (u.uid === bId || u.id === bId)) ||
          (bMob && u.cleanMobile === bMob)
        ) {
          u.enquiries.push(workItem);
          break;
        }
      }
    });

    // Compute total work items per user and strictly isolate role boundaries
    const result: RoleUserWithWork[] = [];
    userMap.forEach((u) => {
      // STRICT ROLE BOUNDARIES:
      // A supplier can ONLY list building supplies/materials (cement, steel, sand, bricks, etc.)
      if (u.role === 'supplier') {
        u.properties = [];
        u.projects = [];
        u.clients = [];
        u.purchases = [];
        u.enquiries = [];
        u.totalWorkCount = u.supplies.length;
      } else if (u.role === 'seller') {
        u.projects = [];
        u.supplies = [];
        u.clients = [];
        u.totalWorkCount = u.properties.length;
      } else if (u.role === 'builder') {
        u.supplies = [];
        u.clients = [];
        u.purchases = [];
        u.totalWorkCount = u.projects.length + u.properties.length;
      } else if (u.role === 'agent') {
        u.supplies = [];
        u.purchases = [];
        u.totalWorkCount = u.clients.length + u.properties.length;
      } else if (u.role === 'buyer') {
        u.properties = [];
        u.projects = [];
        u.supplies = [];
        u.clients = [];
        u.totalWorkCount = u.purchases.length + u.enquiries.length;
      } else {
        u.totalWorkCount =
          u.properties.length +
          u.projects.length +
          u.supplies.length +
          u.clients.length +
          u.purchases.length +
          u.enquiries.length;
      }
      result.push(u);
    });

    return result;
  }, [users, properties, projects, supplies, supplierProfiles, agentClients, purchases, enquiries, isMr]);

  // High-level statistics
  const stats = useMemo(() => {
    let builderCount = 0;
    let sellerCount = 0;
    let supplierCount = 0;
    let agentCount = 0;
    let buyerCount = 0;
    let totalProjects = 0;
    let totalListings = 0;
    let totalSupplies = 0;

    aggregatedUsers.forEach((u) => {
      if (u.role === 'builder') builderCount++;
      else if (u.role === 'seller') sellerCount++;
      else if (u.role === 'supplier') supplierCount++;
      else if (u.role === 'agent') agentCount++;
      else if (u.role === 'buyer') buyerCount++;

      totalProjects += u.projects.length;
      totalListings += u.properties.length;
      totalSupplies += u.supplies.length;
    });

    return {
      builderCount,
      sellerCount,
      supplierCount,
      agentCount,
      buyerCount,
      totalUsers: aggregatedUsers.length,
      totalProjects,
      totalListings,
      totalSupplies
    };
  }, [aggregatedUsers]);

  // Filtered & Sorted list
  const filteredUsers = useMemo(() => {
    return aggregatedUsers
      .filter((u) => {
        // Role filter
        if (selectedRoleFilter !== 'all' && u.role !== selectedRoleFilter) {
          return false;
        }

        // Work activity filter
        if (workFilter === 'with_work' && u.totalWorkCount === 0) return false;
        if (workFilter === 'no_work' && u.totalWorkCount > 0) return false;

        // Search filter
        if (searchTerm.trim()) {
          const q = cleanText(searchTerm);
          const nameMatch = cleanText(u.name).includes(q);
          const mobMatch = u.cleanMobile.includes(q);
          const emailMatch = cleanText(u.email).includes(q);
          const compMatch = cleanText(u.companyName).includes(q);
          const codeMatch = cleanText(u.userCode).includes(q);
          const workItemMatch = [
            ...u.projects,
            ...u.properties,
            ...u.supplies,
            ...u.clients,
            ...u.purchases
          ].some((item) => cleanText(item.title).includes(q) || cleanText(item.location).includes(q));

          return nameMatch || mobMatch || emailMatch || compMatch || codeMatch || workItemMatch;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'most_work') {
          return b.totalWorkCount - a.totalWorkCount;
        }
        if (sortBy === 'newest') {
          const tA = parseDate(a)?.getTime() || 0;
          const tB = parseDate(b)?.getTime() || 0;
          return tB - tA;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [aggregatedUsers, selectedRoleFilter, workFilter, searchTerm, sortBy]);

  const toggleUserExpand = (key: string) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredUsers.forEach((u) => {
      next[u.id] = true;
    });
    setExpandedUsers(next);
  };

  const collapseAll = () => {
    setExpandedUsers({});
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* ── HEADER & BREADCRUMB ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>{isMr ? 'वापरकर्ते आणि काम व्यवस्थापन' : 'User Workspaces & Activity'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            {isMr ? 'भूमिका वापरकर्ते आणि त्यांचे काम' : 'Role Users & Work Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {isMr
              ? 'बिल्डरचे प्रकल्प, विक्रेत्यांची मालमत्ता, पुरवठादारांचे साहित्य आणि खरेदीदारांचे व्यवहार एकाच ठिकाणी पहा व नियंत्रित करा.'
              : 'Directly monitor and manage projects posted by Builders, listings posted by Sellers, materials posted by Suppliers, and activities of all role users.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={expandAll}
            className="text-xs py-2 px-3.5 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
          >
            {isMr ? 'सर्व उघडा' : 'Expand All'}
          </Button>
          <Button
            variant="outline"
            onClick={collapseAll}
            className="text-xs py-2 px-3.5 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
          >
            {isMr ? 'सर्व बंद करा' : 'Collapse All'}
          </Button>
        </div>
      </div>

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Builders */}
        <UICard
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'builder' ? 'all' : 'builder')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none hover:shadow-md ${
            selectedRoleFilter === 'builder'
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Building2 className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
              {stats.builderCount} {isMr ? 'बिल्डर्स' : 'Builders'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalProjects}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {isMr ? 'प्रकल्प पोस्ट केले' : 'Projects Posted'}
            </div>
          </div>
        </UICard>

        {/* Sellers */}
        <UICard
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'seller' ? 'all' : 'seller')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none hover:shadow-md ${
            selectedRoleFilter === 'seller'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Home className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
              {stats.sellerCount} {isMr ? 'विक्रेते' : 'Sellers'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalListings}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {isMr ? 'मालमत्ता यादी' : 'Properties Listed'}
            </div>
          </div>
        </UICard>

        {/* Suppliers */}
        <UICard
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'supplier' ? 'all' : 'supplier')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none hover:shadow-md ${
            selectedRoleFilter === 'supplier'
              ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-teal-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Package className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
              {stats.supplierCount} {isMr ? 'पुरवठादार' : 'Suppliers'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalSupplies}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {isMr ? 'साहित्य कॅटलॉग' : 'Supplies in Catalog'}
            </div>
          </div>
        </UICard>

        {/* Agents */}
        <UICard
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'agent' ? 'all' : 'agent')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none hover:shadow-md ${
            selectedRoleFilter === 'agent'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Briefcase className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
              {stats.agentCount} {isMr ? 'एजंट्स' : 'Agents'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {aggregatedUsers.filter((u) => u.role === 'agent').reduce((sum, u) => sum + u.properties.length + u.clients.length, 0)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {isMr ? 'मालमत्ता / क्लायंट्स' : 'Managed Listings'}
            </div>
          </div>
        </UICard>

        {/* Buyers */}
        <UICard
          onClick={() => setSelectedRoleFilter(selectedRoleFilter === 'buyer' ? 'all' : 'buyer')}
          className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border transition-all cursor-pointer select-none hover:shadow-md ${
            selectedRoleFilter === 'buyer'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              {stats.buyerCount} {isMr ? 'खरेदीदार' : 'Buyers'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {aggregatedUsers.filter((u) => u.role === 'buyer').reduce((sum, u) => sum + u.purchases.length + u.enquiries.length, 0)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {isMr ? 'व्यवहार आणि चौकशी' : 'Purchases & Leads'}
            </div>
          </div>
        </UICard>
      </div>

      {/* ── CONTROLS & FILTER BAR ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              selectedRoleFilter === 'all'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isMr ? 'सर्व भूमिका' : 'All Roles'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {aggregatedUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('builder')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              selectedRoleFilter === 'builder'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isMr ? 'बिल्डर्स' : 'Builders'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {stats.builderCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('seller')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              selectedRoleFilter === 'seller'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100/70'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isMr ? 'विक्रेते' : 'Sellers'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {stats.sellerCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('supplier')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              selectedRoleFilter === 'supplier'
                ? 'bg-teal-600 text-white font-bold shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100/70'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{isMr ? 'साहित्य पुरवठादार' : 'Suppliers'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {stats.supplierCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('agent')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              selectedRoleFilter === 'agent'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100/70'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isMr ? 'एजंट्स' : 'Agents'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {stats.agentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('buyer')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              selectedRoleFilter === 'buyer'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isMr ? 'खरेदीदार' : 'Buyers'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {stats.buyerCount}
            </span>
          </button>
        </div>

        {/* Filters and Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isMr
                  ? 'नाव, मोबाईल, ईमेल, फर्म किंवा प्रोजेक्ट/मालमत्ता नावाने शोधा...'
                  : 'Search by user name, phone, email, firm, or project title...'
              }
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={workFilter}
              onChange={(e) => setWorkFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 font-medium"
            >
              <option value="all">{isMr ? 'सर्व वापरकर्ते' : 'All Users'}</option>
              <option value="with_work">{isMr ? 'काम पोस्ट केलेले (Active Work)' : 'With Work Posted Only'}</option>
              <option value="no_work">{isMr ? 'काम पोस्ट नसलेले' : 'No Work Yet'}</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700 font-medium"
            >
              <option value="most_work">{isMr ? 'सर्वात जास्त काम (Most Work)' : 'Most Work First'}</option>
              <option value="newest">{isMr ? 'नवीनतम सदस्य (Newest)' : 'Newest Joined'}</option>
              <option value="name">{isMr ? 'नावानुसार (A-Z)' : 'Name (A to Z)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── USER LISTINGS & THEIR WORK CARDS ── */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">
            {isMr ? 'वापरकर्ते आणि कामाचे तपशील लोड होत आहेत...' : 'Loading role users and workspace activity...'}
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {isMr ? 'कोणतेही वापरकर्ते आढळले नाहीत' : 'No Role Users Found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isMr
              ? 'निवडलेल्या फिल्टरनुसार कोणतेही वापरकर्ते किंवा काम सापडले नाही. कृपया वेगळा शोध घ्या.'
              : 'No users matched your current role or search filters. Try clearing your search.'}
          </p>
          {(searchTerm || selectedRoleFilter !== 'all' || workFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedRoleFilter('all');
                setWorkFilter('all');
              }}
              className="mt-4 text-xs py-2 px-4 rounded-xl font-bold"
            >
              {isMr ? 'फिल्टर रीसेट करा' : 'Reset Filters'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((u) => {
            const roleCfg = ROLE_BADGES[u.role] || ROLE_BADGES.user;
            const RoleIcon = roleCfg.icon;
            const isExpanded = Boolean(expandedUsers[u.id]);
            const totalWork = u.totalWorkCount;

            const allWorkItems: WorkItem[] = (() => {
              if (u.role === 'supplier') return u.supplies;
              if (u.role === 'seller') return u.properties;
              if (u.role === 'builder') return [...u.projects, ...u.properties];
              if (u.role === 'agent') return [...u.clients, ...u.properties];
              if (u.role === 'buyer') return [...u.purchases, ...u.enquiries];
              return [
                ...u.projects,
                ...u.properties,
                ...u.supplies,
                ...u.clients,
                ...u.purchases,
                ...u.enquiries
              ];
            })();

            return (
              <UICard
                key={u.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* User Row Header */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: User Profile & Role */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className={`p-3.5 rounded-2xl shrink-0 ${roleCfg.bg} ${roleCfg.border} border`}>
                      <RoleIcon className={`w-6 h-6 ${roleCfg.color}`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleCfg.bg} ${roleCfg.border} ${roleCfg.color}`}
                        >
                          {isMr ? roleCfg.labelMr : roleCfg.label}
                        </span>

                        {u.userCode && (
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            #{u.userCode}
                          </span>
                        )}

                        <span
                          className={`w-2 h-2 rounded-full ${
                            u.status === 'active' || u.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-400'
                          }`}
                          title={`Status: ${u.status}`}
                        />
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                          {u.name}
                        </h2>
                        {u.companyName && (
                          <span className="text-xs text-slate-500 truncate font-medium">
                            • {u.companyName}
                          </span>
                        )}
                      </div>

                      {/* Contact metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5 font-medium">
                        {u.mobile && (
                          <a
                            href={`tel:${u.mobile}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-primary transition-colors font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.mobile}</span>
                          </a>
                        )}

                        {u.email && (
                          <a
                            href={`mailto:${u.email}`}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[200px]"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </a>
                        )}

                        {(u.city || u.taluka || u.district) && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{[u.city, u.taluka, u.district].filter(Boolean).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Work Count Badges & Expand Trigger */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Work Summary Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {u.role === 'builder' && (
                        <span className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs font-bold flex items-center gap-1.5">
                          <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{u.projects.length} {isMr ? 'प्रकल्प' : 'Projects'}</span>
                        </span>
                      )}

                      {u.role === 'seller' && (
                        <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-amber-600" />
                          <span>{u.properties.length} {isMr ? 'मालमत्ता' : 'Listings'}</span>
                        </span>
                      )}

                      {u.role === 'supplier' && (
                        <span className="px-3 py-1 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-bold flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-teal-600" />
                          <span>{u.supplies.length} {isMr ? 'साहित्य' : 'Supplies'}</span>
                        </span>
                      )}

                      {u.role === 'agent' && (
                        <span className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-bold flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                          <span>{u.properties.length + u.clients.length} {isMr ? 'पोर्टफोलिओ' : 'Portfolio'}</span>
                        </span>
                      )}

                      {u.role === 'buyer' && (
                        <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{u.purchases.length + u.enquiries.length} {isMr ? 'व्यवहार / लीड' : 'Inquiries'}</span>
                        </span>
                      )}

                      {/* Fallback count if generic user or multiple categories */}
                      {u.role === 'user' && (
                        <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                          {totalWork} {isMr ? 'नोंदी' : 'Items'}
                        </span>
                      )}
                    </div>

                    {/* Quick WhatsApp Link */}
                    {u.mobile && (
                      <a
                        href={`https://wa.me/91${u.cleanMobile}?text=${encodeURIComponent(
                          `Hello ${u.name}, contacting you from Sahyadri Lands administration regarding your ${roleCfg.label} account.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200/70"
                        title={isMr ? 'व्हॉट्सॲप मेसेज करा' : 'Chat on WhatsApp'}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {/* Toggle Button */}
                    <Button
                      variant={isExpanded ? 'primary' : 'outline'}
                      onClick={() => toggleUserExpand(u.id)}
                      className={`text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                        isExpanded
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span>{isExpanded ? (isMr ? 'लपवा' : 'Hide Work') : (isMr ? 'काम पहा' : 'View Work')}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                        {totalWork}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* ── EXPANDABLE WORK SHOWCASE CONTAINER ── */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 space-y-4">
                    {allWorkItems.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs sm:text-sm font-bold text-slate-700">
                          {isMr ? 'या वापरकर्त्याने अद्याप कोणतेही काम पोस्ट केलेले नाही.' : 'No listings or work posted yet by this user.'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {u.role === 'supplier'
                            ? (isMr
                                ? 'हा पुरवठादार सिमेंट, स्टील, वाळू इत्यादी साहित्याची यादी जोडेल तेव्हा ते येथे दिसेल.'
                                : 'When this supplier adds items like cement, steel, sand, or construction materials, they will appear here.')
                            : isMr
                            ? 'जेव्हा हा वापरकर्ता प्रकल्प किंवा मालमत्ता जोडेल, तेव्हा ते येथे दिसेल.'
                            : 'When this user publishes a project, property, or client lead, it will appear here instantly.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>
                            {isMr ? 'पोस्ट केलेले काम आणि सूची' : 'Work Showcase & Activity'} ({allWorkItems.length})
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {isMr ? 'तपशील पाहण्यासाठी कोणत्याही आयटमवर क्लिक करा' : 'Click any item to inspect details'}
                          </span>
                        </div>

                        {/* Grid of Work Items */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {allWorkItems.map((item) => {
                            const isProject = item.type === 'project';
                            const isProperty = item.type === 'property';
                            const isSupply = item.type === 'supply';

                            return (
                              <div
                                key={item.id}
                                onClick={() => setSelectedWorkItem(item)}
                                className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                              >
                                <div>
                                  {/* Work item top tags */}
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                        isProject
                                          ? 'bg-indigo-100 text-indigo-700'
                                          : isProperty
                                          ? 'bg-amber-100 text-amber-800'
                                          : isSupply
                                          ? 'bg-teal-100 text-teal-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {isProject
                                        ? (isMr ? 'प्रकल्प' : 'Project')
                                        : isProperty
                                        ? (isMr ? 'मालमत्ता' : 'Property')
                                        : isSupply
                                        ? (isMr ? 'बांधकाम साहित्य' : 'Building Material')
                                        : item.type}
                                    </span>

                                    {item.status && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                          ['approved', 'active', 'instock', 'purchased'].includes(item.status.toLowerCase())
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}
                                      >
                                        {item.status}
                                      </span>
                                    )}
                                  </div>

                                  {/* Title & Preview Image */}
                                  <div className="flex items-start gap-3">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                                        {isProject ? (
                                          <Building2 className="w-5 h-5 text-indigo-400" />
                                        ) : isSupply ? (
                                          <Package className="w-5 h-5 text-teal-400" />
                                        ) : (
                                          <Home className="w-5 h-5 text-amber-400" />
                                        )}
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                                        {item.title}
                                      </h4>
                                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                        {item.category} {item.subType ? `• ${item.subType}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom Metadata: Location & Price */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                  {item.location ? (
                                    <span className="text-[11px] text-slate-500 truncate max-w-[140px] flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{item.location}</span>
                                    </span>
                                  ) : (
                                    <span />
                                  )}

                                  {item.price ? (
                                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                      ₹{Number(item.price).toLocaleString('en-IN')}
                                      {item.unit && <span className="text-[10px] text-slate-500 font-normal"> / {item.unit}</span>}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium">Price On Request</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </UICard>
            );
          })}
        </div>
      )}

      {/* ── WORK ITEM DETAIL INSPECTION MODAL ── */}
      {selectedWorkItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedWorkItem(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {selectedWorkItem.type === 'supply'
                    ? (isMr ? 'बांधकाम साहित्य' : 'Building Material')
                    : selectedWorkItem.type === 'project'
                    ? (isMr ? 'प्रकल्प' : 'Project')
                    : selectedWorkItem.type === 'property'
                    ? (isMr ? 'मालमत्ता' : 'Property')
                    : selectedWorkItem.type.toUpperCase()}
                </span>
                {selectedWorkItem.status && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedWorkItem.status}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold font-serif text-slate-900">{selectedWorkItem.title}</h3>
            </div>

            {selectedWorkItem.image && (
              <img
                src={selectedWorkItem.image}
                alt={selectedWorkItem.title}
                className="w-full h-48 rounded-2xl object-cover border border-slate-100 shadow-xs"
              />
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">{isMr ? 'प्रवर्ग / श्रेणी' : 'Category'}</span>
                <span className="font-bold text-slate-800">{selectedWorkItem.category || 'N/A'}</span>
              </div>

              {selectedWorkItem.subType && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMr ? 'प्रकार / स्वरूप' : 'Sub-Type'}</span>
                  <span className="font-bold text-slate-800">{selectedWorkItem.subType}</span>
                </div>
              )}

              {selectedWorkItem.price !== undefined && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMr ? 'किंमत / दर' : 'Price / Rate'}</span>
                  <span className="font-black text-slate-900 text-sm">
                    ₹{Number(selectedWorkItem.price).toLocaleString('en-IN')}
                    {selectedWorkItem.unit && ` / ${selectedWorkItem.unit}`}
                  </span>
                </div>
              )}

              {selectedWorkItem.location && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">{isMr ? 'स्थान / पत्ता' : 'Location'}</span>
                  <span className="font-bold text-slate-800 text-right">{selectedWorkItem.location}</span>
                </div>
              )}

              {selectedWorkItem.date && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">{isMr ? 'दिनांक' : 'Created Date'}</span>
                  <span className="text-slate-600 font-mono">
                    {new Date(selectedWorkItem.date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {selectedWorkItem.raw?.description && (
              <div className="text-xs text-slate-600 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                <span className="font-bold text-slate-800 block mb-1">{isMr ? 'वर्णन' : 'Description'}:</span>
                {selectedWorkItem.raw.description}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedWorkItem(null)}
                className="text-xs py-2 px-4 rounded-xl font-bold"
              >
                {isMr ? 'बंद करा' : 'Close'}
              </Button>

              {selectedWorkItem.link && (
                <Link to={selectedWorkItem.link} target="_blank">
                  <Button
                    variant="primary"
                    className="text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <span>{isMr ? 'पोर्टलवर पहा' : 'View on Portal'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleActivityManager;
