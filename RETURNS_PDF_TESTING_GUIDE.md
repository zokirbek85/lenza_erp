# Returns PDF Export - Quick Testing Guide

## 🚀 Pre-Deployment Checklist

### Backend Verification
- [ ] Check imports in `returns/views.py` - no syntax errors
- [ ] Verify `ReturnInvoiceDocument` in `documents/__init__.py` exports
- [ ] Confirm endpoint registered: `/api/returns/{id}/export-pdf/`
- [ ] Check Django can import document class: `python manage.py shell`
  ```python
  from documents import ReturnInvoiceDocument
  from returns.models import Return
  ret = Return.objects.first()
  doc = ReturnInvoiceDocument(return_document=ret)
  print("✓ Import successful")
  ```

### Frontend Verification
- [ ] No TypeScript errors in `ReturnsPage.tsx`
- [ ] No TypeScript errors in `returnsApi.ts`
- [ ] Translation keys present in all 3 locales (en, ru, uz)
- [ ] Build succeeds: `npm run build` (in frontend directory)

### Quick Smoke Test
1. [ ] Start backend: `docker-compose up backend` or `python manage.py runserver`
2. [ ] Start frontend: `cd frontend && npm run dev`
3. [ ] Login to system
4. [ ] Navigate to `/returns`
5. [ ] See PDF button in actions column
6. [ ] Click PDF button on any return
7. [ ] PDF downloads automatically
8. [ ] Open PDF - verify all data present
9. [ ] Check browser console - no errors
10. [ ] Test on mobile - PDF button appears in card

## 🧪 Detailed Testing

### Test Case 1: Basic PDF Export
**Steps:**
1. Go to Returns page
2. Find return with 2-3 items
3. Click PDF button
4. Verify download

**Expected:**
- ✅ File downloads as `return_{id}.pdf`
- ✅ PDF opens without errors
- ✅ All return data visible
- ✅ Styling looks professional

### Test Case 2: Multi-Currency
**Steps:**
1. Export return with USD prices
2. Check exchange rate section
3. Verify totals in both USD and UZS

**Expected:**
- ✅ Exchange rate shows correct date
- ✅ USD total correct
- ✅ UZS total = USD × rate

### Test Case 3: Status Badges
**Steps:**
1. Export return with both healthy and defect items
2. Check item status column

**Expected:**
- ✅ Healthy items have green badge
- ✅ Defect items have red badge

### Test Case 4: Comments
**Steps:**
1. Export return with general comment
2. Export return with item-level comments

**Expected:**
- ✅ General comment in yellow box
- ✅ Item comments below respective items

### Test Case 5: Zero-Price Items
**Steps:**
1. Create/find return with items that have no price
2. Export PDF

**Expected:**
- ✅ Price column shows "—" not "$0.00"
- ✅ Total column shows "—"

### Test Case 6: Error Handling
**Steps:**
1. Try to export non-existent return ID
2. Check error toast

**Expected:**
- ✅ Error toast appears
- ✅ Console shows error details
- ✅ No page crash

### Test Case 7: Mobile View
**Steps:**
1. Open on mobile device or resize browser
2. Find return in mobile cards
3. Tap PDF action button

**Expected:**
- ✅ PDF button visible in mobile card
- ✅ PDF downloads on tap
- ✅ Success toast shows

## 🐛 Common Issues & Fixes

### Issue: PDF Download Not Working
**Symptoms:** Click PDF button, nothing happens
**Fix:**
1. Check browser console for errors
2. Verify backend endpoint responds: `curl /api/returns/1/export-pdf/`
3. Check network tab - should show 200 response with PDF content-type

### Issue: PDF Shows Wrong Data
**Symptoms:** PDF displays but data incorrect
**Fix:**
1. Check return data in database matches PDF
2. Verify product prices exist
3. Check exchange rate date

### Issue: Styling Broken
**Symptoms:** PDF generates but looks wrong
**Fix:**
1. Check `base_css` is in context
2. Verify WeasyPrint can load fonts
3. Check Django template syntax

### Issue: Translation Not Working
**Symptoms:** PDF shows translation keys instead of text
**Fix:**
1. Verify language header sent: `Accept-Language: uz`
2. Check Django i18n middleware enabled
3. Run `python manage.py compilemessages`

## 📊 Performance Benchmarks

### Expected Performance
- **Small return (1-3 items):** < 1 second
- **Medium return (5-10 items):** 1-2 seconds
- **Large return (20+ items):** 2-3 seconds

If slower, check:
- Database query optimization (prefetch_related)
- WeasyPrint installation
- Server resources

## ✅ Production Deployment

### Pre-Deploy
- [ ] All tests pass
- [ ] No console errors
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Translations verified

### Deploy Steps
1. [ ] Commit changes: `git add . && git commit -m "feat: Add PDF export for returns"`
2. [ ] Push to repository: `git push origin main`
3. [ ] Build frontend: `cd frontend && npm run build`
4. [ ] Restart backend: `docker-compose restart backend`
5. [ ] Clear cache if needed: `docker-compose exec backend python manage.py clear_cache`
6. [ ] Test on production: Visit `/returns` and test PDF export

### Post-Deploy
- [ ] Test PDF export on production
- [ ] Monitor error logs: `docker-compose logs -f backend`
- [ ] Check user feedback
- [ ] Monitor performance

## 🎉 Success Criteria

Feature is ready when:
- ✅ PDF exports successfully for all returns
- ✅ All data displays correctly
- ✅ Styling matches design requirements
- ✅ Works on desktop and mobile
- ✅ Error handling works properly
- ✅ No console errors
- ✅ Performance acceptable
- ✅ Translations work in all languages

## 📞 Troubleshooting Contacts

**Backend Issues:**
- Check Django logs: `docker-compose logs backend`
- Test endpoint directly: `curl -H "Authorization: Bearer {token}" {url}/api/returns/1/export-pdf/ --output test.pdf`

**Frontend Issues:**
- Check browser console
- Check network tab (should see 200 response with PDF blob)
- Verify API function called correctly

**PDF Generation Issues:**
- Check WeasyPrint installation: `pip list | grep -i weasy`
- Check fonts available: System fonts or embedded fonts
- Test template rendering: Django shell test

---

**Status:** ✅ Ready for Testing  
**Last Updated:** December 6, 2025
