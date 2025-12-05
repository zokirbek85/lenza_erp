# Run migrations on VPS server
# This script connects to VPS and runs migrations inside Docker container

$VPS_HOST = "95.142.46.43"
$VPS_USER = "root"
$CONTAINER_NAME = "lenza_backend_blue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Migrations on VPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Connecting to VPS..." -ForegroundColor Yellow

$sshCommand = @"
docker exec $CONTAINER_NAME python manage.py migrate dealers --noinput && \
docker exec $CONTAINER_NAME python manage.py showmigrations dealers | tail -5
"@

Write-Host "[2/3] Running migrations in container..." -ForegroundColor Yellow
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa ${VPS_USER}@${VPS_HOST} $sshCommand

Write-Host ""
Write-Host "[3/3] Restarting backend container..." -ForegroundColor Yellow
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa ${VPS_USER}@${VPS_HOST} "docker restart $CONTAINER_NAME"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend restarted. Check logs with:" -ForegroundColor White
Write-Host "ssh root@95.142.46.43 'docker logs lenza_backend_blue --tail 50'" -ForegroundColor Gray
