import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabase } from "../../../../../lib/supabase";

const getSignedUrlInput = z.object({
  fileName: z.string(),
  expiresIn: z.number().default(3600), // 1 hour default
});

export const getSignedUrlProcedure = publicProcedure
  .input(getSignedUrlInput)
  .query(async ({ input }) => {
    try {
      const { fileName, expiresIn } = input;
      
      // Generate signed URL for private access
      const { data, error } = await supabase.storage
        .from('camera-photos')
        .createSignedUrl(fileName, expiresIn);
      
      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }
      
      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (error) {
      console.error('Signed URL generation failed:', error);
      throw new Error(`Signed URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });