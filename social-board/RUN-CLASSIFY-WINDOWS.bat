@echo off
cd /d "%~dp0"
if "%ANTHROPIC_API_KEY%"=="" (set /p ANTHROPIC_API_KEY=Paste ANTHROPIC_API_KEY (not saved): )
python classify.py %*
pause
