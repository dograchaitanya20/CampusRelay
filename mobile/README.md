# 📱 CampusRelay Mobile App

Zero native modules. Runs directly in Expo Go.

---

## ⚡ Quick Start (tell Cursor to run these)

```bash
# 1. Go to mobile folder
cd campusrelay/mobile

# 2. Install dependencies
npm install

# 3. Find your local IP address (Windows)
ipconfig
# Look for "IPv4 Address" under your WiFi adapter e.g. 192.168.1.5

# 4. Edit src/constants/index.js
# Change these two lines:
# export const API_BASE_URL = 'http://192.168.1.5:5000/api';
# export const SOCKET_URL   = 'http://192.168.1.5:5000';

# 5. Start the app
npx expo start

# 6. Scan QR code with Expo Go app on your phone
```

---

## 🗂 File Structure

```
mobile/
├── App.js                              ← Entry point
├── app.json                            ← Expo config
├── babel.config.js                     ← Babel config
├── package.json                        ← Dependencies (100% Expo-safe)
└── src/
    ├── constants/index.js              ← Colors, API URL, config
    ├── services/
    │   ├── api.js                      ← All API calls (Axios)
    │   └── socket.js                   ← Socket.io connection
    ├── store/
    │   ├── authStore.js               ← Auth state (Zustand)
    │   └── deliveryStore.js           ← Delivery state (Zustand)
    ├── components/
    │   ├── common/UI.js               ← All reusable components
    │   └── delivery/DeliveryCard.js   ← Feed + history cards
    └── navigation/
        └── AppNavigator.js            ← ALL screens + navigation
```

---

## 📦 Packages Used (all Expo-compatible)

| Package | Purpose |
|---------|---------|
| expo ~50.0.14 | Core SDK |
| expo-location | GPS tracking |
| expo-image-picker | KYC photo upload |
| expo-secure-store | JWT token storage |
| expo-web-browser | Razorpay web checkout |
| expo-linear-gradient | UI gradients |
| @react-navigation/* | Screen navigation |
| socket.io-client | Real-time events |
| axios | API calls |
| zustand | State management |
| react-native-toast-message | Toast alerts |
| date-fns | Date formatting |

**Zero native modules** — no react-native-maps, no react-native-razorpay, no lottie.

---

## 🔌 Connecting to Backend

1. Start the backend: `cd campusrelay/backend && npm run dev`
2. Find your PC's local IP: run `ipconfig` in terminal
3. Edit `src/constants/index.js`:
   ```js
   export const API_BASE_URL = 'http://YOUR_IP:5000/api';
   export const SOCKET_URL   = 'http://YOUR_IP:5000';
   ```
4. Your phone and PC must be on the **same WiFi network**

---

## 🧪 Test Accounts

| Role | Phone | Password |
|------|-------|----------|
| Receiver | 9111111111 | Test@123 |
| Carrier  | 9222222222 | Test@123 |
| Admin    | 9000000000 | Admin@123 |

Run `npm run seed` in the backend first to create these.
