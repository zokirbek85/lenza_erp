$SERVER = "root@erp.lenza.uz"

Write-Host "Finding and fixing the actual backend container" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] List all running containers..." -ForegroundColor Yellow
ssh $SERVER "docker ps --format '{{.Names}}'"

Write-Host ""
Write-Host "[2] Update .env..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && grep TELEGRAM .env"

Write-Host ""
Write-Host "[3] Restart lenza_backend_green if exists..." -ForegroundColor Yellow
ssh $SERVER "docker restart lenza_backend_green 2>/dev/null || docker restart lenza_backend 2>/dev/null || echo 'No backend container found to restart'"

Write-Host ""
Write-Host "[4] Wait and check..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
ssh $SERVER "docker ps | grep backend"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "Check logs: ssh root@erp.lenza.uz 'docker logs <container_name> --tail 50 | grep TELEGRAM'" -ForegroundColor Yellow
