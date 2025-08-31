# Supabase Storage Setup Instructions

## Manual Bucket Creation

Since bucket creation requires admin privileges, you need to create the storage bucket manually in your Supabase dashboard:

### Steps:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click on "Buckets"

3. **Create the Bucket**
   - Click "New bucket"
   - Name: `camera-photos`
   - Make it **Public** (check the "Public bucket" option)
   - Click "Create bucket"

4. **Configure Bucket Settings**
   - Click on the `camera-photos` bucket
   - Go to "Configuration" tab
   - Set allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Set file size limit: `10485760` (10MB)

5. **Set Up RLS Policies (Optional)**
   If you want more control over access, you can set up Row Level Security policies:
   
   ```sql
   -- Allow public uploads
   CREATE POLICY "Allow public uploads" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'camera-photos');
   
   -- Allow public reads
   CREATE POLICY "Allow public reads" ON storage.objects
   FOR SELECT USING (bucket_id = 'camera-photos');
   ```

## Verification

Once the bucket is created, the app will automatically detect it and start working with cloud storage.

You can test the setup using the "Cloud Storage Test" component in the app.