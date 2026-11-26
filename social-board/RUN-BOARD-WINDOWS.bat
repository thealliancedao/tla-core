@echo off
cd /d "%~dp0"
for /f %%i in ('python -c "import datetime;print((datetime.date.today()-datetime.timedelta(days=365)).isoformat())"') do set FROM=%%i
python build_board.py --from %FROM% && python build_board.py --public --from %FROM%
start "" board.html
pause
