@echo off
setlocal
cd /d "%~dp0"
title StripLink (dev)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js isn't installed. Get Node 22 LTS from https://nodejs.org and run this again.
  pause & exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker isn't installed. StripLink needs Postgres and Redis; install Docker Desktop and run this again.
  pause & exit /b 1
)

echo Starting Postgres and Redis in Docker...
docker compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
  echo Couldn't start the containers. Open Docker Desktop, wait until it says it's running, then run this again.
  pause & exit /b 1
)

if not exist ".env.development" (
  echo Creating .env.development for local testing...
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set DBKEY=%%i
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set IPKEY=%%i
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set JWTKEY=%%i
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set CHARTKEY=%%i
  (
    echo VITE_SERVER_URL=http://localhost:9901
    echo FRONTEND_URL=http://localhost:5173
    echo POSTGRES_DB_URL=postgresql://striplink:striplink@localhost:5432/striplink
    echo REDIS_URL=redis://localhost:6379
    echo DB_ENCRYPTION_KEY=%DBKEY%
    echo IP_HASH_SECRET=%IPKEY%
    echo JWT_SECRET=%JWTKEY%
    echo CHART_SUBJECT_SECRET=%CHARTKEY%
    echo PORT=9901
    echo DISCORD_CLIENT_ID=
    echo DISCORD_CLIENT_SECRET=
    echo DISCORD_REDIRECT_URI=http://localhost:9901/api/auth/discord/callback
    echo ADMIN_IDS=
    echo DEV_LOGIN=true
  ) > ".env.development"
)

echo Checking packages - the first run takes a few minutes...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo npm install failed.
  pause & exit /b 1
)

echo.
echo StripLink is starting. Your browser opens at http://localhost:5173 in a moment.
echo Use "Dev login" on the sign-in page. Close this window to stop the server.
echo.
start "" cmd /c "timeout /t 25 >nul & start http://localhost:5173/login"
call npm run dev
pause
