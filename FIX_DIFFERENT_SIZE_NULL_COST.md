# Fix - Different Size NULL Cost Error

## Problem Summary

Jab user "Different Size" option select karke production entry create karta tha, to ye error aata tha:

```
null value in column "total_material_cost" of relation "jobs" violates not-null constraint
```

## Root Cause

**Database Trigger Issue:**

`handle_job_entry_creation()` trigger function me ye logic tha:

```sql
-- Line 134-138: Roll details fetch karta tha
SELECT cost_per_meter, remaining_meter
INTO v_cost_per_meter, v_roll_remaining
FROM rolls
WHERE id = NEW.roll_id;

-- Line 144-145: Cost calculation
NEW.material_cost := NEW.meter_used * v_cost_per_meter;  -- NULL * number = NULL
NEW.waste_cost := NEW.waste_meter * v_cost_per_meter;    -- NULL * number = NULL
```

**Problem:**
- Jab `roll_id = NULL` (Different Size case), to query koi result nahi deti
- `v_cost_per_meter` NULL ho jata hai
- `NULL * number = NULL` in SQL
- NULL values job table me insert hone ki koshish karti hain
- `total_material_cost` column NOT NULL constraint hai
- Error throw hota hai

## Solution Implemented

### 1. Migration: `fix_null_cost_different_size.sql`

**Modified `handle_job_entry_creation()` trigger function:**

```sql
-- Early check for Different Size entries
IF NEW.roll_id IS NULL THEN
  -- Different Size case: No roll tracking, no costs
  NEW.material_cost := 0;
  NEW.waste_cost := 0;

  -- No roll deduction or job total updates
  -- These entries are for recording purposes only
  RETURN NEW;
END IF;

-- Normal roll entry continues below...
```

**Logic Flow:**

```
Entry Creation
    ↓
Check job is_locked
    ↓
Calculate v_total_used
    ↓
Is roll_id NULL? (Different Size)
    ├─ YES → Set material_cost = 0
    │        Set waste_cost = 0
    │        RETURN NEW (no roll operations)
    │
    └─ NO  → Continue with normal roll logic:
             - Fetch roll details
             - Calculate costs
             - Check approval_required
             - Deduct roll (if approved)
             - Update job totals (if approved)
```

### 2. Migration: `fix_apply_financial_impact_different_size.sql`

**Modified `apply_entry_financial_impact()` function:**

```sql
-- Check if Different Size entry
IF v_entry_record.roll_id IS NULL THEN
  -- Different Size entry: Only update job totals
  UPDATE jobs
  SET
    total_material_cost = total_material_cost + v_entry_record.material_cost,
    total_waste_cost = total_waste_cost + v_entry_record.waste_cost,
    updated_at = now()
  WHERE id = v_entry_record.job_id;

  RETURN;
END IF;

-- Normal roll entry continues with deduction...
```

**Why This Function?**
- Used during approval workflow (Phase 5B-2A)
- Admin approves pending entries
- This function applies financial impact
- Also needed NULL check for Different Size entries

## Changes Summary

### Files Modified
1. **Database Migration 1:** `fix_null_cost_different_size.sql`
   - Updated `handle_job_entry_creation()` trigger
   - Added NULL check for `roll_id`
   - Default costs to 0 for Different Size

2. **Database Migration 2:** `fix_apply_financial_impact_different_size.sql`
   - Updated `apply_entry_financial_impact()` function
   - Added NULL check for `roll_id`
   - Skip roll deduction for Different Size

### No Frontend Changes
- No changes needed in `CreateEntry.tsx`
- Form already sends `roll_id = null` correctly
- Backend now handles NULL properly

## Behavior After Fix

### Scenario 1: Normal Roll Entry
1. User selects existing roll from dropdown
2. `roll_id` set to actual roll UUID
3. Trigger calculates cost using `roll.cost_per_meter`
4. Roll meter deducted
5. Job totals updated
6. Entry created successfully

### Scenario 2: Different Size Entry
1. User selects "Different Size" option
2. Enters custom roll size (e.g., "24x36 inches")
3. `roll_id` set to NULL
4. Trigger detects NULL and sets costs to 0
5. No roll meter deduction (no roll to deduct from)
6. Job totals updated with 0 costs
7. Entry created successfully with `custom_roll_size` recorded

## Database Impact

### Cost Values for Different Size Entries

**job_entries table:**
```
roll_id: NULL
custom_roll_size: "24x36 inches" (example)
meter_used: 10.5
waste_meter: 0.5
material_cost: 0.00
waste_cost: 0.00
```

**jobs table totals:**
- Different Size entries add 0 to `total_material_cost`
- Different Size entries add 0 to `total_waste_cost`
- Only tracked roll entries contribute to job costs

**rolls table:**
- Not affected by Different Size entries
- `remaining_meter` unchanged
- No status updates

## Testing Scenarios

### Test 1: Create Different Size Entry
```
1. Login as any user
2. Go to Create Entry page
3. Select job
4. Select "Different Size" from roll dropdown
5. Enter custom size: "24x36"
6. Enter meter used: 10
7. Enter waste meter: 0.5
8. Submit
Expected: Entry created successfully
Expected: No NULL error
Expected: material_cost = 0, waste_cost = 0
```

### Test 2: Create Normal Roll Entry
```
1. Login as any user
2. Go to Create Entry page
3. Select job
4. Select existing roll
5. Enter meter used: 5
6. Enter waste meter: 0.2
7. Submit
Expected: Entry created successfully
Expected: Costs calculated correctly
Expected: Roll meter deducted
```

### Test 3: Approve Different Size Entry (if approval enabled)
```
1. Enable approval_required in settings
2. Create Different Size entry (becomes Pending)
3. Login as admin
4. Go to Entry List
5. Approve the Different Size entry
Expected: Status changes to Approved
Expected: Job totals updated with 0 costs
Expected: No roll deduction
Expected: No errors
```

## SQL Verification Queries

**Check Different Size entries:**
```sql
SELECT
  je.id,
  je.roll_id,
  je.custom_roll_size,
  je.meter_used,
  je.waste_meter,
  je.material_cost,
  je.waste_cost,
  je.status
FROM job_entries je
WHERE je.roll_id IS NULL
ORDER BY je.created_at DESC;
```

**Expected Result:**
```
roll_id: NULL
custom_roll_size: (some text like "24x36")
material_cost: 0.00
waste_cost: 0.00
```

## Important Notes

1. **Different Size = No Cost Tracking**
   - These entries are for record-keeping only
   - No financial impact on job totals
   - No inventory deduction

2. **Cost Always 0 for Different Size**
   - Cannot be changed
   - By design (no roll to calculate cost from)
   - Admin/Manager aware of this behavior

3. **Backward Compatible**
   - Existing entries unaffected
   - Only affects new Different Size entries
   - Normal roll entries work exactly as before

4. **Future Enhancement Possibility**
   - Could add manual cost input for Different Size entries
   - Would require UI changes and validation
   - Currently out of scope

## Completion Status

**FIX COMPLETE**

All requirements met:
- NULL cost error fixed
- Different Size entries create successfully
- material_cost defaults to 0 for Different Size
- waste_cost defaults to 0 for Different Size
- No NULL values in database
- Build passes successfully
- Both trigger and approval function updated
- Backward compatible

## Migration Applied

1. `fix_null_cost_different_size.sql` - Applied
2. `fix_apply_financial_impact_different_size.sql` - Applied

Build Status: **SUCCESS**
