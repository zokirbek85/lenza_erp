$SERVER = "root@erp.lenza.uz"

Write-Host "EMERGENCY FIX - Restoring backend" -ForegroundColor Red
Write-Host ""

Write-Host "[1] Checking running containers..." -ForegroundColor Yellow
ssh $SERVER "docker ps -a | grep backend"

Write-Host ""
Write-Host "[2] Fixing .env file NOW..." -ForegroundColor Yellow
ssh $SERVER @'
cd /opt/lenza_erp
# Quick fix - add quotes
sed -i 's/^COMPANY_NAME=Lenza ERP$/COMPANY_NAME="Lenza ERP"/' .env
sed -i 's/^COMPANY_SLOGAN=\(.*[^"]\)$/COMPANY_SLOGAN="\1"/' .env
sed -i 's/^COMPANY_ADDRESS=\(.*[^"]\)$/COMPANY_ADDRESS="\1"/' .env
sed -i 's/^COMPANY_PHONE=\(.*[^"]\)$/COMPANY_PHONE="\1"/' .env
# Also fix secret and password
sed -i 's/^DJANGO_SECRET_KEY=\(.*[^"]\)$/DJANGO_SECRET_KEY="\1"/' .env
sed -i 's/^POSTGRES_PASSWORD=\(.*[^"]\)$/POSTGRES_PASSWORD="\1"/' .env
dos2unix .env 2>/dev/null || true
echo "Fixed .env - checking line 47:"
sed -n '45,50p' .env
'@

Write-Host ""
Write-Host "[3] Starting backend containers..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d"

Write-Host ""
Write-Host "[4] Wait 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "[5] Check status..." -ForegroundColor Yellow
ssh $SERVER "docker ps | grep backend"

Write-Host ""
Write-Host "DONE! Check https://erp.lenza.uz" -ForegroundColor Green
