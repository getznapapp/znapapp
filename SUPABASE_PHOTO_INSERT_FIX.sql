-- Fix for photo insert returning null issue
-- This ensures that INSERT...RETURNING works properly for photos

-- First, let's check current policies on photos table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'photos';

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Allow all operations on photos" ON photos;
DROP POLICY IF EXISTS "Photos are viewable by everyone" ON photos;
DROP POLICY IF EXISTS "Photos can be inserted by anyone" ON photos;
DROP POLICY IF EXISTS "Photos can be updated by anyone" ON photos;
DROP POLICY IF EXISTS "Photos can be deleted by anyone" ON photos;

-- Create comprehensive policies that allow INSERT...RETURNING to work
CREATE POLICY "Allow all photo operations" ON photos
FOR ALL
USING (true)
WITH CHECK (true);

-- Alternative approach: Create separate policies for each operation
-- Uncomment these if the above doesn't work:

-- CREATE POLICY "Allow photo select" ON photos
-- FOR SELECT
-- USING (true);

-- CREATE POLICY "Allow photo insert" ON photos
-- FOR INSERT
-- WITH CHECK (true);

-- CREATE POLICY "Allow photo update" ON photos
-- FOR UPDATE
-- USING (true)
-- WITH CHECK (true);

-- CREATE POLICY "Allow photo delete" ON photos
-- FOR DELETE
-- USING (true);

-- Ensure RLS is enabled
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Test the fix by trying an insert with returning
-- (This is just for testing - don't run in production)
-- INSERT INTO photos (id, cameraId, fileName, publicUrl, userId, userName, uploadedAt, mimeType, fileSize)
-- VALUES ('test-id', 'test-camera', 'test.jpg', 'https://example.com/test.jpg', 'test-user', 'Test User', NOW(), 'image/jpeg', 1000)
-- RETURNING *;

-- Clean up test data (uncomment if you ran the test)
-- DELETE FROM photos WHERE id = 'test-id';

-- Verify policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'photos';