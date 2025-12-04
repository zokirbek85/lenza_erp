-- Database Cleanup for Order-Payment Separation Fix
-- Run this ONCE after deploying the fix
-- Purpose: Remove auto-generated transactions from orders

-- ============================================================================
-- STEP 1: Review Auto-Generated Transactions
-- ============================================================================

-- Count auto-generated transactions
SELECT 
    COUNT(*) as total_count,
    status,
    currency,
    SUM(amount) as total_amount
FROM finance_financetransaction
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income'
GROUP BY status, currency;

-- Show details of auto-generated transactions
SELECT 
    id,
    dealer_id,
    account_id,
    date,
    currency,
    amount,
    status,
    comment,
    created_at
FROM finance_financetransaction
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income'
ORDER BY created_at DESC
LIMIT 20;


-- ============================================================================
-- STEP 2: Backup Before Cleanup (IMPORTANT!)
-- ============================================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS finance_financetransaction_backup AS
SELECT * 
FROM finance_financetransaction
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income';

-- Verify backup
SELECT COUNT(*) as backed_up_count
FROM finance_financetransaction_backup;


-- ============================================================================
-- STEP 3: Delete Draft Transactions
-- ============================================================================

-- Delete draft auto-generated transactions (safe to delete)
DELETE FROM finance_financetransaction
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income'
  AND status = 'draft';

-- Check affected rows
SELECT ROW_COUNT() as deleted_draft_count;


-- ============================================================================
-- STEP 4: Cancel Approved Transactions (Preserve Audit Trail)
-- ============================================================================

-- Cancel approved transactions instead of deleting
-- This preserves audit trail while marking them as invalid
UPDATE finance_financetransaction
SET 
    status = 'cancelled',
    comment = CONCAT('[AUTO-GENERATED - CANCELLED] ', comment),
    updated_at = NOW()
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income'
  AND status = 'approved';

-- Check affected rows
SELECT ROW_COUNT() as cancelled_approved_count;


-- ============================================================================
-- STEP 5: Verify Cleanup
-- ============================================================================

-- Should return 0 (no active auto-generated transactions)
SELECT COUNT(*) as remaining_auto_generated
FROM finance_financetransaction
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income'
  AND status IN ('draft', 'approved');

-- Show cancelled transactions (for review)
SELECT 
    id,
    dealer_id,
    amount,
    currency,
    comment,
    status,
    updated_at
FROM finance_financetransaction
WHERE comment LIKE '[AUTO-GENERATED - CANCELLED]%'
ORDER BY updated_at DESC;


-- ============================================================================
-- STEP 6: Statistics After Cleanup
-- ============================================================================

-- Transaction counts by status
SELECT 
    status,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    currency
FROM finance_financetransaction
GROUP BY status, type, currency
ORDER BY status, type;

-- Active transactions (should only be manual entries)
SELECT 
    COUNT(*) as active_transactions,
    type,
    currency,
    SUM(amount) as total_amount
FROM finance_financetransaction
WHERE status = 'approved'
GROUP BY type, currency;


-- ============================================================================
-- STEP 7: Optional - Restore from Backup (If Needed)
-- ============================================================================

-- ONLY run if you need to restore
-- CAUTION: This will restore deleted transactions

-- Check backup exists
-- SELECT COUNT(*) FROM finance_financetransaction_backup;

-- Restore draft transactions
-- INSERT INTO finance_financetransaction
-- SELECT * FROM finance_financetransaction_backup
-- WHERE status = 'draft';

-- Restore approved transactions (remove cancelled flag)
-- UPDATE finance_financetransaction t
-- JOIN finance_financetransaction_backup b ON t.id = b.id
-- SET 
--     t.status = 'approved',
--     t.comment = b.comment,
--     t.updated_at = NOW()
-- WHERE t.comment LIKE '[AUTO-GENERATED - CANCELLED]%';


-- ============================================================================
-- STEP 8: Cleanup Backup Table (After Verification)
-- ============================================================================

-- Run this ONLY after confirming cleanup was successful
-- DROP TABLE IF EXISTS finance_financetransaction_backup;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check no auto-generated transactions remain active
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS: No active auto-generated transactions'
        ELSE CONCAT('❌ FAIL: ', COUNT(*), ' active auto-generated transactions found')
    END as test_result
FROM finance_financetransaction
WHERE comment LIKE '%Order #%'
  AND category = 'Order Income'
  AND status IN ('draft', 'approved');

-- 2. Check finance accounts balance calculation
SELECT 
    a.id,
    a.name,
    a.currency,
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM finance_financetransaction t
        WHERE t.account_id = a.id
          AND t.status = 'approved'
          AND t.type = 'income'
    ) as total_income,
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM finance_financetransaction t
        WHERE t.account_id = a.id
          AND t.status = 'approved'
          AND t.type = 'expense'
    ) as total_expense,
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM finance_financetransaction t
        WHERE t.account_id = a.id
          AND t.status = 'approved'
          AND t.type = 'income'
    ) - (
        SELECT COALESCE(SUM(amount), 0)
        FROM finance_financetransaction t
        WHERE t.account_id = a.id
          AND t.status = 'approved'
          AND t.type = 'expense'
    ) as balance
FROM finance_financeaccount a
WHERE a.is_active = TRUE
ORDER BY a.currency, a.name;

-- 3. Compare order totals vs finance transactions
SELECT 
    'Orders' as source,
    COUNT(*) as count,
    SUM(total_usd) as total_amount
FROM orders_order
WHERE status IN ('confirmed', 'packed', 'shipped', 'delivered')
  AND is_imported = FALSE

UNION ALL

SELECT 
    'Finance Transactions (Income)' as source,
    COUNT(*) as count,
    SUM(amount_usd) as total_amount
FROM finance_financetransaction
WHERE type = 'income'
  AND status = 'approved';

-- Note: These totals should NOT match after fix
-- Orders = invoices (may not be paid)
-- Transactions = actual payments received


-- ============================================================================
-- NOTES
-- ============================================================================

-- ✅ After this cleanup:
--    - Finance balance shows only real payments
--    - Order amounts don't affect finance
--    - Clear separation between invoices and payments
--
-- ❌ Do NOT run this script multiple times
--    - It's designed for one-time cleanup
--    - Subsequent runs may affect manual transactions
--
-- 📝 Always backup before running cleanup
--    - Keep backup table for at least 30 days
--    - Verify application works correctly
--    - Then drop backup table
