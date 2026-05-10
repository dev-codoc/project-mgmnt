import { create } from 'zustand';
import { authAPI } from '../api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isAuthenticated: false,
  error: null,

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      set({ isLoading: true });
      const res = await authAPI.getMe();
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login(credentials);
      localStorage.setItem('token', res.token);
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.register(data);
      localStorage.setItem('token', res.token);
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, error: null });
    }
  },
}));

export default useAuthStore;
