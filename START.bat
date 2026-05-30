@echo off
:: Billar - One-Click Startup for Windows
:: Double-click this file to start the application.
:: Requires Docker Desktop to be installed.

cd /d "%~dp0"

:: Run the PowerShell setup script, bypassing execution policy for this session
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [FAILED] Something went wrong. See error above.
    echo.
    pause
) else (
    echo.
    echo  Press any key to close this window...
    pause >nul
)
