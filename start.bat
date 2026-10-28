@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instala Node 18+ desde https://nodejs.org
  pause
  exit /b 1
)
echo Iniciando Cristal de la Aurora...
start "" http://127.0.0.1:5123
node server.mjs 5123
pause
