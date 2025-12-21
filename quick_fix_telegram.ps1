$SERVER = "root@erp.lenza.uz"

Write-Host "Quick fix: Update only TELEGRAM variables and restart" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Find actual compose file..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && find . -name 'docker-compose*.yml' -type f"

Write-Host ""
Write-Host "[2] Check current setup..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && cat docker-compose.yml | grep -A 2 'env_file'"

Write-Host ""
Write-Host "[3] Update .env file..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && grep TELEGRAM .env"

Write-Host ""
Write-Host "[4] Restart using main docker-compose.yml..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose restart"

Write-Host ""
Write-Host "[5] Check logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
ssh $SERVER "docker logs lenza_backend_green --tail 20 | grep TELEGRAM"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
