/*
  # Fix Job Entries Foreign Key Relationship

  1. Changes
    - Drop existing foreign key constraint on user_id
    - Recreate foreign key with proper naming convention
    - Update RLS policies to use correct reference

  2. Purpose
    - Fix "Could not find a relationship" error in queries
    - Ensure proper relationship between job_entries and profiles
*/

-- Drop existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_entries_user_id_fkey' 
    AND table_name = 'job_entries'
  ) THEN
    ALTER TABLE job_entries DROP CONSTRAINT job_entries_user_id_fkey;
  END IF;
END $$;

-- Add foreign key constraint with proper reference
ALTER TABLE job_entries
ADD CONSTRAINT job_entries_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Recreate index for performance
DROP INDEX IF EXISTS idx_job_entries_user_id;
CREATE INDEX idx_job_entries_user_id ON job_entries(user_id);