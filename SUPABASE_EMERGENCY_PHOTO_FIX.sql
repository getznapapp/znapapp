-- EMERGENCY PHOTO UPLOAD FIX
-- Run this in Supabase SQL Editor to fix photo upload RLS issues

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE tablename IN ('photos', 'cameras');

-- 2. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('photos', 'cameras');

-- 3. Drop conflicting policies if they exist
DO $$ 
BEGIN
    -- Drop photos policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photos' AND policyname = 'Allow all operations on photos') THEN
        DROP POLICY "Allow all operations on photos" ON photos;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photos' AND policyname = 'photos_select_policy') THEN
        DROP POLICY "photos_select_policy" ON photos;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photos' AND policyname = 'photos_insert_policy') THEN
        DROP POLICY "photos_insert_policy" ON photos;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photos' AND policyname = 'photos_update_policy') THEN
        DROP POLICY "photos_update_policy" ON photos;
    END IF;
    
    -- Drop cameras policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cameras' AND policyname = 'Allow all operations on cameras') THEN
        DROP POLICY "Allow all operations on cameras" ON cameras;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cameras' AND policyname = 'cameras_select_policy') THEN
        DROP POLICY "cameras_select_policy" ON cameras;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cameras' AND policyname = 'cameras_insert_policy') THEN
        DROP POLICY "cameras_insert_policy" ON cameras;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cameras' AND policyname = 'cameras_update_policy') THEN
        DROP POLICY "cameras_update_policy" ON cameras;
    END IF;
END $$;

-- 4. Temporarily disable RLS to ensure clean state
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cameras DISABLE ROW LEVEL SECURITY;

-- 5. Grant comprehensive permissions
GRANT ALL ON photos TO anon, authenticated, service_role;
GRANT ALL ON cameras TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Re-enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- 7. Create new permissive policies
CREATE POLICY "photos_full_access" ON photos
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "cameras_full_access" ON cameras
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 8. Verify the fix
SELECT 'Photos table RLS status:' as info, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables WHERE tablename = 'photos'
UNION ALL
SELECT 'Cameras table RLS status:' as info,
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables WHERE tablename = 'cameras';

-- 9. Show active policies
SELECT 
    'Active policies:' as info,
    tablename,
    policyname,
    cmd as operations
FROM pg_policies 
WHERE tablename IN ('photos', 'cameras');

SELECT 'EMERGENCY FIX COMPLETED - Photo uploads should now work!' as result;