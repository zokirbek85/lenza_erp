# Quick Fix: Restart Django Server

## Issue
The `/api/defects/stock/` endpoint returns 404 because the URL routing order was incorrect.

## Fix Applied
Modified `backend/core/urls.py` to register `defects/stock` BEFORE `defects` to avoid route conflicts.

**Before:**
```python
router.register('defects', ProductDefectViewSet, basename='defect')
router.register('defects/stock', ProductDefectFromStockViewSet, basename='defect-stock')
```

**After:**
```python
router.register('defects/stock', ProductDefectFromStockViewSet, basename='defect-stock')
router.register('defects', ProductDefectViewSet, basename='defect')
```

## Required Action: RESTART DJANGO SERVER

### Method 1: Terminal
```bash
cd D:\Project\new\lenza_erp\backend

# Stop any running Django server (Ctrl+C if running in terminal)
# OR kill the process:
Get-Process python | Where-Object { $_.CommandLine -like '*runserver*' } | Stop-Process

# Start the server
python manage.py runserver
```

### Method 2: VS Code
1. Go to Terminal where Django is running
2. Press `Ctrl+C` to stop
3. Run: `python manage.py runserver`

## Verification

After restarting, test the endpoint:

```bash
# In PowerShell
curl http://localhost:8000/api/defects/stock/
```

Or open in browser:
```
http://localhost:8000/api/defects/stock/
```

You should see JSON response with defect data instead of 404.

## Frontend
Once backend is restarted, refresh the frontend at:
```
http://localhost:5173/defects
```

The page should now display all products with defective stock.
