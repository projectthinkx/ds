# DentalSuthra - Dental Clinic Finance Management

A comprehensive dental clinic management application for multi-branch clinics with pharmacy, billing, and inventory management.

## Quick Start (Windows)

### Prerequisites
1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Python 3.10+** - [Download](https://www.python.org/downloads/)
3. **MongoDB 6.0+** - [Download](https://www.mongodb.com/try/download/community)
4. **Yarn** - `npm install -g yarn`

### Setup

```cmd
# 1. Install dependencies
cd backend
pip install -r requirements.txt

cd ../frontend
yarn install

# 2. Run setup script (creates admin user)
cd ..
python setup_admin.py

# 3. Start the application
# Option A: Double-click START.bat
# Option B: Manual (see below)
```

### Manual Start

**Terminal 1 - Backend:**
```cmd
cd backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```cmd
cd frontend
yarn start
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | admin123 |

## Documentation

- **Full Setup Guide**: See `LOCAL_SETUP_WINDOWS.md`
- **Backend Architecture**: See `backend/ARCHITECTURE.md`
- **Product Requirements**: See `memory/PRD.md`

## Features

- ✅ Patient Management (with bulk import)
- ✅ Multi-branch Support
- ✅ Billing System (GST/Non-GST)
- ✅ In-house Pharmacy with Inventory
- ✅ Purchase Entry Management
- ✅ Expense Tracking
- ✅ Doctor Management
- ✅ Godown/Warehouse Management
- ✅ Stock Transfer System
- ✅ Daily Reports & Handovers
- ✅ Shift Management
- ✅ Dental Lab Order Tracking
- ✅ Role-based Access Control

## Tech Stack

- **Frontend**: React 19, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI, Python 3.10+
- **Database**: MongoDB 6.0+
- **Auth**: JWT with bcrypt

## License

Proprietary - All rights reserved
