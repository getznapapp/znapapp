-- SIMPLE POLICY FIX - Copy and paste this into Supabase SQL Editor
-- This will fix the existing policy conflict

-- 1. Drop the existing conflicting policy
DROP POLICY IF EXISTS "Allow all operations on photos" ON photos;
DROP POLICY IF EXISTS "Allow all operations on cameras" ON cameras;

-- 2. Create new permissive policies with different names
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

-- 3. Verify the setup
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE tablename IN ('photos', 'cameras')
ORDER BY tablename;

-- 4. Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('photos', 'cameras')
ORDER BY tablename, policyname;

SELECT 'SUCCESS: Policies have been updated!' as message;