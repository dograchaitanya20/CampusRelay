import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const useAuthStore = create((set) => ({
  user:      null,
  token:     null,
  isLoading: true,
  isLoggedIn:false,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const res = await authAPI.getMe();
        set({ user: res.user, token, isLoggedIn: true });
        await connectSocket();
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (phone, password) => {
    const res = await authAPI.login({ phone, password });
    await SecureStore.setItemAsync('auth_token', res.token);
    set({ user: res.user, token: res.token, isLoggedIn: true });
    await connectSocket();
    return res;
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    await SecureStore.setItemAsync('auth_token', res.token);
    set({ user: res.user, token: res.token, isLoggedIn: true });
    await connectSocket();
    return res;
  },

  logout: async () => {
    disconnectSocket();
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null, isLoggedIn: false });
  },

  updateUser:  (u) => set(s => ({ user: { ...s.user, ...u } })),
  refreshUser: async () => { const r = await authAPI.getMe(); set({ user: r.user }); },
  switchRole:  async (role) => { await authAPI.switchRole(role); set(s => ({ user: { ...s.user, activeRole: role } })); },
}));

export default useAuthStore;
