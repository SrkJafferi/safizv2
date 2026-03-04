/*
  # Add Approval Status to Job Entries

  1. Changes
    - Add `status` column to `job_entries` table with default value "Approved"
    - Allowed values: "Pending", "Approved", "Rejected"
  
  2. Notes
    - This is Phase 5B-1: Structure Only
    - No changes to roll deduction logic
    - Status will be set based on settings.approval_required when creating entries
    - Existing entries will have status = "Approved" by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_entries' AND column_name = 'status'
  ) THEN
    ALTER TABLE job_entries ADD COLUMN status text DEFAULT 'Approved';
  END IF;
END $$;

-- Add check constraint to ensure only valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'job_entries' AND constraint_name = 'job_entries_status_check'
  ) THEN
    ALTER TABLE job_entries 
    ADD CONSTRAINT job_entries_status_check 
    CHECK (status IN ('Pending', 'Approved', 'Rejected'));
  END IF;
END $$;
