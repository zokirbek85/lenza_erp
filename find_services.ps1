$SERVER = "root@erp.lenza.uz"

Write-Host "Finding backend service name..." -ForegroundColor Cyan
ssh $SERVER "cd /opt/lenza_erp && docker compose ps"
