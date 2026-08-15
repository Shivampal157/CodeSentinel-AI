import { create } from 'zustand';
import { api, type User } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous';
  error: string | null;
  refreshSession: () => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
};

let refreshPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'idle',
  error: null,

  refreshSession: async () => {
    if (refreshPromise) return refreshPromise;
    set({ status: 'loading', error: null });
    refreshPromise = (async () => {
      try {
        const { accessToken } = await api<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
        });
        const user = await api<User>('/auth/me');
        set({ accessToken, user, status: 'authenticated' });
      } catch (error) {
        set({
          accessToken: null,
          user: null,
          status: 'anonymous',
          error: error instanceof Error ? error.message : 'Unable to restore session',
        });
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  },

  loadUser: async () => {
    set({ status: 'loading', error: null });
    try {
      const user = await api<User>('/auth/me');
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'anonymous' });
    }
  },

  logout: async () => {
    try {
      await api<null>('/auth/logout', { method: 'POST' });
    } finally {
      disconnectSocket();
      set({ user: null, accessToken: null, status: 'anonymous', error: null });
    }
  },
}));
