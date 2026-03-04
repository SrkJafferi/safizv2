/*
  # Shorten Job Number Format

  1. Changes
    - Update generate_job_number() function to use JOB-XXX format
    - Remove date prefix, use simple incremental numbers
    - Format: JOB-001, JOB-002, JOB-003, etc.

  2. Important Notes
    - Existing job numbers remain unchanged
    - New jobs will use simplified format
    - Sequence continues from current max job number
*/

-- Update function to generate simplified job numbers
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS text AS $$
DECLARE
  sequence_num int;
  new_job_number text;
BEGIN
  -- Get the maximum job number sequence
  SELECT COALESCE(
    MAX(
      CASE
        WHEN job_number ~ '^JOB-[0-9]+$'
        THEN CAST(SUBSTRING(job_number FROM 'JOB-([0-9]+)') AS int)
        ELSE 0
      END
    ), 0
  ) + 1 INTO sequence_num
  FROM jobs;

  -- Format as JOB-XXX with leading zeros (3 digits)
  new_job_number := 'JOB-' || lpad(sequence_num::text, 3, '0');

  RETURN new_job_number;
END;
$$ LANGUAGE plpgsql;