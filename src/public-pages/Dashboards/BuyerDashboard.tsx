import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  Search,
  MessageSquare,
  Sparkles,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Tag
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { subscribeToCollection, getCachedCollection } from '../../services/firebase';
import { subscribeToUserRoleInquiry } from '../../services/roleInquiry';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const BuyerDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [allProperties, setAllProperties] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedCollection('properties');
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
    return [];
  });
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [myInquiries, setMyInquiries] = useState<any[]>([]);
  const [purchasesList, setPurchasesList] = useState<any[]>([]);
  const [localBoughtList, setLocalBoughtList] = useState<any[]>([]);
  const [localInterestsList, setLocalInterestsList] = useState<any[]>([]);
  const [buyerPrefs, setBuyerPrefs] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'bought' | 'interested' | 'matches' | 'saved' | 'inquiries'>('bought');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/buyer/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Load local bought & interests from localStorage
  const refreshLocalData = () => {
    if (!user) return;
    try {
      const boughtKey = `sahyadri_bought_properties_${user.uid}`;
      const rawBought = localStorage.getItem(boughtKey);
      if (rawBought) {
        setLocalBoughtList(JSON.parse(rawBought));
      } else {
        setLocalBoughtList([]);
      }
    } catch (e) {
      setLocalBoughtList([]);
    }

    try {
      const interestsKey = `sahyadri_buyer_interests_${user.uid}`;
      const rawInterests = localStorage.getItem(interestsKey);
      if (rawInterests) {
        setLocalInterestsList(JSON.parse(rawInterests));
      } else {
        setLocalInterestsList([]);
      }
    } catch (e) {
      setLocalInterestsList([]);
    }
  };

  useEffect(() => {
    if (!user) return;

    refreshLocalData();

    const handleStorageUpdate = () => {
      refreshLocalData();
    };

    window.addEventListener('buyer_interests_updated', handleStorageUpdate);
    window.addEventListener('saved_properties_changed', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('buyer_interests_updated', handleStorageUpdate);
      window.removeEventListener('saved_properties_changed', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);

    // Load and subscribe live to buyer preferences and role inquiry
    const unsubInquiry = subscribeToUserRoleInquiry(
      { uid: user.uid, mobile: userCleanMobile || user.mobile, email: user.email },
      (inq) => {
        if (inq?.buyerDetails) {
          setBuyerPrefs(inq.buyerDetails);
        }
      }
    );

    // Subscribe to properties
    const unsubProps = subscribeToCollection('properties', (list) => {
      const activeList = list.filter((p: any) => p.status === 'approved' || p.status === 'active' || p.isSoldOut);
      setAllProperties(activeList);

      // Match saved properties from localStorage
      try {
        const rawSaved = localStorage.getItem('luminous_saved_properties');
        if (rawSaved) {
          const savedIds = new Set(JSON.parse(rawSaved));
          setSavedProperties(list.filter((p: any) => savedIds.has(p.id)));
        }
      } catch (e) {}
    });

    // Inquiries sent by this buyer
    const unsubEnq = subscribeToCollection('enquiries', (list) => {
      const sent = list.filter((e: any) => {
        const eMob = (e.phone || e.mobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && eMob && eMob === userCleanMobile) return true;
        if (user.mobile && e.phone === user.mobile) return true;
        if (user.email && e.email && e.email.toLowerCase() === user.email.toLowerCase()) return true;
        if (e.userId === user.uid || e.buyerId === user.uid) return true;
        return false;
      });
      setMyInquiries(sent);
    });

    // Purchases collection
    const unsubPurchases = subscribeToCollection('purchases', (list) => {
      const buyerPurchases = list.filter((item: any) => {
        const itemMob = (item.buyerPhone || item.buyerMobile || item.phone || '').replace(/[^0-9]/g, '').slice(-10);
        if (item.buyerId === user.uid || item.userId === user.uid) return true;
        if (userCleanMobile && itemMob && itemMob === userCleanMobile) return true;
        if (user.email && item.buyerEmail && item.buyerEmail.toLowerCase() === user.email.toLowerCase()) return true;
        return false;
      });
      setPurchasesList(buyerPurchases);
    });

    return () => {
      if (typeof unsubInquiry === 'function') unsubInquiry();
      if (typeof unsubProps === 'function') unsubProps();
      if (typeof unsubEnq === 'function') unsubEnq();
      if (typeof unsubPurchases === 'function') unsubPurchases();
    };
  }, [user]);

  const userCleanMobile = (
    user?.mobile ||
    (user?.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
    ''
  ).replace(/[^0-9]/g, '').slice(-10);

  // 1. Compute Bought Properties
  const boughtProperties = useMemo(() => {
    const map = new Map<string, any>();

    // From local purchases/bought cache
    localBoughtList.forEach((item) => {
      if (item && item.id) {
        map.set(item.id, { ...item, isBought: true });
      }
    });

    // From purchases collection
    purchasesList.forEach((item) => {
      const propId = item.propertyId || item.id;
      if (propId) {
        const matchedProp = allProperties.find((p) => p.id === propId) || {};
        map.set(propId, {
          ...matchedProp,
          ...item,
          id: propId,
          isBought: true,
          purchaseDate: item.createdAt || item.purchaseDate || new Date().toISOString()
        });
      }
    });

    // From allProperties matching buyer credentials
    allProperties.forEach((p) => {
      const pMob = (p.buyerPhone || p.soldToBuyerPhone || '').replace(/[^0-9]/g, '').slice(-10);
      const isBuyerMatch =
        (user?.uid && (p.buyerId === user.uid || p.soldToBuyerId === user.uid || p.buyerUserId === user.uid)) ||
        (userCleanMobile && pMob && pMob === userCleanMobile);

      if (isBuyerMatch) {
        const existing = map.get(p.id) || {};
        map.set(p.id, {
          ...existing,
          ...p,
          isBought: true,
          purchaseDate: p.soldAt || p.updatedAt || existing.purchaseDate || new Date().toISOString()
        });
      }
    });

    return Array.from(map.values());
  }, [localBoughtList, purchasesList, allProperties, user?.uid, userCleanMobile]);

  // 2. Compute Interested Properties
  const interestedProperties = useMemo(() => {
    const map = new Map<string, any>();
    const boughtIds = new Set(boughtProperties.map((p) => p.id));

    // A. From local interests list (offers sent via Buy button)
    localInterestsList.forEach((item) => {
      if (item && item.id && !boughtIds.has(item.id)) {
        const fullProp = allProperties.find((p) => p.id === item.id) || {};
        map.set(item.id, {
          ...fullProp,
          ...item,
          interestBadge: isMr ? 'खरेदी प्रस्ताव पाठवला' : 'Purchase Offer Sent',
          interestType: 'offer'
        });
      }
    });

    // B. From myInquiries (where buyer sent direct inquiry or tour)
    myInquiries.forEach((inq) => {
      const propId = inq.propertyId;
      if (propId && !boughtIds.has(propId)) {
        const fullProp = allProperties.find((p) => p.id === propId) || {};
        const existing = map.get(propId);
        map.set(propId, {
          ...fullProp,
          ...existing,
          id: propId,
          title: fullProp.title || inq.propertyName || (isMr ? 'मालमत्ता' : 'Property'),
          interestBadge: inq.isPurchaseIntent
            ? (isMr ? 'खरेदी प्रस्ताव पाठवला' : 'Purchase Offer Sent')
            : (isMr ? 'चौकशी पाठवली' : 'Inquiry Sent'),
          interestType: inq.isPurchaseIntent ? 'offer' : 'inquiry',
          inquiryMsg: inq.message || inq.note || ''
        });
      }
    });

    // C. From savedProperties (wishlist)
    savedProperties.forEach((prop) => {
      if (prop && prop.id && !boughtIds.has(prop.id) && !map.has(prop.id)) {
        map.set(prop.id, {
          ...prop,
          interestBadge: isMr ? 'आवडती मालमत्ता (Wishlist)' : 'Saved in Wishlist',
          interestType: 'wishlist'
        });
      }
    });

    return Array.from(map.values());
  }, [localInterestsList, myInquiries, savedProperties, allProperties, boughtProperties, isMr]);

  // 3. Recommended matches based on buyer preferences
  const matchedProperties = useMemo(() => {
    return allProperties.filter((p) => {
      if (p.isSoldOut) return false;
      if (!buyerPrefs) return true;
      if (buyerPrefs.propertyCategory && buyerPrefs.propertyCategory !== 'Any') {
        if ((p.category || '').toLowerCase() !== buyerPrefs.propertyCategory.toLowerCase()) {
          return false;
        }
      }
      const price = Number(p.expectedPrice || p.price || p.monthlyRent || 0);
      if (buyerPrefs.budgetMax && price > buyerPrefs.budgetMax * 1.2) {
        return false;
      }
      return true;
    });
  }, [allProperties, buyerPrefs]);

  const handleRemoveSaved = (propId: string) => {
    try {
      const rawSaved = localStorage.getItem('luminous_saved_properties');
      if (rawSaved) {
        const ids: string[] = JSON.parse(rawSaved);
        const filtered = ids.filter((id) => id !== propId);
        localStorage.setItem('luminous_saved_properties', JSON.stringify(filtered));
        window.dispatchEvent(new Event('saved_properties_changed'));
        setSavedProperties(savedProperties.filter((p) => p.id !== propId));
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 md:px-12 text-left font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── HEADER ── */}
        <div className="bg-[#0f172a] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              {isMr ? 'खरेदीदार पोर्टल (Buyer Portal) - सक्रिय' : 'Active Buyer Portal'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight">
              {isMr ? `स्वागत आहे, ${user?.displayName || 'खरेदीदार'}` : `Welcome, ${user?.displayName || 'Buyer'}`}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              {isMr
                ? 'आपल्या खरेदी केलेल्या मालमत्ता, स्वारस्य असलेल्या घरांचे प्रस्ताव आणि आवडीनुसार शिफारस केलेल्या मालमत्ता एकाच ठिकाणी पहा.'
                : 'Manage your purchased properties, track your purchase interests and offers, and discover verified property deals.'}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3">
            <Link to="/properties">
              <Button variant="primary" className="py-3 px-6 rounded-xl font-bold shadow-lg hover:scale-105 transition-all bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-2">
                <Search className="w-4 h-4" />
                {isMr ? 'सर्व मालमत्ता शोधा व खरेदी करा' : 'Explore Properties'}
              </Button>
            </Link>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* ── KPI STATS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Bought Properties */}
          <Card
            onClick={() => setActiveTab('bought')}
            className={`p-5 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'bought' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-100 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'खरेदी केलेल्या मालमत्ता' : 'Bought Properties'}</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700">{boughtProperties.length}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {isMr ? 'आपल्या मालकीच्या मालमत्ता' : 'Properties you purchased'}
            </div>
          </Card>

          {/* Card 2: Interested Properties */}
          <Card
            onClick={() => setActiveTab('interested')}
            className={`p-5 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'interested' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-100 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'स्वारस्य असलेल्या मालमत्ता' : 'Interested Properties'}</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-blue-700">{interestedProperties.length}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              {isMr ? 'प्रस्ताव व आवडती घरे' : 'Offers & saved listings'}
            </div>
          </Card>

          {/* Card 3: Recommended Matches */}
          <Card
            onClick={() => setActiveTab('matches')}
            className={`p-5 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'matches' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-indigo-100 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'शिफारस केलेल्या मालमत्ता' : 'Recommendations'}</span>
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-indigo-700">{matchedProperties.length}</div>
            <div className="text-xs text-slate-500 mt-1">{isMr ? 'तुमच्या प्राधान्यांशी जुळणारे' : 'Fit your preferences'}</div>
          </Card>

          {/* Card 4: Inquiries Sent */}
          <Card
            onClick={() => setActiveTab('inquiries')}
            className={`p-5 bg-white border rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'inquiries' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-purple-100 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'पाठवलेल्या चौकशी' : 'Inquiries Sent'}</span>
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-purple-700">{myInquiries.length}</div>
            <div className="text-xs text-slate-500 mt-1">{isMr ? 'विक्रेते / ॲडमिन संपर्क' : 'Contact requests sent'}</div>
          </Card>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
          {/* Tab 1: Bought */}
          <button
            type="button"
            onClick={() => setActiveTab('bought')}
            className={`pb-3 font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'bought'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>{isMr ? `खरेदी केलेल्या मालमत्ता (${boughtProperties.length})` : `Bought Properties (${boughtProperties.length})`}</span>
          </button>

          {/* Tab 2: Interested */}
          <button
            type="button"
            onClick={() => setActiveTab('interested')}
            className={`pb-3 font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'interested'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4 text-blue-600" />
            <span>{isMr ? `स्वारस्य असलेल्या मालमत्ता (${interestedProperties.length})` : `Interested Properties (${interestedProperties.length})`}</span>
          </button>

          {/* Tab 3: Recommendations */}
          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            className={`pb-3 font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'matches'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{isMr ? `शिफारस केलेल्या मालमत्ता (${matchedProperties.length})` : `Matches For You (${matchedProperties.length})`}</span>
          </button>

          {/* Tab 4: Wishlist */}
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`pb-3 font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'saved'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>{isMr ? `जतन केलेले (${savedProperties.length})` : `Wishlist (${savedProperties.length})`}</span>
          </button>

          {/* Tab 5: Inquiries */}
          <button
            type="button"
            onClick={() => setActiveTab('inquiries')}
            className={`pb-3 font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'inquiries'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-purple-600" />
            <span>{isMr ? `चौकशी (${myInquiries.length})` : `Inquiries (${myInquiries.length})`}</span>
          </button>
        </div>

        {/* ── TAB 1: BOUGHT PROPERTIES (खरेदी केलेल्या मालमत्ता) ── */}
        {activeTab === 'bought' && (
          <div className="space-y-6 tab-transition">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-serif font-bold text-xl text-slate-900">
                  {isMr ? 'आपण खरेदी केलेल्या मालमत्ता' : 'Properties Bought by You'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMr ? 'सह्याद्री लँड पोर्टलवर खरेदी पूर्ण झालेल्या आणि नोंदणीकृत मालमत्तांची यादी.' : 'Record of properties you have successfully purchased through Sahyadri.'}
                </p>
              </div>
            </div>

            {boughtProperties.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">
                  {isMr ? 'अद्याप कोणतीही मालमत्ता खरेदी केलेली नाही' : 'No Purchased Properties Yet'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto mb-6 leading-relaxed">
                  {isMr
                    ? 'आपण कोणत्याही मालमत्तेच्या तपशील पृष्ठावरून थेट "खरेदी करा" बटणावर क्लिक करून खरेदीचा प्रस्ताव पाठवू शकता.'
                    : 'Explore active listings and click the "Buy Now" button to submit a purchase offer and record your purchase.'}
                </p>
                <Link to="/properties">
                  <Button variant="primary" className="py-2.5 px-6 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-none flex items-center gap-2 mx-auto">
                    <Search className="w-4 h-4" />
                    {isMr ? 'उपलब्ध मालमत्ता शोधा व खरेदी करा' : 'Browse Available Properties'}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boughtProperties.map((prop) => (
                  <Card key={prop.id} className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="aspect-[16/10] w-full relative bg-slate-100">
                      <img
                        src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-md flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isMr ? 'खरेदी पूर्ण (Purchased)' : 'Purchased'}</span>
                      </div>
                      {prop.purchaseDate && (
                        <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{new Date(prop.purchaseDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN')}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {prop.propertyCode || 'SAHYADRI'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {isMr ? 'मालकी हक्क नोंदणीकृत' : 'Ownership Recorded'}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900 line-clamp-1 mb-1">
                          {isMr ? prop.titleMr || prop.title : prop.title}
                        </h4>
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {prop.cityVillage ? `${prop.cityVillage}, ` : ''}{prop.taluka ? `${prop.taluka}, ` : ''}{prop.district || ''}
                          </span>
                        </p>
                        <div className="flex items-baseline justify-between mt-2 mb-3 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                              {isMr ? 'खरेदी किंमत' : 'Purchase Price'}
                            </span>
                            <span className="text-base font-extrabold text-emerald-700">
                              ₹{Number(prop.offeredPrice || prop.purchasePrice || prop.price || prop.expectedPrice || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {prop.category && (
                            <span className="text-[10px] font-bold text-slate-600 uppercase bg-white px-2 py-1 rounded-lg border border-slate-200">
                              {prop.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/property/${prop.id}`} className="flex-1">
                          <Button variant="outline" className="w-full py-2 rounded-xl text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 flex items-center justify-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            {isMr ? 'मालमत्ता तपशील पहा' : 'View Property Details'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: INTERESTED PROPERTIES (स्वारस्य असलेल्या मालमत्ता) ── */}
        {activeTab === 'interested' && (
          <div className="space-y-6 tab-transition">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-serif font-bold text-xl text-slate-900">
                  {isMr ? 'स्वारस्य असलेल्या मालमत्ता' : 'Properties You Are Interested In'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMr ? 'आपण खरेदी प्रस्ताव पाठवलेल्या, जतन केलेल्या आणि चौकशी केलेल्या मालमत्ता.' : 'Properties where you submitted purchase offers, expressed interest, or saved to wishlist.'}
                </p>
              </div>
            </div>

            {interestedProperties.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">
                  {isMr ? 'कोणतीही स्वारस्य असलेली मालमत्ता नाही' : 'No Interested Properties Found'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto mb-6 leading-relaxed">
                  {isMr
                    ? 'आपण आवडलेल्या कोणत्याही मालमत्तेवर "खरेदी करा" (Buy) किंवा हार्ट आयकॉन दाबून येथे ट्रॅक करू शकता.'
                    : 'Click "Buy Property" or the heart icon on any listing to express interest and track it here.'}
                </p>
                <Link to="/properties">
                  <Button variant="primary" className="py-2.5 px-6 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md border-none flex items-center gap-2 mx-auto">
                    <Search className="w-4 h-4" />
                    {isMr ? 'मालमत्ता शोधा' : 'Explore Properties'}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {interestedProperties.map((prop) => (
                  <Card key={prop.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="aspect-[16/10] w-full relative bg-slate-100">
                      <img
                        src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 uppercase tracking-wider">
                        <Tag className="w-3 h-3" />
                        <span>{prop.interestBadge || (isMr ? 'स्वारस्य नोंदवले' : 'Interested')}</span>
                      </div>
                      {prop.offeredPrice && (
                        <div className="absolute bottom-3 left-3 bg-emerald-950/85 backdrop-blur-md text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                          {isMr ? 'प्रस्तावित ऑफर: ' : 'Your Offer: '} ₹{Number(prop.offeredPrice).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {prop.propertyCode || 'SAHYADRI'}
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {prop.interestType === 'offer' ? (isMr ? 'प्रस्ताव सक्रिय' : 'Offer Active') : (isMr ? 'स्वारस्य' : 'Interest')}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900 line-clamp-1 mb-1">
                          {isMr ? prop.titleMr || prop.title : prop.title}
                        </h4>
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {prop.cityVillage ? `${prop.cityVillage}, ` : ''}{prop.taluka ? `${prop.taluka}, ` : ''}{prop.district || ''}
                          </span>
                        </p>
                        <div className="text-base font-extrabold text-blue-700 mb-3">
                          ₹{Number(prop.expectedPrice || prop.price || prop.monthlyRent || 0).toLocaleString('en-IN')}
                        </div>
                        {prop.inquiryMsg && (
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 mb-3 italic">
                            "{prop.inquiryMsg}"
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/property/${prop.id}`} className="flex-1">
                          <Button variant="primary" className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-none flex items-center justify-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {isMr ? 'तपशील पहा / खरेदी करा' : 'View & Buy Property'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: RECOMMENDED MATCHES (शिफारस केलेल्या मालमत्ता) ── */}
        {activeTab === 'matches' && (
          <div className="space-y-6 tab-transition">
            <div>
              <h3 className="font-serif font-bold text-xl text-slate-900">
                {isMr ? 'आपल्या पसंतीनुसार शिफारस केलेल्या मालमत्ता' : 'Properties Matching Your Preferences'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isMr ? 'तुमचे बजेट आणि निवडलेल्या घटकांनुसार सर्वोत्तम मालमत्ता पर्याय.' : 'Personalized recommendations tailored to your category and budget.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchedProperties.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
                  <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="font-bold text-lg text-slate-800">
                    {isMr ? 'सध्या कोणतीही जुळणारी मालमत्ता नाही' : 'No Matching Properties Found'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    {isMr ? 'कृपया सर्व उपलब्ध मालमत्ता ब्राउझ करा.' : 'Explore all active property listings on Sahyadri.'}
                  </p>
                  <Link to="/properties">
                    <Button variant="primary" className="py-2.5 px-6 rounded-xl font-bold text-xs">
                      {isMr ? 'सर्व मालमत्ता पहा' : 'Browse All Properties'}
                    </Button>
                  </Link>
                </div>
              ) : (
                matchedProperties.map((prop) => (
                  <Card key={prop.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="aspect-[16/10] w-full overflow-hidden relative bg-slate-100">
                      <img
                        src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-800 border uppercase">
                        {prop.category || 'House'}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-base text-slate-900 line-clamp-1 mb-1">{prop.title}</h4>
                        <p className="text-xs text-slate-500 mb-2">📍 {prop.cityVillage ? `${prop.cityVillage}, ` : ''}{prop.taluka}, {prop.district}</p>
                        <div className="text-lg font-extrabold text-blue-700 mb-3">
                          ₹{Number(prop.expectedPrice || prop.price || prop.monthlyRent || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Link to={`/property/${prop.id}`}>
                        <Button variant="outline" className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          {isMr ? 'तपशील पहा व खरेदी करा' : 'View Details & Buy'}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: SAVED PROPERTIES (WISHLIST) ── */}
        {activeTab === 'saved' && (
          <div className="space-y-6 tab-transition">
            <div>
              <h3 className="font-serif font-bold text-xl text-slate-900">
                {isMr ? 'जतन केलेल्या आवडत्या मालमत्ता' : 'Saved Properties in Wishlist'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isMr ? 'आपण हार्ट आयकॉन दाबून बुकमार्क केलेली घरे आणि फ्लॅट्स.' : 'Properties you bookmarked to view later.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProperties.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
                  <Heart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="font-bold text-lg text-slate-800">
                    {isMr ? 'कोणतीही जतन केलेली मालमत्ता नाही' : 'No Saved Properties in Wishlist'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    {isMr ? 'आपल्या पसंतीची घरे आणि फ्लॅट्स जतन करण्यासाठी हार्ट आयकॉनवर क्लिक करा.' : 'Click the heart icon on any property to save it here.'}
                  </p>
                  <Link to="/properties">
                    <Button variant="primary" className="py-2.5 px-6 rounded-xl font-bold text-xs">
                      {isMr ? 'मालमत्ता शोधा' : 'Explore Properties'}
                    </Button>
                  </Link>
                </div>
              ) : (
                savedProperties.map((prop) => (
                  <Card key={prop.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col">
                    <div className="aspect-[16/10] w-full relative bg-slate-100">
                      <img
                        src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(prop.id)}
                        className="absolute top-3 right-3 p-2 bg-white/90 text-rose-600 rounded-full hover:bg-white transition-colors cursor-pointer shadow-sm"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-base text-slate-900 line-clamp-1 mb-1">{prop.title}</h4>
                        <p className="text-xs text-slate-500 mb-2">📍 {prop.cityVillage}, {prop.district}</p>
                        <div className="text-lg font-extrabold text-blue-700 mb-3">
                          ₹{Number(prop.expectedPrice || prop.price || prop.monthlyRent || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Link to={`/property/${prop.id}`}>
                        <Button variant="primary" className="w-full py-2 rounded-xl text-xs font-bold">
                          {isMr ? 'तपशील पहा' : 'View Property'}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: INQUIRIES SENT ── */}
        {activeTab === 'inquiries' && (
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm tab-transition">
            <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">
              {isMr ? 'आपण पाठवलेल्या चौकशी विनंत्या' : 'Inquiries & Contact Requests Sent by You'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {isMr ? 'मालक आणि प्रतिनिधींना पाठवलेल्या संदेशांची स्थिती.' : 'Status of contact inquiries sent to sellers and representatives.'}
            </p>
            {myInquiries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {isMr ? 'आपण अद्याप कोणतीही चौकशी पाठवलेली नाही.' : 'You have not submitted any property inquiries yet.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myInquiries.map((inq) => (
                  <div key={inq.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{inq.propertyName || 'Property Listing'}</span>
                        {inq.isPurchaseIntent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {isMr ? 'खरेदी प्रस्ताव' : 'Purchase Offer'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{inq.message || inq.note || 'Expressed interest'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-slate-100 text-slate-700">
                        {inq.status || 'Active'}
                      </span>
                      {inq.propertyId && (
                        <Link to={`/property/${inq.propertyId}`}>
                          <Button variant="outline" className="py-1 px-3 text-[11px] rounded-lg">
                            {isMr ? 'पहा' : 'View'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  );
};
