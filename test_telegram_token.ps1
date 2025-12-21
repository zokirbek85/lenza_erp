# Test Telegram Bot Token
$TOKEN = "8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM"

Write-Host "Testing Telegram Bot Token..." -ForegroundColor Cyan
Write-Host "Token: $TOKEN" -ForegroundColor Yellow
Write-Host ""

# Test 1: Get bot info
Write-Host "[Test 1] Getting bot info..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$TOKEN/getMe" -Method Get
$response | ConvertTo-Json -Depth 3

Write-Host ""
Write-Host "If you see bot information above, the token is valid!" -ForegroundColor Green
