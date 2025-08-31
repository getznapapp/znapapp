# Database Schema Fix Instructions

## Problem
The error you're seeing is due to a type mismatch in the foreign key constraint between the `cameras` and `photos` tables. The `cameras.id` column and `photos.cameraId` column need to have the same data type for the foreign key to work.

## Solution

### Step 1: Run the SQL Script
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `SUPABASE_SIMPLE_FIX.sql`
4. Run the script

This will:
- Drop the existing tables (if any)
- Create new tables with proper UUID types
- Set up the foreign key constraint correctly
- Enable Row Level Security with permissive policies
- Grant necessary permissions

### Step 2: Test the Fix
1. Navigate to `/test-database-fix` in your app
2. Run the tests in order:
   - Test Database Connection
   - Test Camera Creation
   - Test Photo Upload

### Step 3: Verify Everything Works
If all tests pass, your database schema is now correctly set up and the foreign key constraint error should be resolved.

## What Changed
- Both `cameras.id` and `photos.cameraId` now use UUID type
- Proper foreign key constraint is established
- All necessary permissions and policies are in place

## Next Steps
After running the fix, all new cameras and photos will use the proper UUID format and should work correctly with the database.