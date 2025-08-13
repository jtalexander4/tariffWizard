# Security audit script for Tariff Wizard (PowerShell)
Write-Host "Scanning for potential security issues..." -ForegroundColor Cyan

Write-Host "Checking for MongoDB connection strings with credentials..." -ForegroundColor Yellow
$mongoResults = Get-ChildItem -Path . -Include "*.js" -Exclude "*.example*" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" } | Select-String -Pattern "mongodb\+srv://[^:]*:[^@]*@"
if ($mongoResults.Count -eq 0) {
    Write-Host "✅ No hardcoded MongoDB credentials found" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Found MongoDB credentials in:" -ForegroundColor Red
    $mongoResults | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
}

Write-Host "Checking for API keys in code..." -ForegroundColor Yellow
$apiKeyResults = Get-ChildItem -Path . -Include "*.js","*.json" -Exclude "*.example*","security-check.*" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" } | Select-String -Pattern "API_KEY.*=" | Where-Object { $_.Line -notmatch "process\.env" -and $_.Line -notmatch "your_.*_key" }
if ($apiKeyResults.Count -eq 0) {
    Write-Host "✅ No hardcoded API keys found" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Found API keys in:" -ForegroundColor Red
    $apiKeyResults | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
}

Write-Host "Checking for password fields..." -ForegroundColor Yellow
$passwordResults = Get-ChildItem -Path . -Include "*.js","*.json" -Exclude "*.example*","security-check.*" -Recurse | Where-Object { $_.FullName -notmatch "node_modules" } | Select-String -Pattern "password.*=" | Where-Object { $_.Line -notmatch "process\.env" }
if ($passwordResults.Count -eq 0) {
    Write-Host "✅ No hardcoded passwords found" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Found passwords in:" -ForegroundColor Red
    $passwordResults | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
}

Write-Host "Checking .env files are gitignored..." -ForegroundColor Yellow
try {
    $gitIgnoreCheck = git check-ignore "server\.env" 2>$null
    if ($gitIgnoreCheck) {
        Write-Host "✅ .env files are properly gitignored" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: .env files may not be properly gitignored" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Could not check git ignore status" -ForegroundColor Yellow
}

Write-Host "Checking for actual .env files with credentials..." -ForegroundColor Yellow
$envFiles = Get-ChildItem -Path . -Name "*.env" -Recurse | Where-Object { $_ -notlike "*.example*" }
if ($envFiles.Count -eq 0) {
    Write-Host "✅ No .env files with credentials found in repository" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Found .env files that may contain credentials:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    Write-Host "   Consider removing these files with: git rm --cached <filename>" -ForegroundColor Yellow
}

Write-Host "Security audit complete!" -ForegroundColor Cyan
