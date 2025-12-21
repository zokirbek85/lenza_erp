$SERVER = "root@erp.lenza.uz"

Write-Host "Fixing .env file line endings on production server" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1] Converting .env to Unix format..." -ForegroundColor Yellow
ssh $SERVER @'
cd /opt/lenza_erp

# Install dos2unix if not available
if ! command -v dos2unix &> /dev/null; then
    echo "Installing dos2unix..."
    apt-get update && apt-get install -y dos2unix
fi

# Convert .env file to Unix format
echo "Converting .env to Unix line endings..."
dos2unix .env

# Verify
echo "Verifying TELEGRAM variables:"
grep TELEGRAM .env
'@

Write-Host ""
Write-Host "[2] Starting backend..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp && docker compose -f deploy/docker-compose.green.yml up -d backend_green"

Write-Host ""
Write-Host "[3] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "[4] Checking backend status..." -ForegroundColor Yellow
ssh $SERVER "docker ps | grep backend"

Write-Host ""
Write-Host "[5] Checking Telegram env vars in container..." -ForegroundColor Yellow
ssh $SERVER "docker exec lenza_backend_green printenv | grep TELEGRAM"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Done! Create an order to test Telegram bot" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
