@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js. Instala Node 18+ desde https://nodejs.org
  pause
  exit /b 1
)
echo === Motor de audio ===
node tests\audio.mjs || goto :fail
echo.
echo === Validacion de datos ===
node tests\validate.mjs || goto :fail
echo.
echo === Simulacion de combate ===
node tests\battle-sim.mjs || goto :fail
echo.
echo === Menus de batalla ===
node tests\battle-flow.mjs || goto :fail
echo.
echo === Recorrido completo ===
node tests\playthrough.mjs || goto :fail
echo.
echo Todas las pruebas pasaron.
pause
exit /b 0

:fail
echo.
echo Hubo fallos en las pruebas.
pause
exit /b 1
