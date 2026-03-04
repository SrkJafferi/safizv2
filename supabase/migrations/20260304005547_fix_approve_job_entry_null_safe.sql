/*
  # Fix approve_job_entry Function - Make It NULL-Safe

  1. Changes
    - Update approve_job_entry() function to use COALESCE when updating job costs
    - Prevent NULL values from causing constraint violations
    - Add NULL protection for Different Size entries
    
  2. Security
    - Maintains SECURITY DEFINER for admin-only access
    - No changes to permission model
*/

-- Drop and recreate the function with NULL-safe updates
CREATE OR REPLACE FUNCTION public.approve_job_entry(entry_id uuid, admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  entry_record job_entries%ROWTYPE;
  roll_record rolls%ROWTYPE;
  job_record jobs%ROWTYPE;
BEGIN
  -- Get entry details
  SELECT * INTO entry_record FROM job_entries WHERE id = entry_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  
  IF entry_record.approval_status != 'pending' THEN
    RAISE EXCEPTION 'Entry is not pending approval';
  END IF;
  
  -- Check if Different Size entry (no roll to deduct from)
  IF entry_record.roll_id IS NULL THEN
    -- Different Size: Only update job totals with NULL protection
    UPDATE jobs
    SET
      total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(entry_record.material_cost, 0),
      total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(entry_record.waste_cost, 0),
      updated_at = now()
    WHERE id = entry_record.job_id;
    
    -- Update entry status
    UPDATE job_entries
    SET
      approval_status = 'approved',
      approved_by = admin_user_id,
      approved_at = now(),
      updated_at = now()
    WHERE id = entry_id;
    
    RETURN;
  END IF;
  
  -- Normal roll entry: Get roll and job details
  SELECT * INTO roll_record FROM rolls WHERE id = entry_record.roll_id;
  SELECT * INTO job_record FROM jobs WHERE id = entry_record.job_id;
  
  -- Check if roll has enough material
  IF roll_record.remaining_meter < (entry_record.meter_used + entry_record.waste_meter) THEN
    RAISE EXCEPTION 'Insufficient material in roll';
  END IF;
  
  -- Update roll remaining meter
  UPDATE rolls 
  SET 
    remaining_meter = remaining_meter - (entry_record.meter_used + entry_record.waste_meter),
    status = CASE 
      WHEN remaining_meter - (entry_record.meter_used + entry_record.waste_meter) <= 0 
      THEN 'Finished'::roll_status 
      ELSE status 
    END,
    updated_at = now()
  WHERE id = entry_record.roll_id;
  
  -- Update job costs with NULL protection
  UPDATE jobs
  SET
    total_material_cost = COALESCE(total_material_cost, 0) + COALESCE(entry_record.material_cost, 0),
    total_waste_cost = COALESCE(total_waste_cost, 0) + COALESCE(entry_record.waste_cost, 0),
    updated_at = now()
  WHERE id = entry_record.job_id;
  
  -- Update entry status
  UPDATE job_entries
  SET
    approval_status = 'approved',
    approved_by = admin_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = entry_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.approve_job_entry(uuid, uuid) IS 
'NULL-safe approval function that handles both normal roll entries and Different Size entries';
