Write-Host "Deploying Firebase Functions to fix CORS issue..." -ForegroundColor Green
Write-Host ""

Set-Location functions
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "Deploying functions..." -ForegroundColor Yellow
firebase deploy --only functions

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Read-Host "Press Enter to continue" 