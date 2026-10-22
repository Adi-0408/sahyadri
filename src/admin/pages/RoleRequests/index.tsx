import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  Eye,
  Clock,
  Search,
  Home,
  CheckCircle2,
  Trash2,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building,
  Image as ImageIcon
} from 'lucide-react';
import {
  subscribeToRoleInquiries,
  approveRoleInquiry,
  rejectRoleInquiry,
  deleteRoleInquiry,
  isGenericOrDummyName,
  isRealMobileNumber
} from '../../../services/roleInquiry';
import type { RoleInquiry } from '../../../services/roleInquiry';
import { useAuth } from '../../../app/providers/AuthProvider';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

export const RoleRequestsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user: currentAdmin } = useAuth();

  const [inquiries, setInquiries] = useState<RoleInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail Modal
  const [selectedInquiry, setSelectedInquiry] = useState<RoleInquiry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Property Inspection / Preview Modal
  const [viewingProperty, setViewingProperty] = useState<{
    prop: any;
    inquiry: RoleInquiry;
    activeImageIdx?: number;
  } | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    setActiveImageIdx(viewingProperty?.activeImageIdx || 0);
  }, [viewingProperty]);

  // Rejection Dialog
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingInquiry, setRejectingInquiry] = useState<RoleInquiry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Delete State
  const [deletingInquiry, setDeletingInquiry] = useState<RoleInquiry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToRoleInquiries((list) => {
      setInquiries(list);
      setLoading(false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const isItemApproved = (s?: string) => s === 'approved' || s === 'accepted';

  const handleApprove = async (inq: RoleInquiry) => {
    const confirm = window.confirm(
      isMr
        ? `आपण ${inq.userName} यांना "${inq.requestedRole.toUpperCase()}" म्हणून मंजूर करू इच्छिता?`
        : `Are you sure you want to approve ${inq.userName} as "${inq.requestedRole.toUpperCase()}"?`
    );
    if (!confirm) return;

    setActionLoading(true);
    try {
      const res = await approveRoleInquiry(inq, currentAdmin || undefined);
      if (res.success) {
        // Optimistic update so mobile admin immediately sees the row updated without lag
        setInquiries((prev) =>
          prev.map((item) =>
            item.id === inq.id ||
            (inq.userMobile && item.userMobile && inq.userMobile.slice(-10) === item.userMobile.slice(-10))
              ? { ...item, status: 'approved', reviewedAt: new Date().toISOString() }
              : item
          )
        );

        alert(
          isMr
            ? `वापरकर्ता ${inq.userName} आता "${inq.requestedRole}" बनला आहे!` +
                (res.propertyCreated ? '\nत्यांचे पहिले घर/फ्लॅट ॲडमिन मंजुरीसाठी प्रलंबित मालमत्तांमध्ये पाठवले आहे.' : '')
            : `User ${inq.userName} is now approved as "${inq.requestedRole}"!` +
                (res.propertyCreated ? '\nTheir first property was submitted to Pending Properties for Admin approval.' : '')
        );
        if (selectedInquiry?.id === inq.id) {
          setIsDetailOpen(false);
        }
      } else {
        alert(res.error || 'Approval failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (inq: RoleInquiry) => {
    setRejectingInquiry(inq);
    setRejectionReason('');
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingInquiry?.id) return;
    setActionLoading(true);
    try {
      await rejectRoleInquiry(
        rejectingInquiry.id,
        rejectingInquiry.userId,
        rejectionReason || 'Application rejected by Admin',
        currentAdmin || undefined,
        (rejectingInquiry as any).sourceCollection || ((rejectingInquiry as any).isRoleInquiry ? 'enquiries' : 'role_inquiries'),
        rejectingInquiry
      );

      // Optimistic state update
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === rejectingInquiry.id ||
          (rejectingInquiry.userMobile && item.userMobile && rejectingInquiry.userMobile.slice(-10) === item.userMobile.slice(-10))
            ? { ...item, status: 'rejected', rejectionReason: rejectionReason || 'Application rejected by Admin', reviewedAt: new Date().toISOString() }
            : item
        )
      );

      setIsRejectOpen(false);
      setRejectingInquiry(null);
      if (selectedInquiry?.id === rejectingInquiry.id) {
        setIsDetailOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInquiry = async (item: RoleInquiry) => {
    if (!item?.id) return;
    setDeleteLoading(true);
    try {
      await deleteRoleInquiry(item.id, item);
      setInquiries((prev) => prev.filter((i) => i.id !== item.id && i.userId !== item.userId));
      setDeletingInquiry(null);
      if (selectedInquiry?.id === item.id) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete inquiry');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Sanitized valid list (strictly filters out any test, orphan, or ghost records)
  const validInquiries = inquiries.filter((item) => {
    if (!item || (item as any).test === true || (item as any).test === 'true') return false;
    const cleanMob = String(item.userMobile || (item as any).phone || (item as any).mobile || '').replace(/[^0-9]/g, '').slice(-10);
    const hasValidMob = isRealMobileNumber(cleanMob);
    const cleanEmail = item.userEmail || (item as any).email || '';
    const name = String(item.userName || (item as any).name || (item as any).fullName || '').trim();
    const hasRealName = !isGenericOrDummyName(name);
    const hasProperty = Boolean(item.sellerDetails?.firstProperty || (item as any).firstProperty);
    const hasDetails = Boolean(item.builderDetails || item.agentDetails || item.buyerDetails || item.supplierDetails);

    // If an entry has no mobile, no email, no real name, and no property/business details, it is a ghost
    if (!hasValidMob && !cleanMob && !cleanEmail && !hasRealName && !hasProperty && !hasDetails) {
      return false;
    }
    return true;
  });

  // Filtered List
  const filtered = validInquiries.filter((item) => {
    if (statusFilter === 'approved') {
      if (!isItemApproved(item.status)) return false;
    } else if (statusFilter === 'pending') {
      if (item.status !== 'pending') return false;
    } else if (statusFilter === 'rejected') {
      if (item.status !== 'rejected') return false;
    }

    if (roleFilter !== 'all' && item.requestedRole !== roleFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (item.userName || '').toLowerCase();
      const mobile = (item.userMobile || '').toLowerCase();
      const code = (item.userCode || '').toLowerCase();
      return name.includes(term) || mobile.includes(term) || code.includes(term);
    }
    return true;
  });

  const pendingCount = validInquiries.filter((i) => i.status === 'pending').length;
  const approvedCount = validInquiries.filter((i) => isItemApproved(i.status)).length;
  const sellerRequestsCount = validInquiries.filter((i) => i.requestedRole === 'seller').length;

  return (
    <div className="space-y-8 text-left">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1">
            {isMr ? 'भूमिका अपग्रेड विनंत्या (Role Requests)' : 'Role Upgrade & Onboarding Requests'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isMr
              ? 'अतिथी व वापरकर्त्यांकडून आलेले विक्रेता (Seller), एजंट (Agent) व खरेदीदार (Buyer) अर्ज तपासा व मंजूर करा.'
              : 'Review and approve role upgrade inquiries from guest users. Approving a seller automatically activates their 1st property!'}
          </p>
        </div>
      </div>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UICard className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {isMr ? 'एकूण विनंत्या' : 'Total Requests'}
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{validInquiries.length}</div>
        </UICard>

        <UICard className="p-5 bg-white border border-amber-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
            <span>{isMr ? 'प्रलंबित मंजुरी' : 'Pending Approval'}</span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700">{pendingCount}</div>
        </UICard>

        <UICard className="p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
            <span>{isMr ? 'मंजूर विक्रेते / इतर' : 'Approved Requests'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700">{approvedCount}</div>
        </UICard>

        <UICard className="p-5 bg-white border border-blue-100 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
            <span>{isMr ? 'विक्रेता अर्ज' : 'Seller Requests'}</span>
            <Home className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-blue-700">{sellerRequestsCount}</div>
        </UICard>
      </div>

      {/* ── FILTERS BAR ── */}
      <UICard className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase">{isMr ? 'स्थिती:' : 'Status:'}</span>
          <div className="flex gap-1.5">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-slate-400 uppercase ml-2">{isMr ? 'भूमिका:' : 'Role:'}</span>
          <div className="w-52">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: 'all', label: isMr ? 'सर्व भूमिका (All Roles)' : 'All Roles' },
                { value: 'buyer', label: 'Buyer (खरेदीदार)' },
                { value: 'seller', label: 'Seller (विक्रेता)' },
                { value: 'builder', label: 'Builder (बिल्डर)' },
                { value: 'agent', label: 'Agent (एजंट)' },
                { value: 'supplier', label: 'Supplier (पुरवठादार)' },
                { value: 'representative', label: 'Representative (प्रतिनिधी)' }
              ]}
              className="py-1.5 text-xs font-bold"
            />
          </div>
        </div>

        <div className="w-full sm:w-72">
          <Input
            icon={Search}
            placeholder={isMr ? 'नाव किंवा मोबाईलने शोधा...' : 'Search by name or mobile...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </UICard>

      {/* ── TABLE ── */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* MOBILE CARDS VIEW (Only visible on mobile screens < 1024px) */}
          <div className="block lg:hidden space-y-4">
            {filtered.length === 0 ? (
              <UICard className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                {isMr ? 'कोणतीही विनंती सापडली नाही' : 'No role requests found matching your filter.'}
              </UICard>
            ) : (
              filtered.map((item) => {
                const isPending = item.status === 'pending';
                const isApproved = isItemApproved(item.status);
                const firstProp = item.sellerDetails?.firstProperty;

                return (
                  <UICard
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-left space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-base">{item.userName || (item as any).name || (item as any).fullName || 'Applicant'}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.userCode || (item.id && !item.id.startsWith('app_') ? item.id : item.userMobile ? `ID: ${item.userMobile}` : item.userId || '-')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            item.requestedRole === 'seller'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : item.requestedRole === 'buyer'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : item.requestedRole === 'builder'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : item.requestedRole === 'supplier'
                              ? 'bg-orange-50 border-orange-200 text-orange-700'
                              : item.requestedRole === 'agent'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {item.requestedRole || 'User'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isApproved
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : isPending
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          {isApproved ? 'Approved' : item.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">{isMr ? 'मोबाईल' : 'Mobile'}</span>
                        <a href={`tel:${item.userMobile}`} className="font-bold text-slate-800 hover:text-primary">
                          {item.userMobile || 'N/A'}
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">{isMr ? 'तारीख' : 'Date'}</span>
                        <span className="font-mono text-slate-600">
                          {new Date(item.createdAt || 0).toLocaleDateString()}
                        </span>
                      </div>
                      {item.userEmail && (
                        <div className="col-span-2 truncate">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Email</span>
                          <span className="text-slate-600">{item.userEmail}</span>
                        </div>
                      )}
                    </div>

                    {firstProp && (
                      <div className="text-xs bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            🏠 {firstProp.title || firstProp.propertyName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingProperty({ prop: firstProp, inquiry: item })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isMr ? 'मालमत्ता पहा' : 'See Property'}</span>
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-600 block">
                          {firstProp.category} • ₹{Number(firstProp.expectedPrice || firstProp.monthlyRent || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedInquiry(item);
                          setIsDetailOpen(true);
                        }}
                        className="flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isMr ? 'तपशील' : 'Details'}</span>
                      </Button>

                      {isPending && (
                        <>
                          <Button
                            variant="primary"
                            disabled={actionLoading}
                            onClick={() => handleApprove(item)}
                            className="flex-1 text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isMr ? 'मंजूर' : 'Approve'}</span>
                          </Button>
                          <Button
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => openRejectModal(item)}
                            className="text-xs py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1 px-2.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isMr ? 'नाकारा' : 'Reject'}</span>
                          </Button>
                        </>
                      )}

                      <Button
                        variant="outline"
                        disabled={actionLoading || deleteLoading}
                        onClick={() => setDeletingInquiry(item)}
                        className="text-xs py-1.5 border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center px-2.5"
                        title={isMr ? 'हटवा' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </UICard>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Only visible on screens >= 1024px) */}
          <UICard className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left border-collapse">
                <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">{isMr ? 'अर्जदार / नाव' : 'Applicant Name'}</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">{isMr ? 'मोबाईल व ईमेल' : 'Contact'}</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">{isMr ? 'मागितलेली भूमिका' : 'Requested Role'}</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">{isMr ? 'पहिली मालमत्ता (Seller)' : '1st Property Details'}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{isMr ? 'तारीख' : 'Date'}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{isMr ? 'स्थिती' : 'Status'}</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">{isMr ? 'कृती' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-650 bg-white">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        {isMr ? 'कोणतीही विनंती सापडली नाही' : 'No role requests found matching your filter.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const isPending = item.status === 'pending';
                      const isApproved = isItemApproved(item.status);
                      const firstProp = item.sellerDetails?.firstProperty;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 text-sm">
                              {item.userName || (item as any).name || (item as any).fullName || 'Applicant'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {item.userCode || (item.id && !item.id.startsWith('app_') ? item.id : item.userMobile ? `ID: ${item.userMobile}` : item.userId || '-')}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-800">{item.userMobile || (item as any).phone || (item as any).mobile || '-'}</div>
                            <div className="text-[11px] text-slate-400">{item.userEmail || (item as any).email || '-'}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                item.requestedRole === 'seller'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : item.requestedRole === 'buyer'
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : item.requestedRole === 'builder'
                                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                                  : item.requestedRole === 'supplier'
                                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                                  : item.requestedRole === 'agent'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              {item.requestedRole || 'User'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {firstProp ? (
                              <div className="max-w-xs space-y-1">
                                <span className="font-semibold text-slate-900 block truncate">
                                  🏠 {firstProp.title || firstProp.propertyName}
                                </span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-slate-500">
                                    {firstProp.category} • ₹{Number(firstProp.expectedPrice || firstProp.monthlyRent || 0).toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setViewingProperty({ prop: firstProp, inquiry: item })}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                                    title={isMr ? 'मालमत्ता पहा' : 'See Property'}
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>{isMr ? 'पहा' : 'See'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="px-3 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(item.createdAt || 0).toLocaleDateString()}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isApproved
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : isPending
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}
                            >
                              {isApproved ? 'Approved' : item.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInquiry(item);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                                title={isMr ? 'तपशील पहा' : 'View Details'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(item)}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                    title={isMr ? 'मंजूर करा' : 'Approve Role & Publish Property'}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openRejectModal(item)}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                    title={isMr ? 'नाकारा' : 'Reject Request'}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => setDeletingInquiry(item)}
                                disabled={actionLoading || deleteLoading}
                                className="p-1.5 rounded-lg border bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title={isMr ? 'हटवा' : 'Delete Request'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </UICard>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        maxWidth="max-w-2xl"
        footer={selectedInquiry && (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <button
              type="button"
              onClick={() => setDeletingInquiry(selectedInquiry)}
              className="h-10 px-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isMr ? 'हटवा' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isMr ? 'हटवा' : 'Delete'}</span>
            </button>

            {selectedInquiry.status === 'pending' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => openRejectModal(selectedInquiry)}
                  className="h-10 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isMr ? 'नाकारा' : 'Reject'}</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApprove(selectedInquiry)}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span className="whitespace-nowrap">{isMr ? 'मंजूर करा' : 'Approve Role'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      >
        {selectedInquiry && (() => {
          const firstProp = selectedInquiry.sellerDetails?.firstProperty;
          const propLoc = firstProp ? [firstProp.cityVillage, firstProp.taluka, firstProp.district].filter(Boolean).join(', ') || '-' : '-';
          const propPrice = Number(firstProp?.expectedPrice || firstProp?.monthlyRent || 0);
          const builtUpStr = firstProp?.builtUpArea ? `${firstProp.builtUpArea} sqft` : '-';
          const carpetStr = firstProp?.carpetArea ? `${firstProp.carpetArea} sqft` : '-';
          const plotAreaStr = firstProp?.plotAreaSqFt
            ? `${firstProp.plotAreaSqFt} sqft${firstProp.plotAreaGuntha ? ` (${firstProp.plotAreaGuntha} Guntha)` : ''}`
            : firstProp?.plotAreaGuntha
            ? `${firstProp.plotAreaGuntha} Guntha`
            : '-';

          return (
            <div className="text-left space-y-4">
              <div className="border-b border-slate-100 pb-3 pr-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                    {selectedInquiry.requestedRole.toUpperCase()} Application
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                      isItemApproved(selectedInquiry.status)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : selectedInquiry.status === 'rejected'
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {selectedInquiry.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-serif text-slate-900 mt-1.5">
                  {selectedInquiry.userName || 'Applicant'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span>📱 {selectedInquiry.userMobile || '-'}</span>
                  {selectedInquiry.userEmail && <span>• ✉️ {selectedInquiry.userEmail}</span>}
                </p>
              </div>

              {/* SELLER FIRST PROPERTY DISPLAY */}
              {selectedInquiry.requestedRole === 'seller' && firstProp && (
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-primary" />
                      <span>{isMr ? 'नोंदणीकृत पहिली मालमत्ता' : 'Submitted First Property for Listing'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingProperty({ prop: firstProp, inquiry: selectedInquiry })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isMr ? 'मालमत्ता पहा' : 'See Property'}</span>
                    </button>
                  </div>

                  <div className="text-base font-bold text-slate-900">
                    {firstProp.title || firstProp.propertyName || 'Property for Listing'}
                  </div>

                  <div className="text-sm font-extrabold text-primary">
                    {propPrice > 0 ? `₹${propPrice.toLocaleString('en-IN')}` : (isMr ? 'किंमत विचारणा करा' : 'Price on Request')}
                  </div>

                  {/* Dynamic Category Specifications (clean, only active rows) */}
                  {firstProp.category === 'Plot' ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <div><strong>Category:</strong> 📐 Plot / लेआउट प्लॉट</div>
                      <div><strong>Type:</strong> For Sale</div>
                      <div><strong>Location:</strong> {propLoc}</div>
                      {plotAreaStr !== '-' && <div><strong>Plot Area:</strong> {plotAreaStr}</div>}
                      {firstProp.plotDimensions && <div><strong>Dimensions:</strong> {firstProp.plotDimensions}</div>}
                      {firstProp.facingDirection && <div><strong>Facing:</strong> {firstProp.facingDirection}</div>}
                      {firstProp.roadWidth && <div><strong>Front Road:</strong> {firstProp.roadWidth}</div>}
                      {firstProp.plotSanctionType && <div><strong>NA Status:</strong> {firstProp.plotSanctionType}</div>}
                      {firstProp.boundaryWall && <div><strong>Fencing:</strong> {firstProp.boundaryWall}</div>}
                    </div>
                  ) : firstProp.category === 'Land' ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <div><strong>Category:</strong> 🌾 Agricultural / शेती जमीन</div>
                      <div><strong>Type:</strong> For Sale</div>
                      <div><strong>Location:</strong> {propLoc}</div>
                      {firstProp.landArea && <div><strong>Total Land Area:</strong> {firstProp.landArea}</div>}
                      {firstProp.landType && <div><strong>Land Zone / Type:</strong> {firstProp.landType}</div>}
                      {firstProp.waterSource && <div><strong>Water Source:</strong> {firstProp.waterSource}</div>}
                      {firstProp.roadAccess && <div><strong>Road Access:</strong> {firstProp.roadAccess}</div>}
                      {firstProp.electricity && <div><strong>Electricity:</strong> {firstProp.electricity}</div>}
                      {firstProp.titleClear && <div><strong>7/12 Title:</strong> {firstProp.titleClear}</div>}
                    </div>
                  ) : firstProp.category === 'Flat' ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <div><strong>Category:</strong> 🏢 Flat / Apartment</div>
                      <div><strong>Type:</strong> {firstProp.type === 'rent' ? 'For Rent' : 'For Sale'}</div>
                      <div><strong>Location:</strong> {propLoc}</div>
                      {builtUpStr !== '-' && <div><strong>Built-up:</strong> {builtUpStr}</div>}
                      {carpetStr !== '-' && <div><strong>Carpet:</strong> {carpetStr}</div>}
                      {firstProp.flatType && <div><strong>BHK:</strong> {firstProp.flatType}</div>}
                      {firstProp.floorNo && <div><strong>Floor:</strong> {firstProp.floorNo}</div>}
                      {firstProp.furnishingStatus && <div><strong>Furnishing:</strong> {firstProp.furnishingStatus}</div>}
                      {firstProp.carParking && <div><strong>Car Parking:</strong> Yes</div>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <div><strong>Category:</strong> 🏠 {firstProp.category || 'House'}</div>
                      <div><strong>Type:</strong> {firstProp.type === 'rent' ? 'For Rent' : 'For Sale'}</div>
                      <div><strong>Location:</strong> {propLoc}</div>
                      {builtUpStr !== '-' && <div><strong>Built-up:</strong> {builtUpStr}</div>}
                      {plotAreaStr !== '-' && <div><strong>Plot Area:</strong> {plotAreaStr}</div>}
                      {firstProp.flatType && <div><strong>BHK:</strong> {firstProp.flatType}</div>}
                      {firstProp.totalFloors && <div><strong>Floors:</strong> {firstProp.totalFloors}</div>}
                      {firstProp.furnishingStatus && <div><strong>Furnishing:</strong> {firstProp.furnishingStatus}</div>}
                      {firstProp.carParking && <div><strong>Car Parking:</strong> Yes</div>}
                    </div>
                  )}

                  {firstProp.description && (
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 italic">
                      "{firstProp.description}"
                    </p>
                  )}

                  {firstProp.images && firstProp.images.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        📷 {isMr ? 'फोटो (क्लिक करून मोठे पहा)' : `Photos (${firstProp.images.length})`}
                      </span>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {firstProp.images.map((img: string, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setViewingProperty({ prop: firstProp, inquiry: selectedInquiry, activeImageIdx: i })}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:ring-2 hover:ring-primary/40 transition-all"
                            title={isMr ? 'फोटो पहा' : 'View photo'}
                          >
                            <img src={img} alt="Property" className="w-16 h-12 object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BUYER DETAILS DISPLAY */}
              {selectedInquiry.requestedRole === 'buyer' && selectedInquiry.buyerDetails && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 uppercase">Buyer Preferences</div>
                  <div><strong>Category:</strong> {selectedInquiry.buyerDetails.propertyCategory}</div>
                  <div><strong>Budget:</strong> ₹{selectedInquiry.buyerDetails.budgetMin || 0} - ₹{selectedInquiry.buyerDetails.budgetMax || 0}</div>
                  <div><strong>Preferred Area:</strong> {[selectedInquiry.buyerDetails.preferredCity, selectedInquiry.buyerDetails.preferredTaluka].filter(Boolean).join(', ') || '-'}</div>
                  <div><strong>Timeline:</strong> {selectedInquiry.buyerDetails.urgencyTimeline || '-'}</div>
                  {selectedInquiry.buyerDetails.notes && <div><strong>Notes:</strong> {selectedInquiry.buyerDetails.notes}</div>}
                </div>
              )}

              {/* AGENT DETAILS DISPLAY */}
              {selectedInquiry.requestedRole === 'agent' && selectedInquiry.agentDetails && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 uppercase">Agent Credentials</div>
                  <div><strong>Agency:</strong> {selectedInquiry.agentDetails.agencyName || 'Independent'}</div>
                  <div><strong>Experience:</strong> {selectedInquiry.agentDetails.experienceYears || 1} Years</div>
                  <div><strong>RERA:</strong> {selectedInquiry.agentDetails.reraNumber || 'None'}</div>
                  <div><strong>Specialization:</strong> {selectedInquiry.agentDetails.specialization || '-'}</div>
                </div>
              )}

              {/* BUILDER DETAILS DISPLAY */}
              {selectedInquiry.requestedRole === 'builder' && selectedInquiry.builderDetails && (
                <div className="space-y-3 bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-purple-900 uppercase">🏢 Builder Profile & 1st Project</div>
                    {selectedInquiry.builderDetails.firstProject && (
                      <button
                        type="button"
                        onClick={() => setViewingProperty({ prop: selectedInquiry.builderDetails!.firstProject, inquiry: selectedInquiry })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isMr ? 'प्रकल्प पहा' : 'See Project'}</span>
                      </button>
                    )}
                  </div>
                  <div><strong>Company:</strong> {selectedInquiry.builderDetails.companyName}</div>
                  <div><strong>RERA:</strong> {selectedInquiry.builderDetails.reraNumber || 'None'}</div>
                  <div><strong>Experience:</strong> {selectedInquiry.builderDetails.experienceYears || 1} Years</div>
                  <div><strong>Office:</strong> {selectedInquiry.builderDetails.officeAddress || `${selectedInquiry.builderDetails.taluka || ''}, ${selectedInquiry.builderDetails.district || ''}`}</div>
                  {selectedInquiry.builderDetails.firstProject && (
                    <div className="mt-2 pt-2 border-t border-purple-200 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-purple-800">1st Project: {selectedInquiry.builderDetails.firstProject.title}</div>
                        <div>Price: ₹{Number(selectedInquiry.builderDetails.firstProject.expectedPrice || 0).toLocaleString('en-IN')}</div>
                        <div>Location: {[selectedInquiry.builderDetails.firstProject.cityVillage, selectedInquiry.builderDetails.firstProject.district].filter(Boolean).join(', ')}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingProperty({ prop: selectedInquiry.builderDetails!.firstProject, inquiry: selectedInquiry })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isMr ? 'प्रकल्प पहा' : 'See Project'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUPPLIER DETAILS DISPLAY */}
              {selectedInquiry.requestedRole === 'supplier' && selectedInquiry.supplierDetails && (
                <div className="space-y-3 bg-orange-50/70 p-4 rounded-2xl border border-orange-200 text-xs text-slate-700">
                  <div className="font-bold text-orange-900 uppercase">🛠️ Material Supplier Profile</div>
                  <div><strong>Business Name:</strong> {selectedInquiry.supplierDetails.businessName}</div>
                  <div><strong>Supply Category:</strong> {selectedInquiry.supplierDetails.category === 'All' ? 'All (सर्व साहित्य प्रकार)' : selectedInquiry.supplierDetails.category}</div>
                  <div><strong>GST Number:</strong> {selectedInquiry.supplierDetails.gstNumber || 'Not provided'}</div>
                  <div><strong>Shop / Godown:</strong> {selectedInquiry.supplierDetails.officeAddress || '-'}</div>
                  <div><strong>Delivery Available:</strong> {selectedInquiry.supplierDetails.deliveryAvailable ? 'Yes' : 'Pickup Only'}</div>
                  {selectedInquiry.supplierDetails.notes && <div><strong>Notes:</strong> {selectedInquiry.supplierDetails.notes}</div>}
                </div>
              )}
            </div>
          );
        })()}
      </Dialog>

      {/* ── PROPERTY PREVIEW / INSPECTION MODAL ── */}
      <Dialog
        isOpen={Boolean(viewingProperty)}
        onClose={() => setViewingProperty(null)}
        maxWidth="max-w-3xl"
        footer={viewingProperty && (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setViewingProperty(null)}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              {isMr ? 'बंद करा' : 'Back to Details'}
            </Button>

            {viewingProperty.inquiry.status === 'pending' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    const inq = viewingProperty.inquiry;
                    setViewingProperty(null);
                    openRejectModal(inq);
                  }}
                  className="h-10 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isMr ? 'नाकारा' : 'Reject'}</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    const inq = viewingProperty.inquiry;
                    setViewingProperty(null);
                    handleApprove(inq);
                  }}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span className="whitespace-nowrap">{isMr ? 'मंजूर करा व प्रकाशित करा' : 'Approve & Publish'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      >
        {viewingProperty && (() => {
          const prop = viewingProperty.prop;
          const inq = viewingProperty.inquiry;
          const price = Number(prop?.expectedPrice || prop?.monthlyRent || prop?.price || 0);
          const isRent = prop?.type === 'rent';
          const locStr = [prop?.cityVillage, prop?.taluka, prop?.district, 'Maharashtra'].filter(Boolean).join(', ');

          const images: string[] = [
            ...(Array.isArray(prop?.images) ? prop.images : prop?.images ? [prop.images] : []),
            ...(Array.isArray(prop?.photos) ? prop.photos : prop?.photos ? [prop.photos] : []),
            ...(prop?.imageUrl ? [prop.imageUrl] : []),
            ...(prop?.image ? [prop.image] : [])
          ].filter((u): u is string => typeof u === 'string' && Boolean(u.trim()));

          const activeImg = images[activeImageIdx] || images[0];

          const mapQuery = encodeURIComponent([prop?.title, prop?.fullAddress, prop?.cityVillage, prop?.taluka, prop?.district, 'Maharashtra'].filter(Boolean).join(', '));
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

          return (
            <div className="text-left space-y-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-4 pr-10">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                    {prop?.category || 'Property'} • {isRent ? 'For Rent' : 'For Sale'}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                      isItemApproved(inq.status)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : inq.status === 'rejected'
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {isItemApproved(inq.status) ? 'Approved' : inq.status}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold font-serif text-slate-900">
                  {prop?.title || prop?.propertyName || 'Property for Listing'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1 text-slate-600 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    {locStr}
                  </span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Media Gallery / Images Carousel */}
              {images.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner group">
                    <img
                      src={activeImg}
                      alt={prop?.title || 'Property'}
                      className="w-full h-full object-contain md:object-cover"
                    />

                    {/* Image Counter Badge */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
                      📷 {activeImageIdx + 1} / {images.length}
                    </div>

                    {/* Navigation Arrows if > 1 */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                          aria-label="Previous Photo"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveImageIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                          aria-label="Next Photo"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            activeImageIdx === idx
                              ? 'border-primary ring-2 ring-primary/20 scale-95'
                              : 'border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200/60 text-slate-400 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {isMr ? 'अर्जदाराने कोणतेही फोटो जोडलेले नाहीत' : 'No Property Photos Attached'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {isMr
                      ? 'अर्जदाराने नोंदणी करताना फोटो जोडलेले नाहीत. मंजुरीनंतर किंवा संपर्काद्वारे फोटो अपडेट करता येतील.'
                      : 'The applicant did not attach image files during registration. Photos can be requested or updated upon approval.'}
                  </p>
                </div>
              )}

              {/* Price & Primary Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {isRent ? 'Monthly Rent' : 'Expected Price'}
                  </span>
                  <div className="text-lg font-black text-primary">
                    {price > 0 ? `₹${price.toLocaleString('en-IN')}` : (isMr ? 'किंमत विचारणा' : 'On Request')}
                  </div>
                  {prop?.isNegotiable && (
                    <span className="text-[10px] font-semibold text-emerald-600">✓ {isMr ? 'वाटाघाटीयोग्य' : 'Negotiable'}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Property Type
                  </span>
                  <div className="text-sm font-bold text-slate-800">
                    {prop?.category || 'Residential'}
                  </div>
                  <span className="text-[11px] text-slate-500">{isRent ? 'For Rent' : 'For Sale'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Area / Size
                  </span>
                  <div className="text-sm font-bold text-slate-800">
                    {prop?.builtUpArea
                      ? `${prop.builtUpArea} sqft`
                      : prop?.plotAreaSqFt
                      ? `${prop.plotAreaSqFt} sqft`
                      : prop?.landArea || '-'}
                  </div>
                  {prop?.carpetArea && <span className="text-[10px] text-slate-500">Carpet: {prop.carpetArea} sqft</span>}
                  {prop?.plotAreaGuntha && <span className="text-[10px] text-slate-500">{prop.plotAreaGuntha} Guntha</span>}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Configuration
                  </span>
                  <div className="text-sm font-bold text-slate-800">
                    {prop?.flatType || (prop?.bedrooms ? `${prop.bedrooms} BHK` : prop?.category === 'Plot' ? 'Plot' : '-')}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {prop?.furnishingStatus || (prop?.carParking ? 'Parking Available' : '-')}
                  </span>
                </div>
              </div>

              {/* Comprehensive Details Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary" />
                  <span>{isMr ? 'तपशीलवार वैशिष्ट्ये' : 'Detailed Specifications'}</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400 block">Category</span>
                    <span className="font-bold text-slate-800">{prop?.category || 'House'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400 block">Transaction Type</span>
                    <span className="font-bold text-slate-800">{isRent ? 'For Rent' : 'For Sale'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400 block">City / Village</span>
                    <span className="font-bold text-slate-800">{prop?.cityVillage || inq.sellerDetails?.cityVillage || '-'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400 block">Taluka</span>
                    <span className="font-bold text-slate-800">{prop?.taluka || inq.sellerDetails?.taluka || '-'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400 block">District</span>
                    <span className="font-bold text-slate-800">{prop?.district || inq.sellerDetails?.district || 'Sangli'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-400 block">Car Parking</span>
                    <span className="font-bold text-slate-800">{prop?.carParking ? 'Yes (उपलब्ध)' : 'No'}</span>
                  </div>

                  {/* Category Specific specs */}
                  {prop?.builtUpArea ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Built-up Area</span>
                      <span className="font-bold text-slate-800">{prop.builtUpArea} sqft</span>
                    </div>
                  ) : null}

                  {prop?.carpetArea ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Carpet Area</span>
                      <span className="font-bold text-slate-800">{prop.carpetArea} sqft</span>
                    </div>
                  ) : null}

                  {prop?.bedrooms ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Bedrooms</span>
                      <span className="font-bold text-slate-800">{prop.bedrooms} BHK</span>
                    </div>
                  ) : null}

                  {prop?.bathrooms ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Bathrooms</span>
                      <span className="font-bold text-slate-800">{prop.bathrooms}</span>
                    </div>
                  ) : null}

                  {prop?.floorNo || prop?.floorNumber ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Floor Number</span>
                      <span className="font-bold text-slate-800">{prop.floorNo || prop.floorNumber}</span>
                    </div>
                  ) : null}

                  {prop?.totalFloors ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Total Floors</span>
                      <span className="font-bold text-slate-800">{prop.totalFloors}</span>
                    </div>
                  ) : null}

                  {prop?.furnishingStatus ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Furnishing</span>
                      <span className="font-bold text-slate-800">{prop.furnishingStatus}</span>
                    </div>
                  ) : null}

                  {/* Plot Specific */}
                  {prop?.plotAreaSqFt ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Plot Area</span>
                      <span className="font-bold text-slate-800">{prop.plotAreaSqFt} sqft {prop.plotAreaGuntha ? `(${prop.plotAreaGuntha} Guntha)` : ''}</span>
                    </div>
                  ) : null}

                  {prop?.plotDimensions ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Dimensions</span>
                      <span className="font-bold text-slate-800">{prop.plotDimensions}</span>
                    </div>
                  ) : null}

                  {prop?.facingDirection ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Facing Direction</span>
                      <span className="font-bold text-slate-800">{prop.facingDirection}</span>
                    </div>
                  ) : null}

                  {prop?.roadWidth ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Front Road</span>
                      <span className="font-bold text-slate-800">{prop.roadWidth}</span>
                    </div>
                  ) : null}

                  {prop?.plotSanctionType ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">NA Sanction</span>
                      <span className="font-bold text-slate-800">{prop.plotSanctionType}</span>
                    </div>
                  ) : null}

                  {prop?.boundaryWall ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Boundary Wall / Fencing</span>
                      <span className="font-bold text-slate-800">{prop.boundaryWall}</span>
                    </div>
                  ) : null}

                  {/* Land Specific */}
                  {prop?.landArea ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Total Land Area</span>
                      <span className="font-bold text-slate-800">{prop.landArea}</span>
                    </div>
                  ) : null}

                  {prop?.waterSource ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Water Source</span>
                      <span className="font-bold text-slate-800">{prop.waterSource}</span>
                    </div>
                  ) : null}

                  {prop?.electricity ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">Electricity</span>
                      <span className="font-bold text-slate-800">{prop.electricity}</span>
                    </div>
                  ) : null}

                  {prop?.titleClear ? (
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 block">7/12 Title Status</span>
                      <span className="font-bold text-slate-800">{prop.titleClear}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Full Address */}
              {prop?.fullAddress && (
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                    📍 {isMr ? 'संपूर्ण पत्ता' : 'Full Address & Location'}
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {prop.fullAddress}
                  </p>
                </div>
              )}

              {/* Description */}
              {prop?.description && (
                <div className="space-y-1.5 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/70 text-xs">
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block">
                    📝 {isMr ? 'वर्णन / माहिती' : 'Seller Description'}
                  </span>
                  <p className="text-slate-800 leading-relaxed italic">
                    "{prop.description}"
                  </p>
                </div>
              )}

              {/* Applicant / Owner Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isMr ? 'नोंदणीकृत अर्जदार' : 'Submitted By Applicant'}
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{inq.userName || 'Applicant'}</div>
                  <div className="text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                    <a href={`tel:${inq.userMobile}`} className="text-primary hover:underline font-mono font-bold">
                      📱 {inq.userMobile || '-'}
                    </a>
                    {inq.userEmail && <span>• ✉️ {inq.userEmail}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${inq.userMobile}`}
                    className="h-9 px-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call</span>
                  </a>
                  {inq.userEmail && (
                    <a
                      href={`mailto:${inq.userEmail}`}
                      className="h-9 px-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* ── REJECTION REASON MODAL ── */}
      <Dialog isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)}>
        <div className="p-6 text-left space-y-4">
          <h3 className="text-lg font-bold text-slate-900 font-serif">
            {isMr ? 'अर्ज नाकारण्याचे कारण' : 'Reason for Rejection'}
          </h3>
          <p className="text-xs text-slate-500">
            {isMr ? 'वापरकर्त्याला दाखवण्यासाठी नाकारण्याचे कारण प्रविष्ट करा:' : 'Enter a reason why this inquiry cannot be accepted:'}
          </p>
          <Input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Incomplete address, invalid contact details..."
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={actionLoading}
              onClick={handleConfirmReject}
            >
              {actionLoading ? 'Saving...' : isMr ? 'नाकारणे निश्चित करा' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Dialog isOpen={Boolean(deletingInquiry)} onClose={() => setDeletingInquiry(null)}>
        <div className="p-6 text-left space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                {isMr ? 'विनंती हटवायची आहे का?' : 'Delete Role Request?'}
              </h3>
              <p className="text-xs text-slate-500">
                {isMr ? 'ही विनंती डेटाबेसमधून कायमची हटवली जाईल.' : 'This role request will be permanently removed.'}
              </p>
            </div>
          </div>

          {deletingInquiry && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">
                {deletingInquiry.userName || 'Applicant'} •{' '}
                <span className="text-primary font-semibold uppercase">{deletingInquiry.requestedRole}</span>
              </div>
              <div className="text-slate-600 font-mono">
                {deletingInquiry.userMobile || '-'}{' '}
                {deletingInquiry.userEmail ? `• ${deletingInquiry.userEmail}` : ''}
              </div>
              {deletingInquiry.sellerDetails?.firstProperty && (
                <div className="text-amber-800 font-medium truncate pt-1 border-t border-slate-200/60 mt-1">
                  🏠 {deletingInquiry.sellerDetails.firstProperty.title || deletingInquiry.sellerDetails.firstProperty.propertyName}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeletingInquiry(null)} disabled={deleteLoading}>
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteLoading}
              onClick={() => deletingInquiry && handleDeleteInquiry(deletingInquiry)}
            >
              {deleteLoading ? (isMr ? 'हटवत आहे...' : 'Deleting...') : isMr ? 'हटवा' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

