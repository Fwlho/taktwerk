@echo off
rem Startet Taktwerk lokal: Docker Desktop -> Datenbank (Supabase) -> App -> Browser.
rem Einfach doppelklicken. Fenster offen lassen, solange du die App nutzt.
chcp 65001 >nul
title Taktwerk
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;%PATH%"
set tries=0

echo.
echo  [1/4] Docker pruefen ...
docker info >nul 2>&1
if not errorlevel 1 goto dockerok
echo        Docker Desktop wird gestartet ...
start "" "%LOCALAPPDATA%\Programs\DockerDesktop\frontend\Docker Desktop.exe"

:waitdocker
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto dockerok
set /a tries+=1
if %tries% lss 60 goto waitdocker
echo.
echo  Docker Desktop startet nicht. Bitte Docker Desktop von Hand oeffnen und diese Datei erneut starten.
pause
exit /b 1

:dockerok
echo        Docker laeuft.
echo  [2/4] Datenbank starten (dauert beim ersten Mal etwas) ...
call npx supabase start >nul 2>&1
if not errorlevel 1 goto dbok
echo        Zweiter Versuch ...
call npx supabase stop >nul 2>&1
call npx supabase start
if not errorlevel 1 goto dbok
echo.
echo  Die Datenbank startet nicht. Bitte Claude Bescheid geben.
pause
exit /b 1

:dbok
echo        Datenbank laeuft.

rem Schneller Betriebsmodus: App nur neu bauen, wenn sich Dateien seit dem letzten Bau geaendert haben
powershell -NoProfile -Command "$b=(Get-Item '.next\BUILD_ID' -ErrorAction SilentlyContinue).LastWriteTime; $n=(Get-ChildItem src,messages,public,package.json,next.config.ts -Recurse -File -ErrorAction SilentlyContinue | Measure-Object LastWriteTime -Maximum).Maximum; if (-not $b -or $n -gt $b) { exit 1 } else { exit 0 }"
if errorlevel 1 goto build
goto run

:build
echo  [3/4] App wird vorbereitet (nur nach Updates, ca. 2-4 Minuten) ...
call npm run build >".next-build.log" 2>&1
if errorlevel 1 (
  echo.
  echo  Vorbereitung fehlgeschlagen. Bitte Claude Bescheid geben ^(Datei .next-build.log^).
  pause
  exit /b 1
)

:run
echo  [3/4] App starten ...
echo  [4/4] Browser oeffnet sich gleich: http://localhost:3000
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"
echo.
echo  Zum Beenden dieses Fenster schliessen.
echo.
call npm start
