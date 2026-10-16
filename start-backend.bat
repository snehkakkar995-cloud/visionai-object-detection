@echo off
cd /d "%~dp0backend"
if not exist venv (
  echo Creating virtual environment...
  python -m venv venv
  call venv\Scripts\activate
  python -m pip install --upgrade pip
  pip install -r requirements.txt
) else (
  call venv\Scripts\activate
)
uvicorn app.main:app --reload --port 8000
