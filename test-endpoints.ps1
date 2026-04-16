# Test Storage API Endpoints
Write-Host "🧪 Testing Storage API Endpoints..." -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3004/health" -Method GET
    Write-Host "✅ Health Check: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: API Health Check
Write-Host "`n2. Testing API Health Check..." -ForegroundColor Yellow
try {
    $apiHealthResponse = Invoke-RestMethod -Uri "http://localhost:3004/storage/api/v1/health" -Method GET
    Write-Host "✅ API Health Check: $($apiHealthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Login to get JWT token
Write-Host "`n3. Testing User Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin_68f792c7"
        password = "Demo123"
        tenantName = "Test School"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/user/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $accessToken = $loginResponse.data.tokens.accessToken
    Write-Host "✅ Login Successful: Token received" -ForegroundColor Green
    Write-Host "Token: $($accessToken.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Note: Make sure user-api is running on port 3001" -ForegroundColor Yellow
}

# Test 4: File Upload (if token available)
if ($accessToken) {
    Write-Host "`n4. Testing File Upload..." -ForegroundColor Yellow
    try {
        # Create a test file
        $testContent = "This is a test file for storage API"
        $testFile = [System.IO.Path]::GetTempFileName() + ".txt"
        [System.IO.File]::WriteAllText($testFile, $testContent)
        
        $headers = @{
            "Authorization" = "Bearer $accessToken"
        }
        
        $form = @{
            file = Get-Item $testFile
            category = "test"
            description = "Test file upload"
        }
        
        $uploadResponse = Invoke-RestMethod -Uri "http://localhost:3004/storage/api/v1/files/upload" -Method POST -Headers $headers -Form $form
        Write-Host "✅ File Upload Successful: $($uploadResponse.message)" -ForegroundColor Green
        Write-Host "File ID: $($uploadResponse.data.id)" -ForegroundColor Cyan
        
        # Clean up test file
        Remove-Item $testFile -Force
        
    } catch {
        Write-Host "❌ File Upload Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Testing Complete!" -ForegroundColor Green
