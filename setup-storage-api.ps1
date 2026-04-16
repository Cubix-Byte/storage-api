# Storage API - Setup Script

This PowerShell script helps set up the Storage API environment and dependencies.

```powershell
# Storage API Setup Script
Write-Host "🚀 Setting up Storage API..." -ForegroundColor Green

# Check if Node.js is installed
Write-Host "📋 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js v22 or v24" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host "📋 Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoTest = mongo --eval "db.runCommand('ping')" --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️ MongoDB connection test failed. Please ensure MongoDB is running" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ MongoDB test command not available. Please ensure MongoDB is running" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ .env file created from template" -ForegroundColor Green
    Write-Host "⚠️ Please update .env file with your configuration" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Build the project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Storage API setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with your configuration" -ForegroundColor White
Write-Host "2. Ensure MongoDB is running" -ForegroundColor White
Write-Host "3. Verify AWS S3 credentials" -ForegroundColor White
Write-Host "4. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host "5. Import Postman collection for testing" -ForegroundColor White
```

Save this as `setup-storage-api.ps1` and run it in PowerShell.
