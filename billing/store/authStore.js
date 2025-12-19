import { create } from 'zustand';
import { authAPI } from '../api/client';
import client from '../lib/apolloClient';
import { ME } from '../lib/graphql/queries';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isHydrated: false,

  isBillingSite: () => {
    if (typeof window === 'undefined') return false;
    const billingHost = process.env.NEXT_PUBLIC_BILLING_HOST;
    return billingHost
      ? window.location.host === billingHost
      : window.location.host.includes('billing.matsonbrotherspainting.com');
  },

  enforceBillingAccess: (user) => {
    if (typeof window === 'undefined') return true;
    const isBilling = useAuthStore.getState().isBillingSite();
    if (isBilling && user && user.role !== 'admin' && user.role !== 'superadmin') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: 'Admin access required for billing',
      });
      return false;
    }
    return true;
  },

  // Hydrate from localStorage (client-side only)
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const canAccess = useAuthStore.getState().enforceBillingAccess(user);

      set({
        user: canAccess ? user : null,
        token: canAccess ? token : null,
        isAuthenticated: !!token && canAccess,
        isHydrated: true,
      });
    }
  },

  // Refresh user data from backend
  refreshUser: async () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data } = await client.query({
        query: ME,
        fetchPolicy: 'network-only', // Always fetch fresh data
      });

      if (data?.me) {
        const user = data.me;
        const canAccess = useAuthStore.getState().enforceBillingAccess(user);

        if (canAccess) {
          localStorage.setItem('user', JSON.stringify(user));
          set({
            user,
            isAuthenticated: true,
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  },

  login: async (credentials) => {
    console.log("Login with credentials:", credentials);
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;

      const canAccess = useAuthStore.getState().enforceBillingAccess(user);
      if (!canAccess) {
        set({ isLoading: false });
        return { success: false, error: 'Admin access required for billing' };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;

      const canAccess = useAuthStore.getState().enforceBillingAccess(user);
      if (!canAccess) {
        set({ isLoading: false });
        return { success: false, error: 'Admin access required for billing' };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
