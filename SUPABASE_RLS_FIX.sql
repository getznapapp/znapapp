-- Quick fix for RLS policies to allow anonymous photo uploads
-- Run this in your Supabase SQL editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow photo uploads" ON photos;
DROP POLICY IF EXISTS "Allow photo viewing" ON photos;
DROP POLICY IF EXISTS "Allow photo updates" ON photos;
DROP POLICY IF EXISTS "Allow photo deletion" ON photos;

-- Create permissive policies that allow all operations for both authenticated and anonymous users
CREATE POLICY "Allow photo uploads" ON photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow photo viewing" ON photos
  FOR SELECT USING (true);

CREATE POLICY "Allow photo updates" ON photos
  FOR UPDATE USING (true);

CREATE POLICY "Allow photo deletion" ON photos
  FOR DELETE USING (true);

-- Ensure proper permissions are granted
GRANT ALL ON photos TO authenticated;
GRANT ALL ON photos TO anon;

-- Verify the policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'photos';