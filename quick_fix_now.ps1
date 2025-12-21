$SERVER = "root@erp.lenza.uz"

Write-Host "QUICK FIX" -ForegroundColor Red
Write-Host ""

Write-Host "[1] Fix .env quotes..." -ForegroundColor Yellow
ssh $SERVER 'cd /opt/lenza_erp && sed -i "s/COMPANY_NAME=Lenza ERP/COMPANY_NAME=\"Lenza ERP\"/" .env'
ssh $SERVER 'cd /opt/lenza_erp && sed -i "s/COMPANY_SLOGAN=Your/COMPANY_SLOGAN=\"Your/" .env'
ssh $SERVER 'cd /opt/lenza_erp && sed -i "s/Solution$/Solution\"/" .env'
ssh $SERVER 'cd /opt/lenza_erp && sed -i "s/COMPANY_ADDRESS=Tashkent/COMPANY_ADDRESS=\"Tashkent/" .env'  
ssh $SERVER 'cd /opt/lenza_erp && sed -i "s/Uzbekistan$/Uzbekistan\"/" .env'
ssh $SERVER 'cd /opt/lenza_erp && dos2unix /opt/lenza_erp/.env'

Write-Host ""
Write-Host "[2] Check line 47..." -ForegroundColor Yellow
ssh $SERVER 'sed -n "45,50p" /opt/lenza_erp/.env'

Write-Host ""
Write-Host "[3] Start green backend..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d backend_green"

Write-Host ""
Start-Sleep -Seconds 10

Write-Host "[4] Check..." -ForegroundColor Yellow
ssh $SERVER "docker ps"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
