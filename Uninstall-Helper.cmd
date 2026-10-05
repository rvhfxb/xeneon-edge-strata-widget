@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall-Helper.ps1"
if errorlevel 1 (echo. & echo Operation failed. See the message above. & pause & exit /b 1)
echo.
pause
