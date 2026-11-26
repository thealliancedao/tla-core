@echo off
cd /d "%~dp0"
if "%~1"=="" (echo Drag one or more export folders onto this file, or: python ingest.py ^<folder^> & pause & exit /b)
python ingest.py %*
pause
