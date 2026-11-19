@echo off
title VelvetMotion AI — Home Server & Local RAM/GPU Engine
cd /d "%~dp0"
echo Starting VelvetMotion Home Engine...
where python >nul 2>nul
if %errorlevel%==0 (
  python velvetmotion_home_engine.py
) else (
  py -3 velvetmotion_home_engine.py
)
pause
