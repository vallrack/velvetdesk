@echo off
chcp 65001 >nul
title Detener VelvetDesk y VoiceStudio
color 0c

echo ======================================================================
echo              DETENIENDO VELVETDESK Y VOICESTUDIO
echo ======================================================================
echo.

echo [*] Cerrando servicios en puerto 3000 (VelvetDesk)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] Cerrando servicios en puerto 3900 (VoiceStudio AI)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3900 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [*] Todos los procesos han sido cerrados limpiamente.
echo.
timeout /t 2 /nobreak >nul
exit
