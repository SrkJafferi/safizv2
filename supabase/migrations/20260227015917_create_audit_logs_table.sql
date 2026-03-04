/*
  # Create Audit Logs Table

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key) - Unique identifier for each audit log entry
      - `user_id` (uuid, nullable) - References auth.users, can be null for system actions
      - `action` (text, not null) - Action performed (e.g., "create", "update", "delete", "approve", "reject")
      - `entity_type` (text, not null) - Type of entity affected (e.g., "job_entry", "job", "roll")
      - `entity_id` (uuid, nullable) - ID of the affected entity
      - `metadata` (jsonb, nullable) - Additional context data (old values, new values, etc.)
      - `created_at` (timestamp with time zone) - When the action occurred

  2. Security
    - Enable RLS on `audit_logs` table
    - Add policy for admins and managers to read audit logs
    - No delete or update policies (audit logs are immutable)

  3. Indexes
    - Index on `entity_id` for quick lookup by entity
    - Index on `user_id` for quick lookup by user
    - Index on `created_at` for time-based queries
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and managers can read all audit logs
CREATE POLICY "Admins and managers can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Policy: System can insert audit logs (for triggers and application code)
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policies - audit logs are immutable