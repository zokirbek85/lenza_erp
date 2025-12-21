$SERVER = "root@erp.lenza.uz"

Write-Host "Fixing .env file syntax errors" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Checking line 47..." -ForegroundColor Yellow
ssh $SERVER "sed -n '45,50p' /opt/lenza_erp/.env"

Write-Host ""
Write-Host "[2] Fixing quotes in .env..." -ForegroundColor Yellow
ssh $SERVER @'
cd /opt/lenza_erp
# Fix COMPANY_NAME and other unquoted values
sed -i "s/^COMPANY_NAME=Lenza ERP/COMPANY_NAME=\"Lenza ERP\"/" .env
sed -i "s/^COMPANY_SLOGAN=\(.*\)/COMPANY_SLOGAN=\"\1\"/" .env
sed -i "s/^COMPANY_ADDRESS=\(.*\)/COMPANY_ADDRESS=\"\1\"/" .env

# Also set real production values
sed -i "s/^DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=\"$(openssl rand -base64 64 | tr -d '\n')\"/" .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=\"$(openssl rand -base64 32 | tr -d '\n')\"/" .env

# Verify TELEGRAM is still there
echo "TELEGRAM config:"
grep TELEGRAM .env
'@

Write-Host ""
Write-Host "[3] Convert to Unix format..." -ForegroundColor Yellow
ssh $SERVER "dos2unix /opt/lenza_erp/.env 2>/dev/null"

Write-Host ""
Write-Host "[4] Run update.sh..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && bash update.sh"

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
