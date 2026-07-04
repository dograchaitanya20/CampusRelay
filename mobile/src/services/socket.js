import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_URL } from '../constants';

let socket = null;

export const connectSocket = async () => {
  if (socket?.connected) return socket;
  const token = await SecureStore.getItemAsync('auth_token');
  if (!token) return null;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  });
  socket.on('connect',       () => console.log('🔌 Socket connected'));
  socket.on('disconnect',    () => console.log('🔴 Disconnected'));
  socket.on('connect_error', (e) => console.warn('Socket err:', e.message));
  return socket;
};

export const disconnectSocket  = ()           => { socket?.disconnect(); socket = null; };
export const getSocket         = ()           => socket;
export const joinDeliveryRoom  = (id)         => socket?.emit('join_delivery', id);
export const leaveDeliveryRoom = (id)         => socket?.emit('leave_delivery', id);
export const goCarrierOnline   = ()           => socket?.emit('carrier_online');
export const goCarrierOffline  = ()           => socket?.emit('carrier_offline');
export const sendLocation      = (id, la, ln) => socket?.emit('location_update', { deliveryId: id, lat: la, lng: ln });
export const emitTyping        = (id)         => socket?.emit('typing', { deliveryId: id });
export const emitStopTyping    = (id)         => socket?.emit('stop_typing', { deliveryId: id });
export const on                = (ev, cb)     => socket?.on(ev, cb);
export const off               = (ev, cb)     => socket?.off(ev, cb);
