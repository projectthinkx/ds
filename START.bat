@echo off
title DentalSuthra - Local Development

echo ========================================
echo    DentalSuthra - Local Development
echo ========================================
echo.

REM Check prerequisites
echo [1/5] Checking Prerequisites...

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)
echo       Python: OK

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ and add to PATH.
    pause
    exit /b 1
)
echo       Node.js: OK

where yarn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Yarn not found. Installing via npm...
    npm install -g yarn
)
echo       Yarn: OK

echo.
echo [2/5] Checking MongoDB...
REM Check if MongoDB is accessible
mongod --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] MongoDB CLI not in PATH - ensure MongoDB service is running
) else (
    echo       MongoDB: OK
)

echo.
echo [3/5] Checking Environment Files...
if not exist "%~dp0backend\.env" (
    echo       Creating backend\.env...
    echo MONGO_URL=mongodb://localhost:27017> "%~dp0backend\.env"
    echo DB_NAME=dentalsuthra>> "%~dp0backend\.env"
    echo CORS_ORIGINS=*>> "%~dp0backend\.env"
    echo JWT_SECRET_KEY=dentalsuthra-secret-key-2024>> "%~dp0backend\.env"
)
echo       Backend .env: OK

if not exist "%~dp0frontend\.env" (
    echo       Creating frontend\.env...
    echo REACT_APP_BACKEND_URL=http://localhost:8000> "%~dp0frontend\.env"
)
REM Update frontend .env for local development
echo REACT_APP_BACKEND_URL=http://localhost:8000> "%~dp0frontend\.env"
echo       Frontend .env: OK (set to localhost:8000)

echo.
echo [4/5] Starting Backend Server (Port 8000)...
start "DentalSuthra Backend" cmd /k "cd /d %~dp0backend && echo Starting Backend... && uvicorn server:app --host 0.0.0.0 --port 8000 --reload"

echo       Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo [5/5] Starting Frontend Server (Port 3000)...
start "DentalSuthra Frontend" cmd /k "cd /d %~dp0frontend && echo Starting Frontend... && yarn start"

echo.
echo ========================================
echo    STARTUP COMPLETE
echo ========================================
echo.
echo    Backend:   http://localhost:8000
echo    Frontend:  http://localhost:3000
echo    API Docs:  http://localhost:8000/docs
echo.
echo    Login Credentials:
echo    Email:     admin@clinic.com
echo    Password:  admin123
echo.
echo    NOTE: Wait 30-60 seconds for frontend to compile
echo.
echo ========================================
echo.
echo Press any key to close this launcher window...
echo (Backend and Frontend will continue running)
pause >nul
