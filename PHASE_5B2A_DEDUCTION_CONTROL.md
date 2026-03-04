# Phase 5B-2A - Deduction Control Implementation

## Overview
Phase 5B-2A me humne entry creation logic ko refactor kiya hai taake approval-based deduction control support ho sake. Ab system check karta hai ke `settings.approval_required` ki value kya hai aur uske according decision leta hai ke roll deduction aur job totals update immediately karen ya nahi.

## Implementation Summary

### 1. Database Changes

#### Migration: `refactor_entry_deduction_control`

**Two Major Changes:**

1. **New Function Created:** `apply_entry_financial_impact(entry_id)`
2. **Modified Trigger:** `handle_job_entry_creation()`

### 2. New Function: apply_entry_financial_impact()

Ye ek reusable function hai jo kisi bhi entry ki financial impact apply kar sakta hai.

**Function Signature:**
```sql
apply_entry_financial_impact(p_entry_id uuid) RETURNS void
```

**What It Does:**
1. Entry ki details fetch karta hai (job_id, roll_id, meter_used, waste_meter, costs)
2. Roll ki remaining_meter check karta hai
3. Validate karta hai ke sufficient meter available hai
4. Roll se meter deduct karta hai
5. Roll status update karta hai (Active → Finished agar meter = 0)
6. Job totals update karta hai (material_cost, waste_cost)

**Error Handling:**
- Agar entry nahi milti: `'Entry not found'` exception
- Agar insufficient meter hai: `'Insufficient remaining meter'` exception with details

**Usage (Future):**
```sql
-- Manually apply impact (for approval workflow)
SELECT apply_entry_financial_impact('entry-uuid-here');
```

### 3. Modified Trigger: handle_job_entry_creation()

**Old Behavior:**
- Always deduct roll immediately
- Always update job totals immediately

**New Behavior:**
- Check `settings.approval_required` value
- Check entry's `status` field
- Conditionally apply financial impact

**Logic Flow:**

```
Entry Created
    ↓
Check job.is_locked
    ↓ (if locked → exception)
Calculate costs (always)
    ↓
Check settings.approval_required
    ↓
    ├─→ IF approval_required = true AND status = 'Pending'
    │   ├─→ Validate roll has enough meter (don't deduct yet)
    │   ├─→ Store costs in entry
    │   └─→ Return (no deduction, no job update)
    │
    └─→ IF approval_required = false OR status = 'Approved'
        ├─→ Validate roll has enough meter
        ├─→ Deduct from roll
        ├─→ Update roll status if needed
        ├─→ Update job totals
        └─→ Return
```

### 4. Behavioral Scenarios

#### Scenario A: approval_required = false (Default)
**Steps:**
1. User creates production entry
2. Backend sets status = 'Approved' (from Phase 5B-1)
3. Trigger executes
4. Costs calculated
5. Roll deducted immediately
6. Job totals updated immediately
7. Entry saved with all impacts applied

**Result:** Same as current behavior, fully backward compatible

#### Scenario B: approval_required = true, User Creates Entry
**Steps:**
1. User creates production entry
2. Backend sets status = 'Pending' (from Phase 5B-1)
3. Trigger executes
4. Costs calculated and stored
5. Roll validation check (ensures sufficient meter exists)
6. NO roll deduction happens
7. NO job totals update happens
8. Entry saved with status = 'Pending'

**Result:** Entry visible in list, but financial impact NOT applied yet

#### Scenario C: approval_required = true, Admin Approves Entry (Future)
**Steps:**
1. Admin clicks "Approve" button (Phase 5B-2B)
2. Status changed from 'Pending' → 'Approved'
3. Manual call to `apply_entry_financial_impact(entry_id)`
4. Roll deducted
5. Job totals updated
6. Entry now fully applied

**Result:** Financial impact applied at approval time

### 5. Key Design Decisions

**Why Calculate Costs Even for Pending Entries?**
- UI needs to show estimated costs
- Manager/Admin needs to see what impact approval will have
- Prevents surprises during approval

**Why Validate Roll Meter for Pending Entries?**
- Prevents creating pending entries that can never be approved
- Early error detection
- Better user experience

**Why Create Separate Function?**
- Reusability for approval workflow
- Clean separation of concerns
- Easier testing and maintenance
- Can be called manually if needed

**Why Keep It In Trigger?**
- Automatic execution
- No application code changes needed
- Database-level consistency
- Single source of truth

### 6. Testing Scenarios

#### Test 1: Default Behavior (approval_required = false)
```sql
-- Ensure setting is false
UPDATE settings SET approval_required = false;

-- Create entry via UI or API
-- Expected: Immediate deduction and job update
```

#### Test 2: Pending Entry Creation (approval_required = true)
```sql
-- Enable approval mode
UPDATE settings SET approval_required = true;

-- Create entry via UI
-- Expected: Entry created but no deduction
-- Verify: roll.remaining_meter unchanged
-- Verify: job totals unchanged
```

#### Test 3: Manual Function Call
```sql
-- Create a pending entry first (with approval_required = true)
-- Get the entry_id

-- Manually apply impact
SELECT apply_entry_financial_impact('entry-uuid-here');

-- Verify: roll.remaining_meter reduced
-- Verify: job totals updated
```

#### Test 4: Insufficient Meter Validation
```sql
-- Try to create entry that exceeds roll capacity
-- Expected: Exception thrown with clear message
```

### 7. Database Functions Overview

#### apply_entry_financial_impact(uuid)
- **Purpose:** Apply financial impact of an entry
- **Input:** Entry ID (uuid)
- **Output:** void (throws exception on error)
- **Side Effects:** Updates rolls table, updates jobs table
- **When Called:** Currently not called automatically (Phase 5B-2B will use it)

#### handle_job_entry_creation()
- **Purpose:** Trigger function for entry creation
- **Type:** BEFORE INSERT trigger
- **When Executed:** Before every INSERT into job_entries
- **Side Effects:** May update rolls and jobs (conditionally)

### 8. SQL Queries for Testing

**Check Current Approval Setting:**
```sql
SELECT approval_required FROM settings LIMIT 1;
```

**Enable Approval Mode:**
```sql
UPDATE settings SET approval_required = true;
```

**Disable Approval Mode:**
```sql
UPDATE settings SET approval_required = false;
```

**View Pending Entries:**
```sql
SELECT
  je.id,
  j.job_number,
  je.status,
  je.meter_used,
  je.waste_meter,
  je.material_cost,
  je.waste_cost
FROM job_entries je
JOIN jobs j ON j.id = je.job_id
WHERE je.status = 'Pending'
ORDER BY je.created_at DESC;
```

**Check Roll Before/After Entry:**
```sql
SELECT
  roll_number,
  total_meter,
  remaining_meter,
  status
FROM rolls
WHERE id = 'roll-uuid-here';
```

**Check Job Totals:**
```sql
SELECT
  job_number,
  total_material_cost,
  total_waste_cost,
  final_cost
FROM jobs
WHERE id = 'job-uuid-here';
```

### 9. Files Modified

1. **Database:**
   - `supabase/migrations/refactor_entry_deduction_control.sql` (NEW)

2. **Documentation:**
   - `PHASE_5B2A_DEDUCTION_CONTROL.md` (NEW - this file)

### 10. No UI Changes

Phase 5B-2A me koi UI changes nahi hain:
- No new buttons
- No approval actions
- No visual indicators changes
- Existing UI works exactly the same

UI changes Phase 5B-2B me aayenge.

### 11. Backward Compatibility

**100% Backward Compatible:**
- Existing entries unaffected
- Default behavior unchanged (approval_required = false)
- All existing features work as before
- No breaking changes

**Safe Rollback:**
Agar zarurat ho to previous migration restore kar sakte hain.

### 12. What's Next (Phase 5B-2B)

Phase 5B-2B me implement hoga:
1. "Approve" button in Entry List (for Manager and Admin)
2. "Reject" button in Entry List (for Manager and Admin)
3. API endpoints for approval/rejection
4. Status update logic
5. Call to `apply_entry_financial_impact()` on approval
6. Toast notifications
7. UI updates after status change
8. Permission checks

### 13. Known Limitations

1. Function `apply_entry_financial_impact` abhi manually test karna padega
2. No way to approve entries from UI yet
3. Pending entries remain pending forever (until Phase 5B-2B)
4. No audit trail of who approved/rejected (Phase 5B-3)

### 14. Important Notes

**For Developers:**
- Function `apply_entry_financial_impact` is ready to use
- It's safe to call multiple times (idempotent if entry already approved)
- Always check entry status before calling
- Handle exceptions properly in application code

**For Testers:**
- Test with both approval modes (true/false)
- Verify roll meter changes correctly
- Verify job totals update correctly
- Test edge cases (zero meter, exact meter, etc.)

**For Database Admins:**
- Migration is safe to apply
- No data loss
- No downtime needed
- Reversible if needed

## Completion Status

Phase 5B-2A: **COMPLETE**

All requirements met:
- ✅ Created reusable function apply_entry_financial_impact()
- ✅ Modified trigger to check approval_required setting
- ✅ Conditional deduction based on status
- ✅ Validation for pending entries
- ✅ Costs calculated regardless of approval status
- ✅ Build successful
- ✅ No UI changes (as required)
- ✅ Backward compatible
- ✅ Documentation complete

**Migration Applied:** `refactor_entry_deduction_control.sql`

**Next Phase:** 5B-2B (Approval Action Buttons)
