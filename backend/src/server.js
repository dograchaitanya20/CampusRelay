require('dotenv').config();
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
const cron     = require('node-cron');
const path     = require('path');

const app    = express();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many attempts. Try again in 15 minutes.'
  }
});
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach io to every request
app.use((req, _res, next) => { req.io = io; next(); });

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/wallet',     require('./routes/wallet'));
app.use('/api/ratings',    require('./routes/ratings'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/admin',      require('./routes/admin'));


// Health
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'CampusRelay API',
  timestamp: new Date().toISOString(),
}));

// ── Socket.io ─────────────────────────────────────────────────────
require('./sockets/socketHandler')(io);

// ── Cron: commission auto-bump every 5 min ────────────────────────
cron.schedule('*/5 * * * *', async () => {
  try {
    const Delivery = require('./models/Delivery');
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await Delivery.updateMany(
      { status: 'pending', createdAt: { $lte: fiveMinAgo }, 'commission.current': { $lt: 100 } },
      { $inc: { 'commission.current': parseInt(process.env.COMMISSION_BUMP_AMOUNT) || 5, 'commission.bumpCount': 1 } }
    );
    if (result.modifiedCount > 0) {
      console.log(`⏰ Bumped commission on ${result.modifiedCount} deliveries`);
      io.emit('commissions_bumped');
    }
  } catch (err) { console.error('Cron error:', err.message); }
});

// ── MongoDB + Start ───────────────────────────────────────────────
console.log("Mongo URI loaded:", process.env.MONGO_URI);

const startServer = (port) => {
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 CampusRelay API running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy. Retrying on ${nextPort}...`);
      if (nextPort <= port + 10) {
        server.removeAllListeners('error');
        startServer(nextPort);
      } else {
        console.error('❌ No available port found for CampusRelay API');
        process.exit(1);
      }
    } else {
      console.error('❌ Server failed to start:', err.message);
      process.exit(1);
    }
  });
};

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = Number(process.env.PORT) || 5000;
    startServer(PORT);
  })
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

module.exports = { app, io };
