# PowerShell script to fix Telegram on production server
# Run this from local machine

$SERVER = "root@erp.lenza.uz"
$DEPLOY_DIR = "/opt/lenza_erp"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Fixing Telegram Bot on Production Server" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy updated .env.backend file to server
Write-Host "[Step 1/3] Uploading updated .env.backend file..." -ForegroundColor Yellow
scp .env.backend "${SERVER}:${DEPLOY_DIR}/.env"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to upload .env file" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] .env file uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Verify the changes
Write-Host "[Step 2/3] Verifying Telegram configuration..." -ForegroundColor Yellow
ssh $SERVER "cd $DEPLOY_DIR && grep -E 'TELEGRAM_(BOT_TOKEN|GROUP_CHAT_ID)' .env"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to verify configuration" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Configuration verified" -ForegroundColor Green
Write-Host ""

# Step 3: Restart backend container
Write-Host "[Step 3/3] Restarting backend container..." -ForegroundColor Yellow
ssh $SERVER "cd $DEPLOY_DIR && (docker compose restart backend || docker-compose restart backend) && sleep 10"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to restart backend" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Backend restarted successfully" -ForegroundColor Green
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host "Done! Telegram bot should now work on production" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "To test, create a new order on https://erp.lenza.uz" -ForegroundColor Yellow
Write-Host "and check your Telegram group for notification." -ForegroundColor Yellow
