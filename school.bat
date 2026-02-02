@echo off
cd /d "%~dp0"

echo Updating project from GitHub...
git pull
echo project pulled...
git add .
echo project pulled...
git commit -m "data"
git push

start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm start"

exit
