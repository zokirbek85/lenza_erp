$SERVER = "root@erp.lenza.uz"

Write-Host "Updating Telegram token on production server..." -ForegroundColor Cyan
Write-Host ""

# Update .env file
Write-Host "[1] Updating /opt/lenza_erp/.env file..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && grep TELEGRAM_BOT_TOKEN .env"

Write-Host ""
Write-Host "[2] Recreating backend container..." -ForegroundColor Yellow  
ssh $SERVER "cd /opt/lenza_erp/deploy && docker compose up -d --force-recreate backend_green"

Write-Host ""
Write-Host "[3] Waiting for backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "[4] Verifying token in container..." -ForegroundColor Yellow
ssh $SERVER "docker exec lenza_backend_green printenv TELEGRAM_BOT_TOKEN"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Done! Test by creating an order" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
