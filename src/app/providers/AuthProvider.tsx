import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToAuth, signIn, registerUser, logout as authLogout, isMockMode, fetchDocument, subscribeToDocument } from '../../services/firebase';
import { fetchUserRoleInquiry } from '../../services/roleInquiry';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  status?: string;
  permissions?: string[];
  photoURL?: string | null;
  mobile?: string;
  repId?: string;
  repCode?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authInitialized: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string, isAdminLogin?: boolean) => Promise<any>;
  register: (email: string, pass: string, name: string, mobile?: string, initialRole?: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  mockMode: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      const savedAdmin = localStorage.getItem('astitva_admin_session');
      if (savedAdmin) {
        try {
          const parsed = JSON.parse(savedAdmin);
          if (parsed && (parsed.role === 'admin' || parsed.email === 'admin@gmail.com')) {
            return parsed;
          }
        } catch (e) {}
      }
      const savedRep = localStorage.getItem('sahyadri_rep_session');
      if (savedRep) {
        try {
          const parsed = JSON.parse(savedRep);
          if (parsed && parsed.role === 'representative') {
            return parsed;
          }
        } catch (e) {}
      }
      const savedUser = localStorage.getItem('sahyadri_user_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.uid) {
            return parsed;
          }
        } catch (e) {}
      }
      const mockSaved = localStorage.getItem('luminous_mock_user');
      if (mockSaved) {
        try { return JSON.parse(mockSaved); } catch (e) {}
      }
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('astitva_admin_session')) return false;
      if (localStorage.getItem('sahyadri_rep_session')) return false;
      if (localStorage.getItem('sahyadri_user_session')) return false;
      if (localStorage.getItem('luminous_mock_user')) return false;
    }
    return true;
  });

  const [authInitialized, setAuthInitialized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('astitva_admin_session')) return true;
      if (localStorage.getItem('sahyadri_rep_session')) return true;
      if (localStorage.getItem('sahyadri_user_session')) return true;
      if (localStorage.getItem('luminous_mock_user')) return true;
    }
    return false;
  });

  useEffect(() => {
    const hasExistingSession = typeof window !== 'undefined' && (
      !!localStorage.getItem('astitva_admin_session') ||
      !!localStorage.getItem('sahyadri_rep_session') ||
      !!localStorage.getItem('sahyadri_user_session') ||
      !!localStorage.getItem('luminous_mock_user')
    );
    if (!hasExistingSession) {
      setLoading(true);
    }
    const unsubscribe = subscribeToAuth((authUser) => {
      console.log("AUTH EVENT: subscribeToAuth callback fired", { authUser });
      setUser(authUser);
      if (authUser && typeof window !== 'undefined') {
        if (authUser.role === 'admin' || authUser.email === 'admin@gmail.com') {
          localStorage.setItem('astitva_admin_session', JSON.stringify(authUser));
        } else if (authUser.role === 'representative') {
          localStorage.setItem('sahyadri_rep_session', JSON.stringify(authUser));
        } else {
          localStorage.setItem('sahyadri_user_session', JSON.stringify(authUser));
        }
      }
      setLoading(false);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time live listener for role upgrade approval across devices & collections
  useEffect(() => {
    if (!user?.uid || user.role === 'admin' || user.email === 'admin@gmail.com') return;

    const cleanMobile = (
      user.mobile ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
      ''
    ).replace(/[^0-9]/g, '').slice(-10);

    const checkRoleToken = () => {
      try {
        const uidToken = localStorage.getItem(`sahyadri_role_approved_${user.uid}`);
        let tokenRole = '';
        if (uidToken) {
          const p = JSON.parse(uidToken);
          if (p?.role) tokenRole = p.role;
        }
        if (!tokenRole && cleanMobile) {
          const mobToken = localStorage.getItem(`sahyadri_role_approved_${cleanMobile}`);
          if (mobToken) {
            const p = JSON.parse(mobToken);
            if (p?.role) tokenRole = p.role;
          }
        }
        if (tokenRole && tokenRole !== user.role) {
          console.log(`[AuthProvider] Applied approved role from token: ${user.role} -> ${tokenRole}`);
          const updated: AuthUser = {
            ...user,
            role: tokenRole
          };
          setUser(updated);
          localStorage.setItem('sahyadri_user_session', JSON.stringify(updated));
        }
      } catch {}
    };

    checkRoleToken();

    let unsubDocUid: any = null;
    let unsubDocMob: any = null;

    const handleDocUpdate = (docData: any) => {
      if (docData && docData.role && docData.role !== user.role) {
        console.log(`[AuthProvider] User role upgraded: ${user.role} -> ${docData.role}`);
        const updated: AuthUser = {
          ...user,
          role: docData.role,
          displayName: docData.name || docData.displayName || user.displayName,
          mobile: docData.mobile || user.mobile,
          status: docData.status || user.status
        };
        setUser(updated);
        localStorage.setItem('sahyadri_user_session', JSON.stringify(updated));
      }
    };

    try {
      unsubDocUid = subscribeToDocument('users', user.uid, handleDocUpdate);
    } catch (e) {
      console.warn('Could not subscribe to live user doc by uid:', e);
    }

    if (cleanMobile && cleanMobile !== user.uid) {
      try {
        unsubDocMob = subscribeToDocument('users', cleanMobile, handleDocUpdate);
      } catch (e) {}
    }

    window.addEventListener('storage', checkRoleToken);
    window.addEventListener('role_inquiry_updated', checkRoleToken);

    return () => {
      if (typeof unsubDocUid === 'function') unsubDocUid();
      if (typeof unsubDocMob === 'function') unsubDocMob();
      window.removeEventListener('storage', checkRoleToken);
      window.removeEventListener('role_inquiry_updated', checkRoleToken);
    };
  }, [user?.uid, user?.role, user?.mobile, user?.email]);

  const login = async (email: string, pass: string, isAdminLogin?: boolean) => {
    setLoading(true);
    try {
      const res = await signIn(email, pass, { isAdminLogin });
      if (res?.user) {
        const u = res.user as any;
        const normalizedEmail = (u.email || email || '').toLowerCase();
        const isAdmin = 
          Boolean(isAdminLogin) ||
          u.role === 'admin' ||
          normalizedEmail === 'admin@gmail.com' ||
          normalizedEmail.includes('admin') ||
          u.uid === 'B47ojxIU3icqVzJSRTdHpouDN0A2' ||
          u.uid === 'A4TMfsDPivRJGcCXJhhKwyAkJzw2' ||
          u.uid === 'jIzLTB96RzOtiIqDZlypNr1K2cy1';

        const cleanMobile = u.mobile || (/^\d{10}$/.test(email) ? email : undefined);

        const loggedInUser: AuthUser = {
          uid: u.uid || (isAdmin ? 'B47ojxIU3icqVzJSRTdHpouDN0A2' : 'user-id'),
          email: u.email || (isAdmin ? 'admin@gmail.com' : email) || null,
          displayName: u.displayName || u.name || (isAdmin ? 'Super Admin' : 'User'),
          role: isAdmin ? 'admin' : (u.role || 'user'),
          status: u.status || 'active',
          permissions: u.permissions || (isAdmin ? ['all'] : []),
          mobile: cleanMobile,
          repId: u.repId,
          repCode: u.code || u.repCode
        };
        if (loggedInUser.role === 'admin') {
          localStorage.setItem('astitva_admin_session', JSON.stringify(loggedInUser));
        } else if (loggedInUser.role === 'representative') {
          localStorage.setItem('sahyadri_rep_session', JSON.stringify(loggedInUser));
        } else {
          localStorage.setItem('sahyadri_user_session', JSON.stringify(loggedInUser));
        }
        setUser(loggedInUser);
        setLoading(false);
        setAuthInitialized(true);
      }
      return res;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, pass: string, name: string, mobile?: string, initialRole?: string) => {
    setLoading(true);
    try {
      const res = await registerUser(email, pass, name, mobile, initialRole);
      setLoading(false);
      return res;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('sahyadri_user_session');
      localStorage.removeItem('sahyadri_rep_session');
      localStorage.removeItem('astitva_admin_session');
      await authLogout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    if (!user?.uid) return;
    try {
      if (isMockMode) {
        const raw = localStorage.getItem('luminous_mock_users');
        if (raw) {
          const mockUsers = JSON.parse(raw);
          const current = mockUsers.find((u: any) => u.uid === user.uid || u.email === user.email);
          if (!current && user.role !== 'admin') {
            await logout();
            return;
          }
          if (current && (current.isBlocked || current.isBlacklisted || current.isDeleted)) {
            await logout();
            return;
          }
          if (current && current.role && current.role !== user.role) {
            const updated = { ...user, role: current.role, displayName: current.name || user.displayName };
            setUser(updated);
            localStorage.setItem('luminous_mock_user', JSON.stringify(updated));
            localStorage.setItem('sahyadri_user_session', JSON.stringify(updated));
          }
        }
      } else {
        if (user.role !== 'admin' && user.email !== 'admin@gmail.com') {
          const cleanMobile = (
            user.mobile ||
            (user.email && /^\d{10}@/.test(user.email) ? user.email.split('@')[0] : '') ||
            ''
          ).replace(/[^0-9]/g, '').slice(-10);

          let doc = await fetchDocument('users', user.uid);
          if (!doc && cleanMobile) {
            try {
              doc = await fetchDocument('users', cleanMobile);
            } catch {}
          }

          if (doc && (doc.isBlocked || doc.isBlacklisted || doc.status === 'blocked' || doc.isDeleted || doc.status === 'deleted')) {
            await logout();
            return;
          }

          let newRole = doc?.role;
          if (!newRole || newRole === 'user') {
            try {
              const inq = await fetchUserRoleInquiry(user.uid, cleanMobile, user.email || undefined);
              if (inq && (inq.status === 'approved' || (inq as any).status === 'accepted') && inq.requestedRole) {
                newRole = inq.requestedRole;
              }
            } catch {}
          }
          if (!newRole || newRole === 'user') {
            try {
              const uidToken = localStorage.getItem(`sahyadri_role_approved_${user.uid}`);
              if (uidToken) {
                const p = JSON.parse(uidToken);
                if (p?.role) newRole = p.role;
              }
              if ((!newRole || newRole === 'user') && cleanMobile) {
                const mobToken = localStorage.getItem(`sahyadri_role_approved_${cleanMobile}`);
                if (mobToken) {
                  const p = JSON.parse(mobToken);
                  if (p?.role) newRole = p.role;
                }
              }
            } catch {}
          }

          if (newRole && newRole !== user.role) {
            const updated = {
              ...user,
              role: newRole,
              displayName: doc?.name || user.displayName,
              mobile: doc?.mobile || user.mobile
            };
            setUser(updated);
            localStorage.setItem('sahyadri_user_session', JSON.stringify(updated));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  }, [user]);

  const isAdmin = user?.role === 'admin';

  console.log("AuthProvider Render State:", { user, loading, authInitialized, isAdmin });

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authInitialized,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        mockMode: isMockMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
