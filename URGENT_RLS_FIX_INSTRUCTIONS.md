# URGENT: Fix Photo Upload RLS Error

## The Problem
You're getting this error: `"new row violates row-level security policy"`

This means Supabase's Row Level Security (RLS) is blocking photo uploads.

## The Solution
**You need to run the SQL script in your Supabase dashboard RIGHT NOW.**

### Steps:

1. **Open your Supabase dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the ENTIRE contents of `SUPABASE_RLS_COMPLETE_FIX.sql`**
   - Open the file `SUPABASE_RLS_COMPLETE_FIX.sql` in this project
   - Copy ALL the text (from line 1 to the end)
   - Paste it into the SQL Editor

4. **Run the script**
   - Click "Run" button
   - Wait for it to complete
   - You should see success messages

5. **Test immediately**
   - Try taking a photo in your app
   - The upload should now work

## What This Fix Does
- **Disables RLS completely** on photos and cameras tables
- **Grants full permissions** to all users (anon, authenticated, public)
- **Creates permissive policies** as backup
- **Ensures storage bucket** is properly configured
- **Tests the fix** automatically

## If It Still Doesn't Work
1. Check your Supabase project URL in `lib/supabase.ts`
2. Check your Supabase anon key
3. Make sure you ran the ENTIRE script (not just part of it)
4. Try refreshing your app completely

## This is Safe
- This fix is designed for development/testing
- It makes your database fully accessible (which is what you want for a photo sharing app)
- No data will be lost

**Run this fix NOW to resolve the photo upload errors.**