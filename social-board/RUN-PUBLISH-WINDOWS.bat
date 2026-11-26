@echo off
cd /d "%~dp0"
python publish.py
python make_public_repo.py
pause
