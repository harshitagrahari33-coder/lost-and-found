# 🧳 KIET Lost & Found Platform

A production-grade **Lost & Found campus recovery platform** engineered for the KIET Group of Institutions to help students and staff report, search, geographically locate, and recover lost belongings with speed and safety.

---

## 🚀 Features

* 🔍 **Smart Multi-Filter Discovery**: Instant search across item titles, descriptions, categories, and campus landmarks.
* 📦 **Verified Reporting**: Rich report creation with multi-photo uploads (Cloudinary), campus landmark presets, and GPS geolocation.
* 🗺️ **Interactive Campus Map View**: Spatial Leaflet map displaying active reports across KIET campus with color-coded pins (Lost in Coral, Found in Green) and interactive preview drawers.
* 📍 **Campus Landmark Filtering**: Filter listings by building zone (Central Library, Engineering Blocks A/B, Central Cafeteria, Sports Complex, Hostels, Auditorium).
* 🤖 **Smart / AI-Assisted Item Matching**: Intelligent multi-factor matching engine linking opposing lost and found reports using keyword analysis, category pairing, geographical proximity, and timeline tracking.
* 💬 **Real-Time Live Chat**: Socket.IO-powered instant messaging with typing indicators, read receipts, and image attachments.
* 📬 **Messages & Inquiries Hub**: Centralized conversation inbox in user profile to manage all discussions about reported items.
* 🔔 **Campus Notification Center**: Live notification popover alerting users about incoming inquiries, smart matches, and resolved reunions.
* 🔐 **Institutional Zero-Password OTP Auth**: Single-use HMAC-SHA256 hashed OTP authentication restricted to `@kiet.edu` domains.
* 🛡️ **Campus Administration & Moderation**: Dedicated moderator portal for inspecting flagged reports, auditing listings, and managing user access.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Leaflet, Sonner, Lucide Icons, Socket.IO Client
* **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.IO, JWT, Nodemailer, Cloudinary, Multer
* **Security**: Helmet, Express Mongo Sanitize, Rate Limiting, XSS protection, HMAC-SHA256 OTPs

---

## ⚙️ Running Locally

### 1. Backend Server (Port 5001)
```bash
cd backend
npm install
npm run dev
# Or run automated tests: npm test
```

### 2. Frontend Web App (Port 5174)
```bash
npm install
npm run dev
```

### 3. Demo Accounts for Instant Access
* **Student Demo**: `harshit.21b0101@kiet.edu` (Auto-filled OTP in development)
* **Campus Administrator**: `admin@kiet.edu` (Full moderation panel access at `/admin`)

---

## 👨‍💻 Author

**Harshit Agrahari** — KIET Group of Institutions

