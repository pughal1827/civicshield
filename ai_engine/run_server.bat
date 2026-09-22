@echo off
chcp 65001 >nul
echo ============================================================
echo   CivicShield AI Engine — Quick Setup & Launch
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed. Please install Python 3.10+
    pause
    exit /b 1
)

echo [1/4] Python detected.
echo.

REM Create virtual environment
if not exist "venv" (
    echo [2/4] Creating virtual environment...
    python -m venv venv
) else (
    echo [2/4] Virtual environment already exists.
)

REM Activate venv
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing dependencies (this may take 2-3 minutes)...
echo.
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo.
echo [4/4] Starting AI Engine on http://localhost:8000
echo.
echo ============================================================
echo   API Endpoints:
echo     GET  /health              — Health check
echo     POST /api/v1/verify-incident-image  — 4-tier verification
echo     POST /api/v1/verify-batch            — Batch verification
echo ============================================================
echo.
echo Press Ctrl+C to stop.
echo.

uvicorn app:app --host 0.0.0.0 --port 8000 --reload
