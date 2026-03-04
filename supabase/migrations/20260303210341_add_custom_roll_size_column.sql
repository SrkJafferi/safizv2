/*
  # Add Custom Roll Size Support

  ## Overview
  Adds support for "Different Size" rolls in production entries.
  Allows users to enter custom roll sizes that are not tracked in inventory.

  ## Changes
  1. Add custom_roll_size column to job_entries table
  2. Make roll_id nullable to support custom sizes
  3. Update trigger function to handle null roll_id (custom sizes)
  4. Add check constraint to ensure either roll_id OR custom_roll_size is provided

  ## Important Notes
  - Custom size entries do not deduct from inventory
  - Custom size entries still calculate costs (set to 0 if no roll)
  - Either roll_id OR custom_roll_size must be provided, not both
*/

-- Add custom_roll_size column
ALTER TABLE job_entries
ADD COLUMN IF NOT EXISTS custom_roll_size text;

-- Make roll_id nullable to support custom sizes
ALTER TABLE job_entries
ALTER COLUMN roll_id DROP NOT NULL;

-- Add check constraint: either roll_id OR custom_roll_size must be provided
ALTER TABLE job_entries
ADD CONSTRAINT check_roll_or_custom_size
CHECK (
  (roll_id IS NOT NULL AND custom_roll_size IS NULL) OR
  (roll_id IS NULL AND custom_roll_size IS NOT NULL)
);

-- Update the trigger function to handle custom sizes
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

  -- Check if this is a custom size entry (no roll_id)
  IF NEW.roll_id IS NULL THEN
    -- Custom size entry - no inventory deduction, no cost calculation
    NEW.material_cost := 0;
    NEW.waste_cost := 0;
    
    -- Update job totals with zero costs
    UPDATE jobs
    SET updated_at = now()
    WHERE id = NEW.job_id;
    
    RETURN NEW;
  END IF;

  -- Normal roll entry - existing logic
  -- Get roll's cost per meter and remaining meter
  SELECT cost_per_meter, remaining_meter
  INTO v_cost_per_meter, v_roll_remaining
  FROM rolls
  WHERE id = NEW.roll_id;

  -- Calculate costs
  NEW.material_cost := NEW.meter_used * v_cost_per_meter;
  NEW.waste_cost := NEW.waste_meter * v_cost_per_meter;

  -- Check approval settings
  SELECT approval_required INTO v_approval_required
  FROM settings
  LIMIT 1;

  -- If approval required and status is Pending, validate but don't deduct
  IF COALESCE(v_approval_required, false) = true AND NEW.status = 'Pending' THEN
    -- Just validate sufficient meter exists
    IF v_roll_remaining < v_total_used THEN
      RAISE EXCEPTION 'Insufficient remaining meter in roll. Available: %, Required: %', 
        v_roll_remaining, v_total_used;
    END IF;
  ELSE
    -- Approval not required OR status is Approved - deduct immediately
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
