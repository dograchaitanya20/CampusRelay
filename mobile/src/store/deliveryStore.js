import { create } from 'zustand';
import { deliveryAPI } from '../services/api';

const useDeliveryStore = create((set, get) => ({
  feed:         [],
  feedLoading:  false,
  myDeliveries: [],
  myLoading:    false,
  active:       null,

  fetchFeed: async () => {
    set({ feedLoading: true });
    try { const r = await deliveryAPI.getFeed(); set({ feed: r.deliveries || [] }); }
    finally { set({ feedLoading: false }); }
  },

  fetchMyDeliveries: async (role = 'receiver') => {
    set({ myLoading: true });
    try { const r = await deliveryAPI.getMyDeliveries(role); set({ myDeliveries: r.deliveries || [] }); }
    finally { set({ myLoading: false }); }
  },

  fetchActive: async (id) => {
    const r = await deliveryAPI.getOne(id);
    set({ active: r.delivery });
    return r.delivery;
  },

  setActive:             (d)       => set({ active: d }),
  addToFeed:             (d)       => set(s => ({ feed: [d, ...s.feed] })),
  removeFromFeed:        (id)      => set(s => ({ feed: s.feed.filter(d => d._id !== id && d.deliveryId !== id) })),
  bumpCommission:        (id, amt) => set(s => ({ feed: s.feed.map(d => (d._id===id||d.deliveryId===id) ? { ...d, commission: { ...d.commission, current: amt } } : d) })),
  updateActiveStatus:    (status, extra = {}) => set(s => ({ active: s.active ? { ...s.active, status, ...extra } : null })),
  updateCarrierLocation: (lat, lng) => set(s => ({ active: s.active ? { ...s.active, carrierLat: lat, carrierLng: lng } : null })),

  accept: async (id) => {
    const res = await deliveryAPI.accept(id);
    get().removeFromFeed(id);
    set({ active: res.delivery });
    return res;
  },

  create: async (data) => {
    const res = await deliveryAPI.create(data);
    set(s => ({ myDeliveries: [res.delivery, ...s.myDeliveries] }));
    return res;
  },
}));

export default useDeliveryStore;
