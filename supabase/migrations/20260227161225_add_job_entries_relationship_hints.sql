/*
  # Add Relationship Hints for Job Entries

  1. Purpose
    - Ensure Supabase schema cache properly recognizes relationships
    - Add explicit comments for better schema introspection
    
  2. Changes
    - Add table and column comments
    - Verify all foreign key constraints are properly named
*/

-- Add table comment
COMMENT ON TABLE job_entries IS 'Production entries tracking material usage for jobs';

-- Add column comments for foreign keys
COMMENT ON COLUMN job_entries.user_id IS 'References profiles.id - User who created the entry';
COMMENT ON COLUMN job_entries.job_id IS 'References jobs.id - Associated job';
COMMENT ON COLUMN job_entries.roll_id IS 'References rolls.id - Roll used for production';

-- Verify constraint exists (should already be there from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_entries_user_id_fkey' 
    AND table_name = 'job_entries'
  ) THEN
    ALTER TABLE job_entries
    ADD CONSTRAINT job_entries_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;