$SERVER = "root@erp.lenza.uz"

Write-Host "Checking running containers..." -ForegroundColor Cyan
ssh $SERVER "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"
