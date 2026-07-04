You are a senior full-stack engineer working on CampusRelay — a campus last-mile delivery platform.

TECH STACK:
- Backend: Node.js + Express + MongoDB + Mongoose + Socket.io + JWT + bcryptjs + node-cron
- Frontend: React 18 + Vite + Tailwind CSS + Zustand + React Router v6 + Socket.io-client + Axios
- Real-time: Socket.io for GPS tracking, FCFS delivery feed, chat, OTP events

PROJECT STRUCTURE:
campusrelay/
├── backend/src/
│   ├── server.js              ← Express + Socket.io entry
│   ├── models/                ← User.js, Delivery.js, Transaction.js
│   ├── controllers/           ← authController.js, deliveryController.js
│   ├── routes/                ← auth.js, deliveries.js, routes.js (wallet/ratings/chat/admin/users)
│   ├── middleware/auth.js     ← JWT protect, requireApproved, adminOnly
│   ├── sockets/socketHandler.js ← All real-time events
│   └── utils/seed.js         ← Test data seeder
└── web/src/
    ├── App.jsx                ← Router with protected routes
    ├── main.jsx               ← Entry point
    ├── index.css              ← Tailwind + custom component classes
    ├── services/api.js        ← All Axios API calls
    ├── services/socket.js     ← Socket.io connection + helpers
    ├── store/authStore.js     ← Zustand auth state
    ├── store/deliveryStore.js ← Zustand delivery state
    ├── components/common/UI.jsx      ← Button, Input, Card, Modal, OtpInput, etc.
    ├── components/common/Layout.jsx  ← Sidebar + topbar app shell
    ├── components/delivery/DeliveryCard.jsx ← FeedCard, HistoryCard
    └── pages/
        ├── Landing.jsx
        ├── auth/Login.jsx, Register.jsx, KYC.jsx
        ├── receiver/Dashboard.jsx, PostDelivery.jsx
        ├── carrier/CarrierDashboard.jsx
        ├── shared/TrackDelivery.jsx, Chat.jsx, Wallet.jsx, Profile.jsx, Orders.jsx, Dispute.jsx
        └── admin/AdminOverview.jsx, AdminKYC.jsx, AdminUsers.jsx, AdminDisputes.jsx

CORE BUSINESS RULES:
1. FCFS (First-Come First-Served): delivery accept uses findOneAndUpdate with status:'pending' condition — ATOMIC, no race conditions
2. Escrow: funds locked on POST /deliveries, released only after delivery OTP confirmed
3. Two OTPs: pickup OTP at main gate + delivery OTP at hostel — both bcrypt hashed in DB
4. Commission auto-bumps ₹5 every 5 min via cron if no carrier accepts
5. GPS anomaly: if carrier >3km from campus, socket emits 'carrier_anomaly' alert
6. Platform cut: ₹7 per delivery, deducted from receiver's escrow

CODING RULES — FOLLOW STRICTLY:
- Always use Tailwind CSS utility classes, NEVER inline styles (except dynamic values like widths/colors from JS)
- Reuse existing UI components from components/common/UI.jsx — Button, Input, Card, Modal, Badge, Avatar, StatCard, etc.
- API calls go through services/api.js — NEVER call fetch/axios directly in components
- State changes go through Zustand stores — authStore or deliveryStore
- Socket events go through services/socket.js helpers (on, off, joinDeliveryRoom, etc.)
- Protected routes use RequireAuth wrapper in App.jsx
- Admin routes use RequireAdmin wrapper in App.jsx
- Show toast notifications for all user actions using react-hot-toast
- All async operations need try/catch + loading states
- Mobile responsive: use lg: breakpoints, sidebar hidden on mobile

DEV SHORTCUTS:
- POST /api/wallet/dev-credit with {amount: 500} → instant wallet credit (dev only)
- KYC face match always returns 92% in development
- Test accounts: 9111111111/Test@123 (receiver), 9222222222/Test@123 (carrier), 9000000000/Admin@123 (admin)

WHEN I ASK YOU TO:
- "Fix error X" → read the relevant file, fix only the broken part, show the diff
- "Add feature Y" → ask Claude first for the plan, then implement it
- "Run the project" → always run backend first (npm run dev in /backend), then frontend (npm run dev in /web)
- "Seed the database" → run: cd backend && npm run seed