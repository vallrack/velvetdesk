@echo off
chcp 65001 >nul
title VelvetDesk Omnichannel Creator Suite + VoiceStudio
color 0b

echo ======================================================================
echo           VELVETDESK OMNICHANNEL CREATOR SUITE + VOICE STUDIO
echo ======================================================================
echo.

:: 1. Liberar puertos 3000 y 3900 si estaban abiertos por ejecuciones previas
echo [*] Verificando puertos del sistema...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo [*] Liberando puerto 3000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3900 ^| findstr LISTENING 2^>nul') do (
    echo [*] Liberando puerto 3900 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: 2. Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js (v18+) desde https://nodejs.org/
    pause
    exit /b 1
)

:: 3. Instalar dependencias si no existen
if not exist "node_modules\" (
    echo [*] Instalando dependencias de Node.js...
    call npm install
)

:: 4. Iniciar motor de Inteligencia Artificial (VoiceStudio - Clonacion de Voz)
echo [*] Iniciando motor de Clonacion de Voz (VoiceStudio en http://127.0.0.1:3900)...
if exist "voicestudio\.venv\Scripts\uvicorn.exe" (
    start "VoiceStudio AI Backend" /min cmd /c "cd voicestudio && .venv\Scripts\uvicorn.exe main:app --app-dir backend --host 127.0.0.1 --port 3900"
) else if exist "voicestudio\.venv\Scripts\python.exe" (
    start "VoiceStudio AI Backend" /min cmd /c "cd voicestudio && .venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 3900"
) else (
    echo [!] Entorno local de VoiceStudio no configurado. El sistema usara el motor de voz de contingencia.
)

:: 5. Iniciar servidor principal de VelvetDesk en segundo plano
echo [*] Iniciando VelvetDesk en http://localhost:3000...
echo [*] El navegador se abrira automaticamente cuando el servidor este listo...
echo.

:: 6. Abrir el navegador en background DESPUES de 10 segundos (cuando el servidor ya este listo)
:: FIX: antes abria el browser ANTES del servidor (race condition -> ERR_CONNECTION_REFUSED)
start "" /b powershell -Command "Start-Sleep 10; Start-Process 'http://localhost:3000'"

:: 7. Iniciar servidor (bloquea esta ventana hasta que se cierre)
echo [*] Para detener el sistema, cierra esta ventana o ejecuta detener_sistema.bat
echo.
call npm run dev

pause
