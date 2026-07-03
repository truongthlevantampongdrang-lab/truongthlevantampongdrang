@echo off
cd /d "%~dp0"
echo Starting website dev server...
echo.
call npm.cmd run dev
echo.
echo Server stopped. Press any key to close this window.
pause >nul
