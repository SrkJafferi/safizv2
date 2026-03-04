/*
  # Fix NULL-Safe Cost Calculation for Job Totals

  ## Problem
  When updating jobs.total_material_cost and jobs.total_waste_cost,
  if these columns contain NULL values, adding any amount results in NULL
  (NULL + number = NULL in SQL), causing NOT NULL constraint violations.

  This happens when:
  1. Job is created with default NULL values
  2. Different Size entries are processed
  3. Any entry updates job totals

  ## Solution
  Wrap ALL job total updates with COALESCE to ensure NULL values become 0:
  - COALESCE(total_material_cost, 0) + new_cost
  - COALESCE(total_waste_cost, 0) + new_cost

  This ensures costs are NEVER NULL and always have valid numeric values.

  ## Changes
  1. Update handle_job_entry_creation() trigger function
  2. Update apply_entry_financial_impact() function
  3. Both functions now use COALESCE for NULL-safe additions
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_job_entry_created ON job_entries;

-- Update handle_job_entry_creation with NULL-safe cost updates
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
  -- Use COALESCE to ensure we never get NULL from multiplication
  NEW.material_cost := COALESCE(NEW.meter_used * v_cost_per_meter, 0);
  NEW.waste_cost := COALESCE(NEW.waste_meter * v_cost_per_meter, 0);

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

    -- Update job totals with NULL-safe addition using COALESCE
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

-- Recreate trigger
CREATE TRIGGER on_job_entry_created
  BEFORE INSERT ON job_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_entry_creation();

-- Update apply_entry_financial_impact with NULL-safe cost updates
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

  -- Calculate total usage
  v_total_used := COALESCE(v_entry_record.meter_used, 0) + COALESCE(v_entry_record.waste_meter, 0);

  -- Check if this is a Different Size entry (roll_id is NULL)
  IF v_entry_record.roll_id IS NULL THEN
    -- Different Size entry: Only update job totals, no roll deduction
    -- Use COALESCE for NULL-safe addition
    UPDATE jobs
    SET
      total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(v_entry_record.material_cost, 0),
      total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(v_entry_record.waste_cost, 0),
      updated_at = now()
    WHERE id = v_entry_record.job_id;

    RETURN;
  END IF;

  -- Normal roll entry: Get current roll remaining meter
  SELECT remaining_meter INTO v_roll_remaining
  FROM rolls
  WHERE id = v_entry_record.roll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roll not found: %', v_entry_record.roll_id;
  END IF;

  -- Validate sufficient remaining meter
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

  -- Update job totals with NULL-safe addition using COALESCE
  UPDATE jobs
  SET
    total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(v_entry_record.material_cost, 0),
    total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(v_entry_record.waste_cost, 0),
    updated_at = now()
  WHERE id = v_entry_record.job_id;

END;
$$ LANGUAGE plpgsql;