/*
  # Fix apply_entry_financial_impact for Different Size Entries

  ## Problem
  The apply_entry_financial_impact function (used during approval workflow)
  tries to access rolls table even when roll_id is NULL (Different Size case),
  causing errors during approval of Different Size entries.

  ## Solution
  1. Check if roll_id is NULL before processing
  2. If NULL (Different Size):
     - Skip roll deduction
     - Only update job totals with stored costs
  3. If roll_id exists:
     - Continue with normal roll deduction and job updates

  ## Changes
  - Modified apply_entry_financial_impact() function
  - Added NULL check for roll_id
  - Separate logic paths for Different Size vs Normal entries
*/

-- Update the apply_entry_financial_impact function
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
  v_total_used := v_entry_record.meter_used + v_entry_record.waste_meter;

  -- Check if this is a Different Size entry (roll_id is NULL)
  IF v_entry_record.roll_id IS NULL THEN
    -- Different Size entry: Only update job totals, no roll deduction
    UPDATE jobs
    SET
      total_material_cost = total_material_cost + v_entry_record.material_cost,
      total_waste_cost = total_waste_cost + v_entry_record.waste_cost,
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

  -- Update job totals
  UPDATE jobs
  SET
    total_material_cost = total_material_cost + v_entry_record.material_cost,
    total_waste_cost = total_waste_cost + v_entry_record.waste_cost,
    updated_at = now()
  WHERE id = v_entry_record.job_id;

END;
$$ LANGUAGE plpgsql;