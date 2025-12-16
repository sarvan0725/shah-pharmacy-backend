@echo off
echo Starting Shah Pharmacy Backend Server...
echo.
cd /d "%~dp0"
echo Server starting on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
node simple-start.js
pause