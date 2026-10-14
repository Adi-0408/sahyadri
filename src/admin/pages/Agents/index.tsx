import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Smartphone,
  TrendingUp,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Clock,
  Briefcase,
  Award,
  RotateCcw
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Select } from '../../../components/ui/Select';
import {
  fetchCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToCollection
} from '../../../services/firebase';

interface AgentClient {
  id: string;
  name: string;
  mobile: string;
  propertyInterest: string;
  budget?: string;
  status: 'new' | 'contacted' | 'visit_scheduled' | 'visit_completed' | 'negotiation' | 'deal_closed' | 'dropped';
  statusLabelMr: string;
  createdAt: string;
  lastFollowUp: string;
  notes?: string;
}

interface AgentActivityLog {
  id: string;
  action: string;
  actionMr: string;
  timestamp: string;
  type: 'login' | 'client_added' | 'visit_completed' | 'deal_closed' | 'property_posted';
}

interface Agent {
  id: string;
  code: string;
  name: string;
  nameMr?: string;
  mobile: string;
  email?: string;
  photo?: string;
  district?: string;
  taluka?: string;
  cityVillage?: string;
  status: 'active' | 'inactive';
  role: 'agent';
  appRegisteredAt?: string;
  lastLoginAt?: string;
  appDevice?: string;
  totalClientsHandled: number;
  totalPropertiesListed: number;
  totalDealsClosed: number;
  totalSiteVisits: number;
  conversionRate: number;
  growthScore: number;
  rating?: number;
  notes?: string;
  clients?: AgentClient[];
  activityLogs?: AgentActivityLog[];
  source?: 'mobile_app' | 'admin_panel' | 'user_account';
}

// Normalizer to ensure agents from mobile app, users collection, or admin panel have consistent fields
const normalizeAgent = (raw: any, sourceFallback: 'mobile_app' | 'admin_panel' | 'user_account' = 'mobile_app'): Agent => {
  const id = raw.id || raw.uid || `agent-${Date.now()}`;
  const name = (raw.name || raw.fullName || raw.displayName || raw.userName || 'Agent').trim();
  const nameMr = raw.nameMr || name;
  const mobile = (raw.mobile || raw.mobileNumber || raw.phone || raw.phoneNumber || raw.contact || raw.contactNumber || '').toString().trim();
  const email = (raw.email || '').trim();
  const district = raw.district || 'Sangli';
  const taluka = raw.taluka || 'Miraj';
  const cityVillage = raw.cityVillage || raw.city || raw.village || raw.address || '';
  const status = (raw.status === 'inactive' || raw.isActive === false || raw.isBlocked === true) ? 'inactive' : 'active';

  // Safe extraction of clients array
  const clients: AgentClient[] = Array.isArray(raw.clients) ? raw.clients : [];

  const totalClientsHandled = typeof raw.totalClientsHandled === 'number'
    ? raw.totalClientsHandled
    : clients.length;

  const totalDealsClosed = typeof raw.totalDealsClosed === 'number'
    ? raw.totalDealsClosed
    : clients.filter((c: any) => c.status === 'deal_closed').length;

  const totalPropertiesListed = typeof raw.totalPropertiesListed === 'number' ? raw.totalPropertiesListed : 0;
  const totalSiteVisits = typeof raw.totalSiteVisits === 'number' ? raw.totalSiteVisits : 0;
  const conversionRate = typeof raw.conversionRate === 'number'
    ? raw.conversionRate
    : (totalClientsHandled > 0 ? Math.round((totalDealsClosed / totalClientsHandled) * 100) : 0);
  const growthScore = typeof raw.growthScore === 'number' ? raw.growthScore : 75;
  const rating = typeof raw.rating === 'number' ? raw.rating : 5.0;

  const appRegisteredAt = raw.appRegisteredAt || raw.createdAt || raw.timestamp || new Date().toISOString();
  const lastLoginAt = raw.lastLoginAt || raw.updatedAt || appRegisteredAt;
  const appDevice = raw.appDevice || raw.device || (raw.source === 'admin_panel' ? 'Admin Panel' : 'Mobile App');

  // Formatted code
  const code = raw.code || raw.agentCode || raw.userCode || (id ? `AGT-${id.slice(-4).toUpperCase()}` : 'AGT-001');

  return {
    id,
    code,
    name,
    nameMr,
    mobile,
    email,
    photo: raw.photo || raw.photoURL || raw.avatar || '',
    district,
    taluka,
    cityVillage,
    status,
    role: 'agent',
    appRegisteredAt,
    lastLoginAt,
    appDevice,
    totalClientsHandled,
    totalPropertiesListed,
    totalDealsClosed,
    totalSiteVisits,
    conversionRate,
    growthScore,
    rating,
    notes: raw.notes || '',
    clients,
    activityLogs: Array.isArray(raw.activityLogs) ? raw.activityLogs : [],
    source: raw.source || sourceFallback
  };
};

export const AgentsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isMr = Boolean(i18n.language?.startsWith('mr'));

  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [talukaFilter, setTalukaFilter] = useState('All');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('all');
  const [districts, setDistricts] = useState<any[]>([]);
  const [talukas, setTalukas] = useState<any[]>([]);

  // 4 Primary Views triggered by the 4 KPI boxes
  type ActiveView = 'all_agents' | 'active_agents' | 'clients_handled' | 'deals_closed';
  const [activeView, setActiveView] = useState<ActiveView>('all_agents');

  // Detailed Growth Modal State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<'growth' | 'clients' | 'properties' | 'activity'>('growth');

  // Add / Edit Agent Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameMr: '',
    mobile: '',
    email: '',
    district: 'Sangli',
    taluka: 'Miraj',
    cityVillage: '',
    status: 'active' as 'active' | 'inactive',
    notes: '',
    initialPassword: ''
  });

  // Add Client Modal State for specific agent
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    mobile: '',
    propertyInterest: '',
    budget: '',
    status: 'new' as AgentClient['status'],
    notes: ''
  });

  // Load Data
  useEffect(() => {
    Promise.all([
      fetchCollection('districts'),
      fetchCollection('talukas')
    ]).then(([dList, tList]) => {
      setDistricts(dList || []);
      setTalukas(tList || []);
    }).catch(console.error);

    // Clean any mock dummy agents from localStorage
    try {
      const mockKey = 'luminous_mock_agents';
      const local = localStorage.getItem(mockKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (a: any) =>
              !['agent-101', 'agent-102', 'agent-103', 'agent-104'].includes(a.id)
          );
          localStorage.setItem(mockKey, JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }

    // Dual-Collection Real-time Sync:
    // Listen to both 'agents' collection AND 'users' collection (for agents registered via mobile app)
    let rawAgentsList: any[] = [];
    let rawUsersList: any[] = [];

    const mergeAndSetAgents = (agentsData: any[], usersData: any[]) => {
      const mockIds = ['agent-101', 'agent-102', 'agent-103', 'agent-104'];
      const agentsMap = new Map<string, Agent>();

      // 1. Process documents from 'agents' collection
      (agentsData || []).forEach((item) => {
        if (!item || mockIds.includes(item.id)) return;
        const normalized = normalizeAgent(item, item.source || 'mobile_app');
        const key = normalized.mobile ? `mob_${normalized.mobile}` : `id_${normalized.id}`;
        agentsMap.set(key, normalized);
      });

      // 2. Process documents from 'users' collection where role or userType is 'agent'
      (usersData || []).forEach((u) => {
        if (!u) return;
        const role = (u.role || '').toString().toLowerCase();
        const userType = (u.userType || '').toString().toLowerCase();
        const category = (u.category || '').toString().toLowerCase();
        const isAgent = u.isAgent === true || role === 'agent' || userType === 'agent' || category === 'agent';

        if (isAgent) {
          const mob = (u.mobile || u.phone || u.phoneNumber || u.mobileNumber || '').toString().trim();
          const key = mob ? `mob_${mob}` : `id_${u.id || u.uid}`;

          if (!agentsMap.has(key)) {
            // Agent registered in mobile app directly into users
            agentsMap.set(key, normalizeAgent({
              ...u,
              id: u.id || u.uid,
              name: u.name || u.displayName || u.fullName,
              mobile: mob,
              source: 'mobile_app',
              appDevice: u.device || 'Mobile App Registration'
            }, 'mobile_app'));
          } else {
            // Enrich existing agent with any missing data from user account
            const existing = agentsMap.get(key)!;
            if (!existing.email && u.email) existing.email = u.email;
            if (!existing.photo && (u.photo || u.photoURL || u.avatar)) {
              existing.photo = u.photo || u.photoURL || u.avatar;
            }
          }
        }
      });

      const mergedList = Array.from(agentsMap.values());
      setAgents(mergedList);
      setLoading(false);
    };

    // 1. Subscribe to 'agents' collection
    const unsubAgents = subscribeToCollection('agents', (list) => {
      rawAgentsList = list || [];
      mergeAndSetAgents(rawAgentsList, rawUsersList);
    });

    // 2. Subscribe to 'users' collection to catch agents registered from mobile app
    const unsubUsers = subscribeToCollection('users', (list) => {
      rawUsersList = list || [];
      mergeAndSetAgents(rawAgentsList, rawUsersList);
    });

    return () => {
      if (typeof unsubAgents === 'function') unsubAgents();
      if (typeof unsubUsers === 'function') unsubUsers();
    };
  }, []);

  // Flatten all handled clients across all agents
  const allHandledClients = agents.flatMap((agent) => {
    if (!agent.clients || !Array.isArray(agent.clients)) return [];
    return agent.clients.map((c) => ({
      ...c,
      agentId: agent.id,
      agentName: agent.nameMr || agent.name,
      agentNameEn: agent.name,
      agentCode: agent.code,
      agentMobile: agent.mobile,
      agentPhoto: agent.photo,
      agentCity: agent.cityVillage || agent.taluka
    }));
  });

  const allClosedDeals = allHandledClients.filter((c) => c.status === 'deal_closed');

  // Filtered clients list
  const filteredClients = allHandledClients.filter((c) => {
    if (clientStatusFilter !== 'all' && c.status !== clientStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchMobile = (c.mobile || '').includes(q);
      const matchProperty = (c.propertyInterest || '').toLowerCase().includes(q);
      const matchBudget = (c.budget || '').toLowerCase().includes(q);
      const matchAgent = (c.agentName || '').toLowerCase().includes(q) || (c.agentCode || '').toLowerCase().includes(q);
      return matchName || matchMobile || matchProperty || matchBudget || matchAgent;
    }
    return true;
  });

  // Filtered closed deals
  const filteredDeals = allClosedDeals.filter((d) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (d.name || '').toLowerCase().includes(q);
      const matchMobile = (d.mobile || '').includes(q);
      const matchProperty = (d.propertyInterest || '').toLowerCase().includes(q);
      const matchAgent = (d.agentName || '').toLowerCase().includes(q);
      return matchName || matchMobile || matchProperty || matchAgent;
    }
    return true;
  });

  // Filtered Agents
  const filteredAgents = agents.filter((agent) => {
    if (activeView === 'active_agents' && agent.status !== 'active') return false;
    if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
    if (talukaFilter !== 'All' && agent.taluka !== talukaFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (agent.name || '').toLowerCase().includes(q);
      const matchNameMr = (agent.nameMr || '').toLowerCase().includes(q);
      const matchMobile = (agent.mobile || '').includes(q);
      const matchCode = (agent.code || '').toLowerCase().includes(q);
      const matchCity = (agent.cityVillage || '').toLowerCase().includes(q);
      return matchName || matchNameMr || matchMobile || matchCode || matchCity;
    }
    return true;
  });

  // Sorted Agents
  const sortedAgents = [...filteredAgents];

  // Aggregate Stats (computed reliably from direct numbers or client arrays)
  const totalAgentsCount = agents.length;
  const activeAgentsCount = agents.filter((a) => a.status === 'active').length;
  const totalClientsHandledCount = allHandledClients.length > 0 ? allHandledClients.length : agents.reduce((acc, a) => acc + (a.totalClientsHandled || 0), 0);
  const totalDealsClosedCount = allClosedDeals.length > 0 ? allClosedDeals.length : agents.reduce((acc, a) => acc + (a.totalDealsClosed || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'deal_closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'visit_completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'negotiation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'visit_scheduled':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Form Handlers
  const handleOpenAdd = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      nameMr: '',
      mobile: '',
      email: '',
      district: districts[0]?.name || 'Sangli',
      taluka: talukas[0]?.name || 'Miraj',
      cityVillage: '',
      status: 'active',
      notes: '',
      initialPassword: 'agent' + Math.floor(1000 + Math.random() * 9000)
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAgent(agent);
    setFormData({
      name: agent.name || '',
      nameMr: agent.nameMr || '',
      mobile: agent.mobile || '',
      email: agent.email || '',
      district: agent.district || 'Sangli',
      taluka: agent.taluka || 'Miraj',
      cityVillage: agent.cityVillage || '',
      status: agent.status || 'active',
      notes: agent.notes || '',
      initialPassword: ''
    });
    setIsFormOpen(true);
  };

  const handleSubmitAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      alert('कृपया एजंटचे नाव व मोबाईल नंबर प्रविष्ट करा.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString();
    try {
      if (editingAgent) {
        const updatePayload = {
          ...editingAgent,
          name: formData.name.trim(),
          nameMr: formData.nameMr.trim() || formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          district: formData.district,
          taluka: formData.taluka,
          cityVillage: formData.cityVillage.trim(),
          status: formData.status,
          notes: formData.notes.trim(),
          updatedAt: now
        };
        await updateDocument('agents', editingAgent.id, updatePayload);
        if (selectedAgent?.id === editingAgent.id) {
          setSelectedAgent(updatePayload);
        }
      } else {
        const nextCode = `AGT-${String(agents.length + 101)}`;
        const newAgentPayload: Agent = {
          id: `agent-${Date.now()}`,
          code: nextCode,
          name: formData.name.trim(),
          nameMr: formData.nameMr.trim() || formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          district: formData.district,
          taluka: formData.taluka,
          cityVillage: formData.cityVillage.trim(),
          status: formData.status,
          role: 'agent',
          appRegisteredAt: now,
          lastLoginAt: now,
          appDevice: 'Mobile App (Registered via Admin)',
          totalClientsHandled: 0,
          totalPropertiesListed: 0,
          totalDealsClosed: 0,
          totalSiteVisits: 0,
          conversionRate: 0,
          growthScore: 70,
          rating: 5.0,
          notes: formData.notes.trim(),
          clients: [],
          activityLogs: [
            {
              id: `act-${Date.now()}`,
              action: 'Account Created',
              actionMr: 'ॲडमिन पॅनेलमधून एजंट प्रोफाइल तयार केले',
              timestamp: now,
              type: 'login'
            }
          ]
        };
        await createDocument('agents', newAgentPayload);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert((isMr ? 'एजंट सेव्ह करताना त्रुटी आली: ' : 'Error saving agent: ') + (err?.message || (isMr ? 'अज्ञात त्रुटी' : 'Unknown error')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(isMr ? 'तुम्हाला खात्री आहे का की हा एजंट हटवायचा आहे?' : 'Are you sure you want to delete this agent?')) return;
    try {
      await deleteDocument('agents', agentId);
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
    } catch (err: any) {
      console.error(err);
      alert((isMr ? 'हटवताना त्रुटी आली: ' : 'Error deleting agent: ') + (err?.message || (isMr ? 'अज्ञात त्रुटी' : 'Unknown error')));
    }
  };

  // Add client to selected agent
  const handleAddClientToAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !newClientData.name.trim() || !newClientData.mobile.trim()) {
      alert(isMr ? 'कृपया क्लायंटचे नाव आणि मोबाईल नंबर प्रविष्ट करा.' : 'Please enter client name and mobile number.');
      return;
    }

    const statusLabels: Record<string, string> = {
      new: isMr ? 'नवीन चौकशी (New Lead)' : 'New Lead',
      contacted: isMr ? 'संपर्क साधला (Contacted)' : 'Contacted',
      visit_scheduled: isMr ? 'व्हिजिट ठरली (Visit Scheduled)' : 'Visit Scheduled',
      visit_completed: isMr ? 'साईट व्हिजिट झाली (Visit Done)' : 'Visit Done',
      negotiation: isMr ? 'किंमत वाटाघाटी (Negotiation)' : 'Negotiation',
      deal_closed: isMr ? 'सौदा पूर्ण (Deal Closed)' : 'Deal Closed',
      dropped: isMr ? 'रद्द (Dropped)' : 'Dropped'
    };

    const newClient: AgentClient = {
      id: `cl-${Date.now()}`,
      name: newClientData.name.trim(),
      mobile: newClientData.mobile.trim(),
      propertyInterest: newClientData.propertyInterest.trim() || (isMr ? 'प्रॉपर्टी चौकशी' : 'Property Inquiry'),
      budget: newClientData.budget.trim(),
      status: newClientData.status,
      statusLabelMr: statusLabels[newClientData.status] || (isMr ? 'नवीन चौकशी' : 'New Lead'),
      createdAt: new Date().toISOString().split('T')[0],
      lastFollowUp: new Date().toISOString().split('T')[0],
      notes: newClientData.notes.trim()
    };

    const updatedClients = [newClient, ...(selectedAgent.clients || [])];
    const newClientsCount = updatedClients.length;
    const closedCount = updatedClients.filter(c => c.status === 'deal_closed').length;
    const visitsCount = updatedClients.filter(c => c.status === 'visit_completed' || c.status === 'deal_closed').length;

    const newActivity: AgentActivityLog = {
      id: `act-${Date.now()}`,
      action: 'Client Added',
      actionMr: isMr ? `नवीन क्लायंट "${newClient.name}" ची नोंद केली` : `Registered new client "${newClient.name}"`,
      timestamp: new Date().toISOString(),
      type: 'client_added'
    };

    const updatedAgentPayload: Agent = {
      ...selectedAgent,
      clients: updatedClients,
      totalClientsHandled: newClientsCount,
      totalDealsClosed: closedCount,
      totalSiteVisits: visitsCount,
      conversionRate: newClientsCount > 0 ? Math.round((closedCount / newClientsCount) * 100) : 0,
      activityLogs: [newActivity, ...(selectedAgent.activityLogs || [])]
    };

    try {
      await updateDocument('agents', selectedAgent.id, updatedAgentPayload);
      setSelectedAgent(updatedAgentPayload);
      setIsAddClientOpen(false);
      setNewClientData({
        name: '',
        mobile: '',
        propertyInterest: '',
        budget: '',
        status: 'new',
        notes: ''
      });
      alert('✅ क्लायंट यशस्वीरित्या एजंटच्या पोर्टफोलिओमध्ये जोडला गेला!');
    } catch (err: any) {
      console.error(err);
      alert('क्लायंट जोडताना त्रुटी आली: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6 text-left pb-16">
      {/* Top Header - Clean, Proper White Theme matching Sahyadri Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                {isMr ? 'एजंट (Agents)' : 'Agents'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> {isMr ? 'मोबाईल ॲप' : 'Mobile App'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isMr ? 'मोबाईल ॲपमधील सर्व अधिकृत नोंदणीकृत एजंट्स, कार्यप्रदर्शन व क्लायंट व्यवस्थापन.' : 'All authorized registered agents from mobile app, performance and client management.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleOpenAdd}
            variant="primary"
            className="flex items-center gap-2 font-bold px-5 py-2.5 text-xs sm:text-sm shadow-sm hover:shadow-md rounded-xl text-white cursor-pointer bg-indigo-600 hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isMr ? 'नवीन एजंट जोडा (Add Agent)' : 'Add New Agent'}</span>
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Stats Cards - Fully Working & Clickable to Filter Respective Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Total Agents */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveView('all_agents');
            setStatusFilter('all');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveView('all_agents');
              setStatusFilter('all');
            }
          }}
          className={`relative p-5 rounded-2xl transition-all duration-200 cursor-pointer text-left select-none ${
            activeView === 'all_agents'
              ? 'bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 border-2 border-indigo-600 ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-600/10 -translate-y-1'
              : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
          title={isMr ? "सर्व एजंट्सचा डेटा खाली पाहण्यासाठी क्लिक करा" : "Click to view all agents data below"}
        >
          {activeView === 'all_agents' && (
            <div className="absolute -top-2.5 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {isMr ? 'सध्या निवडले आहे' : 'Selected'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-600">
              {isMr ? 'एकूण ॲप एजंट्स' : 'Total App Agents'}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeView === 'all_agents' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{totalAgentsCount}</div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
            <span className="text-indigo-600 font-bold">{isMr ? 'मोबाईल ॲप नोंदणीकृत' : 'Mobile App Registered'}</span>
            <span className={`text-[10px] font-black flex items-center gap-1 ${activeView === 'all_agents' ? 'text-indigo-700' : 'text-slate-400 group-hover:text-indigo-600'}`}>
              {activeView === 'all_agents' ? (isMr ? '✓ डेटा खाली दाखवला आहे' : '✓ Showing below') : (isMr ? 'क्लिक करा ➔' : 'Click ➔')}
            </span>
          </div>
        </div>

        {/* Box 2: Active Agents */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveView('active_agents');
            setStatusFilter('active');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveView('active_agents');
              setStatusFilter('active');
            }
          }}
          className={`relative p-5 rounded-2xl transition-all duration-200 cursor-pointer text-left select-none ${
            activeView === 'active_agents'
              ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 border-2 border-emerald-600 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-600/10 -translate-y-1'
              : 'bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
          title={isMr ? "केवळ सक्रिय एजंट्सचा डेटा खाली पाहण्यासाठी क्लिक करा" : "Click to view active agents only"}
        >
          {activeView === 'active_agents' && (
            <div className="absolute -top-2.5 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {isMr ? 'सध्या निवडले आहे' : 'Selected'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
              {isMr ? 'सक्रिय एजंट्स (Active)' : 'Active Agents'}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeView === 'active_agents' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 mt-2">{activeAgentsCount}</div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
            <span className="text-emerald-600 font-bold">{isMr ? 'नियमित ॲप वापरकर्ते' : 'Active App Users'}</span>
            <span className={`text-[10px] font-black flex items-center gap-1 ${activeView === 'active_agents' ? 'text-emerald-700' : 'text-slate-400 group-hover:text-emerald-600'}`}>
              {activeView === 'active_agents' ? (isMr ? '✓ डेटा खाली दाखवला आहे' : '✓ Showing below') : (isMr ? 'क्लिक करा ➔' : 'Click ➔')}
            </span>
          </div>
        </div>

        {/* Box 3: Total Clients Handled */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveView('clients_handled');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveView('clients_handled');
            }
          }}
          className={`relative p-5 rounded-2xl transition-all duration-200 cursor-pointer text-left select-none ${
            activeView === 'clients_handled'
              ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border-2 border-blue-600 ring-4 ring-blue-500/20 shadow-lg shadow-blue-600/10 -translate-y-1'
              : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
          title={isMr ? "हाताळलेल्या सर्व क्लायंट्सचा डेटा खाली पाहण्यासाठी क्लिक करा" : "Click to view all handled clients"}
        >
          {activeView === 'clients_handled' && (
            <div className="absolute -top-2.5 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {isMr ? 'सध्या निवडले आहे' : 'Selected'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-700">
              {isMr ? 'हाताळलेले एकूण क्लायंट्स' : 'Total Handled Clients'}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeView === 'clients_handled' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-600'
            }`}>
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-700 mt-2">{totalClientsHandledCount}</div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
            <span className="text-blue-600 font-bold">{isMr ? 'एजंट्सद्वारे संपर्कित' : 'Contacted by Agents'}</span>
            <span className={`text-[10px] font-black flex items-center gap-1 ${activeView === 'clients_handled' ? 'text-blue-700' : 'text-slate-400 group-hover:text-blue-600'}`}>
              {activeView === 'clients_handled' ? (isMr ? '✓ डेटा खाली दाखवला आहे' : '✓ Showing below') : (isMr ? 'क्लिक करा ➔' : 'Click ➔')}
            </span>
          </div>
        </div>

        {/* Box 4: Deals Closed */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveView('deals_closed');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveView('deals_closed');
            }
          }}
          className={`relative p-5 rounded-2xl transition-all duration-200 cursor-pointer text-left select-none ${
            activeView === 'deals_closed'
              ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border-2 border-amber-600 ring-4 ring-amber-500/20 shadow-lg shadow-amber-600/10 -translate-y-1'
              : 'bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5'
          }`}
          title={isMr ? "पूर्ण झालेल्या सर्व सौद्यांचा (Deals) डेटा खाली पाहण्यासाठी क्लिक करा" : "Click to view all closed deals"}
        >
          {activeView === 'deals_closed' && (
            <div className="absolute -top-2.5 right-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {isMr ? 'सध्या निवडले आहे' : 'Selected'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-700">
              {isMr ? 'यशस्वी सौदे (Deals Closed)' : 'Deals Closed'}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeView === 'deals_closed' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-600'
            }`}>
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 mt-2">{totalDealsClosedCount}</div>
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
            <span className="text-amber-600 font-bold">{isMr ? 'पूर्ण झालेले व्यवहार' : 'Successful Transactions'}</span>
            <span className={`text-[10px] font-black flex items-center gap-1 ${activeView === 'deals_closed' ? 'text-amber-700' : 'text-slate-400 group-hover:text-amber-600'}`}>
              {activeView === 'deals_closed' ? (isMr ? '✓ डेटा खाली दाखवला आहे' : '✓ Showing below') : (isMr ? 'क्लिक करा ➔' : 'Click ➔')}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic View Header and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {activeView === 'all_agents' && (isMr ? 'सर्व ॲप एजंट्स (All Agents)' : 'All App Agents')}
              {activeView === 'active_agents' && (isMr ? 'सक्रिय ॲप एजंट्स (Active Agents)' : 'Active App Agents')}
              {activeView === 'clients_handled' && (isMr ? 'हाताळलेले सर्व क्लायंट्स (All Handled Clients)' : 'All Handled Clients')}
              {activeView === 'deals_closed' && (isMr ? 'यशस्वीरीत्या पूर्ण झालेले सौदे (Closed Deals)' : 'Closed Deals')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {activeView === 'all_agents' && `${sortedAgents.length} ${isMr ? 'एजंट्स' : 'Agents'}`}
              {activeView === 'active_agents' && `${sortedAgents.filter((a) => a.status === 'active').length} ${isMr ? 'सक्रिय' : 'Active'}`}
              {activeView === 'clients_handled' && `${filteredClients.length} ${isMr ? 'क्लायंट्स' : 'Clients'}`}
              {activeView === 'deals_closed' && `${filteredDeals.length} ${isMr ? 'सौदे' : 'Deals'}`}
            </span>
            {activeView !== 'all_agents' && (
              <button
                onClick={() => {
                  setActiveView('all_agents');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                title={isMr ? "सर्व एजंट्स दाखवा (Reset to All)" : "Show All Agents"}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isMr ? 'फिल्टर काढा (सर्व एजंट्स पहा)' : 'Clear Filter (Show All)'}</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {activeView === 'all_agents' && (isMr ? 'नोंदणीकृत सर्व एजंट्सची यादी. प्रोफाइल पाहण्यासाठी उजवीकडील ॲरोवर क्लिक करा.' : 'List of all registered agents. Click the arrow on the right to view profile.')}
            {activeView === 'active_agents' && (isMr ? 'सध्या मोबाईल ॲपवर सक्रिय असलेले एजंट्स.' : 'Agents currently active on the mobile app.')}
            {activeView === 'clients_handled' && (isMr ? 'सर्व एजंट्सनी हाताळलेले ग्राहक, त्यांची पसंती, बजेट आणि संपर्क.' : 'Clients handled by all agents, their preferences, budget and contact.')}
            {activeView === 'deals_closed' && (isMr ? 'एजंट्सनी यशस्वीरीत्या क्लोज केलेले सर्व सौदे व व्यवहार तपशील.' : 'All deals successfully closed by agents and transaction details.')}
          </p>
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeView === 'clients_handled' || activeView === 'deals_closed'
                  ? (isMr ? 'ग्राहक, फोन, मालमत्ता किंवा एजंट शोधा...' : 'Search client, phone, property or agent...')
                  : (isMr ? 'एजंटचे नाव, मोबाईल, कोड शोधा...' : 'Search agent name, mobile, code...')
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {(activeView === 'all_agents' || activeView === 'active_agents') && (
            <div className="w-40">
              <Select
                value={talukaFilter}
                onChange={(e) => setTalukaFilter(e.target.value)}
                options={[
                  { value: 'All', label: isMr ? 'सर्व तालुके' : 'All Talukas' },
                  ...talukas.map((tItem) => ({
                    value: tItem.name || tItem.label,
                    label: tItem.nameMr || tItem.name || tItem.label
                  }))
                ]}
                className="py-1.5 text-xs font-semibold"
              />
            </div>
          )}

          {activeView === 'clients_handled' && (
            <div className="w-48">
              <Select
                value={clientStatusFilter}
                onChange={(e) => setClientStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: isMr ? 'सर्व स्थिती (Status)' : 'All Status' },
                  { value: 'deal_closed', label: isMr ? 'सौदा पूर्ण (Deal Closed)' : 'Deal Closed' },
                  { value: 'visit_completed', label: isMr ? 'साईट व्हिजिट झाली' : 'Visit Completed' },
                  { value: 'negotiation', label: isMr ? 'किंमत वाटाघाटी' : 'Negotiation' },
                  { value: 'visit_scheduled', label: isMr ? 'व्हिजिट ठरली' : 'Visit Scheduled' },
                  { value: 'new', label: isMr ? 'नवीन चौकशी' : 'New Lead' }
                ]}
                className="py-1.5 text-xs font-semibold"
              />
            </div>
          )}
        </div>
      </div>

      {/* VIEW SECTIONS WITH SMOOTH ANIMATED TRANSITIONS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {/* VIEW 1 & 2: AGENTS LIST */}
          {(activeView === 'all_agents' || activeView === 'active_agents') && (
            <>
              {loading ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 font-bold">
                  {isMr ? 'एजंट्स माहिती लोड होत आहे...' : 'Loading agents information...'}
                </div>
              ) : sortedAgents.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="font-extrabold text-slate-800 text-lg">{isMr ? 'कोणताही एजंट आढळला नाही' : 'No Agents Found'}</div>
                  <p className="text-xs text-slate-400">{isMr ? 'कृपया शोध निकष बदला किंवा नवीन एजंट नोंदणी करा.' : 'Please adjust search criteria or register a new agent.'}</p>
                  {activeView === 'active_agents' && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActiveView('all_agents');
                        setStatusFilter('all');
                      }}
                      className="font-bold text-xs flex items-center gap-1.5 mx-auto mt-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isMr ? 'सर्व ॲप एजंट्स पहा (Show All)' : 'Show All Agents'}</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sortedAgents.map((agent) => {
                    return (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          setSelectedAgent(agent);
                          setActiveTab('growth');
                        }}
                        className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-md hover:ring-2 hover:ring-indigo-500/10 transition-all p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer group"
                        title={isMr ? "एजंटचे प्रोफाइल, ग्रोथ व कार्यप्रदर्शन पाहण्यासाठी क्लिक करा" : "Click to view agent profile, growth and performance"}
                      >
                        {/* Left: Agent Info */}
                        <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={agent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=4f46e5&color=fff&size=128`}
                              alt={agent.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-indigo-100 shadow-xs"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                              title={agent.status === 'active' ? (isMr ? 'ॲपवर सक्रिय' : 'Active on App') : (isMr ? 'निष्क्रिय' : 'Inactive')}
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors truncate">
                                {isMr ? (agent.nameMr || agent.name) : agent.name}
                              </h3>
                              {agent.nameMr && agent.name && isMr && (
                                <span className="text-xs text-slate-400 font-medium hidden sm:inline">({agent.name})</span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black tracking-wider uppercase">
                                {agent.code || 'AGENT'}
                              </span>
                              {agent.source === 'mobile_app' || agent.appDevice?.toLowerCase().includes('mobile') || agent.appDevice?.includes('मोबाईल') ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                                  <Smartphone className="w-3 h-3 text-emerald-600" />
                                  <span>{isMr ? 'मोबाईल ॲप नोंदणी' : 'Mobile App Registration'}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold">
                                  {isMr ? 'ॲडमिन नोंदणी' : 'Admin Registration'}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <a
                                  href={`tel:${agent.mobile}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:text-indigo-600 font-semibold"
                                >
                                  {agent.mobile}
                                </a>
                              </span>
                              {agent.cityVillage && (
                                <span className="hidden md:flex items-center gap-1 text-slate-500">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {agent.cityVillage} {agent.taluka ? `(${agent.taluka})` : ''}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                                <Smartphone className="w-3 h-3 text-emerald-500" />
                                {agent.appDevice || (isMr ? 'मोबाईल ॲप' : 'Mobile App')}
                              </span>
                              {agent.lastLoginAt && (
                                <span className="hidden lg:flex items-center gap-1 text-slate-400 text-[11px]">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {new Date(agent.lastLoginAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions and Small Arrow Button */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEdit(agent, e)}
                            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title={isMr ? "संपादित करा" : "Edit"}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteAgent(agent.id, e)}
                            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                            title={isMr ? "हटवा" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* SMALL ARROW BUTTON - opens growth and handled clients modal */}
                          <button
                            onClick={() => {
                              setSelectedAgent(agent);
                              setActiveTab('growth');
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-all cursor-pointer group/arrow"
                            title={isMr ? "ग्रोथ व हाताळलेले क्लायंट्स पहा" : "View Growth & Handled Clients"}
                          >
                            <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover/arrow:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* VIEW 3: HANDLED CLIENTS LIST (When 3rd box is clicked) */}
          {activeView === 'clients_handled' && (
            <>
              {filteredClients.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div className="font-extrabold text-slate-800 text-lg">{isMr ? 'कोणताही क्लायंट आढळला नाही' : 'No Clients Found'}</div>
                  <p className="text-xs text-slate-400">{isMr ? 'सध्या या निकषांमध्ये कोणताही क्लायंट उपलब्ध नाही.' : 'No clients available matching the criteria.'}</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveView('all_agents');
                      setStatusFilter('all');
                    }}
                    className="font-bold text-xs flex items-center gap-1.5 mx-auto mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isMr ? 'सर्व ॲप एजंट्सची यादी पहा (Show All Agents)' : 'Show All Agents'}</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="bg-white border border-slate-200/90 hover:border-indigo-300 p-4 sm:p-5 rounded-2xl transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                            <span>{client.name}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(client.status)}`}>
                              {client.statusLabelMr || client.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-semibold mt-1">
                            {isMr ? 'मालमत्तेत स्वारस्य:' : 'Interested In:'} <span className="text-indigo-600 font-bold">{client.propertyInterest}</span>
                          </div>
                          {client.budget && (
                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                              {isMr ? 'बजेट:' : 'Budget:'} <span className="font-extrabold text-slate-800">{client.budget}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${client.mobile}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                            title={isMr ? "कॉल करा" : "Call"}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{client.mobile}</span>
                          </a>
                          <a
                            href={`https://wa.me/91${client.mobile}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                            title={isMr ? "व्हॉट्सॲप मेसेज करा" : "Send WhatsApp"}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}</span>
                          </a>
                        </div>
                      </div>

                      {/* Handling Agent Info Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">{isMr ? 'हँडलिंग एजंट:' : 'Handling Agent:'}</span>
                          <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {client.agentName} ({client.agentCode})
                          </span>
                        </div>
                        {client.lastFollowUp && (
                          <span className="text-[11px] text-slate-400">
                            {isMr ? 'फॉलो-अप:' : 'Follow-up:'} {client.lastFollowUp}
                          </span>
                        )}
                      </div>

                      {client.notes && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {client.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VIEW 4: DEALS CLOSED LIST (When 4th box is clicked) */}
          {activeView === 'deals_closed' && (
            <>
              {filteredDeals.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="font-extrabold text-slate-800 text-lg">{isMr ? 'कोणताही पूर्ण झालेला सौदा आढळला नाही' : 'No Closed Deals Found'}</div>
                  <p className="text-xs text-slate-400">{isMr ? 'सध्या डेटाबेसमध्ये पूर्ण झालेले सौदे नोंदलेले नाहीत.' : 'No closed deals recorded yet.'}</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveView('all_agents');
                      setStatusFilter('all');
                    }}
                    className="font-bold text-xs flex items-center gap-1.5 mx-auto mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isMr ? 'सर्व ॲप एजंट्सची यादी पहा (Show All Agents)' : 'Show All Agents'}</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-white border border-emerald-200/90 hover:border-emerald-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                            <span>{deal.name}</span>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✅ {isMr ? 'सौदा पूर्ण (Closed)' : 'Deal Closed'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-semibold mt-1">
                            {isMr ? 'खरेदी केलेली मालमत्ता:' : 'Purchased Property:'} <span className="text-emerald-700 font-bold">{deal.propertyInterest}</span>
                          </div>
                          {deal.budget && (
                            <div className="text-xs text-slate-700 font-medium mt-0.5">
                              {isMr ? 'व्यवहार रक्कम:' : 'Deal Amount:'} <span className="font-extrabold text-emerald-700">{deal.budget}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${deal.mobile}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{deal.mobile}</span>
                          </a>
                          <a
                            href={`https://wa.me/91${deal.mobile}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}</span>
                          </a>
                        </div>
                      </div>

                      {/* Deal Closing Agent Info Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">{isMr ? 'सौदा पूर्ण करणारा एजंट:' : 'Closing Agent:'}</span>
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {deal.agentName} ({deal.agentCode})
                          </span>
                        </div>
                        {deal.lastFollowUp && (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            {isMr ? 'तारीख:' : 'Date:'} {deal.lastFollowUp}
                          </span>
                        )}
                      </div>

                      {deal.notes && (
                        <div className="text-[11px] text-emerald-900 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                          {deal.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* DETAILED AGENT GROWTH & CLIENT PORTFOLIO MODAL (The Core Request) */}
      <Dialog
        isOpen={Boolean(selectedAgent)}
        onClose={() => setSelectedAgent(null)}
        title={
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <div className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <span>{isMr ? (selectedAgent?.nameMr || selectedAgent?.name) : selectedAgent?.name}</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-black">
                  {selectedAgent?.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                {isMr ? 'एजंट ग्रोथ ॲनालिटिक्स, कार्यप्रदर्शन आणि हाताळलेल्या क्लायंट्सचा पोर्टफोलिओ' : 'Agent growth analytics, performance and client portfolio'}
              </p>
            </div>
          </div>
        }
        maxWidth="max-w-4xl"
      >
        {selectedAgent && (
          <div className="space-y-6 pt-2">
            {/* Top Quick Agent Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedAgent.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAgent.name)}&background=6366f1&color=fff&size=128`}
                  alt={selectedAgent.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-400"
                />
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>{isMr ? (selectedAgent.nameMr || selectedAgent.name) : selectedAgent.name}</span>
                    {selectedAgent.name && isMr && <span className="text-xs text-indigo-300 font-normal">({selectedAgent.name})</span>}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                    <span>📞 {selectedAgent.mobile}</span>
                    <span>📍 {selectedAgent.cityVillage || selectedAgent.taluka}</span>
                    <span className="text-emerald-400 font-bold">{isMr ? '● ॲपवर सक्रिय' : '● Active on App'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedAgent.mobile}`}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {isMr ? 'कॉल' : 'Call'}
                </a>
                <a
                  href={`https://wa.me/91${selectedAgent.mobile}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}
                </a>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('growth')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'growth'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>{isMr ? 'ग्रोथ व कार्यप्रदर्शन (Growth)' : 'Growth & Performance'}</span>
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'clients'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{isMr ? 'हाताळलेले क्लायंट्स' : 'Handled Clients'} ({selectedAgent.clients?.length || selectedAgent.totalClientsHandled || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'activity'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{isMr ? 'ॲप ॲक्टिव्हिटी हिस्ट्री' : 'App Activity History'}</span>
              </button>
            </div>

            {/* TAB 1: GROWTH & ANALYTICS */}
            {activeTab === 'growth' && (
              <div className="space-y-6">
                {/* 4 Performance Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl text-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 block">
                      {isMr ? 'एकूण क्लायंट्स' : 'Total Clients'}
                    </span>
                    <span className="text-3xl font-black text-indigo-700 mt-1 block">
                      {selectedAgent.totalClientsHandled || selectedAgent.clients?.length || 0}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold">{isMr ? 'आतापर्यंत हाताळलेले' : 'Handled So Far'}</span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl text-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block">
                      {isMr ? 'यशस्वी व्यवहार (Deals)' : 'Closed Deals'}
                    </span>
                    <span className="text-3xl font-black text-emerald-700 mt-1 block">
                      {selectedAgent.totalDealsClosed || 0}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{isMr ? 'सौदा पूर्ण झाले' : 'Deals Closed'}</span>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl text-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 block">
                      {isMr ? 'प्रकल्प भेटी (Site Visits)' : 'Site Visits'}
                    </span>
                    <span className="text-3xl font-black text-blue-700 mt-1 block">
                      {selectedAgent.totalSiteVisits || 18}
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold">{isMr ? 'ग्राहकांना दाखवले' : 'Conducted Visits'}</span>
                  </div>

                  <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl text-center">
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 block">
                      {isMr ? 'कन्व्हर्जन रेट' : 'Conversion Rate'}
                    </span>
                    <span className="text-3xl font-black text-purple-700 mt-1 block">
                      {selectedAgent.conversionRate || 75}%
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold">{isMr ? 'यशस्वी रूपांतरण' : 'Success Rate'}</span>
                  </div>
                </div>

                {/* Growth Progress Breakdown */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h4 className="font-extrabold text-sm text-slate-800 flex items-center justify-between">
                    <span>{isMr ? 'कार्यप्रदर्शन निर्देशांक (Performance Index)' : 'Performance Index'}</span>
                    <span className="text-xs text-indigo-600 font-black">
                      {isMr ? 'ग्रोथ स्कोअर:' : 'Growth Score:'} {selectedAgent.growthScore || 90}/100
                    </span>
                  </h4>

                  {/* Progress bars */}
                  <div className="space-y-3 text-xs font-bold text-slate-600">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>{isMr ? 'क्लायंट हाताळणी क्षमता (Client Handling Rate)' : 'Client Handling Rate'}</span>
                        <span className="text-indigo-600">95%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span>{isMr ? 'डील क्लोजिंग यश (Deal Closure Success)' : 'Deal Closure Success'}</span>
                        <span className="text-emerald-600">{selectedAgent.conversionRate || 75}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${selectedAgent.conversionRate || 75}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span>{isMr ? 'साईट व्हिजिट पूर्णता (Site Visit Conversion)' : 'Site Visit Conversion'}</span>
                        <span className="text-blue-600">82%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '82%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Notes / Insights */}
                {selectedAgent.notes && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs">
                    <span className="font-black text-amber-900 block uppercase tracking-wider mb-1">
                      {isMr ? 'ॲडमिन शेरा / टीप (Admin Notes)' : 'Admin Notes'}
                    </span>
                    <p className="text-amber-800">{selectedAgent.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CLIENTS HANDLED BY THIS AGENT */}
            {activeTab === 'clients' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800">
                      {isMr ? 'हाताळलेले सर्व ग्राहक (Client Portfolio)' : 'Client Portfolio'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {isMr ? 'या एजंटकडे सोपवलेले व त्यांनी ॲपद्वारे संपर्क केलेले क्लायंट्स' : 'Clients assigned to this agent and contacted via app'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsAddClientOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isMr ? 'नवीन क्लायंट जोडा' : 'Add New Client'}</span>
                  </Button>
                </div>

                {(!selectedAgent.clients || selectedAgent.clients.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    {isMr ? 'या एजंटने अद्याप कोणताही क्लायंट जोडलेला नाही. वरील बटणावर क्लिक करून क्लायंट जोडा.' : 'No clients added by this agent yet. Click the button above to add a client.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAgent.clients.map((client) => {
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'deal_closed':
                            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          case 'visit_completed':
                            return 'bg-blue-50 text-blue-700 border-blue-200';
                          case 'negotiation':
                            return 'bg-purple-50 text-purple-700 border-purple-200';
                          case 'visit_scheduled':
                            return 'bg-amber-50 text-amber-700 border-amber-200';
                          default:
                            return 'bg-slate-100 text-slate-700 border-slate-200';
                        }
                      };

                      return (
                        <div
                          key={client.id}
                          className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl transition-all shadow-xs space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                <span>{client.name}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(client.status)}`}>
                                  {client.statusLabelMr || client.status}
                                </span>
                              </div>
                              <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                                {isMr ? 'मालमत्तेत स्वारस्य:' : 'Interested in:'} {client.propertyInterest}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${client.mobile}`}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{client.mobile}</span>
                              </a>
                              <a
                                href={`https://wa.me/91${client.mobile}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isMr ? 'व्हॉट्सॲप' : 'WhatsApp'}</span>
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <div>
                              {client.budget && (
                                <span className="font-bold text-slate-700 mr-3">{isMr ? 'बजेट:' : 'Budget:'} {client.budget}</span>
                              )}
                              {client.notes && <span>{isMr ? 'शेरा:' : 'Notes:'} {client.notes}</span>}
                            </div>
                            <div className="text-slate-400">
                              {isMr ? 'तारीख:' : 'Date:'} {client.createdAt} • {isMr ? 'शेवटचा फॉलो-अप:' : 'Last follow-up:'} {client.lastFollowUp}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: APP ACTIVITY LOGS */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-800">
                  {isMr ? 'मोबाईल ॲप लॉगिन व ॲक्टिव्हिटी इतिहास (Activity Log)' : 'Mobile App Login & Activity Log'}
                </h4>
                {(!selectedAgent.activityLogs || selectedAgent.activityLogs.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs">
                    {isMr ? 'ॲक्टिव्हिटी नोंदी उपलब्ध नाहीत.' : 'No activity records available.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAgent.activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                            <Clock className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-bold text-slate-800">{isMr ? (log.actionMr || log.action) : log.action}</div>
                            <div className="text-[10px] text-slate-400 uppercase">{log.type}</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {new Date(log.timestamp).toLocaleString(isMr ? 'mr-IN' : 'en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* ADD / EDIT AGENT MODAL */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </span>
            <span className="font-extrabold text-lg text-slate-900">
              {editingAgent 
                ? (isMr ? 'एजंट माहिती संपादित करा' : 'Edit Agent Information') 
                : (isMr ? 'नवीन ॲप एजंट नोंदणी करा' : 'Register New App Agent')}
            </span>
          </div>
        }
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitAgent} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'एजंटचे नाव (इंग्रजी) *' : 'Agent Name (English) *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isMr ? "उदा. Sachin Kadam" : "e.g. Sachin Kadam"}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'एजंटचे नाव (मराठी)' : 'Agent Name (Marathi)'}
              </label>
              <input
                type="text"
                value={formData.nameMr}
                onChange={(e) => setFormData({ ...formData, nameMr: e.target.value })}
                placeholder={isMr ? "उदा. सचिन विलास कदम" : "e.g. सचिन विलास कदम"}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'मोबाईल नंबर * (ॲप लॉगिन आयडी)' : 'Mobile Number * (App Login ID)'}
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                inputMode="numeric"
                value={formData.mobile}
                onKeyDown={(e) => {
                  if (
                    !/^\d$/.test(e.key) &&
                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) &&
                    !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Unidentified' && e.keyCode !== 229
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="9822XXXXXX"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'ईमेल (पर्यायी)' : 'Email (Optional)'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="agent@example.com"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={isMr ? 'जिल्हा' : 'District'}
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              options={districts.map((d) => ({
                value: d.name || d.label,
                label: isMr ? (d.nameMr || d.name || d.label) : (d.name || d.label || d.nameMr)
              }))}
              className="py-2.5 text-xs sm:text-sm font-medium"
            />

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'तालुका / शहर' : 'Taluka / City'}
              </label>
              <input
                type="text"
                value={formData.cityVillage}
                onChange={(e) => setFormData({ ...formData, cityVillage: e.target.value })}
                placeholder={isMr ? "उदा. विश्रामबाग, सांगली" : "e.g. Vishrambag, Sangli"}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={isMr ? 'स्थिती (Status)' : 'Status'}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'active', label: isMr ? '● सक्रिय (Active on App)' : '● Active (Active on App)' },
                { value: 'inactive', label: isMr ? '○ निष्क्रिय (Inactive)' : '○ Inactive' }
              ]}
              className="py-2.5 text-xs sm:text-sm font-bold"
            />

            {!editingAgent && (
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  {isMr ? 'प्रारंभिक पासवर्ड' : 'Initial Password'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.initialPassword}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-700"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {isMr ? 'शेरा / टीप (Notes)' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isMr ? "उदा. सांगली शहरातील लक्झरी फ्लॅट्सचे काम सोपवले आहे." : "e.g. Assigned luxury flats in Sangli city."}
              className="w-full border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl px-5 text-xs font-bold cursor-pointer"
            >
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-7 text-xs font-black shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              {isSubmitting 
                ? (isMr ? 'सेव्ह होत आहे...' : 'Saving...') 
                : editingAgent 
                  ? (isMr ? 'अपडेट करा' : 'Update Agent') 
                  : (isMr ? 'एजंट जोडा' : 'Add Agent')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ADD CLIENT MODAL FOR SELECTED AGENT */}
      <Dialog
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </span>
            <span className="font-extrabold text-lg text-slate-900">
              {isMr 
                ? `${selectedAgent?.nameMr || selectedAgent?.name} यांना नवीन क्लायंट जोडा` 
                : `Add New Client for ${selectedAgent?.name || selectedAgent?.nameMr}`}
            </span>
          </div>
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddClientToAgent} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {isMr ? 'क्लायंटचे नाव *' : 'Client Name *'}
            </label>
            <input
              type="text"
              required
              value={newClientData.name}
              onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
              placeholder={isMr ? "उदा. राहुल सुरेश कुलकर्णी" : "e.g. Rahul Suresh Kulkarni"}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {isMr ? 'क्लायंटचा मोबाईल नंबर *' : 'Client Mobile Number *'}
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              inputMode="numeric"
              value={newClientData.mobile}
              onKeyDown={(e) => {
                if (
                  !/^\d$/.test(e.key) &&
                  !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) &&
                  !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Unidentified' && e.keyCode !== 229
                ) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => setNewClientData({ ...newClientData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="98XXXXXXXX"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {isMr ? 'स्वारस्य असलेली मालमत्ता (Property Interest)' : 'Property Interest'}
            </label>
            <input
              type="text"
              value={newClientData.propertyInterest}
              onChange={(e) => setNewClientData({ ...newClientData, propertyInterest: e.target.value })}
              placeholder={isMr ? "उदा. 2 BHK Luxury Flat - विश्रामबाग" : "e.g. 2 BHK Luxury Flat - Vishrambag"}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                {isMr ? 'बजेट (Budget)' : 'Budget'}
              </label>
              <input
                type="text"
                value={newClientData.budget}
                onChange={(e) => setNewClientData({ ...newClientData, budget: e.target.value })}
                placeholder={isMr ? "उदा. ₹ 40 L" : "e.g. ₹ 40 L"}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <Select
              label={isMr ? 'स्थिती (Status)' : 'Status'}
              value={newClientData.status}
              onChange={(e) => setNewClientData({ ...newClientData, status: e.target.value as any })}
              options={[
                { value: 'new', label: isMr ? 'नवीन चौकशी' : 'New Lead' },
                { value: 'contacted', label: isMr ? 'संपर्क साधला' : 'Contacted' },
                { value: 'visit_scheduled', label: isMr ? 'व्हिजिट ठरली' : 'Visit Scheduled' },
                { value: 'visit_completed', label: isMr ? 'साईट व्हिजिट झाली' : 'Visit Completed' },
                { value: 'negotiation', label: isMr ? 'वाटाघाटी सुरू' : 'Negotiation' },
                { value: 'deal_closed', label: isMr ? 'सौदा पूर्ण' : 'Deal Closed' }
              ]}
              className="py-2.5 text-xs sm:text-sm font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              {isMr ? 'शेरा (Notes)' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={newClientData.notes}
              onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
              placeholder={isMr ? "उदा. उद्या दुपारी १२ वाजता भेट ठरली." : "e.g. Meeting scheduled tomorrow at 12 PM."}
              className="w-full border border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddClientOpen(false)}
              className="rounded-xl px-5 text-xs font-bold cursor-pointer"
            >
              {isMr ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 text-xs font-black cursor-pointer shadow-md"
            >
              {isMr ? 'क्लायंट जोडा' : 'Add Client'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
