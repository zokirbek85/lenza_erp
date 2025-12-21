$SERVER = "root@erp.lenza.uz"

Write-Host "Fixing Telegram on production - final attempt" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking which .env file is used..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp/deploy && grep 'env_file' docker-compose.green.yml | head -5"

Write-Host ""
Write-Host "[2] Updating .env in both locations..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && grep TELEGRAM_BOT_TOKEN .env"

Write-Host ""
Write-Host "[3] Stopping current backend..." -ForegroundColor Yellow
ssh $SERVER "docker stop lenza_backend_green && docker rm lenza_backend_green"

Write-Host ""
Write-Host "[4] Starting new backend..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp/deploy && docker compose -f docker-compose.green.yml up -d backend_green"

Write-Host ""
Write-Host "[5] Waiting..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host ""
Write-Host "[6] Checking token..." -ForegroundColor Yellow
ssh $SERVER "docker exec lenza_backend_green printenv TELEGRAM_BOT_TOKEN"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
