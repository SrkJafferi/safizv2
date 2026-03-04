/*
  # Fix NULL Cost Error for Different Size Entries

  ## Problem
  When creating a production entry with "Different Size" (roll_id = NULL),
  the trigger function tries to calculate material_cost and waste_cost
  using NULL cost_per_meter, resulting in NULL values that violate
  the NOT NULL constraint on jobs.total_material_cost.

  ## Solution
  1. Check if roll_id is NULL before querying roll details
  2. If roll_id is NULL (Different Size case):
     - Set material_cost = 0
     - Set waste_cost = 0
     - Skip all roll-related operations
  3. If roll_id exists:
     - Continue with normal cost calculation and deduction

  ## Changes
  - Modified handle_job_entry_creation() trigger function
  - Added NULL check for roll_id
  - Default costs to 0 for Different Size entries
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_job_entry_created ON job_entries;

-- Modified trigger function with NULL roll_id handling
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
  v_total_used := NEW.meter_used + NEW.waste_meter;

  -- Check if this is a "Different Size" entry (roll_id is NULL)
  IF NEW.roll_id IS NULL THEN
    -- Different Size case: No roll tracking, no costs
    NEW.material_cost := 0;
    NEW.waste_cost := 0;

    -- No roll deduction or job total updates for Different Size entries
    -- These are recorded for tracking purposes only
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

  -- Calculate costs based on roll's cost per meter
  NEW.material_cost := NEW.meter_used * v_cost_per_meter;
  NEW.waste_cost := NEW.waste_meter * v_cost_per_meter;

  -- Get approval setting
  SELECT COALESCE(approval_required, false) INTO v_approval_required
  FROM settings
  LIMIT 1;

  -- Determine if we should apply financial impact immediately
  IF v_approval_required = true AND NEW.status = 'Pending' THEN
    -- Approval required and entry is pending
    -- Do NOT deduct roll or update job totals
    -- Just validate that roll has enough meter for future approval
    IF v_roll_remaining < v_total_used THEN
      RAISE EXCEPTION 'Insufficient remaining meter in roll for pending entry. Available: %, Required: %',
        v_roll_remaining, v_total_used;
    END IF;
    -- Costs calculated above, but no deduction happens
  ELSE
    -- Either approval not required, or status is already 'Approved'
    -- Apply financial impact immediately

    -- Check if roll has enough remaining meter
    IF v_roll_remaining < v_total_used THEN
      RAISE EXCEPTION 'Insufficient remaining meter in roll. Available: %, Required: %',
        v_roll_remaining, v_total_used;
    END IF;

    -- Update roll remaining meter
    UPDATE rolls
    SET
      remaining_meter = remaining_meter - v_total_used,
      status = CASE
        WHEN remaining_meter - v_total_used <= 0 THEN 'Finished'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.roll_id;

    -- Update job totals
    UPDATE jobs
    SET
      total_material_cost = total_material_cost + NEW.material_cost,
      total_waste_cost = total_waste_cost + NEW.waste_cost,
      updated_at = now()
    WHERE id = NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_job_entry_created
  BEFORE INSERT ON job_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_entry_creation();