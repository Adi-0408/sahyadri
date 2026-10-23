import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../app/providers/AuthProvider';
import { Card as UICard } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  Clock, Phone, MessageSquare, Search,
  Check, ClipboardList,
  RefreshCw, CheckCheck
} from 'lucide-react';
import { subscribeToCollection, updateDocument } from '../../../services/firebase';

interface TaskEnquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  propertyName?: string;
  propertyId?: string;
  propertyCode?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  representativeNotes?: string;
  assignedRepresentativeId?: string;
  assignedRepresentativeName?: string;
  assignedRepresentativePhone?: string;
  assignedRepresentativeCode?: string;
  assignedAt?: string;
  createdAt: string;
}

export const RepresentativeTasks: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user } = useAuth();

  const [enquiries, setEnquiries] = useState<TaskEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCollection('enquiries', (list: any[]) => {
      // Filter leads assigned to this representative or if admin view all
      const repMobile = user?.mobile || '';
      const repId = (user as any)?.repId || user?.uid || '';

      let repTasks = list;
      if (user?.role === 'representative') {
        repTasks = list.filter((item: any) => {
          return (
            (item.assignedRepresentativeId && item.assignedRepresentativeId === repId) ||
            (item.assignedRepresentativePhone && repMobile && item.assignedRepresentativePhone.includes(repMobile)) ||
            (item.assignedRepresentativeName && user.displayName && item.assignedRepresentativeName.includes(user.displayName))
          );
        });
      }

      const sorted = repTasks.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setEnquiries(sorted);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user]);

  const handleStatusChange = async (task: TaskEnquiry, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    setUpdatingStatusId(task.id);
    try {
      await updateDocument('enquiries', task.id, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setEnquiries(prev => prev.map(e => e.id === task.id ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveNotes = async (taskId: string) => {
    setSavingNoteId(taskId);
    try {
      await updateDocument('enquiries', taskId, {
        representativeNotes: notesText,
        lastFollowupAt: new Date().toISOString()
      });
      setEnquiries(prev => prev.map(e => e.id === taskId ? { ...e, representativeNotes: notesText } : e));
      setEditingNotesId(null);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const filteredTasks = enquiries.filter(task => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      task.name?.toLowerCase().includes(s) ||
      task.phone?.includes(s) ||
      task.propertyName?.toLowerCase().includes(s) ||
      task.message?.toLowerCase().includes(s);

    const matchesStatus =
      statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalTasks = enquiries.length;
  const pendingCount = enquiries.filter(t => t.status === 'pending').length;
  const inProgressCount = enquiries.filter(t => t.status === 'in_progress').length;
  const resolvedCount = enquiries.filter(t => t.status === 'resolved').length;

  const generateWhatsAppMessage = (task: TaskEnquiry) => {
    const repName = user?.displayName || (isMr ? 'प्रतिनिधी' : 'Representative');
    if (isMr) {
      const prop = task.propertyName ? `"${task.propertyName}" मालमत्तेबाबत` : 'मालमत्ता चौकशीबाबत';
      const msg = `नमस्कार ${task.name} जी,\nमी सह्याद्री लँड्स तर्फे ${repName} बोलत आहे. आपण केलेल्या ${prop} माहितीसाठी संपर्क साधत आहे. आपल्याला कधी बोलणे सोयीचे होईल?`;
      return `https://wa.me/91${task.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    } else {
      const prop = task.propertyName ? `property "${task.propertyName}"` : 'your property inquiry';
      const msg = `Hello ${task.name},\nI am ${repName} from Sahyadri Lands. I am contacting you regarding ${prop}. When would be a convenient time to speak?`;
      return `https://wa.me/91${task.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    }
  };

  return (
    <div className="space-y-6 text-left pb-16">
      {/* Header Profile / Welcome Banner */}
      <div className="bg-gradient-to-r from-[#111c2e] via-slate-900 to-slate-800 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-white/5 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide">
                  {user?.displayName || (isMr ? 'प्रतिनिधी' : 'Representative')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/20 text-orange-300 border border-primary/30">
                  {isMr ? 'अधिकृत प्रतिनिधी' : 'Authorized Representative'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <span>📱 {user?.mobile || (user as any)?.mobileNumber || (isMr ? 'नोंदणीकृत प्रतिनिधी' : 'Registered Representative')}</span>
                {(user as any)?.taluka && (
                  <>
                    <span>•</span>
                    <span>📍 {isMr ? 'तालुका:' : 'Taluka:'} {(user as any).taluka}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">{isMr ? 'कार्यक्षेत्र' : 'Service Area'}</span>
              <span className="text-xs font-semibold text-emerald-400">{isMr ? 'सांगली / सातारा / कोल्हापूर' : 'Sangli / Satara / Kolhapur'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Task Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <UICard className="p-4 sm:p-5 flex items-center gap-3.5 bg-white border border-slate-200/80 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{isMr ? 'एकूण कार्ये' : 'Total Tasks'}</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalTasks}</p>
          </div>
        </UICard>

        <UICard className="p-4 sm:p-5 flex items-center gap-3.5 bg-white border border-amber-200/80 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{isMr ? 'प्रलंबित' : 'Pending'}</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{pendingCount}</p>
          </div>
        </UICard>

        <UICard className="p-4 sm:p-5 flex items-center gap-3.5 bg-white border border-indigo-200/80 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{isMr ? 'प्रगतीपथावर' : 'In Progress'}</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">{inProgressCount}</p>
          </div>
        </UICard>

        <UICard className="p-4 sm:p-5 flex items-center gap-3.5 bg-white border border-emerald-200/80 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{isMr ? 'पूर्ण / निकाली' : 'Resolved'}</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{resolvedCount}</p>
          </div>
        </UICard>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isMr ? "ग्राहकाचे नाव, फोन किंवा मालमत्ता शोधा..." : "Search customer name, phone or property..."}
            className="pl-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#111c2e] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isMr ? 'सर्व' : 'All'} ({totalTasks})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {isMr ? 'प्रलंबित' : 'Pending'} ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {isMr ? 'प्रगतीपथावर' : 'In Progress'} ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {isMr ? 'पूर्ण' : 'Resolved'} ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-semibold">{isMr ? 'नियुक्त कार्ये लोड होत आहेत...' : 'Loading assigned tasks...'}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">{isMr ? 'कोणतेही कार्य आढळले नाही' : 'No tasks found'}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {search || statusFilter !== 'all'
              ? (isMr ? 'निवडलेल्या फिल्टरनुसार कोणतेही कार्य आढळले नाही.' : 'No tasks match the selected filter.')
              : (isMr ? 'ॲडमिन कडून नवीन ग्राहक किंवा मालमत्ता चौकशी सोपवल्यावर येथे त्वरित दिसेल.' : 'New inquiries assigned by admin will appear here.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isResolved = task.status === 'resolved';
            const isInProgress = task.status === 'in_progress';
            const isPending = task.status === 'pending';

            return (
              <UICard
                key={task.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                  isResolved
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isInProgress
                    ? 'border-indigo-200 bg-indigo-50/20'
                    : 'border-slate-200 bg-white hover:border-primary/40 shadow-sm'
                }`}
              >
                <div>
                  {/* Top Bar: Status & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isInProgress
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isResolved && <Check className="w-3 h-3" />}
                      {isInProgress && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {isPending && <Clock className="w-3 h-3" />}
                      {isResolved ? (isMr ? 'पूर्ण / निकाली' : 'Resolved') : isInProgress ? (isMr ? 'प्रगतीपथावर' : 'In Progress') : (isMr ? 'प्रलंबित' : 'Pending')}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {task.createdAt ? new Date(task.createdAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : ''}
                    </span>
                  </div>

                  {/* Customer Details */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-base shrink-0">
                      {task.name ? task.name.charAt(0).toUpperCase() : 'G'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base leading-snug">
                        {task.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">
                        📞 {task.phone}
                      </p>
                    </div>
                  </div>

                  {/* Property Interest */}
                  {task.propertyName && (
                    <div className="p-2.5 bg-orange-50/60 rounded-xl border border-orange-100 text-xs text-orange-950 mb-3 flex items-start gap-2">
                      <span className="font-bold text-orange-700 shrink-0">{isMr ? 'मालमत्ता:' : 'Property:'}</span>
                      <span className="font-medium line-clamp-1">
                        {task.propertyName} {task.propertyCode ? `(${task.propertyCode})` : ''}
                      </span>
                    </div>
                  )}

                  {/* Inquiry Message */}
                  {task.message && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150 mb-3 leading-relaxed">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{isMr ? 'ग्राहकाचा मेसेज:' : 'Client Message:'}</span>
                      "{task.message}"
                    </div>
                  )}

                  {/* Representative Notes / Progress */}
                  <div className="mt-2 text-xs">
                    {editingNotesId === task.id ? (
                      <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder={isMr ? "ग्राहकासोबत झालेल्या चर्चेची किंवा प्रगतीची टीप लिहा..." : "Write notes about discussion with client or progress..."}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:border-primary resize-none"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            {isMr ? 'रद्द करा' : 'Cancel'}
                          </button>
                          <Button
                            variant="primary"
                            onClick={() => handleSaveNotes(task.id)}
                            disabled={savingNoteId === task.id}
                            className="text-[11px] px-3 py-1 rounded-lg"
                          >
                            {savingNoteId === task.id ? (isMr ? 'जतन करत आहे...' : 'Saving...') : (isMr ? 'टीप जतन करा' : 'Save Note')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className="truncate pr-2 italic">
                          {task.representativeNotes
                            ? (isMr ? `टीप: "${task.representativeNotes}"` : `Note: "${task.representativeNotes}"`)
                            : (isMr ? 'कोणतीही टीप नाही' : 'No notes added')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotesId(task.id);
                            setNotesText(task.representativeNotes || '');
                          }}
                          className="text-primary hover:underline font-bold shrink-0 cursor-pointer text-[11px]"
                        >
                          {task.representativeNotes ? (isMr ? 'संपादित करा' : 'Edit') : (isMr ? '+ टीप जोडा' : '+ Add Note')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar: Connect & Status Selector */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-2">
                  {/* Quick Connect: Call & WhatsApp */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${task.phone}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {isMr ? 'कॉल करा' : 'Call'}
                    </a>
                    <a
                      href={generateWhatsAppMessage(task)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-500/20"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
                    </a>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
                    <button
                      type="button"
                      disabled={updatingStatusId === task.id}
                      onClick={() => handleStatusChange(task, 'pending')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        task.status === 'pending'
                          ? 'bg-white text-amber-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isMr ? 'प्रलंबित' : 'Pending'}
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatusId === task.id}
                      onClick={() => handleStatusChange(task, 'in_progress')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        task.status === 'in_progress'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isMr ? 'प्रगतीपथावर' : 'In Progress'}
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatusId === task.id}
                      onClick={() => handleStatusChange(task, 'resolved')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                        task.status === 'resolved'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isMr ? 'पूर्ण' : 'Resolved'}
                    </button>
                  </div>
                </div>
              </UICard>
            );
          })}
        </div>
      )}
    </div>
  );
};
