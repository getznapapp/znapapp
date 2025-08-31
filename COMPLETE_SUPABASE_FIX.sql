-- Complete Supabase Fix for Camera App
-- This script fixes both storage policies and database RLS policies

-- =============================================
-- PART 1: Fix Storage Policies
-- =============================================

-- Drop existing restrictive storage policies
DROP POLICY IF EXISTS "Auth users can read/write own uploads r3csvd_0" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can read/write own uploads r3csvd_1" ON storage.objects;

-- Create new permissive policies for camera-photos bucket
CREATE POLICY "Allow photo uploads to camera-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'camera-photos');

CREATE POLICY "Allow photo viewing from camera-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'camera-photos');

CREATE POLICY "Allow photo updates in camera-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'camera-photos');

CREATE POLICY "Allow photo deletion from camera-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'camera-photos');

-- =============================================
-- PART 2: Fix Database RLS Policies
-- =============================================

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Allow all operations on cameras" ON public.cameras;
DROP POLICY IF EXISTS "Allow all operations on photos" ON public.photos;

-- Create permissive policies for cameras table
CREATE POLICY "Allow all operations on cameras"
ON public.cameras
FOR ALL
USING (true)
WITH CHECK (true);

-- Create permissive policies for photos table
CREATE POLICY "Allow all operations on photos"
ON public.photos
FOR ALL
USING (true)
WITH CHECK (true);

-- =============================================
-- PART 3: Verify Setup
-- =============================================

-- Check storage policies
SELECT 
  'Storage Policy' as type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%camera-photos%'

UNION ALL

-- Check database policies
SELECT 
  'Database Policy' as type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('cameras', 'photos')
ORDER BY type, tablename, cmd;