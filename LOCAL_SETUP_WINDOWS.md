# DentalSuthra - Local Setup Guide for Windows

## Minimum PC Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 (64-bit) | Windows 11 |
| **RAM** | 4 GB | 8 GB+ |
| **Storage** | 2 GB free space | 5 GB+ |
| **CPU** | Dual-core 2.0 GHz | Quad-core 2.5 GHz+ |

## Software Prerequisites

### Required Software (Install in order):

1. **Node.js v18+** (includes npm)
   - Download: https://nodejs.org/en/download/
   - Choose "Windows Installer (.msi)" - LTS version
   - Verify: `node --version` (should show v18.x or higher)

2. **Python 3.10+**
   - Download: https://www.python.org/downloads/
   - ✅ Check "Add Python to PATH" during installation
   - Verify: `python --version` (should show 3.10.x or higher)

3. **MongoDB Community Server 6.0+**
   - Download: https://www.mongodb.com/try/download/community
   - Choose "Windows x64" MSI package
   - Install as Windows Service (default)
   - Verify: `mongod --version`

4. **Yarn (Package Manager)**
   - After Node.js is installed, run:
   ```cmd
   npm install -g yarn
   ```
   - Verify: `yarn --version`

5. **Git** (Optional, for cloning)
   - Download: https://git-scm.com/download/win

---

## Project Setup

### Step 1: Download/Clone the Project

```cmd
REM Option A: Clone from GitHub (if available)
git clone <repository-url> DentalSuthra
cd DentalSuthra

REM Option B: Extract from downloaded ZIP
REM Extract to C:\DentalSuthra or any preferred location
cd C:\DentalSuthra
```

### Step 2: Configure Environment Variables

#### Backend (.env)
Create/Edit `backend\.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=dentalsuthra
CORS_ORIGINS=*
JWT_SECRET_KEY=dentalsuthra-secret-key-2024
```

#### Frontend (.env)
Create/Edit `frontend\.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Step 3: Install Dependencies

Open **Command Prompt** (as Administrator recommended) and navigate to project folder:

```cmd
REM Navigate to project root
cd C:\DentalSuthra

REM Install Backend Dependencies
cd backend
pip install -r requirements.txt

REM Go back to root and install Frontend Dependencies
cd ..\frontend
yarn install

REM Go back to root
cd ..
```

### Step 4: Start MongoDB (if not running as service)

```cmd
REM Check if MongoDB is running
mongod --version

REM If MongoDB is not running as a service, start it manually:
REM Open a NEW Command Prompt window and run:
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"

REM Note: Create C:\data\db folder first if it doesn't exist
mkdir C:\data\db
```

### Step 5: Create Admin User

```cmd
cd C:\DentalSuthra
python setup_admin.py
```

This creates the default admin user:
- **Email**: admin@clinic.com
- **Password**: admin123

### Step 6: Start the Application

#### Terminal 1 - Start Backend:
```cmd
cd C:\DentalSuthra\backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Wait until you see: `Uvicorn running on http://0.0.0.0:8000`

#### Terminal 2 - Start Frontend:
```cmd
cd C:\DentalSuthra\frontend
yarn start
```

Wait until browser opens automatically at `http://localhost:3000`

---

## Quick Start Script (START.bat)

Save as `START.bat` in project root for one-click startup:

```batch
@echo off
title DentalSuthra Startup

echo ========================================
echo    DentalSuthra - Local Development
echo ========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
mongod --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] MongoDB not found in PATH. Please ensure MongoDB is installed and running.
)

echo.
echo Starting Backend Server...
start "DentalSuthra Backend" cmd /k "cd /d %~dp0backend && uvicorn server:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server...
start "DentalSuthra Frontend" cmd /k "cd /d %~dp0frontend && yarn start"

echo.
echo ========================================
echo    Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Login: admin@clinic.com / admin123
echo.
echo Press any key to close this window...
pause >nul
```

---

## Verify Installation

### 1. Test Backend API
Open browser or use curl:
```
http://localhost:8000/docs
```
You should see the FastAPI Swagger documentation.

### 2. Test Frontend
Open browser:
```
http://localhost:3000
```
You should see the DentalSuthra login page.

### 3. Test Login
- Email: `admin@clinic.com`
- Password: `admin123`

### 4. Test API Endpoint (Optional)
```cmd
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@clinic.com\",\"password\":\"admin123\"}"
```
Should return a JSON response with a token.

---

## Troubleshooting

### Issue: MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Start MongoDB service
```cmd
net start MongoDB
REM or manually start mongod
```

### Issue: Port 8000 Already in Use
```cmd
REM Find process using port 8000
netstat -ano | findstr :8000

REM Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Issue: Port 3000 Already in Use
```cmd
REM Find process using port 3000
netstat -ano | findstr :3000

REM Kill the process
taskkill /PID <PID> /F
```

### Issue: Python/pip Not Found
```
'python' is not recognized as an internal or external command
```
**Solution**: 
1. Reinstall Python with "Add to PATH" checked
2. Or add manually: `System Properties > Environment Variables > Path > Add Python installation folder`

### Issue: yarn Not Found
```cmd
npm install -g yarn
```

### Issue: CORS Error in Browser Console
Ensure `CORS_ORIGINS=*` is set in `backend\.env` and restart the backend server.

### Issue: Module Not Found (Python)
```cmd
cd backend
pip install -r requirements.txt
```

### Issue: npm/yarn Install Fails
```cmd
REM Clear cache and retry
cd frontend
yarn cache clean
rmdir /s /q node_modules
yarn install
```

---

## Final Checklist

| Step | Status |
|------|--------|
| ☐ Node.js v18+ installed | |
| ☐ Python 3.10+ installed | |
| ☐ MongoDB 6.0+ installed and running | |
| ☐ Yarn installed globally | |
| ☐ Backend .env configured for localhost | |
| ☐ Frontend .env configured for localhost | |
| ☐ Backend dependencies installed (`pip install -r requirements.txt`) | |
| ☐ Frontend dependencies installed (`yarn install`) | |
| ☐ Admin user created (`python setup_admin.py`) | |
| ☐ Backend running on http://localhost:8000 | |
| ☐ Frontend running on http://localhost:3000 | |
| ☐ Can access http://localhost:8000/docs | |
| ☐ Can login with admin@clinic.com / admin123 | |
| ☐ Dashboard loads after login | |

---

## Application URLs (Local)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| MongoDB | mongodb://localhost:27017 |

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | admin123 |
| Receptionist | recep1@clinic.com | test123 |
| Accountant | acc1@clinic.com | test123 |

---

## Stopping the Application

1. Close the Backend terminal (Ctrl+C then close window)
2. Close the Frontend terminal (Ctrl+C then close window)
3. MongoDB will continue running as a Windows service

To stop MongoDB service:
```cmd
net stop MongoDB
```

---

## Next Steps

After successful local setup:
1. Test all features (Patient Management, Billing, Pharmacy, etc.)
2. Add sample data through the UI
3. Test multi-user scenarios by creating additional users
4. Review reports and analytics

For production deployment, additional configuration is required for:
- SSL certificates
- Domain setup
- Database backup strategy
- User authentication hardening
