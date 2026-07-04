import { create } from 'zustand';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const useAuthStore = create((set) => ({
  user:      null,
  token:     null,
  loading:   true,
  loggedIn:  false,

  init: async () => {
    const token = localStorage.getItem('cr_token');
    if (token) {
      try {
        const res = await authAPI.getMe();
        set({ user: res.user, token, loggedIn: true });
        connectSocket(token);
      } catch {
        localStorage.removeItem('cr_token');
      }
    }
    set({ loading: false });
  },

  login: async (phone, password) => {
    const res = await authAPI.login({ phone, password });
    localStorage.setItem('cr_token', res.token);
    set({ user: res.user, token: res.token, loggedIn: true });
    connectSocket(res.token);
    return res;
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    localStorage.setItem('cr_token', res.token);
    set({ user: res.user, token: res.token, loggedIn: true });
    connectSocket(res.token);
    return res;
  },

  logout: () => {
    disconnectSocket();
    localStorage.removeItem('cr_token');
    set({ user: null, token: null, loggedIn: false });
  },

  updateUser:  (u) => set(s => ({ user: { ...s.user, ...u } })),
  refreshUser: async () => { const r = await authAPI.getMe(); set({ user: r.user }); },
  switchRole: async (role) => {
  await authAPI.switchRole(role);
  set(s => ({ user: { ...s.user, activeRole: role } })); // instant UI update
  const r = await authAPI.getMe();                        // then sync full user
  set({ user: r.user });
},

}));

export default useAuthStore;
