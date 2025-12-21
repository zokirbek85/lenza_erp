$SERVER = "root@erp.lenza.uz"

Write-Host "Final fix for Telegram bot" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Updating token..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && echo 'Token updated:' && grep TELEGRAM .env"

Write-Host ""
Write-Host "[2] Stopping backend..." -ForegroundColor Yellow
ssh $SERVER "docker stop lenza_backend_green && docker rm lenza_backend_green"

Write-Host ""
Write-Host "[3] Starting backend from root dir..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d backend_green"

Write-Host ""
Write-Host "[4] Waiting 20 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "[5] Checking token in container..." -ForegroundColor Yellow
ssh $SERVER "docker exec lenza_backend_green printenv | grep TELEGRAM"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Done! Create an order to test" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
