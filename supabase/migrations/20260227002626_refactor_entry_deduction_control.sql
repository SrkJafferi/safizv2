/*
  # Phase 5B-2A - Refactor Entry Deduction Control
  
  ## Overview
  This migration refactors the production entry creation logic to support 
  approval-based deduction control. It creates a reusable function for applying
  financial impact and modifies the entry creation trigger to respect the 
  approval_required setting.

  ## Changes
  
  ### 1. New Function: apply_entry_financial_impact(entry_id)
  - Reusable function that applies financial impact of an entry
  - Deducts roll.remaining_meter
  - Updates job totals (material_cost, waste_cost)
  - Validates remaining_meter is not negative
  - Can be called independently for approval workflows
  
  ### 2. Modified Trigger: handle_job_entry_creation()
  - Checks settings.approval_required before applying financial impact
  - If approval_required = true AND status = 'Pending':
    → Only calculates costs (material_cost, waste_cost)
    → Does NOT deduct roll or update job totals
  - If approval_required = false OR status = 'Approved':
    → Applies full financial impact immediately
  
  ## Behavior
  
  ### When approval_required = false (default):
  - Entry created with status = 'Approved'
  - Roll deduction happens immediately
  - Job totals updated immediately
  - Same as current behavior
  
  ### When approval_required = true:
  - Entry created with status = 'Pending'
  - Costs calculated but NOT applied
  - Roll NOT deducted
  - Job totals NOT updated
  - Awaits manual approval to apply impact
  
  ## Important Notes
  
  1. This is Phase 5B-2A - preparation only
  2. No approval buttons yet (comes in Phase 5B-2B)
  3. Function apply_entry_financial_impact is ready for future use
  4. Existing entries unaffected
  5. Backward compatible with approval_required = false
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_job_entry_created ON job_entries;

-- Create reusable function to apply financial impact
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

  -- Get current roll remaining meter
  SELECT remaining_meter INTO v_roll_remaining
  FROM rolls
  WHERE id = v_entry_record.roll_id;

  -- Calculate total usage
  v_total_used := v_entry_record.meter_used + v_entry_record.waste_meter;

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

  -- Update job totals
  UPDATE jobs
  SET
    total_material_cost = total_material_cost + v_entry_record.material_cost,
    total_waste_cost = total_waste_cost + v_entry_record.waste_cost,
    updated_at = now()
  WHERE id = v_entry_record.job_id;

END;
$$ LANGUAGE plpgsql;

-- Modified trigger function for job entry creation
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

  -- Get roll's cost per meter and remaining meter
  SELECT cost_per_meter, remaining_meter
  INTO v_cost_per_meter, v_roll_remaining
  FROM rolls
  WHERE id = NEW.roll_id;

  -- Calculate total meters to deduct
  v_total_used := NEW.meter_used + NEW.waste_meter;

  -- Always calculate costs (needed for display even if pending)
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