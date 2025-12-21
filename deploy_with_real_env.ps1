$SERVER = "root@erp.lenza.uz"

Write-Host "Uploading fixed .env.production to server" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Upload .env.production..." -ForegroundColor Yellow
scp .env.production "${SERVER}:/opt/lenza_erp/.env.new"

Write-Host ""
Write-Host "[2] Generate real secrets on server and install..." -ForegroundColor Yellow
ssh $SERVER @'
cd /opt/lenza_erp

# Generate random secrets
SECRET_KEY=$(openssl rand -base64 64 | tr -d '\n' | tr -d '=')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | tr -d '=')

# Replace placeholders
sed -i "s/lenza-production-secret-key-change-this-to-random-string-min-50-chars-[0-9]*/$(echo $SECRET_KEY | sed 's/[\/&]/\\&/g')/" .env.new
sed -i "s/lenza_prod_password_[0-9]*/$(echo $DB_PASSWORD | sed 's/[\/&]/\\&/g')/" .env.new

# Convert to Unix
dos2unix .env.new 2>/dev/null || true

# Backup old and install new
cp .env .env.old
mv .env.new .env

echo "New .env installed. Checking TELEGRAM:"
grep TELEGRAM .env
'@

Write-Host ""
Write-Host "[3] Run update.sh..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && bash update.sh"

Write-Host ""
Write-Host "Done! Backend should be deploying..." -ForegroundColor Green
