/*
  # Create Job Entries Table

  ## Overview
  This migration creates the job_entries table for tracking production entries.
  Each entry records material usage, waste, and costs per user/role for a specific job.

  ## New Tables
  
  ### job_entries
  - `id` (uuid, primary key) - Unique identifier for each entry
  - `job_id` (uuid, foreign key) - References the job this entry belongs to
  - `roll_id` (uuid, foreign key) - References the roll used in production
  - `user_id` (uuid, foreign key) - References the user who created the entry
  - `role` (user_role enum) - The role of the user at time of entry
  - `meter_used` (decimal) - Actual meters of material used in production
  - `waste_meter` (decimal) - Meters of material wasted
  - `material_cost` (decimal) - Cost of material used (calculated)
  - `waste_cost` (decimal) - Cost of waste material (calculated)
  - `created_at` (timestamptz) - Timestamp of entry creation
  - `updated_at` (timestamptz) - Timestamp of last update

  ## Security
  
  ### Row Level Security
  - Enabled RLS on job_entries table
  - Authenticated users can view all entries
  - Only authenticated users can create entries
  - Only admins can delete entries
  - Entries cannot be updated once created (immutable audit trail)

  ## Important Notes
  
  1. Entries are immutable after creation for audit trail integrity
  2. Costs are calculated at entry creation time based on roll's cost_per_meter
  3. Foreign key constraints ensure data integrity
  4. Triggers will handle automatic calculations and roll updates
*/

-- Create job_entries table
CREATE TABLE IF NOT EXISTS job_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  roll_id uuid NOT NULL REFERENCES rolls(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role text NOT NULL,
  meter_used decimal(10,2) NOT NULL DEFAULT 0 CHECK (meter_used >= 0),
  waste_meter decimal(10,2) NOT NULL DEFAULT 0 CHECK (waste_meter >= 0),
  material_cost decimal(10,2) NOT NULL DEFAULT 0 CHECK (material_cost >= 0),
  waste_cost decimal(10,2) NOT NULL DEFAULT 0 CHECK (waste_cost >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_entries

-- All authenticated users can view entries
CREATE POLICY "Users can view all job entries"
  ON job_entries FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create entries
CREATE POLICY "Authenticated users can create entries"
  ON job_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins can delete entries
CREATE POLICY "Admins can delete entries"
  ON job_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to handle job entry creation
CREATE OR REPLACE FUNCTION handle_job_entry_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_cost_per_meter decimal(10,2);
  v_total_used decimal(10,2);
  v_roll_remaining decimal(10,2);
  v_job_locked boolean;
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

  -- Check if roll has enough remaining meter
  IF v_roll_remaining < v_total_used THEN
    RAISE EXCEPTION 'Insufficient remaining meter in roll. Available: %, Required: %', 
      v_roll_remaining, v_total_used;
  END IF;

  -- Calculate costs
  NEW.material_cost := NEW.meter_used * v_cost_per_meter;
  NEW.waste_cost := NEW.waste_meter * v_cost_per_meter;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for job entry creation
DROP TRIGGER IF EXISTS on_job_entry_created ON job_entries;
CREATE TRIGGER on_job_entry_created
  BEFORE INSERT ON job_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_entry_creation();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_job_entries_timestamp ON job_entries;
CREATE TRIGGER update_job_entries_timestamp
  BEFORE UPDATE ON job_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_job_entries_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_entries_job_id ON job_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_entries_roll_id ON job_entries(roll_id);
CREATE INDEX IF NOT EXISTS idx_job_entries_user_id ON job_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_job_entries_created_at ON job_entries(created_at DESC);
