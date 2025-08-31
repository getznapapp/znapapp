-- STORAGE BUCKET POLICY FIX
-- This fixes storage bucket policies that might be blocking uploads
-- Run this in your Supabase SQL Editor AFTER running the RLS fix

-- 1. Check current storage policies
SELECT 'Current Storage Policies:' as info;
SELECT * FROM storage.policies WHERE bucket_id = 'camera-photos';

-- 2. Drop existing storage policies that might be restrictive
DELETE FROM storage.policies WHERE bucket_id = 'camera-photos';

-- 3. Create permissive storage policies
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition, command, roles)
VALUES 
  (
    'camera-photos-select-all',
    'camera-photos',
    'Allow all users to view photos',
    'true',
    NULL,
    'SELECT',
    '{anon,authenticated,service_role}'
  ),
  (
    'camera-photos-insert-all',
    'camera-photos', 
    'Allow all users to upload photos',
    'true',
    'true',
    'INSERT',
    '{anon,authenticated,service_role}'
  ),
  (
    'camera-photos-update-all',
    'camera-photos',
    'Allow all users to update photos', 
    'true',
    'true',
    'UPDATE',
    '{anon,authenticated,service_role}'
  ),
  (
    'camera-photos-delete-all',
    'camera-photos',
    'Allow all users to delete photos',
    'true', 
    NULL,
    'DELETE',
    '{anon,authenticated,service_role}'
  );

-- 4. Verify storage policies
SELECT 'Updated Storage Policies:' as info;
SELECT bucket_id, name, command, roles FROM storage.policies WHERE bucket_id = 'camera-photos';

SELECT 'SUCCESS: Storage policies updated!' as result;