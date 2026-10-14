import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { fetchDocument, subscribeToCollection, updateDocument, deleteDocument, getCachedCollection } from '../../services/firebase';
import { subscribeToUserRoleInquiry } from '../../services/roleInquiry';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useTranslation } from 'react-i18next';
import { MapPin, BedDouble, Bath, Ruler, Trash2, Edit3, Eye, Sparkles, Phone, Mail, User, Clock, ArrowRight, XCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user, loading, refreshUser } = useAuth();
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
        if (user.uid && (p.userId === user.uid || p.uid === user.uid || p.sellerId === user.uid || p.builderId === user.uid)) {
          return true;
        }
        const propMobile = (p.mobileNumber || p.ownerPhone || p.phone || p.cleanMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && propMobile && propMobile === userCleanMobile) return true;
        const propEmail = (p.email || p.ownerEmail || '').trim().toLowerCase();
        if (userCleanEmail && propEmail && propEmail === userCleanEmail) return true;
        return false;
      });
    }
    return [];
  });
  const [userDoc, setUserDoc] = useState<any>(null);
  const [roleInquiry, setRoleInquiry] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  
  // Edit Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editTitleMr, setEditTitleMr] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editLocation, setEditLocation] = useState('');
  const [editLocationMr, setEditLocationMr] = useState('');
  const [editBeds, setEditBeds] = useState(0);
  const [editBaths, setEditBaths] = useState(0);
  const [editArea, setEditArea] = useState(0);
  const [editDesc, setEditDesc] = useState('');
  const [editDescMr, setEditDescMr] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Auth check redirect
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Fetch real-time properties and user details
  useEffect(() => {
    if (!user) return;

    // Fetch user Firestore doc if any
    fetchDocument('users', user.uid).then((doc) => {
      if (doc) setUserDoc(doc);
    });

    // Clean mobile number (last 10 digits)
    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);
    const userCleanEmail = (user.email || '').trim().toLowerCase();

    // Subscribe to live role inquiry across devices (UID, mobile, email)
    const unsubInquiry = subscribeToUserRoleInquiry(
      { uid: user.uid, mobile: userCleanMobile || user.mobile, email: user.email },
      (inq) => {
        setRoleInquiry(inq);
        const isApproved = inq && (inq.status === 'approved' || (inq as any).status === 'accepted');
        if (isApproved && user.role === 'user' && refreshUser) {
          refreshUser();
        }
      }
    );

    // Subscribe to all properties and filter client-side across UID, phone, and email
    const unsubscribe = subscribeToCollection('properties', (list) => {
      const userList = list.filter((p: any) => {
        if (user.uid && (p.userId === user.uid || p.uid === user.uid || p.sellerId === user.uid || p.builderId === user.uid)) {
          return true;
        }

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

      // Sort by creation date descending
      userList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProperties(userList);
    });

    return () => {
      if (typeof unsubInquiry === 'function') unsubInquiry();
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const getAvatarLetter = () => {
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const mobileNumber = userDoc?.mobile || userDoc?.phoneNumber || userDoc?.mobileNumber || properties[0]?.mobileNumber || properties[0]?.ownerPhone || '';

  // Delete Action
  const handleDelete = async (e: React.MouseEvent, propId: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(i18n.language?.startsWith('mr') ? 'तुम्हाला ही मालमत्ता खरोखर हटवायची आहे का?' : 'Are you sure you want to delete this property?');
    if (confirmed) {
      try {
        await deleteDocument('properties', propId);
      } catch (error) {
        console.error("Failed to delete property:", error);
      }
    }
  };

  // Edit action triggers
  const handleEditClick = (e: React.MouseEvent, prop: any) => {
    e.stopPropagation();
    setSelectedProperty(prop);
    setEditTitle(prop.title || '');
    setEditTitleMr(prop.titleMr || '');
    setEditPrice(prop.price || prop.monthlyRent || 0);
    setEditLocation(prop.location || '');
    setEditLocationMr(prop.locationMr || '');
    setEditBeds(prop.beds || 0);
    setEditBaths(prop.baths || 0);
    setEditArea(prop.area || 0);
    setEditDesc(prop.description || '');
    setEditDescMr(prop.descriptionMr || '');
    setIsEditOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setIsSubmittingEdit(true);

    try {
      const updatedFields = {
        title: editTitle,
        titleMr: editTitleMr,
        // Set both price or monthlyRent based on original property category
        price: selectedProperty.type === 'rent' ? undefined : Number(editPrice),
        monthlyRent: selectedProperty.type === 'rent' ? Number(editPrice) : undefined,
        location: editLocation,
        locationMr: editLocationMr,
        beds: Number(editBeds),
        baths: Number(editBaths),
        area: Number(editArea),
        description: editDesc,
        descriptionMr: editDescMr,
        propertyName: editTitle
      };

      // Clean undefined keys
      if (updatedFields.price === undefined) delete (updatedFields as any).price;
      if (updatedFields.monthlyRent === undefined) delete (updatedFields as any).monthlyRent;

      await updateDocument('properties', selectedProperty.id, updatedFields);
      setIsEditOpen(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error("Failed to update property:", error);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 py-10 text-left pt-24 min-h-[80vh]">
      
      {/* ── PROFILE INFORMATION CARD ── */}
      <div className="bg-[#0f172a] text-white border border-slate-800 rounded-[32px] p-6 md:p-10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] relative overflow-hidden mb-12">
        {/* Subtle decorative background gradients */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl"></div>

        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 md:gap-10 relative z-10">
          {/* Circular Avatar with a glowing double ring */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-orange-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300 scale-105" />
            <div className="relative w-24 h-24 sm:w-26 sm:h-26 md:w-28 md:h-28 rounded-full bg-slate-950 border border-slate-800 text-white flex items-center justify-center font-bold text-4xl md:text-5xl shadow-2xl select-none animate-fadeIn">
              {getAvatarLetter()}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col gap-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-full border shadow-sm ${
                user.role === 'seller'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  : user.role === 'buyer'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : user.role === 'builder'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : user.role === 'supplier'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  : user.role === 'agent'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : user.role === 'representative'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-500/20 text-slate-300 border-slate-700'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                {user.role === 'seller'
                  ? isMr ? 'अधिकृत मालमत्ता विक्रेता (Seller)' : 'Verified Property Seller'
                  : user.role === 'buyer'
                  ? isMr ? 'नोंदणीकृत खरेदीदार (Buyer)' : 'Registered Buyer'
                  : user.role === 'builder'
                  ? isMr ? 'बिल्डर व डेव्हलपर (Builder)' : 'Verified Builder & Developer'
                  : user.role === 'supplier'
                  ? isMr ? 'साहित्य पुरवठादार (Supplier)' : 'Verified Material Supplier'
                  : user.role === 'agent'
                  ? isMr ? 'अधिकृत एजंट (Agent)' : 'Authorized Agent'
                  : user.role === 'representative'
                  ? isMr ? 'क्षेत्र प्रतिनिधी (Representative)' : 'Field Representative'
                  : isMr ? 'अतिथी / वापरकर्ता (Guest Member)' : 'Guest Member'}
              </span>

              {/* Direct Dashboard Button */}
              {user.role === 'seller' && (
                <Link to="/seller/dashboard">
                  <span className="inline-flex items-center gap-1 bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shadow">
                    🏠 {isMr ? 'विक्रेता डॅशबोर्ड उघडा' : 'Seller Dashboard'} →
                  </span>
                </Link>
              )}
              {user.role === 'buyer' && (
                <Link to="/buyer/dashboard">
                  <span className="inline-flex items-center gap-1 bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shadow">
                    🔍 {isMr ? 'खरेदीदार डॅशबोर्ड उघडा' : 'Buyer Dashboard'} →
                  </span>
                </Link>
              )}
              {user.role === 'builder' && (
                <Link to="/builder/dashboard">
                  <span className="inline-flex items-center gap-1 bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shadow">
                    🏢 {isMr ? 'बिल्डर डॅशबोर्ड उघडा' : 'Builder Dashboard'} →
                  </span>
                </Link>
              )}
              {user.role === 'agent' && (
                <Link to="/agent/dashboard">
                  <span className="inline-flex items-center gap-1 bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shadow">
                    💼 {isMr ? 'एजंट डॅशबोर्ड उघडा' : 'Agent Dashboard'} →
                  </span>
                </Link>
              )}
              {user.role === 'supplier' && (
                <Link to="/supplier/dashboard">
                  <span className="inline-flex items-center gap-1 bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shadow">
                    🛠️ {isMr ? 'सप्लायर डॅशबोर्ड उघडा' : 'Supplier Dashboard'} →
                  </span>
                </Link>
              )}
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-serif text-white font-extrabold mb-1 tracking-tight drop-shadow-sm">
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-3 text-sm text-slate-400 font-medium">
              <span className="flex items-center gap-2 hover:text-slate-200 transition-colors">
                <Mail className="w-4 h-4 text-orange-500" />
                <span>{user.email}</span>
              </span>

              {mobileNumber && (
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{mobileNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROLE INQUIRY / UPGRADE BANNER (FOR GUEST/USER ROLE) ── */}
      {user.role === 'user' && (
        <div className="mb-12">
          {roleInquiry && roleInquiry.status === 'rejected' ? (
            /* Rejection Banner */
            <div className="p-6 sm:p-8 bg-rose-50 border border-rose-200 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-rose-950 shadow-sm">
              <div className="flex items-start sm:items-center gap-4">
                <div className="p-3 bg-rose-100 rounded-2xl text-rose-700 shrink-0 mt-1 sm:mt-0">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="inline-block px-3 py-0.5 bg-rose-200/80 text-rose-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    ⚠️ {isMr ? 'अर्ज नामंजूर (Application Rejected)' : 'Application Rejected'}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-rose-950">
                    {isMr
                      ? `आपला "${roleInquiry.requestedRole.toUpperCase()}" अर्ज नामंजूर करण्यात आला आहे`
                      : `Your Application for "${roleInquiry.requestedRole.toUpperCase()}" Was Rejected`}
                  </h3>
                  <div className="bg-white/80 border border-rose-200/80 rounded-xl p-3 text-xs sm:text-sm text-rose-900 font-medium">
                    <span className="font-bold text-rose-950">{isMr ? 'कारण (Reason): ' : 'Reason: '}</span>
                    <span>"{roleInquiry.rejectionReason || (isMr ? 'माहिती अपूर्ण असल्याने किंवा पडताळणी प्रक्रियेत त्रुटी आढळल्यामुळे अर्ज नाकारण्यात आला आहे.' : 'Incomplete details or failed verification.')}"</span>
                  </div>
                  {roleInquiry.reviewedAt && (
                    <p className="text-[11px] text-rose-700/80">
                      {isMr ? 'तपासणी दिनांक: ' : 'Reviewed on: '}
                      {new Date(roleInquiry.reviewedAt).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 shrink-0 w-full md:w-auto">
                <Link to={`/role-inquiry?role=${roleInquiry.requestedRole || 'seller'}`} className="w-full md:w-auto">
                  <Button variant="primary" className="w-full md:w-auto py-3 px-6 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md text-xs sm:text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {isMr ? 'पुन्हा अर्ज करा (Re-apply)' : 'Re-apply Now'}
                  </Button>
                </Link>
              </div>
            </div>
          ) : roleInquiry && (roleInquiry.status === 'approved' || (roleInquiry as any).status === 'accepted') ? (
            /* Approved Banner */
            <div className="p-6 sm:p-8 bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-emerald-950 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-block px-3 py-0.5 bg-emerald-200/80 text-emerald-800 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1">
                    🎉 {isMr ? 'मंजूर (Approved)' : 'Approved'}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg text-emerald-950">
                    {isMr
                      ? `अभिनंदन! आपला "${roleInquiry.requestedRole.toUpperCase()}" अर्ज मंजूर करण्यात आला आहे.`
                      : `Congratulations! Your "${roleInquiry.requestedRole.toUpperCase()}" Application Was Approved.`}
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                    {isMr
                      ? 'आपले खाते सक्रिय झाले असून आपण थेट आपल्या नवीन डॅशबोर्डवर जाऊ शकता.'
                      : 'Your role is active. You can now access your dedicated dashboard.'}
                  </p>
                </div>
              </div>
              <Link to={`/${roleInquiry.requestedRole}/dashboard`} className="shrink-0 w-full md:w-auto">
                <Button variant="primary" className="w-full md:w-auto py-3 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-xs sm:text-sm">
                  {isMr ? 'डॅशबोर्ड उघडा (Open Dashboard)' : 'Open Dashboard'} →
                </Button>
              </Link>
            </div>
          ) : roleInquiry && roleInquiry.status === 'pending' ? (
            /* Pending Review Banner */
            <div className="p-6 sm:p-8 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-amber-900 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-700 shrink-0">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    {isMr
                      ? `आपला "${roleInquiry.requestedRole.toUpperCase()}" भूमिका अर्ज ॲडमिन मंजुरीसाठी प्रलंबित आहे`
                      : `Your Application for "${roleInquiry.requestedRole.toUpperCase()}" is Under Admin Review`}
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                    {isMr
                      ? 'सह्याद्री ॲडमिन पडताळणीनंतर आपले खाते विक्रेता/एजंट म्हणून सक्रिय होईल आणि डॅशबोर्ड उपलब्ध होईल.'
                      : 'Once approved by Sahyadri Admin, your dedicated dashboard will be unlocked.'}
                  </p>
                </div>
              </div>
              <Link to="/role-inquiry">
                <Button variant="outline" className="border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm">
                  {isMr ? 'अर्जाचे तपशील पहा' : 'View Application'}
                </Button>
              </Link>
            </div>
          ) : (
            /* Default Upgrade Banner */
            <div className="p-6 sm:p-8 bg-gradient-to-r from-orange-500/10 via-primary/10 to-amber-500/10 border border-orange-200/80 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
              <div className="space-y-1.5">
                <span className="inline-block px-3 py-1 bg-orange-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {isMr ? 'खाते अपग्रेड' : 'Account Upgrade'}
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
                  {isMr ? 'आपल्या घराची किंवा फ्लॅटची विक्री करू इच्छिता? विक्रेता बना!' : 'Want to Sell Houses or Flats? Become a Seller!'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {isMr
                    ? 'विक्रेता चौकशी फॉर्मद्वारे आपली पहिली मालमत्ता नोंदवा. ॲडमिन मंजुरीनंतर आपले स्वतंत्र विक्रेता डॅशबोर्ड उपलब्ध होईल आणि मालमत्ता लाईव्ह होईल.'
                    : 'List your first house or flat details in our onboarding inquiry. Once approved by Admin, your dedicated Seller Dashboard will unlock!'}
                </p>
              </div>

              <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                <Link to="/role-inquiry?role=seller" className="w-full sm:w-auto">
                  <Button variant="primary" className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold shadow-md hover:scale-105 transition-all text-xs sm:text-sm">
                    {isMr ? 'विक्रेता बना (Become Seller)' : 'Apply to Become Seller'} <ArrowRight className="w-4 h-4 ml-1.5 inline" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MY PROPERTIES SECTION ── */}
      <div className="mb-8 border-b border-slate-200 pb-4">
        <h2 className="text-2xl md:text-3xl font-serif text-[#111c2e] font-bold">
          {t('profile.myProperties', 'My Properties')}
        </h2>
      </div>

      {properties.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-6">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 font-serif mb-2">
            {t('profile.noProperties', 'No Properties Listed')}
          </h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
            {t('profile.noPropertiesDesc', "You haven't listed any real estate properties under your account. Click the button below to get started for free.")}
          </p>
          <Link to="/post-property">
            <Button variant="primary" className="py-3 px-8 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all">
              {t('profile.postPropertyFree', 'Post Property FREE')}
            </Button>
          </Link>
        </div>
      ) : (
        /* Listings Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {properties.map((prop) => (
            <Card
              key={prop.id}
              className="group relative overflow-hidden flex flex-col h-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl animate-fadeIn"
            >
              {/* Media Container */}
              <div className="aspect-[4/3] w-full overflow-hidden relative border-b border-slate-100">
                <img
                  src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                  alt={prop.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Category tag */}
                <div className="absolute top-4 left-4 bg-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-slate-800 border border-slate-200 uppercase">
                  {t(`categories.${prop.category.toLowerCase()}`, prop.category) as string}
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4 uppercase tracking-widest text-[9px] font-extrabold px-3 py-1 rounded-full border shadow-sm bg-white/90 backdrop-blur-sm">
                  {prop.status === 'approved' ? (
                    <span className="text-emerald-700">{isMr ? 'लाईव्ह' : 'Live'}</span>
                  ) : prop.status === 'rejected' ? (
                    <span className="text-red-700">{isMr ? 'नाकारले' : 'Rejected'}</span>
                  ) : (
                    <span className="text-amber-700">{isMr ? 'प्रलंबित' : 'Pending'}</span>
                  )}
                </div>
              </div>

              {/* Details Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-serif text-slate-900 font-bold mb-1.5 line-clamp-1">
                    {i18n.language?.startsWith('mr') ? prop.titleMr || prop.title : prop.title}
                  </h3>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{i18n.language?.startsWith('mr') ? prop.locationMr || prop.location : prop.location}</span>
                  </div>
                </div>

                <div>
                  {/* Price & specs */}
                  <div className="flex justify-between items-center py-3 border-t border-slate-100 mt-2 mb-4">
                    <span className="text-slate-900 font-serif font-bold text-base">
                      Rs {prop.price ? prop.price.toLocaleString() : (prop.monthlyRent ? prop.monthlyRent.toLocaleString() : 'N/A')}
                      {prop.type === 'rent' && <span className="text-xs text-slate-500 font-sans font-normal">/mo</span>}
                    </span>
                    <div className="flex gap-3 text-slate-500 text-[11px] font-semibold">
                      {prop.beds !== undefined && (
                        <div className="flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prop.beds}</span>
                        </div>
                      )}
                      {prop.baths !== undefined && (
                        <div className="flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prop.baths}</span>
                        </div>
                      )}
                      {prop.area !== undefined && (
                        <div className="flex items-center gap-1">
                          <Ruler className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prop.area} sqft</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                    <Button
                      onClick={() => navigate(`/property/${prop.id}`)}
                      variant="outline"
                      className="py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-slate-700 hover:text-primary border-slate-200 hover:bg-slate-50 hover:border-primary/20 transition-all cursor-pointer"
                      title={isMr ? "तपशील पहा" : "View Details"}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isMr ? 'पहा' : 'View'}</span>
                    </Button>
                    <Button
                      onClick={(e) => handleEditClick(e, prop)}
                      variant="outline"
                      className="py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-slate-700 hover:text-orange-600 border-slate-200 hover:bg-orange-50/20 hover:border-orange-500/20 transition-all cursor-pointer"
                      title={isMr ? "माहिती संपादित करा" : "Edit Details"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isMr ? 'संपादित करा' : 'Edit'}</span>
                    </Button>
                    <Button
                      onClick={(e) => handleDelete(e, prop.id)}
                      variant="outline"
                      className="py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-red-655 hover:text-white border-slate-200 hover:border-red-500 hover:bg-red-500 transition-all cursor-pointer"
                      title={isMr ? "मालमत्ता हटवा" : "Delete Property"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isMr ? 'हटवा' : 'Delete'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── EDIT DIALOG MODAL ── */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={isMr ? "मालमत्ता माहिती संपादित करा" : "Edit Property Details"}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-5 text-left">
          
          <Input
            label={isMr ? "मालमत्ता शीर्षक (इंग्रजी)" : "Property Title (English)"}
            placeholder={isMr ? "उदा. 2 BHK House for Sale" : "e.g. 2 BHK House for Sale"}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <Input
            label={isMr ? "मालमत्ता शीर्षक (मराठी)" : "Property Title (Marathi)"}
            placeholder={isMr ? "उदा. २ BHK घर विक्रीसाठी" : "e.g. २ BHK घर विक्रीसाठी"}
            value={editTitleMr}
            onChange={(e) => setEditTitleMr(e.target.value)}
          />

          <Input
            label={isMr ? "किंमत / भाडे (₹)" : "Price / Rent (Rs)"}
            type="number"
            placeholder={isMr ? "किंमत प्रविष्ट करा" : "Enter price"}
            value={editPrice}
            onChange={(e) => setEditPrice(Number(e.target.value))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={isMr ? "बेड्स" : "Beds"}
              type="number"
              placeholder={isMr ? "उदा. 2" : "e.g. 2"}
              value={editBeds}
              onChange={(e) => setEditBeds(Number(e.target.value))}
            />
            <Input
              label={isMr ? "बाथ्स" : "Baths"}
              type="number"
              placeholder={isMr ? "उदा. 2" : "e.g. 2"}
              value={editBaths}
              onChange={(e) => setEditBaths(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={isMr ? "क्षेत्रफळ (sqft)" : "Area (sqft)"}
              type="number"
              placeholder={isMr ? "उदा. 1200" : "e.g. 1200"}
              value={editArea}
              onChange={(e) => setEditArea(Number(e.target.value))}
            />
          </div>

          <Input
            label={isMr ? "स्थान (इंग्रजी)" : "Location (English)"}
            placeholder={isMr ? "उदा. Shantisagar Colony, Sangli" : "e.g. Shantisagar Colony, Sangli"}
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            required
          />

          <Input
            label={isMr ? "स्थान (मराठी)" : "Location (Marathi)"}
            placeholder={isMr ? "उदा. शांतिसागर कॉलनी, सांगली" : "e.g. Shantisagar Colony, Sangli (Marathi)"}
            value={editLocationMr}
            onChange={(e) => setEditLocationMr(e.target.value)}
          />

          <Textarea
            label={isMr ? "वर्णन (इंग्रजी)" : "Description (English)"}
            placeholder={isMr ? "येथे इंग्रजीत वर्णन लिहा..." : "Write description here..."}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={3}
          />

          <Textarea
            label={isMr ? "वर्णन (मराठी)" : "Description (Marathi)"}
            placeholder={isMr ? "येथे वर्णन लिहा..." : "Write Marathi description here..."}
            value={editDescMr}
            onChange={(e) => setEditDescMr(e.target.value)}
            rows={3}
          />

          <div className="flex gap-4 pt-4 border-t border-slate-100 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {t('profile.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              isLoading={isSubmittingEdit}
              className="flex-grow py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800"
            >
              {t('profile.saveChanges', 'Save Changes')}
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
