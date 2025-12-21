$SERVER = "root@erp.lenza.uz"

Write-Host "Updating only TELEGRAM variables in existing .env" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Backup current .env..." -ForegroundColor Yellow
ssh $SERVER "cp /opt/lenza_erp/.env /opt/lenza_erp/.env.backup"

Write-Host ""
Write-Host "[2] Update TELEGRAM variables..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/^TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && sed -i 's/^TELEGRAM_GROUP_CHAT_ID=.*/TELEGRAM_GROUP_CHAT_ID=-1003006758530/' .env"

Write-Host ""
Write-Host "[3] Verify changes..." -ForegroundColor Yellow
ssh $SERVER "grep -E 'TELEGRAM|POSTGRES_PASSWORD' /opt/lenza_erp/.env | head -5"

Write-Host ""
Write-Host "[4] Start backend..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d backend_green"

Write-Host ""
Write-Host "[5] Wait and check..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
ssh $SERVER "docker ps | grep backend"

Write-Host ""
Write-Host "[6] Check TELEGRAM in container..." -ForegroundColor Yellow
ssh $SERVER "docker exec lenza_backend_green printenv | grep TELEGRAM"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Done! Test by creating an order" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
