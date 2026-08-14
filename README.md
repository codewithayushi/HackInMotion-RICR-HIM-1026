# Smart City Issue Reporting & Resolution Platform — RICR-HIM-1026

![SmartCity Platform Header](https://img.shields.io/badge/Platform-SmartCity--Gov-blue?style=for-the-badge&logo=city)
![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/HackInMotion-RICR--HIM--1026-indigo?style=for-the-badge)

A comprehensive, production-grade **Two-Role Municipal Civic Issue Reporting and Resolution Platform** designed for smart urban governance. Citizens can report civic issues (potholes, garbage dumps, streetlight failures, water leaks, drainage blockages) with GIS geolocation coordinates and photos, while Municipal Department Administrators manage issue workflows, assign maintenance crews, update statuses, and enforce Service Level Agreements (SLAs).

---

## 🏛️ Key Features & Capabilities

### 1. 👤 Dual-Role Authentication & Role-Based Access Control (RBAC)
- **Citizen Portal**: Register with Email & 10-Digit Mobile, verify with 6-Digit Email OTP, report civic issues, track real-time resolution status, and upvote community reports.
- **Administrator Portal**: Department-level role management (`Roads`, `Sanitation`, `Electricity`, `Water`, `Drainage`, `Public Property`), issue queue processing, maintenance team dispatch, resolution proof notes, and photo uploads.

### 2. 🗺️ Geolocation & Map-Based Issue Reporting
- Interactive **Leaflet / OpenStreetMap** integration with reverse geocoding.
- Pinpoint location selection on city map with latitude & longitude auto-capture.
- Base64 & URL image photo upload previews.

### 3. 🔍 Haversine Duplicate Issue Detection
- Geospatial duplicate detection engine using the **Haversine Formula**:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- Flags duplicate reports submitted within 50 meters of existing issues to prevent redundant municipal dispatch.

### 4. 🔄 End-to-End Issue Status Lifecycle Workflow
Issues transition through transparent municipal status milestones:
1. `reported`: Submitted by citizen, awaiting department review.
2. `acknowledged`: Under review by designated department administrator.
3. `in_progress`: Maintenance crew dispatched; repair work ongoing.
4. `resolved`: Work completed; resolution proof note & photo uploaded.
5. `closed`: Verified and closed by citizen or system auditor.

### 5. ⏱️ SLA Deadline Enforcement & Analytics Dashboard
- Dynamic Service Level Agreement (SLA) countdown timers based on issue priority (`low`, `medium`, `high`, `urgent`).
- Admin analytics dashboard with department performance metrics, SLA breach warnings, category distribution charts, and resolution efficiency rates.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 18, React Router v6, Tailwind CSS, Lucide Icons, Leaflet Maps, React-Toastify |
| **Backend API** | Node.js, Express.js, JWT Authentication, Helmet Security, CORS Policy |
| **Database & ORM** | Sequelize ORM, SQLite3 (Vercel Serverless / Fallback), MySQL2 (Production DB) |
| **Verification** | Nodemailer SMTP (Email OTP), Fast2SMS API Gateway Integration |
| **Deployment** | Vercel Serverless Functions, GitHub Actions CI/CD Pipeline |

---

## 📦 Project Directory Structure

```text
smart-city-platform/
├── api/                   # Vercel Serverless Function API Entrypoint
│   ├── index.js           # Serverless Express Application & Seed Engine
│   └── otpService.js      # Cryptographic 6-Digit OTP Generator & Transporter
├── backend/               # Node.js Express Backend Service
│   ├── src/
│   │   ├── controllers/   # Auth, Issue, Admin Controllers
│   │   ├── models/        # Sequelize User, Issue, OTP, Upvote Models
│   │   ├── routes/        # Auth, Issue, Admin Express Routes
│   │   ├── services/      # OTP & Distance Services
│   │   └── server.js      # Express Server Entrypoint
│   └── .env.example       # Backend Environment Variables Template
├── frontend/              # React 18 Single Page Application
│   ├── public/            # HTML Template & Static Assets
│   └── src/
│       ├── components/    # Common Navbar, Footer, Map, Modals
│       ├── context/       # AuthContext Session State Provider
│       ├── pages/         # HomePage, RegisterPage, LoginPage, Dashboards
│       └── App.js         # React App Routing Component
├── .eslintrc.json         # ESLint Linter Rules
├── .prettierrc            # Prettier Formatting Rules
├── .gitignore             # Git Ignore Configuration
└── package.json           # Master Project Manifest & Scripts
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18.0 or higher)
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/codewithayushi/HackInMotion-RICR-HIM-1026.git
cd HackInMotion-RICR-HIM-1026
```

### 2. Install Dependencies
```bash
# Install Root & Backend Dependencies
npm install

# Install Frontend Dependencies
cd frontend
npm install
cd ..
```

### 3. Run Development Servers
```bash
# Option A: Run Backend Server (Port 5000)
node backend/src/server.js

# Option B: Run Frontend Application (Port 3000)
cd frontend
npm start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Accounts & Pre-Populated Dataset

The platform comes pre-seeded with **50 Citizen Profiles**, **6 Department Administrators**, and **0 Civic Issues (100% Data-Driven)**:

### Citizen Logins
- **Primary Citizen**: `aayushipawar2004@gmail.com` | Password: `password123`
- **Demo Citizen 1**: `citizen1@smartcity.com` | Password: `password123`
- **Demo Citizen 2**: `citizen2@smartcity.com` | Password: `password123`

### Department Administrator Logins
- 🛣️ **Roads & Infra**: `admin.roads@smartcity.com` | Password: `admin123`
- 🧹 **Sanitation**: `admin.sanitation@smartcity.com` | Password: `admin123`
- ⚡ **Electricity**: `admin.electricity@smartcity.com` | Password: `admin123`
- 💧 **Water Supply**: `admin.water@smartcity.com` | Password: `admin123`
- 🌧️ **Drainage**: `admin.drainage@smartcity.com` | Password: `admin123`
- 🌳 **Public Property**: `admin.public@smartcity.com` | Password: `admin123`

---

## 🛡️ Security & Quality Standards

- **Password Protection**: Salty bcrypt hashing (10 salt rounds).
- **JWT Authentication**: Bearer token headers with 7-day expiration guards.
- **Security Headers**: Helmet XSS protection, MIME sniffing prevention, and strict CORS origin validation.
- **Code Quality**: ESLint & Prettier compliance across all JavaScript modules.

---

## 📜 License & Accreditation

Developed by **Ayushi Pawar** for **HackInMotion 2026** (Team Code: `RICR-HIM-1026`).  
Licensed under the **MIT License**.
