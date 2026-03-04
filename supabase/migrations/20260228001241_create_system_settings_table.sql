/*
  # Create System Settings Table

  1. New Table
    - `system_settings`
      - `id` (uuid, primary key, auto-generated)
      - `key` (text, unique, not null) - Setting name/identifier
      - `value` (text, nullable) - Setting value as text
      - `created_at` (timestamp) - Record creation time
      - `updated_at` (timestamp) - Last update time

  2. Default Settings Inserted
    - `approval_enabled` = "true"
    - `entry_lock_enabled` = "false"

  3. Security
    - Enable RLS on `system_settings` table
    - Allow all authenticated users to read settings
    - Only admins can insert, update, or delete settings

  4. Important Notes
    - Key column has UNIQUE constraint to prevent duplicates
    - Updated_at automatically updates on row modification
    - All existing tables and services remain unchanged
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read settings
CREATE POLICY "Anyone can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Only admins can insert settings
CREATE POLICY "Only admins can insert system settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Only admins can update settings
CREATE POLICY "Only admins can update system settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Only admins can delete settings
CREATE POLICY "Only admins can delete system settings"
  ON system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on every update
CREATE TRIGGER set_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default settings
INSERT INTO system_settings (key, value) VALUES
  ('approval_enabled', 'true'),
  ('entry_lock_enabled', 'false')
ON CONFLICT (key) DO NOTHING;