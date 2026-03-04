/*
  # Create Jobs Table

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `job_number` (text, unique, auto-generated)
      - `client_name` (text, required)
      - `description` (text, optional)
      - `selected_roll_id` (uuid, foreign key to rolls)
      - `status` (enum: Open, In Progress, Closed)
      - `total_material_cost` (numeric, default 0)
      - `total_waste_cost` (numeric, default 0)
      - `labor_cost` (numeric, default 0)
      - `other_cost` (numeric, default 0)
      - `final_cost` (numeric, default 0)
      - `is_locked` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `jobs` table
    - Authenticated users can read all jobs
    - Only admins can create jobs
    - Only admins can update jobs
    - Only admins can delete jobs

  3. Important Notes
    - Job number is auto-generated using format: JOB-YYYYMMDD-XXXX
    - Selected roll must be active
    - Final cost is sum of all cost components
    - Locked jobs cannot be modified
*/

-- Create job status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('Open', 'In Progress', 'Closed');
  END IF;
END $$;

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  description text,
  selected_roll_id uuid REFERENCES rolls(id) ON DELETE SET NULL,
  status job_status DEFAULT 'Open' NOT NULL,
  total_material_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  total_waste_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  labor_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  other_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  final_cost numeric(10, 2) DEFAULT 0 NOT NULL,
  is_locked boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create function to auto-generate job number
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS text AS $$
DECLARE
  date_prefix text;
  sequence_num int;
  new_job_number text;
BEGIN
  date_prefix := 'JOB-' || to_char(now(), 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM jobs
  WHERE job_number LIKE date_prefix || '%';
  
  new_job_number := date_prefix || '-' || lpad(sequence_num::text, 4, '0');
  
  RETURN new_job_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate job number on insert
CREATE OR REPLACE FUNCTION set_job_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := generate_job_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_job_number'
  ) THEN
    CREATE TRIGGER trigger_set_job_number
    BEFORE INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION set_job_number();
  END IF;
END $$;

-- Create trigger to update final_cost automatically
CREATE OR REPLACE FUNCTION calculate_final_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.final_cost := 
    COALESCE(NEW.total_material_cost, 0) + 
    COALESCE(NEW.total_waste_cost, 0) + 
    COALESCE(NEW.labor_cost, 0) + 
    COALESCE(NEW.other_cost, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_calculate_final_cost'
  ) THEN
    CREATE TRIGGER trigger_calculate_final_cost
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_final_cost();
  END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_jobs_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update unlocked jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND is_locked = false
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND is_locked = false
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);