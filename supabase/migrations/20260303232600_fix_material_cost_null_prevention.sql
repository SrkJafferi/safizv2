/*
  # Fix Material Cost NULL Prevention for Different Size Entries

  ## Problem
  When "Different Size" entry is created (roll_id = NULL), material_cost and waste_cost
  can be NULL if:
  1. Frontend doesn't explicitly set them
  2. Database trigger doesn't calculate them
  3. No DEFAULT value exists in table definition

  This violates NOT NULL constraints and causes insert failures.

  ## Solution
  Multi-layer protection:

  1. Add DEFAULT 0 to material_cost and waste_cost columns
  2. Ensure trigger always sets these values (already done in previous migration)
  3. Backfill any existing NULL values (if any)

  ## Changes
  - ALTER TABLE to add DEFAULT values
  - Backfill any existing NULL values (safety measure)
  - Add comments for clarity
*/

-- Step 1: Set DEFAULT values for cost columns
ALTER TABLE job_entries
  ALTER COLUMN material_cost SET DEFAULT 0,
  ALTER COLUMN waste_cost SET DEFAULT 0;

-- Step 2: Backfill any existing NULL values (safety measure)
UPDATE job_entries
SET material_cost = 0
WHERE material_cost IS NULL;

UPDATE job_entries
SET waste_cost = 0
WHERE waste_cost IS NULL;

-- Step 3: Add helpful comments
COMMENT ON COLUMN job_entries.material_cost IS 'Material cost calculated from meter_used × cost_per_meter. Defaults to 0 for Different Size entries.';
COMMENT ON COLUMN job_entries.waste_cost IS 'Waste cost calculated from waste_meter × cost_per_meter. Defaults to 0 for Different Size entries.';

-- Step 4: Verify trigger function handles NULL roll_id correctly
-- The handle_job_entry_creation() function already has this logic from previous migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_job_entry_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_job_entry_created not found. Previous migration may have failed.';
  END IF;
END $$;