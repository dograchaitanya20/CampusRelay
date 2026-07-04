import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io('/', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
  });
  socket.on('connect',       () => console.log('🔌 Socket connected'));
  socket.on('disconnect',    () => console.log('🔴 Socket disconnected'));
  socket.on('connect_error', (e) => console.warn('Socket error:', e.message));
  return socket;
};

export const disconnectSocket  = () => { socket?.disconnect(); socket = null; };
export const getSocket         = () => socket;
export const joinDeliveryRoom  = (id) => socket?.emit('join_delivery', id);
export const leaveDeliveryRoom = (id) => socket?.emit('leave_delivery', id);
export const goCarrierOnline   = () => socket?.emit('carrier_online');
export const goCarrierOffline  = () => socket?.emit('carrier_offline');
export const sendLocation      = (id, lat, lng) => socket?.emit('location_update', { deliveryId: id, lat, lng });
export const emitTyping        = (id) => socket?.emit('typing',      { deliveryId: id });
export const emitStopTyping    = (id) => socket?.emit('stop_typing', { deliveryId: id });
export const on  = (ev, cb) => socket?.on(ev, cb);
export const off = (ev, cb) => socket?.off(ev, cb);
