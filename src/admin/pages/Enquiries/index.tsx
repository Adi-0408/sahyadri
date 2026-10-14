import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  subscribeToCollection,
  updateDocument,
  deleteDocument
} from '../../../services/firebase';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import {
  Check, Trash2, Mail, Phone, MessageCircle, UserCheck,
  UserPlus, X, Share2
} from 'lucide-react';

export const EnquiriesManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State for Assigning Representative
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Subscribe to enquiries
    const unsubEnquiries = subscribeToCollection('enquiries', (list) => {
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setEnquiries(sorted);
      setLoading(false);
    });

    // Subscribe to representatives
    const unsubReps = subscribeToCollection('representatives', (list) => {
      setRepresentatives(list || []);
    });

    return () => {
      if (typeof unsubEnquiries === 'function') unsubEnquiries();
      if (typeof unsubReps === 'function') unsubReps();
    };
  }, []);

  const handleResolve = async (enq: any) => {
    try {
      const newStatus = enq.status === 'resolved' ? 'pending' : 'resolved';
      await updateDocument('enquiries', enq.id, { status: newStatus });
      setEnquiries(enquiries.map((e) => e.id === enq.id ? { ...e, status: newStatus } : e));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (enqId: string) => {
    if (!window.confirm(t('admin.enquiries.confirmDelete', 'आपण खात्रीने ही लीड डिलीट करू इच्छिता?'))) return;
    try {
      await deleteDocument('enquiries', enqId);
      setEnquiries(enquiries.filter((e) => e.id !== enqId));
    } catch (e) {
      console.error(e);
    }
  };

  const openAssignModal = (enq: any) => {
    setSelectedEnquiry(enq);
    setSelectedRepId(enq.assignedRepresentativeId || (representatives[0]?.id || ''));
    setAssignModalOpen(true);
  };

  const handleAssignSave = async () => {
    if (!selectedEnquiry) return;
    setAssignSaving(true);
    try {
      if (!selectedRepId) {
        // Clear assignment
        await updateDocument('enquiries', selectedEnquiry.id, {
          assignedRepresentativeId: null,
          assignedRepresentativeName: null,
          assignedRepresentativePhone: null,
          assignedRepresentativeCode: null,
          assignedAt: null
        });
      } else {
        const rep = representatives.find((r) => r.id === selectedRepId);
        if (rep) {
          await updateDocument('enquiries', selectedEnquiry.id, {
            assignedRepresentativeId: rep.id,
            assignedRepresentativeName: rep.name,
            assignedRepresentativePhone: rep.mobile,
            assignedRepresentativeCode: rep.code || '',
            assignedAt: new Date().toISOString()
          });
        }
      }
      setAssignModalOpen(false);
    } catch (err) {
      console.error('Error assigning representative:', err);
    } finally {
      setAssignSaving(false);
    }
  };

  const generateWhatsAppShareUrl = (enq: any, repPhone: string, repName: string) => {
    const text = isMr
      ? `नमस्कार ${repName || 'प्रतिनिधी'},\n` +
        `सह्याद्री लँड डेव्हलपर कडून नवीन ग्राहक चौकशी (Lead):\n\n` +
        `👤 ग्राहक: ${enq.name || 'ग्राहक'}\n` +
        `📞 मोबाईल: ${enq.phone || 'उपलब्ध नाही'}\n` +
        (enq.propertyName ? `🏠 मालमत्ता: ${enq.propertyName}\n` : '') +
        (enq.message ? `💬 संदेश: ${enq.message}\n` : '') +
        `\nकृपया ग्राहकांशी त्वरित संपर्क साधून मदत करावी.\n- सह्याद्री लँड डेव्हलपर`
      : `Hello ${repName || 'Representative'},\n` +
        `New client lead from Sahyadri Land Developer:\n\n` +
        `👤 Client: ${enq.name || 'Client'}\n` +
        `📞 Mobile: ${enq.phone || 'N/A'}\n` +
        (enq.propertyName ? `🏠 Property: ${enq.propertyName}\n` : '') +
        (enq.message ? `💬 Message: ${enq.message}\n` : '') +
        `\nPlease contact the client promptly.\n- Sahyadri Land Developer`;
    return `https://wa.me/91${String(repPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
  };

  const totalPages = Math.ceil(enquiries.length / itemsPerPage);
  const paginatedEnquiries = enquiries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const selectedRepObj = representatives.find((r) => r.id === selectedRepId);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
            {t('admin.enquiries.title', 'लीड्स आणि चौकशी (Leads)')}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {t('admin.enquiries.desc', 'ग्राहकांच्या सर्व चौकशींचे व्यवस्थापन करा आणि योग्य प्रतिनिधीकडे सोपवा.')}
          </p>
        </div>
        <Link to="/admin/role-requests">
          <Button variant="secondary" className="text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span>📋</span>
            <span>{isMr ? 'भूमिका विनंत्या पहा (Role Requests)' : 'View Role Requests'}</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <UICard className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f19] text-[10px] uppercase font-bold text-white tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-4">{t('admin.enquiries.table.id', 'लीड आयडी')}</th>
                  <th className="px-5 py-4">{t('admin.enquiries.table.category', 'मालमत्ता / श्रेणी')}</th>
                  <th className="px-5 py-4">{t('admin.enquiries.table.contact', 'ग्राहक संपर्क माहिती')}</th>
                  <th className="px-5 py-4">{t('admin.enquiries.table.message', 'संदेश')}</th>
                  <th className="px-5 py-4">{t('admin.enquiries.table.representative', 'प्रतिनिधी (Representative)')}</th>
                  <th className="px-5 py-4">{t('admin.enquiries.table.status', 'स्थिति')}</th>
                  <th className="px-5 py-4 text-right">{t('admin.enquiries.table.actions', 'कृती')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 bg-white">
                {paginatedEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">
                      {t('admin.enquiries.noEnquiries', 'अद्याप कोणतीही ग्राहक चौकशी नोंदवली गेलेली नाही.')}
                    </td>
                  </tr>
                ) : (
                  paginatedEnquiries.map((enq) => {
                    const hasRep = Boolean(enq.assignedRepresentativeName);

                    return (
                      <tr key={enq.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Lead ID */}
                        <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                          {enq.id}
                        </td>

                        {/* Property / Category */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 leading-tight">
                            {enq.propertyName || t('admin.enquiries.generalInquiry', 'सर्वसाधारण चौकशी')}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                            {enq.propertyId ? t('admin.enquiries.specificEstate', 'विशिष्ट मालमत्ता') : t('admin.enquiries.generalConcierge', 'सर्वसाधारण चौकशी')}
                          </p>
                        </td>

                        {/* Customer Contact */}
                        <td className="px-5 py-4 space-y-1">
                          <p className="font-bold text-slate-900">{enq.name}</p>
                          {enq.email && enq.email !== 'N/A' && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate max-w-[140px]">{enq.email}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${enq.phone}`}
                              className="text-[11px] font-semibold text-slate-700 hover:text-primary flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-primary shrink-0" />
                              {enq.phone}
                            </a>
                            {enq.phone && (
                              <a
                                href={`https://wa.me/91${String(enq.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(isMr ? 'नमस्कार, सह्याद्री लँड डेव्हलपर कडून.' : 'Hello, from Sahyadri Land Developer.')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                                title={isMr ? "व्हॉट्सॲपवर चॅट करा" : "Chat on WhatsApp"}
                              >
                                <MessageCircle className="w-2.5 h-2.5" /> WA
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Message */}
                        <td className="px-5 py-4 max-w-xs leading-relaxed text-slate-600 text-xs">
                          {enq.message}
                        </td>

                        {/* Assigned Representative */}
                        <td className="px-5 py-4">
                          {hasRep ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
                                  <UserCheck className="w-3 h-3" />
                                </span>
                                <div>
                                  <span className="font-bold text-xs text-slate-900">
                                    {enq.assignedRepresentativeName}
                                  </span>
                                  {enq.assignedRepresentativeCode && (
                                    <span className="ml-1 text-[9px] font-mono text-emerald-700 font-bold">
                                      ({enq.assignedRepresentativeCode})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {enq.assignedRepresentativePhone && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <a
                                    href={`tel:${enq.assignedRepresentativePhone}`}
                                    className="text-[10px] text-slate-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    {enq.assignedRepresentativePhone}
                                  </a>
                                  <a
                                    href={generateWhatsAppShareUrl(enq, enq.assignedRepresentativePhone, enq.assignedRepresentativeName)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded border border-green-200 transition-colors flex items-center gap-0.5"
                                    title={isMr ? "प्रतिनिधीला व्हॉट्सॲपवर माहिती पाठवा" : "Send details to representative via WhatsApp"}
                                  >
                                    <Share2 className="w-2.5 h-2.5" /> WA
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAssignModal(enq)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <UserPlus className="w-3 h-3" />
                              {isMr ? 'प्रतिनिधी जोडा' : 'Assign Rep'}
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border inline-block ${
                              enq.status === 'resolved'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                          >
                            {enq.status === 'resolved'
                              ? t('admin.enquiries.status.resolved', 'सुटलेले (RESOLVED)')
                              : t('admin.enquiries.status.pending', 'प्रलंबित (PENDING)')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Assign / Change Representative Button */}
                            <button
                              type="button"
                              onClick={() => openAssignModal(enq)}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                hasRep
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                              }`}
                              title={hasRep ? (isMr ? 'प्रतिनिधी बदला / माहिती पहा' : 'Change Representative / View Info') : (isMr ? 'या लीडला प्रतिनिधी जोडा' : 'Assign Representative to this Lead')}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>

                            {/* Resolve Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleResolve(enq)}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                                enq.status === 'resolved'
                                  ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                              }`}
                              title={
                                enq.status === 'resolved'
                                  ? t('admin.enquiries.tooltips.pending', 'मार्क प्रलंबित करा')
                                  : t('admin.enquiries.tooltips.resolve', 'मार्क Resolved करा')
                              }
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDelete(enq.id)}
                              className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                              title={t('admin.enquiries.tooltips.delete', 'लीड डिलीट करा')}
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

          {/* Pagination Controls */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-white gap-4">
              <div className="text-xs text-slate-500 font-medium">
                {isMr
                  ? `दाखवत आहे ${enquiries.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} ते ${Math.min(currentPage * itemsPerPage, enquiries.length)} एकूण ${enquiries.length} नोंदी`
                  : `Showing ${enquiries.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, enquiries.length)} of ${enquiries.length} entries`}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isMr ? 'मागील' : 'Previous'}
                </button>
                <div className="flex items-center px-2 text-xs font-bold text-slate-700">
                  {isMr ? `पान ${currentPage} / ${totalPages || 1}` : `Page ${currentPage} of ${totalPages || 1}`}
                </div>
                <button
                  type="button"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isMr ? 'पुढील' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </UICard>
      )}

      {/* Assign Representative Modal */}
      {assignModalOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {isMr ? 'चौकशीला प्रतिनिधी जोडा (Assign Representative)' : 'Assign Representative to Lead'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {isMr ? 'लीड आयडी:' : 'Lead ID:'} {selectedEnquiry.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Enquiry Details Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">{isMr ? 'ग्राहक नाव:' : 'Client Name:'}</span>
                  <span className="font-bold text-slate-900">{selectedEnquiry.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">{isMr ? 'ग्राहक मोबाईल:' : 'Client Mobile:'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedEnquiry.phone}</span>
                    <a
                      href={`tel:${selectedEnquiry.phone}`}
                      className="text-emerald-700 hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <Phone className="w-2.5 h-2.5" /> {isMr ? 'कॉल' : 'Call'}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">{isMr ? 'मालमत्ता / श्रेणी:' : 'Property / Category:'}</span>
                  <span className="font-semibold text-slate-800">
                    {selectedEnquiry.propertyName || (isMr ? 'सर्वसाधारण चौकशी' : 'General Enquiry')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{isMr ? 'ग्राहकाचा संदेश:' : 'Client Message:'}</span>
                  <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                    {selectedEnquiry.message || '—'}
                  </p>
                </div>
              </div>

              {/* Representative Selection */}
              <Select
                label={isMr ? 'नियुक्त करण्यासाठी प्रतिनिधी निवडा:' : 'Select Representative to Assign:'}
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                options={[
                  { value: '', label: isMr ? '-- कोणताही प्रतिनिधी नाही (काढून टाका) --' : '-- No Representative (Unassign) --' },
                  ...representatives.map((rep) => ({
                    value: rep.id,
                    label: `${rep.name} ${rep.code ? `(${rep.code})` : ''} - 📞 ${rep.mobile} ${rep.taluka ? `(${rep.taluka})` : ''}`
                  }))
                ]}
                className="py-2.5 text-xs font-semibold"
              />

              {/* Quick WhatsApp Forward to Representative */}
              {selectedRepObj && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">
                      {isMr ? 'निवडलेले प्रतिनिधी:' : 'Selected Representative:'} {selectedRepObj.name}
                    </span>
                    <span className="text-emerald-700 font-mono text-[11px]">
                      📞 {selectedRepObj.mobile}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    {isMr ? 'या प्रतिनिधीला एका क्लिकवर ग्राहकाची संपूर्ण चौकशी माहिती व्हॉट्सॲपवर पाठवा:' : 'Forward customer enquiry details to this representative via WhatsApp in one click:'}
                  </p>
                  <a
                    href={generateWhatsAppShareUrl(selectedEnquiry, selectedRepObj.mobile, selectedRepObj.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {isMr ? 'प्रतिनिधीला व्हॉट्सॲपवर पाठवा (Forward via WhatsApp)' : 'Forward to Rep via WhatsApp'}
                  </a>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  variant="outline"
                  className="px-4 py-2 text-xs rounded-xl"
                >
                  {isMr ? 'रद्द करा' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  onClick={handleAssignSave}
                  variant="primary"
                  disabled={assignSaving}
                  className="px-6 py-2 text-xs font-bold rounded-xl shadow-xs"
                >
                  {assignSaving
                    ? (isMr ? 'जतन होत आहे...' : 'Saving...')
                    : (isMr ? 'प्रतिनिधी नियुक्त करा (Save)' : 'Save Assignment')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnquiriesManager;
