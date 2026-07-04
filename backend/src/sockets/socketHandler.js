const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      const user   = await User.findById(id).select('-passwordHash');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`user_${user._id}`);
    if (user.roles.includes('admin')) socket.join('admin_room');

    socket.on('carrier_online', async () => {
      await User.findByIdAndUpdate(user._id, { isOnline: true });
      socket.join('carrier_feed');
      io.emit('carrier_online', { carrierId: user._id });
    });

    socket.on('carrier_offline', async () => {
      await User.findByIdAndUpdate(user._id, { isOnline: false });
      socket.leave('carrier_feed');
    });

    socket.on('join_delivery', (id) => socket.join(`delivery_${id}`));
    socket.on('leave_delivery',(id) => socket.leave(`delivery_${id}`));

    socket.on('location_update', async ({ deliveryId, lat, lng }) => {
      await User.findByIdAndUpdate(user._id, { lastLocation: { type: 'Point', coordinates: [lng, lat] } });
      io.to(`delivery_${deliveryId}`).emit('carrier_location', { deliveryId, lat, lng, ts: new Date() });

      // Anomaly: >3km from campus centre
      const campusLat = parseFloat(process.env.CAMPUS_LAT) || 28.6139;
      const campusLng = parseFloat(process.env.CAMPUS_LNG) || 77.2090;
      const dist = haversine(lat, lng, campusLat, campusLng);
      if (dist > 3000) io.to(`delivery_${deliveryId}`).emit('carrier_anomaly', { deliveryId });
    });

    socket.on('typing',      ({ deliveryId }) => socket.to(`delivery_${deliveryId}`).emit('user_typing',      { userId: user._id, name: user.fullName }));
    socket.on('stop_typing', ({ deliveryId }) => socket.to(`delivery_${deliveryId}`).emit('user_stop_typing', { userId: user._id }));

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(user._id, { isOnline: false });
    });
  });
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
