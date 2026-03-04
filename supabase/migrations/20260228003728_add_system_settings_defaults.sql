/*
  # Add System Settings Defaults

  1. New Default Settings
    - company_name = "My Company"
    - timezone = "UTC"
    - currency = "USD"
    - approval_roles = "admin,manager"

  2. Notes
    - Uses ON CONFLICT DO NOTHING to prevent duplicates
    - No table structure changes
    - Safe to run multiple times
*/

-- Insert new system settings defaults
INSERT INTO system_settings (key, value)
VALUES
  ('company_name', 'My Company'),
  ('timezone', 'UTC'),
  ('currency', 'USD'),
  ('approval_roles', 'admin,manager')
ON CONFLICT (key) DO NOTHING;
