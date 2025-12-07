# Deploy fix for /api/products/export/excel/ 500 error
# Run this locally to deploy to VPS

Write-Host "🚀 Deploying tmp directory fix to VPS..." -ForegroundColor Green

# SSH commands
$commands = @"
cd /opt/lenza_erp && \
git pull origin main && \
bash fix_media_permissions.sh && \
docker-compose build backend && \
docker-compose up -d backend && \
sleep 5 && \
docker-compose exec -T backend ls -la /app/media/
"@

Write-Host "📡 Connecting to VPS and deploying..." -ForegroundColor Cyan

ssh root@lenza.uz $commands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🧪 Test the export at: https://erp.lenza.uz/products" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Please check the errors above." -ForegroundColor Red
    Write-Host "You may need to SSH manually: ssh root@lenza.uz" -ForegroundColor Yellow
}
