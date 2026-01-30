@echo off
cd /d "%~dp0"

echo Updating project from GitHub...
git pull
git push

start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm start"

exit
