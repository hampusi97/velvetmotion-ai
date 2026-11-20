@echo off
title VelvetMotion AI — One-Click Local Host
cd /d "%~dp0"
echo.
echo  VelvetMotion AI — Local Host
echo  ============================
echo  Hosts the site on http://127.0.0.1:8787
echo  Uses your RAM/GPU if Ollama, KoboldCpp or ComfyUI is running.
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  set PY=python
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set PY=py -3
  ) else (
    echo Python not found. Install from https://www.python.org/downloads/
    echo Then run this file again.
    pause
    exit /b 1
  )
)

echo Starting server...
start "" http://127.0.0.1:8787
%PY% velvetmotion_home_engine.py
pause
