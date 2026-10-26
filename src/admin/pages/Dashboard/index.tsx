import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import { fetchCollection, subscribeToCollection } from '../../../services/firebase';
import { Link } from 'react-router-dom';
import { Card as UICard } from '../../../components/ui/Card';
import { Home, Clock, CheckCircle, Users, UserCheck, TrendingUp, XCircle, ShieldAlert, FolderGit2, MessageSquare, Settings, Image as ImageIcon, Key, ShoppingCart } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLive: 0,
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    onHold: 0,
    users: 8420,
    agents: 4,
    enquiries: 0,
    visits: 0
  });

  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [enquiriesList, setEnquiriesList] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    let propsLoaded = false;
    let logsLoaded = false;

    const unsubProps = subscribeToCollection('properties', (list) => {
      setPropertiesList(list || []);
      const pendingCount = (list || []).filter((p) => p.status === 'pending').length;
      const liveCount = (list || []).filter((p) => p.status === 'approved' || p.status === 'active').length;
      const onHoldCount = (list || []).filter((p) => p.status === 'onhold').length;

      setStats((prev) => ({
        ...prev,
        pending: pendingCount,
        totalLive: liveCount,
        onHold: onHoldCount
      }));

      const counts: Record<string, number> = {};
      (list || []).forEach((p) => {
        const cat = p.propertyType || p.category || 'Other';
        const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        counts[formattedCat] = (counts[formattedCat] || 0) + 1;
      });
      setCategoryCounts(counts);

      propsLoaded = true;
      if (propsLoaded && logsLoaded) setLoading(false);
    });

    const unsubLogs = subscribeToCollection('admin_logs', (logsList) => {

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const approvedTodayCount = logsList.filter(
        (l) => l.actionType === 'approve' && new Date(l.timestamp) >= startOfToday
      ).length;

      const rejectedTodayCount = logsList.filter(
        (l) => l.actionType === 'reject' && new Date(l.timestamp) >= startOfToday
      ).length;

      setStats((prev) => ({
        ...prev,
        approvedToday: approvedTodayCount,
        rejectedToday: rejectedTodayCount
      }));

      logsLoaded = true;
      if (propsLoaded && logsLoaded) setLoading(false);
    });

    const unsubEnquiries = subscribeToCollection('enquiries', (list) => {
      setEnquiriesList(list || []);
      setStats((prev) => ({ ...prev, enquiries: (list || []).length }));
    });

    fetchCollection('visit_requests').then((res) => {
      setStats((prev) => ({ ...prev, visits: res.length }));
    });
    let dAgents: any[] = [];
    let dUsers: any[] = [];
    const updateDashboardAgentStats = () => {
      const agentKeys = new Set<string>();
      (dAgents || []).forEach((a) => {
        if (!a || ['agent-101', 'agent-102', 'agent-103', 'agent-104'].includes(a.id)) return;
        const key = a.mobile || a.phone || a.phoneNumber || a.id;
        if (key) agentKeys.add(String(key));
      });
      const nonAdminUsers = (dUsers || []).filter((u) => {
        if (!u) return false;
        const role = (u.role || '').toString().toLowerCase().trim();
        const userType = (u.userType || '').toString().toLowerCase().trim();
        const email = (u.email || '').toString().toLowerCase().trim();
        const uName = (u.name || u.displayName || u.fullName || '').toString().toLowerCase().trim();
        const uid = String(u.id || u.uid || '').trim();
        return !(
          role === 'admin' ||
          role === 'super_admin' ||
          userType === 'admin' ||
          userType === 'super_admin' ||
          email === 'admin@gmail.com' ||
          email === 'admin@sahyadri.com' ||
          u.isAdmin === true ||
          uid === 'B47ojxIU3icqVzJSRTdHpouDN0A2' ||
          uid === 'admin-123' ||
          uName.includes('super admin') ||
          uName === 'admin'
        );
      });
      nonAdminUsers.forEach((u) => {
        const role = (u.role || '').toString().toLowerCase();
        const userType = (u.userType || '').toString().toLowerCase();
        const isAgent = u.isAgent === true || role === 'agent' || userType === 'agent';
        if (isAgent) {
          const key = u.mobile || u.phone || u.phoneNumber || u.id || u.uid;
          if (key) agentKeys.add(String(key));
        }
      });
      setStats((prev) => ({ ...prev, agents: agentKeys.size, users: nonAdminUsers.length }));
    };

    const unsubAgents = subscribeToCollection('agents', (list) => {
      dAgents = list || [];
      updateDashboardAgentStats();
    });

    const unsubUsers = subscribeToCollection('users', (list) => {
      dUsers = list || [];
      updateDashboardAgentStats();
    });

    return () => {
      if (typeof unsubProps === 'function') unsubProps();
      if (typeof unsubLogs === 'function') unsubLogs();
      if (typeof unsubEnquiries === 'function') unsubEnquiries();
      if (typeof unsubAgents === 'function') unsubAgents();
      if (typeof unsubUsers === 'function') unsubUsers();
    };
  }, []);

  // Real charts data dynamically aggregated from live database properties and enquiries
  const trendsData = useMemo(() => {
    const now = new Date();
    const buckets: Array<{
      name: string;
      year: number;
      month: number;
      Listings: number;
      Enquiries: number;
    }> = [];

    // Rolling 6-month window up to current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const name = d.toLocaleString('en-US', { month: 'short' });
      buckets.push({
        name,
        year: d.getFullYear(),
        month: d.getMonth(),
        Listings: 0,
        Enquiries: 0
      });
    }

    const parseItemDate = (item: any): Date | null => {
      if (!item) return null;
      const raw = item.createdAt || item.timestamp || item.date || item.appliedAt || item.updatedAt;
      if (raw) {
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
        if (typeof raw === 'object' && typeof raw.seconds === 'number') {
          return new Date(raw.seconds * 1000);
        }
        const d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
      }
      if (item.id && typeof item.id === 'string') {
        const match = item.id.match(/(\d{10,13})$/);
        if (match) {
          const ts = parseInt(match[1], 10);
          const d = new Date(ts > 1e11 ? ts : ts * 1000);
          if (!isNaN(d.getTime())) return d;
        }
      }
      return null;
    };

    propertiesList.forEach((p) => {
      const d = parseItemDate(p);
      if (!d) return;
      const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
      if (bucket) {
        bucket.Listings += 1;
      }
    });

    enquiriesList.forEach((e) => {
      const d = parseItemDate(e);
      if (!d) return;
      const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
      if (bucket) {
        bucket.Enquiries += 1;
      }
    });

    return buckets.map(({ name, Listings, Enquiries }) => ({
      name,
      Listings,
      Enquiries
    }));
  }, [propertiesList, enquiriesList]);

  const listingDistribution = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    Count: count,
  }));

  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const hasUsersAccess = user?.role === 'admin' || (user?.role === 'employee' && user.permissions?.includes('/admin/users'));

  const allStatCards = [
    {
      title: t('admin.dashboard.pendingReviews'),
      value: stats.pending,
      badge: t('admin.dashboard.needsAction'),
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-50',
      path: '/admin/property-sell/pending',
      show: isAdmin
    },
    {
      title: t('admin.dashboard.liveProperties'),
      value: stats.totalLive,
      badge: t('admin.dashboard.publiclyActive'),
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-255',
      icon: <Home className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50',
      path: '/admin/property-sell/approved',
      show: isAdmin
    },
    {
      title: t('admin.dashboard.approvedToday'),
      value: stats.approvedToday,
      badge: t('admin.dashboard.verifiedToday'),
      badgeClass: 'bg-green-50 text-green-700 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      iconBg: 'bg-green-50',
      path: '/admin/property-sell/approved',
      show: isAdmin
    },
    {
      title: t('admin.dashboard.rejectedToday'),
      value: stats.rejectedToday,
      badge: t('admin.dashboard.deniedToday'),
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      iconBg: 'bg-rose-50',
      path: '/admin/property-sell/rejected',
      show: isAdmin
    },
    {
      title: t('admin.dashboard.onHoldListings'),
      value: stats.onHold,
      badge: t('admin.dashboard.pendingInfo'),
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-50',
      path: '/admin/property-sell/pending',
      show: isAdmin
    },
    {
      title: t('admin.dashboard.registeredUsers'),
      value: stats.users,
      badge: t('admin.dashboard.activeClients'),
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <Users className="w-5 h-5 text-slate-700" />,
      iconBg: 'bg-slate-100',
      path: '/admin/users',
      show: hasUsersAccess
    },
    {
      title: t('admin.dashboard.activeAgents', 'सक्रिय ॲप एजंट्स'),
      value: stats.agents,
      badge: t('admin.dashboard.appAgentsBadge', 'मोबाईल ॲप'),
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <UserCheck className="w-5 h-5 text-indigo-600" />,
      iconBg: 'bg-indigo-50',
      path: '/admin/agents',
      show: isAdmin
    }
  ];

  const statCards = allStatCards.filter(card => card.show);

  const employeeCards = [
    {
      path: '/admin/hero-section',
      title: t('admin.sidebar.heroSection'),
      description: 'Manage homepage banners and visuals',
      icon: <ImageIcon className="w-7 h-7 text-indigo-600" />,
      iconBg: 'bg-indigo-50/80',
    },
    {
      path: '/admin/projects',
      title: t('admin.sidebar.newProjects'),
      description: 'Add or update real estate projects',
      icon: <FolderGit2 className="w-7 h-7 text-blue-600" />,
      iconBg: 'bg-blue-50/80',
    },
    {
      path: '/admin/property-sell',
      title: t('admin.sidebar.propertyForSell'),
      description: 'Manage properties listed for sale',
      icon: <ShoppingCart className="w-7 h-7 text-emerald-600" />,
      iconBg: 'bg-emerald-50/80',
    },
    {
      path: '/admin/property-rent',
      title: t('admin.sidebar.propertyForRent'),
      description: 'Manage rental property listings',
      icon: <Key className="w-7 h-7 text-amber-600" />,
      iconBg: 'bg-amber-50/80',
    },
    {
      path: '/admin/users',
      title: t('admin.sidebar.registeredUsers'),
      description: 'View and manage client accounts',
      icon: <Users className="w-7 h-7 text-slate-700" />,
      iconBg: 'bg-slate-100/80',
    },
    {
      path: '/admin/enquiries',
      title: t('admin.sidebar.leadsEnquiries'),
      description: 'Handle customer messages and leads',
      icon: <MessageSquare className="w-7 h-7 text-rose-600" />,
      iconBg: 'bg-rose-50/80',
    },
    {
      path: '/admin/settings',
      title: t('admin.sidebar.websiteSettings'),
      description: 'Update system configurations',
      icon: <Settings className="w-7 h-7 text-slate-600" />,
      iconBg: 'bg-slate-100/80',
    }
  ];

  const allowedEmployeeCards = employeeCards.filter(card => 
    user?.permissions?.includes(card.path)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mb-1.5">
          {t('admin.dashboard.welcome')}
        </h1>
      </div>

      {/* KPI Cards Grid (Admin Only for most) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <UICard 
            key={idx} 
            className="p-6 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl flex flex-col justify-between h-40 group relative overflow-hidden cursor-pointer" 
            onClick={() => card.path && navigate(card.path)}
          >
            {/* Subtle top indicator hover line */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-100 group-hover:bg-accent transition-colors duration-300"></div>
            <div className="flex justify-between items-start">
              <div className={`p-2.5 ${card.iconBg} rounded-xl border border-transparent transition-transform group-hover:scale-105 duration-300`}>
                {card.icon}
              </div>
              <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${card.badgeClass}`}>
                {card.badge}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{card.title}</p>
              <h3 className="text-3xl font-serif text-slate-900 font-bold">{card.value}</h3>
            </div>
          </UICard>
        ))}
      </div>

      {/* Employee Quick Access Cards */}
      {!isAdmin && (
        <div className="space-y-8 mt-6">
          <p className="text-slate-500 font-medium text-lg">Here are the modules you have access to:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {allowedEmployeeCards.map((card, idx) => (
              <Link key={idx} to={card.path} className="block group h-full">
                <UICard className="p-8 bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 rounded-3xl flex flex-col items-start text-left h-full min-h-[220px] relative overflow-hidden hover:-translate-y-1">
                  
                  {/* Decorative Gradient on Hover */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className={`p-4 ${card.iconBg} rounded-2xl border border-white shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300 mb-6 z-10`}>
                    {card.icon}
                  </div>
                  
                  <div className="flex-1 flex flex-col z-10">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">{card.title}</h3>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">
                      {card.description}
                    </p>

                    <div className="mt-auto flex items-center text-[10px] font-bold uppercase tracking-wider text-accent group-hover:text-primary transition-colors">
                      Open Module <span className="ml-1 inline-block opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">→</span>
                    </div>
                  </div>
                </UICard>
              </Link>
            ))}
          </div>
          {allowedEmployeeCards.length === 0 && (
            <div className="p-10 text-center bg-white border border-slate-200 border-dashed rounded-3xl shadow-sm">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-bold text-lg">No Modules Assigned</p>
              <p className="text-slate-400 text-sm mt-1">You do not have access to any modules yet.</p>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Line Chart */}
          <UICard className="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl min-w-0" >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif text-primary font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" /> {t('admin.dashboard.marketTrends')}
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('admin.dashboard.last6Months')}</span>
            </div>
            <div className="h-64 w-full text-[11px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={trendsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                    labelStyle={{ color: '#0f172a', fontFamily: 'serif', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="Listings" stroke="#0f172a" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Enquiries" stroke="#f97316" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </UICard>

          {/* Bar Chart */}
          <UICard className="p-8 bg-white border border-slate-100 shadow-sm rounded-2xl min-w-0" >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif text-primary font-bold">{t('admin.dashboard.categoryBreakdown')}</h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('admin.dashboard.byPropertyType')}</span>
            </div>
            <div className="h-64 w-full text-[11px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={listingDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    labelStyle={{ color: '#0f172a', fontFamily: 'serif', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Count" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </UICard>

        </div>
      )}


    </div>
  );
};
export default Dashboard;
