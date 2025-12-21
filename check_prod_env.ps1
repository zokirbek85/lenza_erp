# Check Telegram config on production server
$SERVER = "root@erp.lenza.uz"

Write-Host "Checking production server Telegram configuration..." -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking .env file..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && grep TELEGRAM .env"

Write-Host ""
Write-Host "[2] Checking environment in backend container..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose exec -T backend printenv | grep TELEGRAM"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
