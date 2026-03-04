/*
  # Fix Profile Insert Policy

  ## Problem
  The existing INSERT policy for profiles checks if the user is an admin,
  but when a new user signs up, their profile doesn't exist yet, causing
  a circular dependency and preventing profile creation.

  ## Changes
  - Drop the restrictive INSERT policy
  - Create a new policy that allows authenticated users to insert their own profile only
  - This works with the SECURITY DEFINER trigger that creates profiles on signup

  ## Security
  - Users can only insert a profile with their own user ID
  - The trigger runs with elevated privileges (SECURITY DEFINER)
  - RLS still protects against unauthorized insertions
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create new policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
