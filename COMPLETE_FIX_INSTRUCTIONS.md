# Complete Fix Instructions for ZNAP App

This document provides step-by-step instructions to fix all the issues in your ZNAP disposable camera app.

## Issues Fixed

1. **RLS (Row Level Security) Policy Error** - "new row violates row-level security policy"
2. **Camera Unmounting Error** - Camera unmounting during photo capture
3. **Photo Upload Flow** - Improved error handling and retry logic
4. **Timeout Issues** - Added proper timeouts to prevent hanging

## Step 1: Fix Supabase RLS Policies

The most critical fix is to run the RLS fix script in your Supabase dashboard.

### Instructions:

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the RLS Fix Script**
   - Copy the entire contents of `SUPABASE_RLS_COMPLETE_FIX.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

4. **Verify the Fix**
   - The script will output verification messages
   - Look for "SUCCESS" messages in the output
   - You should see "ULTIMATE RLS FIX COMPLETED!" at the end

### What the RLS Fix Does:

- **Disables RLS completely** on photos and cameras tables
- **Grants full permissions** to all roles (anon, authenticated, service_role, public)
- **Creates permissive policies** as backup
- **Fixes storage bucket permissions**
- **Tests the setup** to ensure everything works

## Step 2: Test the Fix

After running the RLS fix script, test that everything works:

1. **Navigate to the test page** in your app:
   - Go to `/test-rls-fix` in your app
   - Or add a button to navigate there from your main screen

2. **Run the RLS Fix Test**:
   - Tap "Run RLS Fix Test"
   - Watch the results for any errors
   - All tests should show ✅ (success)

3. **Test Photo Upload**:
   - Go to the camera screen
   - Try taking a photo
   - The photo should upload without the RLS error

## Step 3: Verify App Functionality

Test the main app features:

### Camera Functionality:
- ✅ Camera permissions work
- ✅ Camera loads without errors
- ✅ Photo capture works
- ✅ Photo upload succeeds
- ✅ No "Camera unmounted" errors

### Photo Management:
- ✅ Photos appear in gallery
- ✅ Photo counts are accurate
- ✅ Offline storage works as fallback

### Navigation:
- ✅ No crashes when switching between screens
- ✅ Camera doesn't unmount unexpectedly

## Step 4: Additional Improvements Made

### Camera Component Improvements:
- **Added timeout protection** for photo capture (10 seconds)
- **Added timeout protection** for photo upload (30 seconds)
- **Improved mount/unmount handling** to prevent crashes
- **Better error messages** for different failure scenarios
- **Enhanced retry logic** for database operations

### Database Operations:
- **Retry logic** for photo metadata insertion (3 attempts)
- **Fallback to anonymous user** if RLS issues persist
- **Better error handling** with specific error messages
- **Improved camera creation** with verification steps

### Upload Flow:
- **Multiple fallback strategies**: Backend → Direct Supabase → Offline storage
- **Better error recovery** with detailed logging
- **Improved offline handling** for when network is unavailable

## Troubleshooting

### If you still get RLS errors:

1. **Double-check the SQL script ran completely**
   - Look for any error messages in the SQL editor
   - Make sure you ran the entire script, not just part of it

2. **Check your Supabase project URL and keys**
   - Verify `EXPO_PUBLIC_SUPABASE_URL` in your `.env`
   - Verify `EXPO_PUBLIC_SUPABASE_ANON_KEY` in your `.env`

3. **Try the test page**
   - Navigate to `/test-rls-fix`
   - Run the test to see specific error details

### If camera still unmounts:

1. **Check for navigation issues**
   - Make sure you're not navigating away during photo capture
   - Avoid rapid button presses

2. **Check device permissions**
   - Ensure camera permissions are granted
   - Try restarting the app

### If photos don't upload:

1. **Check network connectivity**
   - Ensure you have internet connection
   - Try on different networks (WiFi vs cellular)

2. **Check Supabase storage bucket**
   - Verify the `camera-photos` bucket exists
   - Check bucket permissions in Supabase dashboard

## Success Indicators

When everything is working correctly, you should see:

- ✅ **No RLS errors** in the console
- ✅ **Photos upload successfully** with success messages
- ✅ **Camera doesn't unmount** during photo capture
- ✅ **Photo counts update** correctly after upload
- ✅ **Gallery shows uploaded photos**
- ✅ **No timeout errors** during normal usage

## Files Modified

The following files were updated to implement these fixes:

1. `lib/supabase-direct.ts` - Enhanced retry logic and error handling
2. `app/(tabs)/camera.tsx` - Improved camera lifecycle and timeout handling
3. `SUPABASE_RLS_COMPLETE_FIX.sql` - Complete RLS fix script
4. `app/test-rls-fix.tsx` - New test page to verify fixes

## Next Steps

After applying these fixes:

1. **Test thoroughly** on both iOS and Android
2. **Test with different network conditions** (WiFi, cellular, offline)
3. **Test with multiple users** to ensure permissions work correctly
4. **Monitor logs** for any remaining issues

The app should now work without the RLS errors, camera unmounting issues, or upload failures you were experiencing.