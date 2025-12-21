# Recreate backend container to reload environment variables
$SERVER = "root@erp.lenza.uz"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Recreating Backend Container" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[Step 1] Stopping backend container..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp/deploy && docker compose stop backend_green"

Write-Host ""
Write-Host "[Step 2] Removing backend container..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp/deploy && docker compose rm -f backend_green"

Write-Host ""
Write-Host "[Step 3] Recreating backend container with new environment..." -ForegroundColor Yellow
ssh $SERVER "cd /opt/lenza_erp/deploy && docker compose up -d backend_green"

Write-Host ""
Write-Host "[Step 4] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "[Step 5] Checking environment variables in container..." -ForegroundColor Yellow
ssh $SERVER "docker exec lenza_backend_green printenv | grep TELEGRAM"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Done! Backend container recreated" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now test by creating a new order on https://erp.lenza.uz" -ForegroundColor Yellow
