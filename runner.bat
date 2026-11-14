@echo off
echo ========================================
echo   Starting Nuxt Development Server
echo ========================================
echo.
echo Access from:
echo   Local:   http://localhost:3001
echo   Network: http://%%COMPUTERNAME%%:3001
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

npm run dev -- --host 0.0.0.0 --port 3001

pause