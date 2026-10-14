import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  Eye,
  Clock,
  Search,
  Home,
  CheckCircle2
} from 'lucide-react';
import {
  subscribeToRoleInquiries,
  approveRoleInquiry,
  rejectRoleInquiry
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

  // Rejection Dialog
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingInquiry, setRejectingInquiry] = useState<RoleInquiry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  // Sanitized valid list (strictly filters out any test or ghost records)
  const validInquiries = inquiries.filter((item) => {
    if (!item || (item as any).test === true || (item as any).test === 'true') return false;
    const hasApplicant = Boolean(
      (item.userName && item.userName.trim()) ||
      ((item as any).name && (item as any).name.trim()) ||
      (item.userMobile && item.userMobile.trim()) ||
      ((item as any).phone && (item as any).phone.trim())
    );
    const hasRole = Boolean(item.requestedRole);
    return Boolean(hasApplicant || hasRole);
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
                        <div className="text-[10px] font-mono text-slate-400">{item.userCode || item.userId || '-'}</div>
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
                      <div className="text-xs bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl">
                        <span className="font-bold text-slate-900 block truncate">
                          🏠 {firstProp.title || firstProp.propertyName}
                        </span>
                        <span className="text-[11px] text-slate-600">
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
                            className="text-xs py-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isMr ? 'नाकारा' : 'Reject'}</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </UICard>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Only visible on screens >= 1024px) */}
          <UICard className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider">
                  <tr>
                    <th className="px-6 py-4">{isMr ? 'अर्जदार / नाव' : 'Applicant Name'}</th>
                    <th className="px-6 py-4">{isMr ? 'मोबाईल व ईमेल' : 'Contact'}</th>
                    <th className="px-6 py-4">{isMr ? 'मागितलेली भूमिका' : 'Requested Role'}</th>
                    <th className="px-6 py-4">{isMr ? 'पहिली मालमत्ता (Seller)' : '1st Property Details'}</th>
                    <th className="px-6 py-4">{isMr ? 'तारीख' : 'Date'}</th>
                    <th className="px-6 py-4">{isMr ? 'स्थिती' : 'Status'}</th>
                    <th className="px-6 py-4 text-right">{isMr ? 'कृती' : 'Actions'}</th>
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
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {item.userName || (item as any).name || (item as any).fullName || 'Applicant'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">{item.userCode || item.userId || '-'}</div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{item.userMobile || (item as any).phone || (item as any).mobile || '-'}</div>
                            <div className="text-[11px] text-slate-400">{item.userEmail || (item as any).email || '-'}</div>
                          </td>

                          <td className="px-6 py-4">
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

                          <td className="px-6 py-4">
                            {firstProp ? (
                              <div className="max-w-xs">
                                <span className="font-semibold text-slate-900 block truncate">
                                  🏠 {firstProp.title || firstProp.propertyName}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {firstProp.category} • ₹{Number(firstProp.expectedPrice || firstProp.monthlyRent || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                            {new Date(item.createdAt || 0).toLocaleDateString()}
                          </td>

                          <td className="px-6 py-4">
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

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInquiry(item);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1.5 rounded-lg border bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                                title="View Details"
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
                                    title="Approve Role & Publish Property"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openRejectModal(item)}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                    title="Reject Request"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
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
      <Dialog isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)}>
        {selectedInquiry && (
          <div className="p-6 text-left space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {selectedInquiry.requestedRole.toUpperCase()} Application
                </span>
                <h3 className="text-xl font-bold font-serif text-slate-900 mt-1">
                  {selectedInquiry.userName}
                </h3>
                <p className="text-xs text-slate-500">
                  📱 {selectedInquiry.userMobile} • ✉️ {selectedInquiry.userEmail}
                </p>
              </div>

              <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full border bg-slate-50">
                {selectedInquiry.status}
              </span>
            </div>

            {/* SELLER FIRST PROPERTY DISPLAY */}
            {selectedInquiry.requestedRole === 'seller' && selectedInquiry.sellerDetails?.firstProperty && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-primary" />
                  {isMr ? 'नोंदणीकृत पहिली मालमत्ता' : 'Submitted First Property for Listing'}
                </div>

                <div className="text-base font-bold text-slate-900">
                  {selectedInquiry.sellerDetails.firstProperty.title}
                </div>

                <div className="text-sm font-extrabold text-primary">
                  ₹{Number(selectedInquiry.sellerDetails.firstProperty.expectedPrice || selectedInquiry.sellerDetails.firstProperty.monthlyRent || 0).toLocaleString('en-IN')}
                </div>

                {/* Dynamic Category Specifications */}
                {selectedInquiry.sellerDetails.firstProperty.category === 'Plot' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                    <div><strong>Category:</strong> 📐 Plot / लेआउट प्लॉट</div>
                    <div><strong>Type:</strong> For Sale</div>
                    <div><strong>Location:</strong> {selectedInquiry.sellerDetails.firstProperty.cityVillage}, {selectedInquiry.sellerDetails.firstProperty.taluka}</div>
                    <div><strong>Plot Area:</strong> {selectedInquiry.sellerDetails.firstProperty.plotAreaSqFt || selectedInquiry.sellerDetails.firstProperty.builtUpArea || '-'} Sq.Ft ({selectedInquiry.sellerDetails.firstProperty.plotAreaGuntha || '-'} Guntha)</div>
                    <div><strong>Dimensions:</strong> {selectedInquiry.sellerDetails.firstProperty.plotDimensions || '-'}</div>
                    <div><strong>Facing:</strong> {selectedInquiry.sellerDetails.firstProperty.facingDirection || '-'}</div>
                    <div><strong>Front Road:</strong> {selectedInquiry.sellerDetails.firstProperty.roadWidth || '-'}</div>
                    <div><strong>NA Status:</strong> {selectedInquiry.sellerDetails.firstProperty.plotSanctionType || '-'}</div>
                    <div><strong>Fencing:</strong> {selectedInquiry.sellerDetails.firstProperty.boundaryWall || '-'}</div>
                  </div>
                ) : selectedInquiry.sellerDetails.firstProperty.category === 'Land' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                    <div><strong>Category:</strong> 🌾 Agricultural / शेती जमीन</div>
                    <div><strong>Type:</strong> For Sale</div>
                    <div><strong>Location:</strong> {selectedInquiry.sellerDetails.firstProperty.cityVillage}, {selectedInquiry.sellerDetails.firstProperty.taluka}</div>
                    <div><strong>Total Land Area:</strong> {selectedInquiry.sellerDetails.firstProperty.landArea || '-'}</div>
                    <div><strong>Land Zone / Type:</strong> {selectedInquiry.sellerDetails.firstProperty.landType || '-'}</div>
                    <div><strong>Water Source:</strong> {selectedInquiry.sellerDetails.firstProperty.waterSource || '-'}</div>
                    <div><strong>Road Access:</strong> {selectedInquiry.sellerDetails.firstProperty.roadAccess || '-'}</div>
                    <div><strong>Electricity:</strong> {selectedInquiry.sellerDetails.firstProperty.electricity || '-'}</div>
                    <div><strong>7/12 Title:</strong> {selectedInquiry.sellerDetails.firstProperty.titleClear || '-'}</div>
                  </div>
                ) : selectedInquiry.sellerDetails.firstProperty.category === 'Flat' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                    <div><strong>Category:</strong> 🏢 Flat / Apartment</div>
                    <div><strong>Type:</strong> {selectedInquiry.sellerDetails.firstProperty.type === 'rent' ? 'For Rent' : 'For Sale'}</div>
                    <div><strong>Location:</strong> {selectedInquiry.sellerDetails.firstProperty.cityVillage}, {selectedInquiry.sellerDetails.firstProperty.taluka}</div>
                    <div><strong>Built-up Area:</strong> {selectedInquiry.sellerDetails.firstProperty.builtUpArea} sqft</div>
                    <div><strong>Carpet Area:</strong> {selectedInquiry.sellerDetails.firstProperty.carpetArea || '-'} sqft</div>
                    <div><strong>BHK:</strong> {selectedInquiry.sellerDetails.firstProperty.flatType || (selectedInquiry.sellerDetails.firstProperty.bedrooms ? selectedInquiry.sellerDetails.firstProperty.bedrooms + 'BHK' : '-')}</div>
                    <div><strong>Floor:</strong> {selectedInquiry.sellerDetails.firstProperty.floorNo || '-'}</div>
                    <div><strong>Furnishing:</strong> {selectedInquiry.sellerDetails.firstProperty.furnishingStatus || '-'}</div>
                    <div><strong>Car Parking:</strong> {selectedInquiry.sellerDetails.firstProperty.carParking ? 'Yes' : 'No'}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                    <div><strong>Category:</strong> 🏠 {selectedInquiry.sellerDetails.firstProperty.category || 'House'}</div>
                    <div><strong>Type:</strong> {selectedInquiry.sellerDetails.firstProperty.type === 'rent' ? 'For Rent' : 'For Sale'}</div>
                    <div><strong>Location:</strong> {selectedInquiry.sellerDetails.firstProperty.cityVillage}, {selectedInquiry.sellerDetails.firstProperty.taluka}</div>
                    <div><strong>Built-up Area:</strong> {selectedInquiry.sellerDetails.firstProperty.builtUpArea} sqft</div>
                    {selectedInquiry.sellerDetails.firstProperty.plotAreaSqFt ? (
                      <div><strong>Plot Area:</strong> {selectedInquiry.sellerDetails.firstProperty.plotAreaSqFt} sqft</div>
                    ) : null}
                    <div><strong>BHK:</strong> {selectedInquiry.sellerDetails.firstProperty.flatType || (selectedInquiry.sellerDetails.firstProperty.bedrooms ? selectedInquiry.sellerDetails.firstProperty.bedrooms + 'BHK' : '-')}</div>
                    <div><strong>Floors:</strong> {selectedInquiry.sellerDetails.firstProperty.totalFloors || '-'}</div>
                    <div><strong>Furnishing:</strong> {selectedInquiry.sellerDetails.firstProperty.furnishingStatus || '-'}</div>
                    <div><strong>Car Parking:</strong> {selectedInquiry.sellerDetails.firstProperty.carParking ? 'Yes' : 'No'}</div>
                  </div>
                )}

                {selectedInquiry.sellerDetails.firstProperty.description && (
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                    "{selectedInquiry.sellerDetails.firstProperty.description}"
                  </p>
                )}

                {selectedInquiry.sellerDetails.firstProperty.images && selectedInquiry.sellerDetails.firstProperty.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-2">
                    {selectedInquiry.sellerDetails.firstProperty.images.map((img, i) => (
                      <img key={i} src={img} alt="Property" className="w-20 h-16 object-cover rounded-lg border border-slate-200 shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BUYER DETAILS DISPLAY */}
            {selectedInquiry.requestedRole === 'buyer' && selectedInquiry.buyerDetails && (
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                <div className="font-bold text-slate-900 uppercase">Buyer Preferences</div>
                <div><strong>Category:</strong> {selectedInquiry.buyerDetails.propertyCategory}</div>
                <div><strong>Budget:</strong> ₹{selectedInquiry.buyerDetails.budgetMin} - ₹{selectedInquiry.buyerDetails.budgetMax}</div>
                <div><strong>Preferred Area:</strong> {selectedInquiry.buyerDetails.preferredCity}, {selectedInquiry.buyerDetails.preferredTaluka}</div>
                <div><strong>Timeline:</strong> {selectedInquiry.buyerDetails.urgencyTimeline}</div>
                {selectedInquiry.buyerDetails.notes && <div><strong>Notes:</strong> {selectedInquiry.buyerDetails.notes}</div>}
              </div>
            )}

            {/* AGENT DETAILS DISPLAY */}
            {selectedInquiry.requestedRole === 'agent' && selectedInquiry.agentDetails && (
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                <div className="font-bold text-slate-900 uppercase">Agent Credentials</div>
                <div><strong>Agency:</strong> {selectedInquiry.agentDetails.agencyName || 'Independent'}</div>
                <div><strong>Experience:</strong> {selectedInquiry.agentDetails.experienceYears} Years</div>
                <div><strong>RERA:</strong> {selectedInquiry.agentDetails.reraNumber || 'None'}</div>
                <div><strong>Specialization:</strong> {selectedInquiry.agentDetails.specialization}</div>
              </div>
            )}

            {/* BUILDER DETAILS DISPLAY */}
            {selectedInquiry.requestedRole === 'builder' && selectedInquiry.builderDetails && (
              <div className="space-y-3 bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-xs text-slate-700">
                <div className="font-bold text-purple-900 uppercase">🏢 Builder Profile & 1st Project</div>
                <div><strong>Company:</strong> {selectedInquiry.builderDetails.companyName}</div>
                <div><strong>RERA:</strong> {selectedInquiry.builderDetails.reraNumber || 'None'}</div>
                <div><strong>Experience:</strong> {selectedInquiry.builderDetails.experienceYears} Years</div>
                <div><strong>Office:</strong> {selectedInquiry.builderDetails.officeAddress || `${selectedInquiry.builderDetails.taluka}, ${selectedInquiry.builderDetails.district}`}</div>
                {selectedInquiry.builderDetails.firstProject && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <div className="font-semibold text-purple-800">1st Project: {selectedInquiry.builderDetails.firstProject.title}</div>
                    <div>Price: ₹{Number(selectedInquiry.builderDetails.firstProject.expectedPrice || 0).toLocaleString('en-IN')}</div>
                    <div>Location: {selectedInquiry.builderDetails.firstProject.cityVillage}, {selectedInquiry.builderDetails.firstProject.district}</div>
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

            {/* ACTION BUTTONS */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                {isMr ? 'बंद करा' : 'Close'}
              </Button>

              {selectedInquiry.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={() => openRejectModal(selectedInquiry)}
                  >
                    {isMr ? 'नाकारा' : 'Reject'}
                  </Button>
                  <Button
                    variant="primary"
                    disabled={actionLoading}
                    onClick={() => handleApprove(selectedInquiry)}
                  >
                    {isMr ? 'मंजूर करा (Approve Role)' : 'Approve & Activate Role'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
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
    </div>
  );
};
