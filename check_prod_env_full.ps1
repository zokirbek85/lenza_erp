$SERVER = "root@erp.lenza.uz"

Write-Host "Checking production .env file" -ForegroundColor Cyan
ssh $SERVER "cat /opt/lenza_erp/.env | head -30"
