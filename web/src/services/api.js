import axios from 'axios';

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || '/api', 
  timeout: 15000, 
  withCredentials: true 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(new Error(err.response?.data?.message || err.message || 'Network error'))
);

export const authAPI = {
  register:   (d)    => api.post('/auth/register', d),
  login:      (d)    => api.post('/auth/login', d),
  getMe:      ()     => api.get('/auth/me'),
  submitKyc:  (form) => api.post('/auth/kyc', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  switchRole: (role) => api.post('/auth/switch-role', { role }),
};

export const deliveryAPI = {
  getFeed:         ()        => api.get('/deliveries'),
  create:          (d)       => api.post('/deliveries', d),
  getMyDeliveries: (role)    => api.get(`/deliveries/my?role=${role}`),
  getOne:          (id)      => api.get(`/deliveries/${id}`),
  accept:          (id)      => api.post(`/deliveries/${id}/accept`),
  verifyPickup:    (id, d)   => api.post(`/deliveries/${id}/verify-pickup`, d),
  confirmDelivery: (id, d)   => api.post(`/deliveries/${id}/confirm-delivery`, d),
  cancel:          (id, r)   => api.post(`/deliveries/${id}/cancel`, { reason: r }),
  dispute:         (id, d)   => api.post(`/deliveries/${id}/dispute`, d),
  updateLocation:  (id, c)   => api.patch(`/deliveries/${id}/location`, c),
  refreshOtp: (id) => api.post(`/deliveries/${id}/refresh-otp`),
  getOtps: (id) => api.get(`/deliveries/${id}/otps`),
};

export const walletAPI = {
  getBalance:      ()    => api.get('/wallet/balance'),
  getTransactions: ()    => api.get('/wallet/transactions'),
  createOrder:     (amt) => api.post('/wallet/create-order', { amount: amt }),
  verifyPayment:   (d)   => api.post('/wallet/verify-payment', d),
  withdraw:        (amt) => api.post('/wallet/withdraw', { amount: amt }),
  devCredit:       (amt) => api.post('/wallet/dev-credit', { amount: amt }),
};



export const ratingsAPI = {
  submit: (id, d) => api.post(`/ratings/${id}`, d),
  get:    (id)    => api.get(`/ratings/${id}`),   // ← add this
};

export const chatAPI = {
  getMessages: (id)      => api.get(`/chat/${id}`),
  sendMessage: (id, txt) => api.post(`/chat/${id}`, { content: txt }),
};

export const adminAPI = {
  getStats:       ()         => api.get('/admin/stats'),
  getKyc:         ()         => api.get('/admin/kyc'),
  approveKyc:     (uid)      => api.patch(`/admin/kyc/${uid}/approve`),
  rejectKyc:      (uid, r)   => api.patch(`/admin/kyc/${uid}/reject`, { reason: r }),
  getUsers:        (p)        => api.get('/admin/users', { params: p }),
  banUser:         (uid, r)   => api.patch(`/admin/users/${uid}/ban`, { reason: r }),
  unbanUser:       (uid)      => api.patch(`/admin/users/${uid}/unban`),
  getDisputes:     ()         => api.get('/admin/disputes'),
  resolveDispute:  (id, d)    => api.patch(`/admin/disputes/${id}/resolve`, d),
};

export const usersAPI = {
  updateProfile:   (d)  => api.patch('/users/profile', d),
  setOnlineStatus: (on) => api.patch('/users/online-status', { isOnline: on }),
};



export default api;
