@echo off
cd /d "%~dp0"
if "%~1"=="" (python update.py & pause & exit /b)
python update.py %*
pause
