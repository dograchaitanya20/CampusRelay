import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(new Error(err.response?.data?.message || err.message || 'Network error'))
);

export const authAPI = {
  register:     (d)    => api.post('/auth/register', d),
  login:        (d)    => api.post('/auth/login', d),
  getMe:        ()     => api.get('/auth/me'),
  submitKyc:    (form) => api.post('/auth/kyc', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  switchRole:   (role) => api.post('/auth/switch-role', { role }),
};

export const deliveryAPI = {
  create:          (d)     => api.post('/deliveries', d),
  getFeed:         ()      => api.get('/deliveries'),
  getMyDeliveries: (role)  => api.get(`/deliveries/my?role=${role}`),
  getOne:          (id)    => api.get(`/deliveries/${id}`),
  accept:          (id)    => api.post(`/deliveries/${id}/accept`),
  verifyPickup:    (id, f) => api.post(`/deliveries/${id}/verify-pickup`, f, { headers: { 'Content-Type': 'multipart/form-data' } }),
  confirmDelivery: (id, f) => api.post(`/deliveries/${id}/confirm-delivery`, f, { headers: { 'Content-Type': 'multipart/form-data' } }),
  cancel:          (id, r) => api.post(`/deliveries/${id}/cancel`, { reason: r }),
  raiseDispute:    (id, d) => api.post(`/deliveries/${id}/dispute`, d),
};

export const walletAPI = {
  getBalance:      ()    => api.get('/wallet/balance'),
  getTransactions: ()    => api.get('/wallet/transactions'),
  createOrder:     (amt) => api.post('/wallet/create-order', { amount: amt }),
  verifyPayment:   (d)   => api.post('/wallet/verify-payment', d),
  withdraw:        (amt) => api.post('/wallet/withdraw', { amount: amt }),
};

export const ratingsAPI = {
  submit:         (id, d) => api.post(`/ratings/${id}`, d),
};

export const chatAPI = {
  getMessages: (id)      => api.get(`/chat/${id}`),
  sendMessage: (id, txt) => api.post(`/chat/${id}`, { content: txt }),
};

export const adminAPI = {
  getStats:       ()          => api.get('/admin/stats'),
  getPendingKyc:  ()          => api.get('/admin/kyc/pending'),
  approveKyc:     (uid)       => api.patch(`/admin/kyc/${uid}/approve`),
  rejectKyc:      (uid, r)    => api.patch(`/admin/kyc/${uid}/reject`, { reason: r }),
  getDisputes:    ()          => api.get('/admin/disputes'),
  resolveDispute: (id, d)     => api.patch(`/admin/disputes/${id}/resolve`, d),
};

export const usersAPI = {
  setOnlineStatus: (on) => api.patch('/users/online-status', { isOnline: on }),
};

export default api;
