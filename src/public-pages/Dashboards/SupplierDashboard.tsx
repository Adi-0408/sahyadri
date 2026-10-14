import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Wrench,
  Package,
  Plus,
  Phone,
  MessageSquare,
  Truck,
  Trash2,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument, getCachedCollection } from '../../services/firebase';
import { fetchUserRoleInquiry, subscribeToUserRoleInquiry } from '../../services/roleInquiry';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const SupplierDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>(() => {
    const cached = getCachedCollection('supplier_products');
    return Array.isArray(cached) ? cached : [];
  });
  const [inquiries, setInquiries] = useState<any[]>(() => {
    const cached = getCachedCollection('supplier_inquiries');
    return Array.isArray(cached) ? cached : [];
  });
  const [supplierProfile, setSupplierProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'leads' | 'profile'>('catalog');

  // Real-time Role Verification State
  const [checkingRole, setCheckingRole] = useState(true);
  const [inquiryStatus, setInquiryStatus] = useState<'approved' | 'pending' | 'rejected' | 'none'>('none');
  const [supplierInquiry, setSupplierInquiry] = useState<any>(null);
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);

  // Add Product modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('Cement & Steel');
  const [productPrice, setProductPrice] = useState<number | ''>('');
  const [productUnit, setProductUnit] = useState('Per Bag');
  const [inStock, setInStock] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/supplier/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Real-time multi-device role listener
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCheckingRole(false);
      return;
    }

    if (user.role === 'supplier' || user.role === 'admin') {
      setInquiryStatus('approved');
      setCheckingRole(false);
    }

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);

    setCheckingRole(true);
    const unsubInquiry = subscribeToUserRoleInquiry(
      { uid: user.uid, mobile: userCleanMobile || user.mobile, email: user.email },
      (inq) => {
        setSupplierInquiry(inq);
        const isApproved = inq && ((inq as any).status === 'approved' || (inq as any).status === 'accepted');
        if (isApproved) {
          setInquiryStatus('approved');
          if (refreshUser && user.role !== 'supplier' && user.role !== 'admin') {
            refreshUser();
          }
        } else if (inq && inq.status === 'pending') {
          if (user.role !== 'supplier' && user.role !== 'admin') {
            setInquiryStatus('pending');
          }
        } else if (inq && inq.status === 'rejected') {
          if (user.role !== 'supplier' && user.role !== 'admin') {
            setInquiryStatus('rejected');
          }
        } else {
          try {
            const raw =
              localStorage.getItem(`sahyadri_role_approved_${user.uid}`) ||
              (userCleanMobile ? localStorage.getItem(`sahyadri_role_approved_${userCleanMobile}`) : null);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.role === 'supplier') {
                setInquiryStatus('approved');
                if (refreshUser && user.role !== 'supplier' && user.role !== 'admin') refreshUser();
                setCheckingRole(false);
                return;
              }
            }
          } catch {}
          if (user.role !== 'supplier' && user.role !== 'admin') {
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
      setSupplierInquiry(inq);
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

  useEffect(() => {
    if (!user?.uid) return;

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);

    // Fetch supplier's product catalog across UID, phone
    const unsubProducts = subscribeToCollection('supplier_products', (items) => {
      const myItems = items.filter((p: any) => {
        if (p.supplierId === user.uid || p.userId === user.uid) return true;
        const pMob = (p.supplierMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && pMob && pMob === userCleanMobile) return true;
        return false;
      });
      setProducts(myItems);
    });

    // Fetch supplier inquiries
    const unsubInquiries = subscribeToCollection('supplier_inquiries', (items) => {
      const myInquiries = items.filter((inq: any) => {
        if (inq.supplierId === user.uid) return true;
        if (inq.supplierEmail && user.email && inq.supplierEmail.toLowerCase() === user.email.toLowerCase()) return true;
        const inqSupMob = (inq.supplierMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && inqSupMob && inqSupMob === userCleanMobile) return true;
        return false;
      });
      setInquiries(myInquiries);
    });

    // Fetch supplier doc
    const unsubSuppliers = subscribeToCollection('suppliers', (items) => {
      const found = items.find((s: any) => {
        if (s.userId === user.uid || s.uid === user.uid) return true;
        const sMob = (s.mobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && sMob && sMob === userCleanMobile) return true;
        if (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase()) return true;
        return false;
      });
      if (found) setSupplierProfile(found);
    });

    return () => {
      unsubProducts();
      unsubInquiries();
      unsubSuppliers();
    };
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !user?.uid) return;

    try {
      await createDocument('supplier_products', {
        supplierId: user.uid,
        supplierName: supplierProfile?.businessName || user.displayName || 'अधिकृत पुरवठादार',
        supplierMobile: supplierProfile?.mobile || user.mobile || '',
        name: productName.trim(),
        category: productCategory,
        price: Number(productPrice) || 0,
        unit: productUnit,
        inStock,
        district: supplierProfile?.operatingDistrict || supplierProfile?.district || '',
        taluka: supplierProfile?.operatingTaluka || supplierProfile?.taluka || '',
        address: supplierProfile?.officeAddress || supplierProfile?.address || '',
        deliveryAvailable: supplierProfile?.deliveryAvailable ?? true,
        createdAt: new Date().toISOString()
      });

      setProductName('');
      setProductPrice('');
      setIsAddOpen(false);
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm(isMr ? 'हे उत्पादन कॅटलॉगमधून हटवायचे का?' : 'Delete this item from catalog?')) return;
    try {
      await deleteDocument('supplier_products', id);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleToggleStock = async (prod: any) => {
    try {
      await updateDocument('supplier_products', prod.id, {
        inStock: !prod.inStock,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to toggle stock:', err);
    }
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pending Supplier Review Guard
  if (inquiryStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-md w-full p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              ⏳ {isMr ? 'ॲडमिन पडताळणी प्रलंबित' : 'Awaiting Admin Approval'}
            </span>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
              {isMr ? 'आपला साहित्य पुरवठादार अर्ज सध्या तपासणीत आहे' : 'Your Supplier Application is Under Review'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isMr
                ? 'आपण साहित्य पुरवठादार म्हणून नोंदणीसाठी सादर केलेले तपशील ॲडमिन टीमकडे मंजुरीसाठी पाठवले आहेत. ॲडमिन मंजुरी मिळताच हा डॅशबोर्ड आपोआप खुला होईल.'
                : 'Your request to become a verified building material supplier is currently being reviewed by our admin team.'}
            </p>
          </div>

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

  // Rejection Alert Screen
  if (inquiryStatus === 'rejected') {
    const rejectionReason =
      supplierInquiry?.rejectionReason ||
      (user as any)?.lastInquiryRejectionReason ||
      (isMr
        ? 'माहिती अपूर्ण असल्याने किंवा पडताळणी प्रक्रियेदरम्यान विसंगती आढळल्याने आपला अर्ज नामंजूर करण्यात आला आहे.'
        : 'Your supplier application was rejected during admin review.');

    const rejectionDate = supplierInquiry?.reviewedAt || (user as any)?.lastInquiryRejectedAt;

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
              {isMr ? 'आपला पुरवठादार अर्ज नामंजूर करण्यात आला आहे' : 'Your Supplier Application Was Rejected'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isMr
                ? 'ॲडमिन टीमने आपल्या अर्जाची तपासणी केली असून खालील कारणास्तव तो नाकारण्यात आला आहे.'
                : 'Our admin team reviewed your application and rejected it due to the reason below.'}
            </p>
          </div>

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
            <Link to="/role-inquiry?role=supplier" className="flex-1">
              <Button
                variant="primary"
                className="w-full py-3 rounded-xl font-bold bg-primary hover:bg-primary-dark text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isMr ? 'पुन्हा अर्ज करा (Re-apply)' : 'Re-apply as Supplier'}
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

  // Non-supplier guard
  if (user && user.role !== 'supplier' && user.role !== 'admin' && inquiryStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-md w-full p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
            {isMr ? 'साहित्य पुरवठादार डॅशबोर्ड प्रवेश आवश्यक' : 'Supplier Account Required'}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {isMr
              ? 'हा डॅशबोर्ड फक्त अधिकृत बांधकाम साहित्य पुरवठादार (Material Suppliers) यांच्यासाठी आहे.'
              : 'This dashboard is reserved for authorized building material suppliers.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/role-inquiry?role=supplier">
              <Button variant="primary" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'पुरवठादार अर्ज भरा (Apply as Supplier)' : 'Apply to Become Supplier'}
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

  return (
    <div className="min-h-screen bg-slate-50/70 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 md:px-12 text-left">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-900 via-amber-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-200 border border-orange-400/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-3 backdrop-blur-sm">
                <Wrench className="w-4 h-4 text-orange-300" />
                {isMr ? 'बांधकाम साहित्य पुरवठादार डॅशबोर्ड' : 'Construction Material Supplier Console'}
              </div>

              <h1 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight">
                {supplierProfile?.businessName || user?.displayName || 'Materials Hub'}
              </h1>

              <p className="text-orange-200 text-sm mt-1 max-w-xl">
                {isMr
                  ? 'तुमचे साहित्य कॅटलॉग, घाऊक दर आणि बिल्डर्स व घरमालकांकडून येणाऱ्या कोटेशन चौकशी व्यवस्थापित करा.'
                  : 'Manage product pricing catalog, material orders, and quote requests from builders and home constructors.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsAddOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                {isMr ? 'नवीन साहित्य जोडा' : 'Add Material / Product'}
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-orange-200 font-medium block">
                {isMr ? 'कॅटलॉग उत्पादने' : 'Catalog Items'}
              </span>
              <span className="text-2xl font-extrabold mt-1 block">{products.length}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-emerald-300 font-medium block">
                {isMr ? 'स्टॉकमध्ये उपलब्ध' : 'In Stock Items'}
              </span>
              <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">
                {products.filter((p) => p.inStock).length}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-orange-200 font-medium block">
                {isMr ? 'कोटेशन चौकशी' : 'Quote Inquiries'}
              </span>
              <span className="text-2xl font-extrabold text-orange-200 mt-1 block">{inquiries.length}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-orange-200 font-medium block">
                {isMr ? 'डिलिव्हरी स्थिती' : 'Delivery Service'}
              </span>
              <span className="text-2xl font-extrabold text-white mt-1 block flex items-center gap-1.5 text-base">
                <Truck className="w-4 h-4 text-orange-400" />
                {supplierProfile?.deliveryAvailable ?? true ? (isMr ? 'उपलब्ध' : 'Available') : (isMr ? 'नाही' : 'Pickup Only')}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            {isMr ? 'माझे साहित्य व दर' : 'Materials & Pricing'} ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'leads'
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {isMr ? 'ग्राहकांचे कोटेशन्स' : 'Quote Inquiries'} ({inquiries.length})
          </button>
        </div>

        {/* TAB 1: CATALOG */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 tab-transition">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif text-slate-900">
                {isMr ? 'उपलब्ध साहित्याची यादी' : 'Listed Materials & Hardware'}
              </h3>

              <Button
                onClick={() => setIsAddOpen(true)}
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50 font-bold rounded-xl text-xs py-2"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {isMr ? 'साहित्य जोडा' : 'Add Item'}
              </Button>
            </div>

            {products.length === 0 ? (
              <Card className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  {isMr ? 'कॅटलॉगमध्ये अद्याप साहित्य जोडलेले नाही' : 'No Materials Listed Yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                  {isMr
                    ? 'सिमेंट, स्टील, वाळू, विटा किंवा टाईल्स जोडा जेणेकरून बिल्डर्स व ग्राहक थेट कोटेशन मागवू शकतील.'
                    : 'Add items like cement, TMT steel, sand, bricks, or plumbing fittings to start receiving orders.'}
                </p>
                <Button onClick={() => setIsAddOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  {isMr ? 'पहिले साहित्य जोडा' : 'Add First Item'}
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((item) => (
                  <Card key={item.id} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {item.category}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleStock(item)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                            item.inStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {item.inStock ? (isMr ? 'स्टॉकमध्ये' : 'In Stock') : (isMr ? 'स्टॉक संपला' : 'Out of Stock')}
                        </button>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base mt-3">{item.name}</h4>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">{item.unit || 'Per Unit'}</span>
                        <span className="text-lg font-extrabold text-orange-700">
                          ₹{Number(item.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl border-slate-200"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INQUIRIES */}
        {activeTab === 'leads' && (
          <div className="space-y-6 tab-transition">
            {inquiries.length === 0 ? (
              <Card className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  {isMr ? 'अद्याप कोणत्याही कोटेशन चौकशी नाहीत' : 'No Quote Requests Yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isMr
                    ? 'जेव्हा बिल्डर्स किंवा ग्राहक आपल्या साहित्यासाठी कोटेशन मागवतील, तेव्हा त्यांचे संपर्क येथे दिसतील.'
                    : 'When builders or clients request bulk pricing or quotations, their contact requests will appear here.'}
                </p>
              </Card>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">{isMr ? 'ग्राहक / बिल्डर' : 'Client / Builder'}</th>
                        <th className="px-6 py-4">{isMr ? 'संपर्क' : 'Contact'}</th>
                        <th className="px-6 py-4">{isMr ? 'साहित्य गरज' : 'Requirement'}</th>
                        <th className="px-6 py-4">{isMr ? 'तपशील' : 'Details'}</th>
                        <th className="px-6 py-4 text-right">{isMr ? 'कृती' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {inquiries.map((inq) => (
                        <tr key={inq.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{inq.clientName || inq.name}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{inq.clientMobile || inq.mobile}</div>
                            <div className="text-[11px] text-slate-400">{inq.clientEmail || inq.email}</div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-orange-700">{inq.materialCategory || inq.productName || 'Bulk Materials'}</td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{inq.quantityNotes || inq.message || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <a
                              href={`tel:${inq.clientMobile || inq.mobile}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {isMr ? 'कॉल करा' : 'Call'}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Product Modal */}
      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <form onSubmit={handleAddProduct} className="p-6 space-y-4">
          <h3 className="text-lg font-bold font-serif text-slate-900">
            {isMr ? 'नवीन साहित्य कॅटलॉगमध्ये जोडा' : 'Add Material to Catalog'}
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {isMr ? 'साहित्याचे नाव *' : 'Material / Product Name *'}
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="उदा. UltraTech Cement, Fe550 TMT Steel"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={isMr ? 'प्रवर्ग' : 'Category'}
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="py-2 text-xs font-semibold"
              options={[
                { value: 'All Materials', label: isMr ? 'सर्व साहित्य (All Materials)' : 'All Materials' },
                { value: 'Cement & Steel', label: 'Cement & Steel' },
                { value: 'Sand & Aggregate', label: 'Sand & Aggregate' },
                { value: 'Bricks & Blocks', label: 'Bricks & Blocks' },
                { value: 'Tiles & Flooring', label: 'Tiles & Flooring' },
                { value: 'Plumbing & Sanitary', label: 'Plumbing & Sanitary' },
                { value: 'Electrical & Lighting', label: 'Electrical & Lighting' },
                { value: 'Paints & Waterproofing', label: 'Paints & Waterproofing' },
                { value: 'Hardware & Tools', label: 'Hardware & Tools' }
              ]}
            />

            <Select
              label={isMr ? 'दर एकक (Unit)' : 'Unit'}
              value={productUnit}
              onChange={(e) => setProductUnit(e.target.value)}
              className="py-2 text-xs font-semibold"
              options={[
                { value: 'Per Bag', label: 'Per Bag (पोते)' },
                { value: 'Per Ton', label: 'Per Ton (टन)' },
                { value: 'Per Brass', label: 'Per Brass (ब्रास)' },
                { value: 'Per Sq.Ft', label: 'Per Sq.Ft (चौ. फूट)' },
                { value: 'Per Piece', label: 'Per Piece (नग)' },
                { value: 'Per Litre', label: 'Per Litre (लिटर)' }
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {isMr ? 'किंमत (₹) *' : 'Price (₹) *'}
            </label>
            <Input
              type="number"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value ? Number(e.target.value) : '')}
              placeholder="380"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="instock"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="instock" className="text-xs font-semibold text-slate-700">
              {isMr ? 'सध्या स्टॉकमध्ये उपलब्ध आहे' : 'Item is currently in stock'}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
              {isMr ? 'जोडा' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
