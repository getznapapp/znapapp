-- Simple Storage Policy Fix for Camera Photos
-- This will allow all authenticated and anonymous users to upload and view photos

-- First, drop existing restrictive policies
DROP POLICY IF EXISTS "Auth users can read/write own uploads r3csvd_0" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can read/write own uploads r3csvd_1" ON storage.objects;

-- Create new permissive policies for camera-photos bucket
-- Allow anyone to upload photos to camera-photos bucket
CREATE POLICY "Allow photo uploads to camera-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'camera-photos');

-- Allow anyone to view photos in camera-photos bucket
CREATE POLICY "Allow photo viewing from camera-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'camera-photos');

-- Allow anyone to update photos in camera-photos bucket (for metadata updates)
CREATE POLICY "Allow photo updates in camera-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'camera-photos');

-- Allow anyone to delete photos in camera-photos bucket (for cleanup)
CREATE POLICY "Allow photo deletion from camera-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'camera-photos');

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%camera-photos%';