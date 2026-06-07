@echo off
title FightVex Dev Server
cd /d "D:\UserData\Admin\Desktop\fightvector"

echo ============================================
echo   Starting FightVex server...
echo   (Keep this window open. Close it to stop.)
echo ============================================
echo.

echo Freeing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1

echo Launching browser shortly...
start "" /min cmd /c "timeout /t 6 >nul & start http://localhost:3000"

echo.
npm run dev

echo.
echo Server stopped. Press any key to close.
pause >nul
