# ========================================
# Deploy to Production Server
# Runs update.sh on erp.lenza.uz server
# ========================================

$SERVER = "root@erp.lenza.uz"
$PROJECT_DIR = "/opt/lenza_erp"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deploying to Production Server" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "[1/3] Connecting to $SERVER..." -ForegroundColor Yellow

# Check if we can connect
$testConnection = ssh -o ConnectTimeout=5 $SERVER "echo 'connected'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Cannot connect to server" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. SSH key is configured" -ForegroundColor Yellow
    Write-Host "  2. Server is accessible" -ForegroundColor Yellow
    Write-Host "  3. Firewall allows SSH" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Connected to server" -ForegroundColor Green

Write-Host "`n[2/3] Pulling latest code..." -ForegroundColor Yellow

$pullOutput = ssh $SERVER "cd $PROJECT_DIR && git pull origin main 2>&1"
Write-Host $pullOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Git pull failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Code updated" -ForegroundColor Green

Write-Host "`n[3/3] Running update script (zero-downtime deployment)..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

# Run update.sh and stream output
ssh $SERVER "cd $PROJECT_DIR && bash update.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Application is now live at:" -ForegroundColor Cyan
    Write-Host "  https://erp.lenza.uz" -ForegroundColor White
    Write-Host "  https://erp.lenza.uz/admin/" -ForegroundColor White
    Write-Host "  https://erp.lenza.uz/api/" -ForegroundColor White
    
    Write-Host "`nView logs:" -ForegroundColor Yellow
    Write-Host "  ssh $SERVER 'docker logs lenza_backend_blue -f'" -ForegroundColor Gray
    Write-Host "  ssh $SERVER 'docker logs lenza_backend_green -f'" -ForegroundColor Gray
} else {
    Write-Host "`n[ERROR] Deployment failed!" -ForegroundColor Red
    Write-Host "Check server logs for details:" -ForegroundColor Yellow
    Write-Host "  ssh $SERVER 'docker ps'" -ForegroundColor Gray
    Write-Host "  ssh $SERVER 'docker logs lenza_backend_blue'" -ForegroundColor Gray
    exit 1
}
