$SERVER = "root@erp.lenza.uz"

Write-Host "Using update.sh to deploy with new token" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Updating token in .env..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && sed -i 's/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=8125179512:AAHO-ts0v_zxFWuEDcGEIWn9abqPsroY8kM/' .env && grep TELEGRAM .env"

Write-Host ""
Write-Host "[2] Running update.sh..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && bash update.sh"

Write-Host ""
Write-Host "Done! Check your Telegram group" -ForegroundColor Green
