Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Functions Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking if Firebase CLI is installed..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>$null
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Login to Firebase
Write-Host "Logging into Firebase..." -ForegroundColor Yellow
firebase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase login failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Set-Location functions
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Set OpenAI API key
Write-Host "Setting up OpenAI API key..." -ForegroundColor Yellow
$openaiKey = Read-Host "Please enter your OpenAI API key" -AsSecureString
$openaiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($openaiKey))
firebase functions:config:set openai.api_key="$openaiKeyPlain"

Write-Host ""

# Deploy functions
Write-Host "Deploying Firebase Functions..." -ForegroundColor Yellow
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Functions deployment failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Firebase Functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the functions using test-functions.html" -ForegroundColor White
Write-Host "2. Check the dashboard for Smart Digest functionality" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit" 