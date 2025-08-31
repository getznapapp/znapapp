import { supabase } from './supabase';

// Helper to check if we're in development
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

export async function setupSupabaseBucket() {
  try {
    // Check if bucket exists by trying to list files
    const { data, error } = await supabase.storage
      .from('camera-photos')
      .list('', { limit: 1 });
    
    if (error) {
      // Handle specific error cases
      if (error.message?.includes('Bucket not found') || 
          error.message?.includes('bucket does not exist') ||
          error.message?.includes('The resource was not found')) {
        if (isDevelopment) {
          console.log('\n🚨 SETUP REQUIRED:');
          console.log('Please create the "camera-photos" bucket in your Supabase project:');
          console.log('1. Go to https://supabase.com/dashboard');
          console.log('2. Select your project');
          console.log('3. Go to Storage > Buckets');
          console.log('4. Create a new PUBLIC bucket named "camera-photos"');
          console.log('5. See SUPABASE_SETUP.md for detailed instructions\n');
        }
        return false;
      }
      
      // Handle network errors gracefully
      if (error.message?.includes('Network request failed') ||
          error.message?.includes('fetch')) {
        console.log('Network error during bucket check, continuing...');
        return false;
      }
      
      if (isDevelopment) {
        console.error('Bucket access test failed:', error);
      }
      return false;
    }

    console.log('✅ Bucket access verified successfully');
    return true;
  } catch (error) {
    // Handle network errors gracefully
    if (error instanceof Error && 
        (error.message?.includes('Network request failed') ||
         error.message?.includes('fetch'))) {
      console.log('Network error during bucket setup, continuing...');
      return false;
    }
    
    if (isDevelopment) {
      console.error('Bucket setup failed:', error);
    }
    return false;
  }
}

export async function testBucketAccess() {
  try {
    // Test upload a small file
    const testData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    const testFileName = `test/test-${Date.now()}.png`;

    const { data, error } = await supabase.storage
      .from('camera-photos')
      .upload(testFileName, testData, {
        contentType: 'image/png',
      });

    if (error) {
      console.error('Test upload failed:', error);
      
      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket does not exist')) {
        throw new Error('Bucket "camera-photos" does not exist. Please create it in your Supabase dashboard.');
      }
      
      throw new Error(`Upload test failed: ${error.message}`);
    }

    // Clean up test file
    await supabase.storage
      .from('camera-photos')
      .remove([testFileName]);

    console.log('Bucket access test successful');
    return true;
  } catch (error) {
    console.error('Bucket access test failed:', error);
    throw error;
  }
}