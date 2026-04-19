@echo off
echo ===================================================
echo PrimeScore Local Run (Fixed Port 5433)
echo ===================================================

cd /d "%~dp0"

REM 1. Faqat yo'q bo'lsa nusxa oladi (mavjudini o'chirmaydi)
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
if not exist "frontend\.env" copy "frontend\.env.example" "frontend\.env" >nul
if not exist "admin\.env" copy "admin\.env.example" "admin\.env" >nul

echo.
echo [1/2] Database Setup (Port 5433 tekshirilmoqda...)
start "PrimeScore DB Setup" /wait cmd /c "cd backend && call .venv\Scripts\activate.bat && alembic upgrade head && python force_db_init.py || pause"

echo.
echo [2/2] Xizmatlar ishga tushirilmoqda...

start "PrimeScore Backend" cmd /k "cd backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --port 8000"
start "PrimeScore Telegram Bot" cmd /k "cd backend && call .venv\Scripts\activate.bat && python -m app.bot.main"
start "PrimeScore Frontend" cmd /k "cd frontend && npm run dev"
start "PrimeScore Admin" cmd /k "cd admin && npm run dev"

echo.
echo Barchasi ishga tushdi! Port: 5433, Parol: 1112
pause
