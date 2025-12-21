$SERVER = "root@erp.lenza.uz"

Write-Host "Restoring original .env and updating TELEGRAM" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Restore original .env from backup..." -ForegroundColor Yellow
ssh $SERVER "cp /opt/lenza_erp/.env.backup /opt/lenza_erp/.env"

Write-Host ""
Write-Host "[2] Show current TELEGRAM values..." -ForegroundColor Yellow
ssh $SERVER "grep TELEGRAM /opt/lenza_erp/.env"

Write-Host ""
Write-Host "[3] Update TELEGRAM token..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/^TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env"

Write-Host ""
Write-Host "[4] Verify update..." -ForegroundColor Yellow
ssh $SERVER "grep TELEGRAM /opt/lenza_erp/.env"

Write-Host ""
Write-Host "[5] Convert to Unix format..." -ForegroundColor Yellow
ssh $SERVER "dos2unix /opt/lenza_erp/.env 2>/dev/null || echo '.env already in Unix format'"

Write-Host ""
Write-Host "[6] Start backend..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d backend_green"

Write-Host ""
Write-Host "[7] Wait..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "[8] Check status..." -ForegroundColor Yellow
ssh $SERVER "docker ps | grep backend && docker exec lenza_backend_green printenv TELEGRAM_BOT_TOKEN"

Write-Host ""
Write-Host "Done! Test Telegram by creating an order" -ForegroundColor Green
