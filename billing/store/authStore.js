import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        set({ user: response.data.user, token, isLoading: false });
      } catch (error) {
        localStorage.removeItem('token');
        set({ user: null, token: null, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      set({ user, token });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  },

  register: async (email, password, name) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { email, password, name });
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      set({ user, token });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
