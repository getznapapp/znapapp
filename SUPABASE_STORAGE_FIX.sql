-- STORAGE BUCKET FIX - Run this in Supabase SQL Editor if storage upload fails
-- This will ensure the storage bucket has proper permissions

-- 1. Create the bucket if it doesn't exist (this will fail silently if it exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('camera-photos', 'camera-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing storage policies
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;

-- 3. Create permissive storage policies
CREATE POLICY "Allow all operations on camera-photos"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'camera-photos')
WITH CHECK (bucket_id = 'camera-photos');

-- 4. Verify bucket exists and is public
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id = 'camera-photos';

-- 5. Show storage policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

SELECT 'SUCCESS: Storage bucket configured!' as message;