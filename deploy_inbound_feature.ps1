# Product Inbound Feature Deployment - Windows
# PowerShell script

Write-Host "🚀 Deploying Product Inbound Feature..." -ForegroundColor Blue
Write-Host ""

# Step 1: Backend Migration
Write-Host "Step 1: Running database migrations..." -ForegroundColor Cyan
Set-Location backend
python manage.py migrate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "✗ Migration failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Collect static files
Write-Host "Step 2: Collecting static files..." -ForegroundColor Cyan
python manage.py collectstatic --noinput
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Static files collected" -ForegroundColor Green
} else {
    Write-Host "⚠ Static files collection skipped" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Build Frontend
Write-Host "Step 3: Building frontend..." -ForegroundColor Cyan
Set-Location ../frontend
npm install
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Instructions for restart
Write-Host "Step 4: Restart services" -ForegroundColor Cyan
Write-Host "Please restart your development server manually:" -ForegroundColor Yellow
Write-Host "  - Backend: Ctrl+C and restart Django server" -ForegroundColor White
Write-Host "  - Frontend: Ctrl+C and restart Vite server" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Deployment preparation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart backend: cd backend && python manage.py runserver"
Write-Host "2. Restart frontend: cd frontend && npm run dev"
Write-Host "3. Test the API: http://localhost:8000/api/inbounds/"
Write-Host "4. Access the UI: http://localhost:5173/products/inbounds"
Write-Host "5. Check the documentation: PRODUCT_INBOUND_IMPLEMENTATION.md"
Write-Host ""
