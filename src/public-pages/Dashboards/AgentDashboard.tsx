import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Home,
  Plus,
  Share2,
  Phone,
  Award,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { subscribeToCollection, createDocument, updateDocument, getCachedCollection } from '../../services/firebase';
import { fetchUserRoleInquiry, subscribeToUserRoleInquiry } from '../../services/roleInquiry';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const AgentDashboard: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState<any[]>(() => {
    const cached = getCachedCollection('properties');
    return Array.isArray(cached) ? cached : [];
  });
  const [clients, setClients] = useState<any[]>(() => {
    const cached = getCachedCollection('agent_clients');
    return Array.isArray(cached) ? cached : [];
  });
  const [activeTab, setActiveTab] = useState<'clients' | 'properties'>('clients');

  // Real-time Role Verification State
  const [checkingRole, setCheckingRole] = useState(true);
  const [inquiryStatus, setInquiryStatus] = useState<'approved' | 'pending' | 'rejected' | 'none'>('none');
  const [agentInquiry, setAgentInquiry] = useState<any>(null);
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);

  // Add client modal
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientRequirement, setClientRequirement] = useState('');
  const [clientBudget, setClientBudget] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/agent/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Real-time multi-device role listener
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCheckingRole(false);
      return;
    }

    if (user.role === 'agent' || user.role === 'admin') {
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
        setAgentInquiry(inq);
        const isApproved = inq && ((inq as any).status === 'approved' || (inq as any).status === 'accepted');
        if (isApproved) {
          setInquiryStatus('approved');
          if (refreshUser && user.role !== 'agent' && user.role !== 'admin') {
            refreshUser();
          }
        } else if (inq && inq.status === 'pending') {
          if (user.role !== 'agent' && user.role !== 'admin') {
            setInquiryStatus('pending');
          }
        } else if (inq && inq.status === 'rejected') {
          if (user.role !== 'agent' && user.role !== 'admin') {
            setInquiryStatus('rejected');
          }
        } else {
          try {
            const raw =
              localStorage.getItem(`sahyadri_role_approved_${user.uid}`) ||
              (userCleanMobile ? localStorage.getItem(`sahyadri_role_approved_${userCleanMobile}`) : null);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.role === 'agent') {
                setInquiryStatus('approved');
                if (refreshUser && user.role !== 'agent' && user.role !== 'admin') refreshUser();
                setCheckingRole(false);
                return;
              }
            }
          } catch {}
          if (user.role !== 'agent' && user.role !== 'admin') {
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
      setAgentInquiry(inq);
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
    if (!user) return;

    const userCleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);

    // Load active properties
    const unsubProps = subscribeToCollection('properties', (list) => {
      setProperties(list.filter((p: any) => p.status === 'approved' || p.status === 'active'));
    });

    // Load agent's clients
    const unsubClients = subscribeToCollection('agent_clients', (list) => {
      const myClients = list.filter((c: any) => {
        if (c.agentUid === user.uid) return true;
        const cMob = (c.agentMobile || '').replace(/[^0-9]/g, '').slice(-10);
        if (userCleanMobile && cMob && cMob === userCleanMobile) return true;
        return false;
      });
      setClients(myClients);
    });

    return () => {
      if (typeof unsubProps === 'function') unsubProps();
      if (typeof unsubClients === 'function') unsubClients();
    };
  }, [user]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientMobile.trim()) return;

    setSavingClient(true);
    try {
      const newClient = {
        agentUid: user?.uid,
        agentName: user?.displayName,
        agentMobile: user?.mobile,
        name: clientName.trim(),
        mobile: clientMobile.trim(),
        requirement: clientRequirement.trim() || '2 BHK Flat / House',
        budget: clientBudget.trim() || '₹30-50 Lakhs',
        status: 'new',
        createdAt: new Date().toISOString()
      };
      await createDocument('agent_clients', newClient);
      setIsAddClientOpen(false);
      setClientName('');
      setClientMobile('');
      setClientRequirement('');
      setClientBudget('');
    } catch (err) {
      console.error('Failed to add client:', err);
    } finally {
      setSavingClient(false);
    }
  };

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    try {
      await updateDocument('agent_clients', clientId, { status: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pending Agent Review Guard
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
              {isMr ? 'आपला एजंट अर्ज सध्या तपासणीत आहे' : 'Your Agent Application is Under Review'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              {isMr
                ? 'आपण एजंट म्हणून नोंदणीसाठी सादर केलेले तपशील ॲडमिन टीमकडे मंजुरीसाठी पाठवले आहेत. ॲडमिन मंजुरी मिळताच हा डॅशबोर्ड आपोआप खुला होईल.'
                : 'Your request to become an authorized agent is currently being reviewed by our admin team.'}
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
      agentInquiry?.rejectionReason ||
      (user as any)?.lastInquiryRejectionReason ||
      (isMr
        ? 'माहिती अपूर्ण असल्याने किंवा पडताळणी प्रक्रियेदरम्यान विसंगती आढळल्याने आपला अर्ज नामंजूर करण्यात आला आहे.'
        : 'Your agent application was rejected during admin review.');

    const rejectionDate = agentInquiry?.reviewedAt || (user as any)?.lastInquiryRejectedAt;

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
              {isMr ? 'आपला एजंट अर्ज नामंजूर करण्यात आला आहे' : 'Your Agent Application Was Rejected'}
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
            <Link to="/role-inquiry?role=agent" className="flex-1">
              <Button
                variant="primary"
                className="w-full py-3 rounded-xl font-bold bg-primary hover:bg-primary-dark text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isMr ? 'पुन्हा अर्ज करा (Re-apply)' : 'Re-apply as Agent'}
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

  // Non-agent guard
  if (user && user.role !== 'agent' && user.role !== 'admin' && inquiryStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 px-4 flex items-center justify-center text-left">
        <Card className="max-w-md w-full p-8 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
            {isMr ? 'एजंट डॅशबोर्ड प्रवेश आवश्यक' : 'Agent Account Required'}
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {isMr
              ? 'हा डॅशबोर्ड फक्त अधिकृत रिअल इस्टेट एजंट्स यांच्यासाठी आहे.'
              : 'This dashboard is reserved for authorized real estate agents.'}
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/role-inquiry?role=agent">
              <Button variant="primary" className="w-full py-3 rounded-xl font-bold">
                {isMr ? 'एजंट अर्ज भरा (Apply as Agent)' : 'Apply to Become Agent'}
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

        {/* ── HEADER ── */}
        <div className="bg-[#0b1326] text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-amber-500/20">
              <Award className="w-3.5 h-3.5" />
              {isMr ? 'अधिकृत रिअल इस्टेट एजंट कन्सोल' : 'Authorized Agent Console'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight">
              {isMr ? `स्वागत आहे, ${user?.displayName || 'एजंट'}` : `Welcome, ${user?.displayName || 'Agent'}`}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
              {isMr
                ? 'येथून आपल्या क्लायंट लीड्सचे व्यवस्थापन करा, मालमत्ता शेअर करा आणि डिल क्लोजिंग ट्रॅक करा.'
                : 'Manage your client leads, share verified listings on WhatsApp, and track deal closures.'}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => setIsAddClientOpen(true)}
              className="py-3 px-6 rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isMr ? '+ नवीन क्लायंट जोडा' : '+ Add New Client'}
            </Button>
            <Link to="/post-property">
              <Button variant="outline" className="py-3 px-6 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border-white/20">
                {isMr ? 'मालमत्ता पोस्ट करा' : 'Post Listing'}
              </Button>
            </Link>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* ── KPI STATS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {isMr ? 'एकूण क्लायंट्स' : 'Total Clients'}
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{clients.length}</div>
          </Card>

          <Card className="p-5 bg-white border border-amber-100 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
              {isMr ? 'सक्रिय पोर्टफोलिओ' : 'Portfolio Listings'}
            </div>
            <div className="text-3xl font-extrabold text-amber-700">{properties.length}</div>
          </Card>

          <Card className="p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
              {isMr ? 'पूर्ण झालेले सौदे' : 'Deals Closed'}
            </div>
            <div className="text-3xl font-extrabold text-emerald-700">
              {clients.filter((c) => c.status === 'closed').length}
            </div>
          </Card>

          <Card className="p-5 bg-white border border-blue-100 rounded-2xl shadow-sm">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
              {isMr ? 'नियोजित साइट व्हिजिट' : 'Site Visits'}
            </div>
            <div className="text-3xl font-extrabold text-blue-700">
              {clients.filter((c) => c.status === 'visit_scheduled').length}
            </div>
          </Card>
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'clients'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            {isMr ? `माझे क्लायंट्स (${clients.length})` : `My Clients (${clients.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('properties')}
            className={`pb-3 font-bold text-sm tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === 'properties'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            {isMr ? `उपलब्ध मालमत्ता पोर्टफोलिओ (${properties.length})` : `Available Listings (${properties.length})`}
          </button>
        </div>

        {/* TAB 1: CLIENTS */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            {clients.length === 0 ? (
              <Card className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-lg text-slate-800">
                  {isMr ? 'अद्याप कोणताही क्लायंट जोडलेला नाही' : 'No Clients Added Yet'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {isMr ? 'आपल्या ग्राहकांची माहिती आणि गरजा व्यवस्थापित करण्यासाठी नवीन क्लायंट जोडा.' : 'Track client requirements, site visits, and deals.'}
                </p>
                <Button variant="primary" onClick={() => setIsAddClientOpen(true)} className="py-2.5 px-6 rounded-xl font-bold text-xs">
                  {isMr ? '+ क्लायंट जोडा' : '+ Add Client'}
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((c) => (
                  <Card key={c.id} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-bold text-slate-900 text-base truncate">{c.name}</h4>
                        <div className="w-36 shrink-0">
                          <Select
                            value={c.status || 'new'}
                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                            options={[
                              { value: 'new', label: 'New Lead' },
                              { value: 'contacted', label: 'Contacted' },
                              { value: 'visit_scheduled', label: 'Visit Scheduled' },
                              { value: 'closed', label: 'Deal Closed' }
                            ]}
                            className="py-1 px-2.5 text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 mb-1">
                        <strong>{isMr ? 'गरज:' : 'Requirement:'}</strong> {c.requirement}
                      </div>
                      <div className="text-xs text-slate-600 mb-3">
                        <strong>{isMr ? 'बजेट:' : 'Budget:'}</strong> {c.budget}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <a
                        href={`tel:${c.mobile}`}
                        className="text-xs font-bold text-slate-700 hover:text-primary flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> {c.mobile}
                      </a>
                      <a
                        href={`https://wa.me/91${c.mobile.replace(/[^0-9]/g, '').slice(-10)}?text=Hello%20${encodeURIComponent(c.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PORTFOLIO LISTINGS */}
        {activeTab === 'properties' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => (
              <Card key={prop.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col">
                <div className="aspect-[16/10] w-full relative bg-slate-100">
                  <img
                    src={prop.images && prop.images[0] ? prop.images[0] : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'}
                    alt={prop.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-800 border uppercase">
                    {prop.category || 'House'}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 line-clamp-1 mb-1">{prop.title}</h4>
                    <p className="text-xs text-slate-500 mb-2">📍 {prop.cityVillage}, {prop.district}</p>
                    <div className="text-lg font-extrabold text-amber-700 mb-3">
                      ₹{Number(prop.expectedPrice || prop.price || prop.monthlyRent || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/property/${prop.id}`} className="flex-1">
                      <Button variant="outline" className="w-full py-2 rounded-xl text-xs font-bold">
                        {isMr ? 'पहा' : 'View'}
                      </Button>
                    </Link>
                    <a
                      href={`https://wa.me/?text=Check%20out%20this%20property%20on%20Sahyadri:%20${encodeURIComponent(prop.title)}%20-%20https://propertyvishva.com/property/${prop.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-colors"
                      title="Share to Client via WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* ── ADD CLIENT MODAL ── */}
      <Dialog isOpen={isAddClientOpen} onClose={() => setIsAddClientOpen(false)}>
        <form onSubmit={handleAddClient} className="p-6 text-left space-y-4">
          <h3 className="text-lg font-bold text-slate-900 font-serif">
            {isMr ? 'नवीन क्लायंट जोडा' : 'Add New Client Lead'}
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'क्लायंट नाव *' : 'Client Name *'}
            </label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'मोबाईल नंबर *' : 'Mobile Number *'}
            </label>
            <Input value={clientMobile} onChange={(e) => setClientMobile(e.target.value)} maxLength={10} required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'मालमत्ता गरज' : 'Property Requirement'}
            </label>
            <Input value={clientRequirement} onChange={(e) => setClientRequirement(e.target.value)} placeholder="e.g. 2 BHK Flat near Kupwad" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {isMr ? 'अपेक्षित बजेट' : 'Budget'}
            </label>
            <Input value={clientBudget} onChange={(e) => setClientBudget(e.target.value)} placeholder="e.g. ₹35 - ₹45 Lakhs" />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddClientOpen(false)}>
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={savingClient}>
              {savingClient ? (isMr ? 'जोडत आहे...' : 'Adding...') : (isMr ? 'क्लायंट जोडा' : 'Add Client')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
