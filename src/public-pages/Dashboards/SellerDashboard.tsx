import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  PlusCircle,
  Eye,
  Trash2,
  Edit3,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  TrendingUp,
  Phone,
  Sparkles,
  ShieldCheck,
  Building,
  Building2,
  Mountain,
  Tractor,
  Share2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { subscribeToCollection, deleteDocument, updateDocument, getCachedCollection } from '../../services/firebase';
import { fetchUserRoleInquiry, subscribeToUserRoleInquiry } from '../../services/roleInquiry';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';

export const SellerDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<any[]>(() => {
    const cached = getCachedCollection('properties');
    if (user && Array.isArray(cached) && cached.length > 0) {
      const userCleanMobile = (
        user.mobile ||
        (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
        ''
      ).replace(/[^0-9]/g, '').slice(-10);
      const userCleanEmail = (user.email || '').trim().toLowerCase();
      return cached.filter((p: any) => {
        if (user.uid && (p.userId === user.uid || p.uid === user.uid || p.sellerId === user.uid)) return true;
        const propMobile = (p.mobileNumber || p.ownerPhone || p.phone || p.cleanMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && propMobile && propMobile === userCleanMobile) return true;
        const propEmail = (p.email || p.ownerEmail || '').trim().toLowerCase();
        if (userCleanEmail && propEmail && propEmail === userCleanEmail) return true;
        return false;
      });
    }
    return [];
  });
  const [enquiries, setEnquiries] = useState<any[]>(() => {
    const cached = getCachedCollection('enquiries');
    return Array.isArray(cached) ? cached : [];
  });
  const [loadingProps, setLoadingProps] = useState(() => properties.length === 0);

  // Smart Role Verification State
  const [checkingRole, setCheckingRole] = useState(true);
  const [inquiryStatus, setInquiryStatus] = useState<'approved' | 'pending' | 'rejected' | 'none'>('none');
  const [sellerInquiry, setSellerInquiry] = useState<any>(null);
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);
  const [showApprovedBanner, setShowApprovedBanner] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'properties' | 'leads' | 'tips'>('properties');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/seller/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Real-time Multi-Device Role Verification
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCheckingRole(false);
      return;
    }

    if (user.role === 'seller' || user.role === 'admin') {
      setInquiryStatus('approved');
      setCheckingRole(false);
    }

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);

    // Subscribe live across devices (Firebase UID, mobile number, or email)
    setCheckingRole(true);
    const unsubInquiry = subscribeToUserRoleInquiry(
      { uid: user.uid, mobile: userCleanMobile || user.mobile, email: user.email },
      (inq) => {
        setSellerInquiry(inq);
        const isApproved = inq && ((inq as any).status === 'approved' || (inq as any).status === 'accepted');
        if (isApproved) {
          setInquiryStatus('approved');
          // If the user's local auth record hasn't flipped to seller yet, refresh in-app
          if (refreshUser && user.role !== 'seller' && user.role !== 'admin') {
            refreshUser();
          }
        } else if (inq && inq.status === 'pending') {
          if (user.role !== 'seller' && user.role !== 'admin') {
            setInquiryStatus('pending');
          }
        } else if (inq && inq.status === 'rejected') {
          if (user.role !== 'seller' && user.role !== 'admin') {
            setInquiryStatus('rejected');
          }
        } else {
          // Check local storage approval token
          try {
            const raw =
              localStorage.getItem(`sahyadri_role_approved_${user.uid}`) ||
              (userCleanMobile ? localStorage.getItem(`sahyadri_role_approved_${userCleanMobile}`) : null);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.role === 'seller') {
                setInquiryStatus('approved');
                if (refreshUser && user.role !== 'seller' && user.role !== 'admin') refreshUser();
                setCheckingRole(false);
                return;
              }
            }
          } catch {}
          if (user.role !== 'seller' && user.role !== 'admin') {
            setInquiryStatus('none');
          }
        }
        setCheckingRole(false);
      }
    );

    return () => {
      unsubInquiry();
    };
  }, [user, authLoading, refreshUser]);

  // Manual status refresh handler
  const handleCheckStatus = async () => {
    if (!user) return;
    setIsRefreshingRole(true);
    try {
      if (refreshUser) await refreshUser();
      const userCleanMobile = (
        user.mobile ||
        (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
        ''
      ).replace(/[^0-9]/g, '').slice(-10);
      const inq = await fetchUserRoleInquiry(user.uid, userCleanMobile || user.mobile, user.email || undefined);
      setSellerInquiry(inq);
      const isApproved = inq && ((inq as any).status === 'approved' || (inq as any).status === 'accepted');
      if (isApproved) {
        setInquiryStatus('approved');
      } else if (inq && inq.status === 'pending') {
        setInquiryStatus('pending');
      } else if (inq && inq.status === 'rejected') {
        setInquiryStatus('rejected');
      }
    } finally {
      setIsRefreshingRole(false);
    }
  };

  // Fetch properties and inquiries for this seller
  useEffect(() => {
    if (!user) return;

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);
    const userCleanEmail = (user.email || '').trim().toLowerCase();

    if (properties.length === 0) setLoadingProps(true);
    const unsubProps = subscribeToCollection('properties', (list) => {
      // Filter for properties belonging to this seller across UID, mobile number (last 10 digits), and email
      const sellerProps = list.filter((p: any) => {
        if (user.uid && (p.userId === user.uid || p.uid === user.uid || p.sellerId === user.uid)) return true;

        const propMobile = (
          p.mobileNumber ||
          p.ownerPhone ||
          p.phone ||
          p.cleanMobile ||
          p.alternateMobile ||
          p.ownerDetails?.ownerPhone ||
          ''
        ).replace(/[^0-9]/g, '').slice(-10);

        if (userCleanMobile && propMobile && propMobile === userCleanMobile) return true;

        const propEmail = (p.email || p.ownerEmail || '').trim().toLowerCase();
        if (userCleanEmail && propEmail && propEmail === userCleanEmail) return true;

        return false;
      });

      sellerProps.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProperties(sellerProps);
      setLoadingProps(false);
    });

    const unsubEnq = subscribeToCollection('enquiries', (list) => {
      setEnquiries(list);
    });

    return () => {
      if (typeof unsubProps === 'function') unsubProps();
      if (typeof unsubEnq === 'function') unsubEnq();
    };
  }, [user]);

  // Loading state
  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">
            {isMr ? 'विक्रेता खाते पडताळत आहे...' : 'Verifying seller credentials...'}
          </p>
        </div>
      </div>
    );
  }

  // Pending inquiry screen
  if (user && user.role !== 'seller' && user.role !== 'admin' && inquiryStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-xl w-full p-8 bg-white rounded-3xl shadow-xl border border-amber-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              ⏳ {isMr ? 'ॲडमिन पडताळणी प्रलंबित' : 'Awaiting Admin Approval'}
            </span>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
              {isMr ? 'आपला विक्रेता अर्ज सध्या तपासणीत आहे' : 'Your Seller Application is Under Review'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isMr
                ? 'आपण विक्रेता म्हणून नोंदणीसाठी सादर केलेले तपशील आणि पहिली मालमत्ता ॲडमिन टीमकडे मंजुरीसाठी पाठवली आहे. ॲडमिन मंजुरी मिळताच हा डॅशबोर्ड आपोआप खुला होईल.'
                : 'Your request to become a verified seller along with your initial property listing is currently being reviewed by our admin team.'}
            </p>
          </div>

          {/* Application summary */}
          {sellerInquiry && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{isMr ? 'अर्जदाराचे नाव:' : 'Applicant:'}</span>
                <span className="font-bold text-slate-800">{sellerInquiry.userName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{isMr ? 'मोबाईल नंबर:' : 'Mobile:'}</span>
                <span className="font-bold text-slate-800">{sellerInquiry.userMobile}</span>
              </div>
              {sellerInquiry.sellerDetails?.firstProperty?.title && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{isMr ? 'सादर केलेली मालमत्ता:' : 'Submitted Listing:'}</span>
                  <span className="font-bold text-slate-800 line-clamp-1">{sellerInquiry.sellerDetails.firstProperty.title}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{isMr ? 'अर्जाची तारीख:' : 'Submission Date:'}</span>
                <span className="font-bold text-slate-800">
                  {new Date(sellerInquiry.createdAt || Date.now()).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              onClick={handleCheckStatus}
              disabled={isRefreshingRole}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingRole ? 'animate-spin' : ''}`} />
              {isMr ? 'स्थिती पुन्हा तपासा (Refresh)' : 'Check Live Status'}
            </Button>
            <Link to="/profile" className="flex-1">
              <Button variant="outline" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'माझे प्रोफाइल' : 'Go to Profile'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Dedicated Rejection Alert Screen (Admin rejected role request)
  if (inquiryStatus === 'rejected') {
    const rejectionReason =
      sellerInquiry?.rejectionReason ||
      (user as any)?.lastInquiryRejectionReason ||
      (isMr
        ? 'माहिती अपूर्ण असल्याने किंवा पडताळणी प्रक्रियेदरम्यान विसंगती आढळल्याने आपला अर्ज नामंजूर करण्यात आला आहे.'
        : 'Your application was rejected due to incomplete information or verification criteria.');

    const rejectionDate = sellerInquiry?.reviewedAt || (user as any)?.lastInquiryRejectedAt;

    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-lg w-full p-6 sm:p-8 bg-white rounded-3xl shadow-xl border border-rose-100">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 mb-2">
              ⚠️ {isMr ? 'अर्ज नामंजूर (Application Rejected)' : 'Application Rejected'}
            </span>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
              {isMr ? 'आपला विक्रेता अर्ज नामंजूर करण्यात आला आहे' : 'Your Seller Application Was Rejected'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isMr
                ? 'ॲडमिन टीमने आपल्या अर्जाची तपासणी केली असून खालील कारणास्तव तो नाकारण्यात आला आहे. आपण दिलेल्या कारणाची पूर्तता करून पुन्हा नव्याने अर्ज सादर करू शकता.'
                : 'Our admin team reviewed your application and rejected it due to the reason below. You can rectify the issues and re-apply.'}
            </p>
          </div>

          {/* Rejection Details Box */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 sm:p-5 mb-6 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2 flex items-center gap-1.5">
              <span>⚠️ {isMr ? 'नामंजुरीचे कारण (Reason):' : 'Rejection Reason:'}</span>
            </div>
            <p className="text-sm font-semibold text-rose-950 bg-white/80 p-3 rounded-xl border border-rose-100 leading-relaxed shadow-xs">
              "{rejectionReason}"
            </p>
            {rejectionDate && (
              <div className="mt-3 text-[11px] text-rose-700/80 flex items-center justify-between">
                <span>{isMr ? 'तपासणी दिनांक:' : 'Reviewed on:'}</span>
                <span className="font-semibold">
                  {new Date(rejectionDate).toLocaleDateString('mr-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/role-inquiry?role=seller" className="flex-1">
              <Button
                variant="primary"
                className="w-full py-3 rounded-xl font-bold bg-primary hover:bg-primary-dark text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isMr ? 'पुन्हा अर्ज करा (Re-apply)' : 'Re-apply as Seller'}
              </Button>
            </Link>
            <Link to="/profile" className="flex-1">
              <Button variant="outline" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'माझे प्रोफाइल (Profile)' : 'Go to Profile'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Non-seller guard (only if not approved)
  if (user && user.role !== 'seller' && user.role !== 'admin' && inquiryStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-md w-full p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
            {isMr ? 'विक्रेता डॅशबोर्ड प्रवेश आवश्यक' : 'Seller Account Required'}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {isMr
              ? 'हा डॅशबोर्ड फक्त अधिकृत मालमत्ता विक्रेत्यांसाठी आहे. घर किंवा फ्लॅट विकण्यासाठी कृपया विक्रेता म्हणून नोंदणी करा.'
              : 'This dashboard is reserved for approved sellers. Apply to become a seller with your first house/flat listing.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/role-inquiry?role=seller">
              <Button variant="primary" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'विक्रेता अर्ज भरा (Apply as Seller)' : 'Apply to Become Seller'}
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'माझे प्रोफाइल' : 'Go to Profile'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Filtered properties
  const filteredProperties = properties.filter((p) => {
    if (filterType !== 'all') {
      const type = (p.type || '').toLowerCase();
      if (type !== filterType) return false;
    }
    if (filterStatus !== 'all') {
      const status = (p.status || 'pending').toLowerCase();
      if (filterStatus === 'approved' && status !== 'approved' && status !== 'active') return false;
      if (filterStatus === 'pending' && status !== 'pending') return false;
      if (filterStatus === 'rejected' && status !== 'rejected') return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const title = (p.title || p.propertyName || '').toLowerCase();
      const city = (p.cityVillage || p.location || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return title.includes(term) || city.includes(term) || cat.includes(term);
    }
    return true;
  });

  // Calculate seller stats
  const totalListings = properties.length;
  const approvedListings = properties.filter((p) => p.status === 'approved' || p.status === 'active').length;
  const pendingListings = properties.filter((p) => p.status === 'pending').length;
  const saleListings = properties.filter((p) => (p.type || '').toLowerCase() === 'sale').length;
  const rentListings = properties.filter((p) => (p.type || '').toLowerCase() === 'rent').length;

  // Filter leads for this seller's properties
  const sellerPropIds = new Set(properties.map((p) => p.id));
  const sellerPropNames = new Set(properties.map((p) => (p.title || p.propertyName || '').toLowerCase().trim()));
  const sellerLeads = enquiries.filter((e) => {
    if (e.propertyId && sellerPropIds.has(e.propertyId)) return true;
    if (e.propertyName && sellerPropNames.has(e.propertyName.toLowerCase().trim())) return true;
    return false;
  });

  // Delete handler
  const handleDelete = async (propId: string) => {
    const confirm = window.confirm(
      isMr ? 'आपण ही मालमत्ता डिलीट करू इच्छिता?' : 'Are you sure you want to delete this listing?'
    );
    if (!confirm) return;
    try {
      await deleteDocument('properties', propId);
    } catch (e) {
      console.error('Failed to delete property:', e);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: any) => {
    setEditingProp(p);
    setEditTitle(p.title || p.propertyName || '');
    setEditPrice(p.expectedPrice || p.price || p.monthlyRent || 0);
    setEditDesc(p.description || '');
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingProp) return;
    setSavingEdit(true);
    try {
      const updatePayload: any = {
        title: editTitle.trim(),
        propertyName: editTitle.trim(),
        description: editDesc.trim()
      };
      if (editingProp.type === 'rent') {
        updatePayload.monthlyRent = Number(editPrice);
      } else {
        updatePayload.expectedPrice = Number(editPrice);
        updatePayload.price = Number(editPrice);
      }

      await updateDocument('properties', editingProp.id, updatePayload);
      setIsEditModalOpen(false);
      setEditingProp(null);
    } catch (err) {
      console.error('Failed to update property:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 md:px-12 text-left">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── APPROVAL CELEBRATION BANNER ── */}
        {showApprovedBanner && (sellerInquiry?.status === 'approved' || (user as any)?.roleInquiryStatus === 'approved') && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn border border-emerald-400/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white shadow-inner">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full mb-1">
                  <span>🎉</span>
                  <span>{isMr ? 'ॲडमिन मंजुरी यशस्वी' : 'Admin Approved'}</span>
                </div>
                <h3 className="text-base sm:text-lg font-serif font-bold">
                  {isMr ? 'अभिनंदन! आपला विक्रेता अर्ज मंजूर झाला आहे.' : 'Congratulations! Your seller application is approved.'}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 max-w-2xl leading-relaxed">
                  {isMr
                    ? 'आपले विक्रेता खाते सक्रिय झाले असून आपण खाली दिलेल्या पर्यायांमधून थेट घरे, फ्लॅट्स व इतर वस्तू विक्रीसाठी पोस्ट करू शकता.'
                    : 'Your seller account is fully active. You can now list properties and goods for sale immediately.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowApprovedBanner(false)}
                className="p-2 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── SELLER HEADER ── */}
        <div className="bg-[#0b0f19] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              {isMr ? 'अधिकृत मालमत्ता विक्रेता डॅशबोर्ड' : 'Verified Seller Portal'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight">
              {isMr ? `नमस्कार, ${user?.displayName || 'विक्रेता'}` : `Welcome, ${user?.displayName || 'Seller'}`}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
              {isMr
                ? 'येथून आपल्या विक्रीसाठी असलेल्या सर्व घरे, फ्लॅट्स आणि प्लॉट्सचे व्यवस्थापन करा व खरेदीदारांच्या चौकशी पहा.'
                : 'Manage your listed houses, flats, and plots for sale or rent, track live approval status, and respond to buyer inquiries.'}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3 w-full sm:w-auto">
            <Link to="/post-property" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold shadow-lg hover:scale-105 transition-all">
                <PlusCircle className="w-4 h-4 mr-2" />
                {isMr ? '+ नवीन घर / फ्लॅट जोडा' : '+ List New Property'}
              </Button>
            </Link>
          </div>

          {/* Background decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* ── GOODS / PROPERTY POSTING SHORTCUTS ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full mb-1 border border-orange-200/60 uppercase tracking-wide">
                <span>⚡</span>
                <span>{isMr ? '१-क्लिक पोस्टिंग' : '1-Click Listing'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-slate-900 flex items-center gap-2">
                <span>📦</span>
                <span>{isMr ? 'विक्रीसाठी वस्तू व मालमत्ता पोस्ट करा' : 'Post Goods & Properties for Sale'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isMr
                  ? 'आपल्याकडे विक्रीसाठी उपलब्ध असलेली कोणतीही मालमत्ता थेट पोस्ट करण्यासाठी योग्य वर्गवारी निवडा.'
                  : 'Select a category below to list your flat, house, plot, or agricultural land for buyers.'}
              </p>
            </div>
            <Link to="/post-property">
              <Button variant="primary" className="py-2.5 px-5 rounded-xl font-bold text-xs shadow-md">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                {isMr ? 'सर्व प्रकार पहा' : 'View All Options'}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-1">
            {/* Flat */}
            <Link
              to="/post-property?category=Flat"
              className="group p-4 bg-purple-50/50 hover:bg-purple-100/70 border border-purple-200/70 hover:border-purple-400 rounded-2xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow">
                  <Building className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  1/2/3 BHK
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                  {isMr ? 'फ्लॅट / अपार्टमेंट' : 'Flat / Apartment'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {isMr ? 'रेडि पझेशन किंवा अंडर-कन्स्ट्रक्शन फ्लॅट' : 'Ready or under-construction flat'}
                </p>
              </div>
              <div className="mt-3 text-xs font-bold text-purple-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>+ {isMr ? 'फ्लॅट पोस्ट करा' : 'Post Flat'}</span>
                <span>→</span>
              </div>
            </Link>

            {/* House */}
            <Link
              to="/post-property?category=House"
              className="group p-4 bg-blue-50/50 hover:bg-blue-100/70 border border-blue-200/70 hover:border-blue-400 rounded-2xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow">
                  <Home className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  House
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                  {isMr ? 'स्वतंत्र घर / रो-हाऊस' : 'Independent House'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {isMr ? 'वैयक्तिक घर, रो-हाऊस किंवा जुने घर' : 'Single houses, row houses'}
                </p>
              </div>
              <div className="mt-3 text-xs font-bold text-blue-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>+ {isMr ? 'घर पोस्ट करा' : 'Post House'}</span>
                <span>→</span>
              </div>
            </Link>

            {/* Bungalow */}
            <Link
              to="/post-property?category=Bungalow"
              className="group p-4 bg-amber-50/50 hover:bg-amber-100/70 border border-amber-200/70 hover:border-amber-400 rounded-2xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Villa
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                  {isMr ? 'बंगला व व्हिला' : 'Bungalow & Villa'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {isMr ? 'लक्झरी बंगला, फार्म हाऊस व व्हिला' : 'Luxury villas and bungalows'}
                </p>
              </div>
              <div className="mt-3 text-xs font-bold text-amber-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>+ {isMr ? 'बंगला पोस्ट करा' : 'Post Bungalow'}</span>
                <span>→</span>
              </div>
            </Link>

            {/* Plot */}
            <Link
              to="/post-property?category=Plot"
              className="group p-4 bg-emerald-50/50 hover:bg-emerald-100/70 border border-emerald-200/70 hover:border-emerald-400 rounded-2xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow">
                  <Mountain className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  NA Plot
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                  {isMr ? 'प्लॉट / एन.ए. जागा' : 'Plots & NA Land'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {isMr ? 'निवासी, कमर्शियल व गुंठेवारी प्लॉट्स' : 'Residential, commercial plots'}
                </p>
              </div>
              <div className="mt-3 text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>+ {isMr ? 'प्लॉट पोस्ट करा' : 'Post Plot'}</span>
                <span>→</span>
              </div>
            </Link>

            {/* Land */}
            <Link
              to="/post-property?category=Land"
              className="group p-4 bg-orange-50/50 hover:bg-orange-100/70 border border-orange-200/70 hover:border-orange-400 rounded-2xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow">
                  <Tractor className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  Farm
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-orange-700 transition-colors">
                  {isMr ? 'शेती जमीन' : 'Agricultural Land'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                  {isMr ? 'बागायती, जिरायती व फार्म लँड' : 'Agricultural and farm land'}
                </p>
              </div>
              <div className="mt-3 text-xs font-bold text-orange-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>+ {isMr ? 'जमीन पोस्ट करा' : 'Post Land'}</span>
                <span>→</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── KPI STATS CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'एकूण मालमत्ता' : 'Total Listings'}</span>
              <Home className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalListings}</div>
            <div className="text-[11px] text-slate-500 mt-1">{isMr ? 'नोंदणीकृत मालमत्ता' : 'Properties posted'}</div>
          </Card>

          <Card className="p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'लाइव्ह / मंजूर' : 'Live & Active'}</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{approvedListings}</div>
            <div className="text-[11px] text-emerald-600 mt-1">{isMr ? 'पोर्टलवर दृश्यमान' : 'Visible on portal'}</div>
          </Card>

          <Card className="p-5 bg-white border border-amber-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'प्रलंबित' : 'Under Review'}</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">{pendingListings}</div>
            <div className="text-[11px] text-amber-600 mt-1">{isMr ? 'ॲडमिन मंजुरी बाकी' : 'Awaiting admin review'}</div>
          </Card>

          <Card className="p-5 bg-white border border-blue-100 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'विक्रीसाठी' : 'For Sale'}</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">{saleListings}</div>
            <div className="text-[11px] text-blue-600 mt-1">{rentListings} {isMr ? 'भाड्याने उपलब्ध' : 'for rent'}</div>
          </Card>

          <Card className="p-5 bg-white border border-purple-100 rounded-2xl shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
              <span>{isMr ? 'चौकशी / लीड्स' : 'Buyer Inquiries'}</span>
              <MessageSquare className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700">{sellerLeads.length}</div>
            <div className="text-[11px] text-purple-600 mt-1">{isMr ? 'खरेदीदारांकडून प्रतिसाद' : 'Interested buyers'}</div>
          </Card>
        </div>

        {/* ── TABS NAVIGATION ── */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('properties')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'properties'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            {isMr ? `माझ्या मालमत्ता (${properties.length})` : `My Listed Properties (${properties.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {isMr ? `खरेदीदार चौकशी (${sellerLeads.length})` : `Buyer Inquiries (${sellerLeads.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tips')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'tips'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isMr ? 'विक्री मार्गदर्शक व कागदपत्रे' : 'Selling Guidelines & Checklist'}
          </button>
        </div>

        {/* ── TAB 1: PROPERTIES LISTING ── */}
        {activeTab === 'properties' && (
          <div className="space-y-6 tab-transition">
            
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">{isMr ? 'फिल्टर:' : 'Filter:'}</span>
                <div className="w-36">
                  <Select
                    value={filterType}
                    onChange={(e: any) => setFilterType(e.target.value)}
                    options={[
                      { value: 'all', label: isMr ? 'सर्व प्रकार' : 'All Types' },
                      { value: 'sale', label: isMr ? 'फक्त विक्री' : 'For Sale' },
                      { value: 'rent', label: isMr ? 'फक्त भाडे' : 'For Rent' },
                    ]}
                    className="py-2 text-xs font-semibold"
                  />
                </div>

                <div className="w-44">
                  <Select
                    value={filterStatus}
                    onChange={(e: any) => setFilterStatus(e.target.value)}
                    options={[
                      { value: 'all', label: isMr ? 'सर्व स्थिती' : 'All Status' },
                      { value: 'approved', label: isMr ? 'लाइव्ह / मंजूर' : 'Live / Approved' },
                      { value: 'pending', label: isMr ? 'प्रलंबित' : 'Pending Review' },
                      { value: 'rejected', label: isMr ? 'नाकारले' : 'Rejected' },
                    ]}
                    className="py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="w-full sm:w-64">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isMr ? 'शीर्षक किंवा गावाने शोधा...' : 'Search by title or city...'}
                  className="py-1.5 text-xs"
                />
              </div>
            </div>

            {loadingProps ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <Card className="py-16 px-6 text-center bg-white rounded-3xl border border-slate-200">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Home className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {isMr ? 'कोणतीही मालमत्ता सापडली नाही' : 'No Properties Found'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  {isMr
                    ? 'आपण अद्याप कोणतीही मालमत्ता पोस्ट केली नाही किंवा निवडलेल्या फिल्टरनुसार परिणाम नाहीत.'
                    : "You haven't listed any properties matching the filter yet. Click below to add a property."}
                </p>
                <Link to="/post-property">
                  <Button variant="primary" className="py-2.5 px-6 rounded-xl font-bold text-sm">
                    {isMr ? '+ नवीन मालमत्ता पोस्ट करा' : '+ List New Property'}
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((prop) => {
                  const isApproved = prop.status === 'approved' || prop.status === 'active';
                  const isPending = prop.status === 'pending';
                  const isOnboarding = prop.source === 'seller_inquiry_onboarding';

                  return (
                    <Card
                      key={prop.id}
                      className={`group overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col ${
                        isOnboarding ? 'border-2 border-amber-300 ring-2 ring-amber-100' : 'border border-slate-200'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-[16/10] w-full overflow-hidden relative bg-slate-100 border-b border-slate-100">
                        <img
                          src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Category & Type badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur text-slate-800 shadow-sm border uppercase">
                            {prop.category || 'House'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 text-white shadow-sm uppercase">
                            {prop.type === 'rent' ? (isMr ? 'भाड्याने' : 'Rent') : (isMr ? 'विक्री' : 'Sale')}
                          </span>
                          {isOnboarding && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1">
                              ⭐ {isApproved
                                ? (isMr ? 'प्राथमिक नोंदणी (मंजूर)' : 'Initial Listing (Live)')
                                : (isMr ? 'प्राथमिक नोंदणी (मंजुरी बाकी)' : 'Initial Listing (Pending Approval)')}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm border flex items-center gap-1 ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {isApproved ? (
                              <><CheckCircle className="w-3 h-3" /> {isMr ? 'लाइव्ह' : 'Live'}</>
                            ) : isPending ? (
                              <><Clock className="w-3 h-3" /> {isMr ? 'प्रलंबित' : 'Pending'}</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> {isMr ? 'नाकारले' : 'Rejected'}</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-lg font-extrabold text-slate-900 line-clamp-1 mb-1">
                            {prop.title || prop.propertyName || 'Property'}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                            <span>📍 {prop.cityVillage ? `${prop.cityVillage}, ` : ''}{prop.taluka || ''}, {prop.district || ''}</span>
                          </div>

                          <div className="text-xl font-extrabold text-primary mb-3">
                            ₹{Number(prop.expectedPrice || prop.price || prop.monthlyRent || 0).toLocaleString('en-IN')}
                            {prop.type === 'rent' && <span className="text-xs font-normal text-slate-500"> / month</span>}
                          </div>

                          {/* Quick specs */}
                          <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {prop.flatType && <span className="font-semibold">{prop.flatType}</span>}
                            {prop.builtUpArea > 0 && <span>• {prop.builtUpArea} {prop.areaType || 'sqft'}</span>}
                            {prop.furnishingStatus && <span>• {prop.furnishingStatus}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                          <Link
                            to={`/property/${prop.id}`}
                            className="text-xs font-bold text-slate-600 hover:text-primary flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {isMr ? 'पहा' : 'Preview'}
                          </Link>

                          <div className="flex items-center gap-1">
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                (isMr ? 'सह्याद्री पोर्टलवर माझी मालमत्ता पहा: ' : 'Check out my property on Sahyadri: ') +
                                (prop.title || prop.propertyName || '') +
                                ' (₹' + Number(prop.expectedPrice || prop.price || prop.monthlyRent || 0).toLocaleString('en-IN') + ') - ' +
                                (typeof window !== 'undefined' ? window.location.origin : '') + '/property/' + prop.id
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title={isMr ? 'व्हॉट्सॲपवर शेअर करा' : 'Share on WhatsApp'}
                            >
                              <Share2 className="w-4 h-4" />
                            </a>

                            <button
                              type="button"
                              onClick={() => openEditModal(prop)}
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(prop.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Property"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: BUYER LEADS / INQUIRIES ── */}
        {activeTab === 'leads' && (
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm tab-transition">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-xl font-bold font-serif text-slate-900">
                {isMr ? 'आपल्या मालमत्तेवरील खरेदीदारांच्या चौकशी' : 'Buyer Inquiries Received'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isMr ? 'थेट खरेदीदारांशी फोन किंवा व्हॉट्सॲपवर संपर्क साधा' : 'Connect directly with interested buyers via Call or WhatsApp'}
              </p>
            </div>

            {sellerLeads.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold">{isMr ? 'अद्याप कोणतीही चौकशी आलेली नाही' : 'No buyer inquiries yet'}</p>
                <p className="text-xs mt-1 text-slate-400">
                  {isMr
                    ? 'आपली मालमत्ता मंजूर झाल्यावर खरेदीदार चौकशी सुरू करतील.'
                    : 'Inquiries will appear here once buyers reach out about your listed houses or flats.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sellerLeads.map((lead) => (
                  <div key={lead.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">{lead.name || 'Interested Buyer'}</span>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">
                          {new Date(lead.createdAt || 0).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        🏠 {lead.propertyName || 'Property Listing'}
                      </div>
                      {lead.message && (
                        <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 p-2 rounded-lg italic">
                          "{lead.message}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {lead.phone && (
                        <>
                          <a
                            href={`tel:${lead.phone}`}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            {lead.phone}
                          </a>
                          <a
                            href={`https://wa.me/91${lead.phone.replace(/[^0-9]/g, '').slice(-10)}?text=Hello%20${encodeURIComponent(lead.name || '')},%20regarding%20your%20inquiry%20for%20my%20property%20on%20Sahyadri`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── TAB 3: SELLER RESOURCES & CHECKLIST ── */}
        {activeTab === 'tips' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 tab-transition">
            <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {isMr ? 'घर व फ्लॅट विक्रीसाठी आवश्यक कागदपत्रे' : 'Required Legal Documents Checklist'}
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>७/१२ उतारा किंवा आखिव पत्रिका (City Survey PR Card)</strong> - मालमत्तेचा मालकी हक्क सिद्ध करण्यासाठी.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>खरेदीखत (Sale Deed / Title Deed)</strong> - मागील खरेदी व मालकी नोंद.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>बांधकाम परवानगी व भोगवटा प्रमाणपत्र (Completion / OC)</strong> - फ्लॅट व रो-हाऊससाठी.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>सोसायटी एनओसी (Society NOC)</strong> - अपार्टमेंट किंवा गृहनिर्माण संस्थेचा ना-हरकत दाखला.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>कर पावती (Property Tax Receipts)</strong> - महानगरपालिका / ग्रामपंचायत कर भरणा पावती.</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                {isMr ? 'जलद व योग्य किमतीत विक्रीसाठी टिप्स' : 'Tips to Sell Faster at the Best Price'}
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">💡</span>
                  <span><strong>स्पष्ट फोटो जोडा:</strong> घराचे हॉल, किचन, बेडरूम आणि बाहेरील दृश्य दाखवणारे उच्च दर्जाचे फोटो अपलोड करा.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">💡</span>
                  <span><strong>योग्य बाजारभाव ठरवा:</strong> परिसरातील चालू दरानुसार स्पर्धात्मक किंमत ठेवा.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">💡</span>
                  <span><strong>परिसर वैशिष्ट्ये नमूद करा:</strong> शाळा, बाजारपेठ, मुख्य रस्ता, बस स्थानक यांपासूनचे अंतर वर्णनात लिहा.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">💡</span>
                  <span><strong>खरेदीदारांना त्वरित प्रतिसाद द्या:</strong> येणाऱ्या कॉल्स आणि मेसेजना वेळेवर उत्तर दिल्याने व्यवहार जलद पूर्ण होतो.</span>
                </li>
              </ul>
            </Card>
          </div>
        )}

      </div>

      {/* ── EDIT PROPERTY MODAL ── */}
      <Dialog isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <div className="p-6 text-left space-y-4">
          <h3 className="text-lg font-bold text-slate-900 font-serif">
            {isMr ? 'मालमत्तेचे तपशील संपादित करा' : 'Edit Property Details'}
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'शीर्षक' : 'Property Title'}
            </label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'किंमत / भाडे (₹)' : 'Price / Rent (₹)'}
            </label>
            <Input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'वर्णन' : 'Description'}
            </label>
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button variant="primary" disabled={savingEdit} onClick={handleSaveEdit}>
              {savingEdit ? (isMr ? 'जतन करत आहे...' : 'Saving...') : (isMr ? 'जतन करा' : 'Save Changes')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
