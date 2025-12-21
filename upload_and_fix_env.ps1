$SERVER = "root@erp.lenza.uz"

Write-Host "Uploading and fixing .env file" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Uploading .env.backend..." -ForegroundColor Yellow
scp .env.backend "${SERVER}:/opt/lenza_erp/.env.tmp"

Write-Host ""
Write-Host "[2] Converting to Unix format and installing..." -ForegroundColor Yellow
ssh $SERVER "apt-get install -y dos2unix 2>/dev/null; dos2unix /opt/lenza_erp/.env.tmp; mv /opt/lenza_erp/.env.tmp /opt/lenza_erp/.env; grep TELEGRAM /opt/lenza_erp/.env"

Write-Host ""
Write-Host "[3] Starting backend..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d backend_green"

Write-Host ""
Write-Host "[4] Waiting..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "[5] Checking..." -ForegroundColor Yellow
ssh $SERVER "docker ps | grep backend && docker exec lenza_backend_green printenv | grep TELEGRAM"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
