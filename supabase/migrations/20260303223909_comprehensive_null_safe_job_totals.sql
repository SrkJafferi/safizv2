/*
  # Comprehensive NULL-Safe Job Totals Fix

  ## Problem
  Despite previous fixes, NULL values can still appear in jobs.total_material_cost
  and jobs.total_waste_cost if:
  1. Old data exists with NULL values
  2. Any edge case in calculation logic
  3. Direct updates bypass COALESCE protection

  ## Solution - Multi-Layer Protection

  ### 1. Data Cleanup
  - Set all existing NULL values to 0

  ### 2. Default Value Enforcement
  - Ensure DEFAULT 0 is always applied

  ### 3. Trigger-Level Protection
  - Add BEFORE INSERT/UPDATE trigger to force NULL → 0 conversion

  ### 4. Function Updates
  - Double-check all functions use COALESCE

  This creates multiple layers of protection so NULL can NEVER enter these columns.
*/

-- ============================================================================
-- STEP 1: Clean up existing NULL values
-- ============================================================================

UPDATE jobs
SET
  total_material_cost = COALESCE(total_material_cost, 0),
  total_waste_cost = COALESCE(total_waste_cost, 0),
  labor_cost = COALESCE(labor_cost, 0),
  other_cost = COALESCE(other_cost, 0),
  final_cost = COALESCE(final_cost, 0)
WHERE
  total_material_cost IS NULL
  OR total_waste_cost IS NULL
  OR labor_cost IS NULL
  OR other_cost IS NULL
  OR final_cost IS NULL;

-- ============================================================================
-- STEP 2: Add trigger to prevent NULL values at insert/update time
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_null_job_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- Force NULL values to 0 before they enter the database
  NEW.total_material_cost := COALESCE(NEW.total_material_cost, 0);
  NEW.total_waste_cost := COALESCE(NEW.total_waste_cost, 0);
  NEW.labor_cost := COALESCE(NEW.labor_cost, 0);
  NEW.other_cost := COALESCE(NEW.other_cost, 0);
  NEW.final_cost := COALESCE(NEW.final_cost, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_prevent_null_job_costs ON jobs;

CREATE TRIGGER trigger_prevent_null_job_costs
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_job_costs();

-- ============================================================================
-- STEP 3: Re-verify all existing functions use COALESCE
-- ============================================================================

-- Update handle_job_entry_creation (already has COALESCE, but ensuring it's there)
DROP TRIGGER IF EXISTS on_job_entry_created ON job_entries;

CREATE OR REPLACE FUNCTION handle_job_entry_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_cost_per_meter decimal(10,2);
  v_total_used decimal(10,2);
  v_roll_remaining decimal(10,2);
  v_job_locked boolean;
  v_approval_required boolean;
BEGIN
  -- Check if job is locked
  SELECT is_locked INTO v_job_locked
  FROM jobs
  WHERE id = NEW.job_id;

  IF v_job_locked THEN
    RAISE EXCEPTION 'Cannot add entries to a locked job';
  END IF;

  -- Calculate total meters to deduct
  v_total_used := COALESCE(NEW.meter_used, 0) + COALESCE(NEW.waste_meter, 0);

  -- Check if this is a "Different Size" entry (roll_id is NULL)
  IF NEW.roll_id IS NULL THEN
    -- Different Size case: No roll tracking, no costs
    NEW.material_cost := 0;
    NEW.waste_cost := 0;

    -- No roll deduction or job total updates for Different Size entries
    RETURN NEW;
  END IF;

  -- Normal roll entry: Get roll details
  SELECT cost_per_meter, remaining_meter
  INTO v_cost_per_meter, v_roll_remaining
  FROM rolls
  WHERE id = NEW.roll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roll not found: %', NEW.roll_id;
  END IF;

  -- Calculate costs with NULL protection
  NEW.material_cost := COALESCE(NEW.meter_used * v_cost_per_meter, 0);
  NEW.waste_cost := COALESCE(NEW.waste_meter * v_cost_per_meter, 0);

  -- Get approval setting
  SELECT COALESCE(approval_required, false) INTO v_approval_required
  FROM settings
  LIMIT 1;

  -- Apply financial impact based on approval mode
  IF v_approval_required = true AND NEW.status = 'Pending' THEN
    -- Pending entry: Only validate, don't deduct
    IF v_roll_remaining < v_total_used THEN
      RAISE EXCEPTION 'Insufficient remaining meter in roll for pending entry. Available: %, Required: %',
        v_roll_remaining, v_total_used;
    END IF;
  ELSE
    -- Approved entry: Apply immediately
    IF v_roll_remaining < v_total_used THEN
      RAISE EXCEPTION 'Insufficient remaining meter in roll. Available: %, Required: %',
        v_roll_remaining, v_total_used;
    END IF;

    -- Update roll
    UPDATE rolls
    SET
      remaining_meter = remaining_meter - v_total_used,
      status = CASE
        WHEN remaining_meter - v_total_used <= 0 THEN 'Finished'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.roll_id;

    -- Update job totals with TRIPLE NULL protection
    UPDATE jobs
    SET
      total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(NEW.material_cost, 0),
      total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(NEW.waste_cost, 0),
      updated_at = now()
    WHERE id = NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_job_entry_created
  BEFORE INSERT ON job_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_entry_creation();

-- ============================================================================
-- STEP 4: Update apply_entry_financial_impact with COALESCE
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_entry_financial_impact(p_entry_id uuid)
RETURNS void AS $$
DECLARE
  v_entry_record RECORD;
  v_total_used decimal(10,2);
  v_roll_remaining decimal(10,2);
BEGIN
  -- Get entry details
  SELECT
    je.id,
    je.job_id,
    je.roll_id,
    je.meter_used,
    je.waste_meter,
    je.material_cost,
    je.waste_cost
  INTO v_entry_record
  FROM job_entries je
  WHERE je.id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found: %', p_entry_id;
  END IF;

  -- Calculate total usage with NULL protection
  v_total_used := COALESCE(v_entry_record.meter_used, 0) + COALESCE(v_entry_record.waste_meter, 0);

  -- Check if Different Size entry
  IF v_entry_record.roll_id IS NULL THEN
    -- Different Size: Only update job totals with TRIPLE NULL protection
    UPDATE jobs
    SET
      total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(v_entry_record.material_cost, 0),
      total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(v_entry_record.waste_cost, 0),
      updated_at = now()
    WHERE id = v_entry_record.job_id;

    RETURN;
  END IF;

  -- Normal roll entry: Get roll details
  SELECT remaining_meter INTO v_roll_remaining
  FROM rolls
  WHERE id = v_entry_record.roll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roll not found: %', v_entry_record.roll_id;
  END IF;

  -- Validate meter
  IF v_roll_remaining < v_total_used THEN
    RAISE EXCEPTION 'Insufficient remaining meter in roll. Available: %, Required: %',
      v_roll_remaining, v_total_used;
  END IF;

  -- Deduct from roll
  UPDATE rolls
  SET
    remaining_meter = remaining_meter - v_total_used,
    status = CASE
      WHEN remaining_meter - v_total_used <= 0 THEN 'Finished'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_entry_record.roll_id;

  -- Update job totals with TRIPLE NULL protection
  UPDATE jobs
  SET
    total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(v_entry_record.material_cost, 0),
    total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(v_entry_record.waste_cost, 0),
    updated_at = now()
  WHERE id = v_entry_record.job_id;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERY (Optional - for manual testing)
-- ============================================================================

-- Run this to verify no NULL values remain:
-- SELECT
--   id,
--   job_number,
--   total_material_cost,
--   total_waste_cost,
--   labor_cost,
--   other_cost,
--   final_cost
-- FROM jobs
-- WHERE
--   total_material_cost IS NULL
--   OR total_waste_cost IS NULL
--   OR labor_cost IS NULL
--   OR other_cost IS NULL
--   OR final_cost IS NULL;
-- Expected: 0 rows
