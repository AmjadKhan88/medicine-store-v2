<div align="center">

# 💊 MediStore — Professional Medicine Store Management System

### Final Year Project | MERN Stack Full-Stack Application

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb)](https://mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

*A complete, production-ready medicine store management system with real-time inventory tracking, patient management, billing, and analytics.*

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Screenshots](#screenshots)
- [Default Credentials](#default-credentials)

---

## 🌟 Overview

MediStore is a professional-grade Medicine Store Management System built as a Final Year Project using the MERN stack (MongoDB, Express.js, React.js, Node.js). It provides doctors, pharmacists, and admins with a complete toolset to manage their medical store operations efficiently.

---

## ✨ Features

### 💊 Medicine Management
- Add, edit, delete medicines with full details (name, generic name, category, dosage form, strength, unit)
- Batch number, barcode, and manufacturer tracking
- Purchase price and sale price management
- Stock quantity management with minimum stock alerts
- Storage location tracking
- Prescription requirement flag (Rx medicines)

### 🚨 Expiry Tracking
- Real-time expired medicines alert (highlighted in red)
- Expiring within 30 days warning
- Expiring within 60 days notice
- Automatic badge on sidebar with count
- Bell notification in top bar

### 👥 Patient Management
- Complete patient registration (name, age, gender, contact, blood group)
- Medical history and allergy records
- Attending doctor assignment
- Patient ID auto-generation (PT-00001)
- City and address management

### 💰 Billing & Invoicing
- Create professional invoices with multiple medicines
- Automatic stock deduction on bill creation
- Discount and tax support
- Partial payment support (Cash, Card, Online)
- Invoice number auto-generation (INV-000001)
- Print-ready invoice view
- Stock restoration on bill deletion

### 💳 Patient Balance Tracking
- Real-time outstanding balance per patient
- Total billed vs total paid summary
- Per-bill outstanding breakdown
- Record payment against specific invoices
- Total store outstanding amount

### 📊 Reports & Analytics
- Monthly revenue trend (line chart)
- Bills per month (bar chart)
- Medicine category distribution (pie chart)
- Top selling medicines with revenue
- Today's and monthly sales summary

### 🎨 Theme System
- **Light Theme** — Clean professional white
- **Dark Theme** — Easy on eyes night mode
- **Teal Theme** — Fresh medical green
- **Purple Theme** — Rich elegant purple
- Instant theme switching from sidebar dots or top bar toggle

### 🔐 Authentication & Roles
- JWT-based secure authentication
- Role-based access (Admin, Doctor, Pharmacist)
- Profile management
- Password change
- Auto token refresh

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Vite 5 |
| **Styling** | Pure CSS with CSS Custom Properties (4 themes) |
| **Charts** | Recharts |
| **Icons** | React Icons (Material Design) |
| **HTTP Client** | Axios |
| **Notifications** | React Hot Toast |
| **Backend** | Node.js, Express.js 4 |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Dev Tools** | Nodemon, Morgan |

---

## 📁 Project Structure

```
medicine-store/
├── backend/                    # Node.js + Express API
│   ├── config/
│   │   └── seed.js             # Database seeder with demo data
│   ├── controllers/
│   │   ├── authController.js   # Login, register, profile
│   │   ├── medicineController.js
│   │   ├── patientController.js
│   │   ├── billingController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   └── auth.js             # JWT protect middleware
│   ├── models/
│   │   ├── User.js             # User schema
│   │   ├── Medicine.js         # Medicine schema with virtuals
│   │   ├── Patient.js          # Patient schema
│   │   └── Bill.js             # Invoice schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── medicines.js
│   │   ├── patients.js
│   │   ├── billing.js
│   │   ├── dashboard.js
│   │   └── sales.js
│   ├── .env.example
│   ├── package.json
│   └── server.js               # Entry point
│
└── frontend/                   # React + Vite SPA
    ├── src/
    │   ├── Auth/
    │   │   ├── Login.jsx
    │   │   └── Register.jsx
    │   ├── Components/
    │   │   └── Layout.jsx      # Sidebar + Topbar
    │   ├── Pages/
    │   │   ├── Dashboard.jsx   # KPIs + Charts
    │   │   ├── Medicines.jsx   # CRUD + filters
    │   │   ├── Patients.jsx    # Patient management
    │   │   ├── Billing.jsx     # Invoice list
    │   │   ├── CreateBill.jsx  # Invoice creator
    │   │   ├── ExpiryAlerts.jsx
    │   │   ├── PatientBalance.jsx
    │   │   ├── Reports.jsx
    │   │   └── Settings.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── utils/
    │   │   └── api.js          # Axios instance
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css           # Full design system
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally (`mongodb://localhost:27017`) or MongoDB Atlas URI
- npm or yarn

### 1. Clone / Extract the Project
```bash
cd medicine-store
```

### 2. Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env and set your MONGODB_URI and JWT_SECRET

# Seed database with demo data (optional but recommended)
npm run seed

# Start backend server
npm run dev   # Development (nodemon)
# OR
npm start     # Production
```

Backend runs on: `http://localhost:5000`

### 3. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:5173`

### 4. Open Browser
Navigate to `http://localhost:5173` and login with demo credentials.

---

## 🔑 Default Credentials

After running `npm run seed` in the backend:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@medistore.com | admin123 |
| **Doctor** | doctor@medistore.com | doctor123 |

---

## 📡 API Documentation

### Base URL: `http://localhost:5000/api`

All protected routes require header: `Authorization: Bearer <token>`

#### Auth Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT token |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/change-password` | Change password |

#### Medicine Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/medicines` | List medicines (paginated, filterable) |
| POST | `/medicines` | Add new medicine |
| GET | `/medicines/:id` | Get single medicine |
| PUT | `/medicines/:id` | Update medicine |
| DELETE | `/medicines/:id` | Soft delete medicine |
| GET | `/medicines/expiry-alerts` | Get expired/expiring medicines |
| GET | `/medicines/low-stock` | Get low stock medicines |
| PATCH | `/medicines/:id/stock` | Update stock quantity |

#### Patient Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/patients` | List patients (paginated) |
| POST | `/patients` | Register new patient |
| GET | `/patients/:id` | Get patient + recent bills |
| PUT | `/patients/:id` | Update patient |
| DELETE | `/patients/:id` | Soft delete patient |
| GET | `/patients/balances` | All patients with outstanding balance |
| GET | `/patients/:id/balance` | Patient balance detail |

#### Billing Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/billing` | List bills (paginated, filterable) |
| POST | `/billing` | Create invoice (deducts stock) |
| GET | `/billing/:id` | Get bill details |
| PATCH | `/billing/:id/payment` | Record payment |
| DELETE | `/billing/:id` | Delete bill (restores stock) |

#### Dashboard & Reports
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/dashboard` | All KPIs, charts, top medicines |
| GET | `/sales/report` | Sales report (daily/weekly/monthly) |

---

## 🎓 Final Year Project Notes

This project demonstrates mastery of:
- **Full-Stack Development** — Complete MERN stack implementation
- **RESTful API Design** — Well-structured, documented API
- **Database Design** — Normalized MongoDB schemas with virtuals
- **Authentication** — JWT with role-based access control
- **State Management** — React Context API for global state
- **Responsive UI** — Mobile-friendly with CSS custom properties
- **Business Logic** — Real-world pharmacy management flows
- **Data Visualization** — Recharts integration for analytics

---

## 👨‍💻 Developer

Built with ❤️ as a Final Year Project for Computer Science/Software Engineering.

**Supervisor:** [Add supervisor name]  
**Institution:** [Add institution name]  
**Year:** 2024–2025
