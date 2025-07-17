@echo off
echo Deploying Firebase Functions to fix CORS issue...
echo.

cd functions
echo Installing dependencies...
npm install

echo.
echo Deploying functions...
firebase deploy --only functions

echo.
echo Deployment completed!
pause 