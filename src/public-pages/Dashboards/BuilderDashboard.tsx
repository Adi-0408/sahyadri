import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  PlusCircle,
  Eye,
  Trash2,
  Edit3,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Phone,
  Wrench,
  Search,
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

export const BuilderDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<any[]>(() => {
    const cached = getCachedCollection('projects');
    return Array.isArray(cached) ? cached : [];
  });
  const [inquiries, setInquiries] = useState<any[]>(() => {
    const cached = getCachedCollection('property_inquiries');
    return Array.isArray(cached) ? cached : [];
  });
  const [suppliers, setSuppliers] = useState<any[]>(() => {
    const cached = getCachedCollection('suppliers');
    return Array.isArray(cached) ? cached : [];
  });
  const [activeTab, setActiveTab] = useState<'projects' | 'leads' | 'suppliers'>('projects');
  const [searchTerm, setSearchTerm] = useState('');

  // Real-time Role Verification State
  const [checkingRole, setCheckingRole] = useState(true);
  const [inquiryStatus, setInquiryStatus] = useState<'approved' | 'pending' | 'rejected' | 'none'>('none');
  const [builderInquiry, setBuilderInquiry] = useState<any>(null);
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);

  // Edit project state
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editDescription, setEditDescription] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/builder/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Real-time multi-device role listener
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCheckingRole(false);
      return;
    }

    if (user.role === 'builder' || user.role === 'admin') {
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
        setBuilderInquiry(inq);
        const isApproved = inq && ((inq as any).status === 'approved' || (inq as any).status === 'accepted');
        if (isApproved) {
          setInquiryStatus('approved');
          if (refreshUser && user.role !== 'builder' && user.role !== 'admin') {
            refreshUser();
          }
        } else if (inq && inq.status === 'pending') {
          if (user.role !== 'builder' && user.role !== 'admin') {
            setInquiryStatus('pending');
          }
        } else if (inq && inq.status === 'rejected') {
          if (user.role !== 'builder' && user.role !== 'admin') {
            setInquiryStatus('rejected');
          }
        } else {
          try {
            const raw =
              localStorage.getItem(`sahyadri_role_approved_${user.uid}`) ||
              (userCleanMobile ? localStorage.getItem(`sahyadri_role_approved_${userCleanMobile}`) : null);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.role === 'builder') {
                setInquiryStatus('approved');
                if (refreshUser && user.role !== 'builder' && user.role !== 'admin') refreshUser();
                setCheckingRole(false);
                return;
              }
            }
          } catch {}
          if (user.role !== 'builder' && user.role !== 'admin') {
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
      setBuilderInquiry(inq);
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

  // Subscribe to builder's projects/properties
  useEffect(() => {
    if (!user?.uid) return;

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);
    const userCleanEmail = (user.email || '').trim().toLowerCase();

    const unsubProps = subscribeToCollection('properties', (items) => {
      // Filter properties posted by this builder across UID, phone, or email
      const myItems = items.filter((p: any) => {
        if (p.userId === user.uid || p.builderId === user.uid || p.uid === user.uid) return true;

        const propMobile = (
          p.mobileNumber ||
          p.ownerPhone ||
          p.phone ||
          p.cleanMobile ||
          ''
        ).replace(/[^0-9]/g, '').slice(-10);

        if (userCleanMobile && propMobile && propMobile === userCleanMobile) return true;

        const propEmail = (p.email || p.ownerEmail || '').trim().toLowerCase();
        if (userCleanEmail && propEmail && propEmail === userCleanEmail) return true;

        return false;
      });
      setProjects(myItems);
    });

    const unsubInquiries = subscribeToCollection('property_inquiries', (items) => {
      const myInquiries = items.filter(
        (inq: any) =>
          inq.builderId === user.uid ||
          inq.sellerId === user.uid ||
          (inq.sellerEmail && user.email && inq.sellerEmail.toLowerCase() === user.email.toLowerCase())
      );
      setInquiries(myInquiries);
    });

    const unsubSuppliers = subscribeToCollection('suppliers', (items) => {
      setSuppliers(items);
    });

    return () => {
      unsubProps();
      unsubInquiries();
      unsubSuppliers();
    };
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(isMr ? 'आपण हा प्रोजेक्ट नक्की हटवू इच्छिता?' : 'Are you sure you want to delete this project?')) {
      return;
    }
    try {
      await deleteDocument('properties', id);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const openEditModal = (proj: any) => {
    setEditingProject(proj);
    setEditTitle(proj.title || proj.propertyName || '');
    setEditPrice(proj.expectedPrice || proj.monthlyRent || '');
    setEditDescription(proj.description || '');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProject?.id) return;
    try {
      await updateDocument('properties', editingProject.id, {
        title: editTitle,
        propertyName: editTitle,
        expectedPrice: Number(editPrice) || 0,
        description: editDescription,
        updatedAt: new Date().toISOString()
      });
      setIsEditOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(term)) ||
      (p.propertyName && p.propertyName.toLowerCase().includes(term)) ||
      (p.cityVillage && p.cityVillage.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  const liveProjectsCount = projects.filter((p) => p.status === 'approved' || p.status === 'active').length;
  const pendingProjectsCount = projects.filter((p) => p.status === 'pending').length;

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pending Builder Review Guard
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
              {isMr ? 'आपला बिल्डर अर्ज सध्या तपासणीत आहे' : 'Your Builder Application is Under Review'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isMr
                ? 'आपण बिल्डर म्हणून नोंदणीसाठी सादर केलेले तपशील ॲडमिन टीमकडे मंजुरीसाठी पाठवले आहेत. ॲडमिन मंजुरी मिळताच हा डॅशबोर्ड आपोआप खुला होईल.'
                : 'Your request to become a verified builder along with company details is currently being reviewed by our admin team.'}
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
      builderInquiry?.rejectionReason ||
      (user as any)?.lastInquiryRejectionReason ||
      (isMr
        ? 'माहिती अपूर्ण असल्याने किंवा पडताळणी प्रक्रियेदरम्यान विसंगती आढळल्याने आपला अर्ज नामंजूर करण्यात आला आहे.'
        : 'Your builder application was rejected during admin review.');

    const rejectionDate = builderInquiry?.reviewedAt || (user as any)?.lastInquiryRejectedAt;

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
              {isMr ? 'आपला बिल्डर अर्ज नामंजूर करण्यात आला आहे' : 'Your Builder Application Was Rejected'}
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
            <Link to="/role-inquiry?role=builder" className="flex-1">
              <Button
                variant="primary"
                className="w-full py-3 rounded-xl font-bold bg-primary hover:bg-primary-dark text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isMr ? 'पुन्हा अर्ज करा (Re-apply)' : 'Re-apply as Builder'}
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

  // Non-builder guard
  if (user && user.role !== 'builder' && user.role !== 'admin' && inquiryStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-md w-full p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
            {isMr ? 'बिल्डर डॅशबोर्ड प्रवेश आवश्यक' : 'Builder Account Required'}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {isMr
              ? 'हा डॅशबोर्ड फक्त अधिकृत बांधकाम व्यावसायिक (Builders & Developers) यांच्यासाठी आहे.'
              : 'This dashboard is reserved for approved builders and developers.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/role-inquiry?role=builder">
              <Button variant="primary" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'बिल्डर अर्ज भरा (Apply as Builder)' : 'Apply to Become Builder'}
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
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-3 backdrop-blur-sm">
                <Building2 className="w-4 h-4 text-purple-300" />
                {isMr ? 'बिल्डर व डेव्हलपर डॅशबोर्ड' : 'Builder & Developer Console'}
              </div>

              <h1 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight">
                {user?.displayName || 'Sahyadri Projects'}
              </h1>

              <p className="text-purple-200 text-sm mt-1 max-w-xl">
                {isMr
                  ? 'तुमचे सर्व गृहप्रकल्प, अपार्टमेंट टावर्स, बुकिंग आणि खरेदीदारांच्या चौकशी व्यवस्थापित करा.'
                  : 'Manage residential & commercial projects, inventory towers, bookings, and customer leads.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/post-property?type=builder">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
                  <PlusCircle className="w-4 h-4" />
                  {isMr ? 'नवीन प्रकल्प जोडा' : 'Add New Project'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-purple-200 font-medium block">
                {isMr ? 'एकूण प्रकल्प' : 'Total Projects'}
              </span>
              <span className="text-2xl font-extrabold mt-1 block">{projects.length}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-emerald-300 font-medium block">
                {isMr ? 'लाईव्ह प्रकल्प' : 'Live / Approved'}
              </span>
              <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">{liveProjectsCount}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-amber-300 font-medium block">
                {isMr ? 'पडताळणी प्रलंबित' : 'Under Review'}
              </span>
              <span className="text-2xl font-extrabold text-amber-300 mt-1 block">{pendingProjectsCount}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-purple-200 font-medium block">
                {isMr ? 'ग्राहकांच्या चौकशी' : 'Buyer Leads'}
              </span>
              <span className="text-2xl font-extrabold text-purple-200 mt-1 block">{inquiries.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {isMr ? 'माझे प्रकल्प' : 'My Projects'} ({projects.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'leads'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {isMr ? 'खरेदीदार लीड्स' : 'Buyer Leads'} ({inquiries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'suppliers'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            {isMr ? 'मटेरिअल सप्लायर्स' : 'Material Suppliers'} ({suppliers.length})
          </button>
        </div>

        {/* TAB 1: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="space-y-6 tab-transition">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isMr ? 'प्रकल्प नाव किंवा शहरानुसार शोधा...' : 'Search projects by title or city...'}
                  className="pl-10 py-2.5 rounded-xl bg-white"
                />
              </div>

              <Link to="/post-property">
                <Button variant="outline" className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 font-bold">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {isMr ? 'नवीन युनिट / टॉवर जोडा' : 'Add Property Unit'}
                </Button>
              </Link>
            </div>

            {filteredProjects.length === 0 ? (
              <Card className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {isMr ? 'कोणतेही प्रकल्प सापडले नाहीत' : 'No Projects Listed Yet'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  {isMr
                    ? 'आपण आपल्या गृहप्रकल्पाची माहिती आणि फोटो जोडून थेट हजारो ग्राहकांपर्यंत पोहोचू शकता.'
                    : 'List your residential schemes, apartments, or plots to reach thousands of potential buyers.'}
                </p>
                <Link to="/post-property">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {isMr ? 'पहिले प्रकल्प जोडा' : 'List Your First Project'}
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((proj) => {
                  const isApproved = proj.status === 'approved' || proj.status === 'active';
                  const isPending = proj.status === 'pending';

                  return (
                    <Card
                      key={proj.id}
                      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-[16/10] w-full overflow-hidden relative bg-slate-100 border-b border-slate-100">
                        <img
                          src={
                            proj.images && proj.images[0]
                              ? proj.images[0]
                              : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'
                          }
                          alt={proj.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Category badge */}
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur text-purple-800 shadow-sm border uppercase">
                            {proj.category || 'Project'}
                          </span>
                        </div>

                        {/* Status badge */}
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
                              <><Clock className="w-3 h-3" /> {isMr ? 'पडताळणी' : 'Under Review'}</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> {isMr ? 'नाकारले' : 'Rejected'}</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-purple-700 transition-colors">
                            {proj.title || proj.propertyName}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            📍 {proj.cityVillage ? `${proj.cityVillage}, ` : ''}{proj.taluka}, {proj.district}
                          </p>

                          <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
                            {proj.flatType && <span className="bg-slate-100 px-2 py-0.5 rounded">{proj.flatType}</span>}
                            {proj.builtUpArea && <span className="bg-slate-100 px-2 py-0.5 rounded">{proj.builtUpArea} Sq.Ft</span>}
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400">{isMr ? 'सुरुवातीची किंमत' : 'Starting Price'}</span>
                            <span className="text-base font-extrabold text-purple-700">
                              ₹{Number(proj.expectedPrice || proj.monthlyRent || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                          <Link to={`/properties/${proj.id}`} className="flex-1">
                            <Button variant="outline" className="w-full text-xs py-2 rounded-xl border-slate-200 hover:bg-purple-50 hover:text-purple-700 font-bold">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              {isMr ? 'पहा' : 'View'}
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            onClick={() => openEditModal(proj)}
                            className="p-2 text-slate-600 hover:text-purple-600 rounded-xl border-slate-200"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => handleDelete(proj.id)}
                            className="p-2 text-slate-600 hover:text-red-600 rounded-xl border-slate-200"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-6 tab-transition">
            {inquiries.length === 0 ? (
              <Card className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {isMr ? 'सध्या कोणत्याही चौकशी नाहीत' : 'No Buyer Inquiries Yet'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  {isMr
                    ? 'जेव्हा ग्राहक आपल्या प्रकल्पात रस दाखवतील, तेव्हा त्यांच्या संपर्क तपशिलांची यादी येथे दिसेल.'
                    : 'When prospective buyers inquire about your project or units, their inquiries will appear here.'}
                </p>
              </Card>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">{isMr ? 'ग्राहक नाव' : 'Client Name'}</th>
                        <th className="px-6 py-4">{isMr ? 'संपर्क' : 'Contact'}</th>
                        <th className="px-6 py-4">{isMr ? 'प्रकल्प / फ्लॅट' : 'Target Unit'}</th>
                        <th className="px-6 py-4">{isMr ? 'संदेश' : 'Message'}</th>
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
                          <td className="px-6 py-4 font-semibold text-purple-700">{inq.propertyTitle || 'Project Unit'}</td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{inq.message || inq.notes || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <a
                              href={`tel:${inq.clientMobile || inq.mobile}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 transition-colors"
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

        {/* TAB 3: MATERIAL SUPPLIERS */}
        {activeTab === 'suppliers' && (
          <div className="space-y-6 tab-transition">
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-purple-900">
                  {isMr ? 'अधिकृत बांधकाम साहित्य पुरवठादार (Material Suppliers)' : 'Verified Construction Material Suppliers'}
                </h3>
                <p className="text-xs text-purple-700 mt-0.5">
                  {isMr
                    ? 'सिमेंट, स्टील, वाळू, टाईल्स व इलेक्ट्रिकल पुरवठादारांशी थेट घाऊक दरात संपर्क साधा.'
                    : 'Connect directly with verified suppliers for bulk cement, steel, sand, tiles, and fittings.'}
                </p>
              </div>
            </div>

            {suppliers.length === 0 ? (
              <Card className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-sm text-slate-500">
                  {isMr ? 'सध्या कोणतेही पुरवठादार नोंदणीकृत नाहीत.' : 'No suppliers registered in your area yet.'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map((sup) => (
                  <Card key={sup.id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {sup.category === 'All' ? 'All Materials' : (sup.category || 'Building Materials')}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base mt-2">{sup.businessName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">👤 {sup.contactPerson || 'Proprietor'}</p>
                      </div>
                      <Wrench className="w-5 h-5 text-orange-500" />
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                      <p>📍 {sup.officeAddress || `${sup.district || 'Sangli'}`}</p>
                      {sup.gstNumber && <p className="font-mono text-[11px] text-slate-400">GST: {sup.gstNumber}</p>}
                    </div>

                    <a
                      href={`tel:${sup.mobile}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {isMr ? 'कोटेशनसाठी कॉल करा' : 'Call for Bulk Quotes'}
                    </a>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Edit Modal */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <div className="p-6 space-y-5">
          <h3 className="text-lg font-bold font-serif text-slate-900">
            {isMr ? 'प्रकल्प माहिती संपादित करा' : 'Edit Project Details'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isMr ? 'प्रकल्प शीर्षक' : 'Project Title'}
              </label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isMr ? 'सुरुवातीची किंमत (₹)' : 'Starting Price (₹)'}
              </label>
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isMr ? 'वर्णन' : 'Description'}
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveEdit}>
              {isMr ? 'जतन करा' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
