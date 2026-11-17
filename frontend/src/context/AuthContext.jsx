import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';

const AuthContext = createContext(null);

const STORAGE_KEY = 'auth';

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const stored = loadStoredAuth();
      if (!stored?.accessToken) {
        setIsLoading(false);
        return;
      }
      try {
        const user = await api.me(stored.accessToken);
        setAuth({ accessToken: stored.accessToken, user });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setAuth(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const persist = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAuth(data);
  };

  const login = async (phone, password, allowedRoles) => {
    const data = await api.login(phone, password);
    if (allowedRoles && !allowedRoles.includes(data.user.role)) {
      throw new ApiError('This login is not available for your account type', 403);
    }
    persist(data);
    if (data.user.role === 'user') {
      sessionStorage.setItem('show_referral_promo_modal', 'true');
    }
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    persist(data);
    if (data.user.role === 'user') {
      sessionStorage.setItem('show_referral_promo_modal', 'true');
    }
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  const refreshUser = async () => {
    if (!auth?.accessToken) return null;
    try {
      const user = await api.me(auth.accessToken);
      setAuth((prev) => (prev ? { ...prev, user } : prev));
      return user;
    } catch {
      return null;
    }
  };

  const value = useMemo(
    () => ({
      user: auth?.user ?? null,
      accessToken: auth?.accessToken ?? null,
      isAuthenticated: Boolean(auth?.accessToken),
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [auth, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
