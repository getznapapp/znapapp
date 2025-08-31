import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { supabase } from "../../../../../lib/supabase";

const isRevealedInput = z.object({
  cameraId: z.string().min(1, "Camera ID is required"),
});

export default publicProcedure
  .input(isRevealedInput)
  .query(async ({ input, ctx }) => {
    const { cameraId } = input;
    
    try {
      // Fetch camera data from Supabase
      const { data: camera, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('id', cameraId)
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error("Camera not found");
      }
      
      if (!camera) {
        throw new Error("Camera not found");
      }
      
      const currentTime = new Date();
      const endDate = new Date(camera.endDate);
      let revealTime: Date;
      
      // Calculate reveal time based on revealDelayType
      switch (camera.revealDelayType) {
        case 'immediate':
          revealTime = endDate;
          break;
          
        case '12h':
          revealTime = new Date(endDate.getTime() + 12 * 60 * 60 * 1000);
          break;
          
        case '24h':
          revealTime = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
          break;
          
        case 'custom':
          if (!camera.customRevealAt) {
            throw new Error("Custom reveal time not set");
          }
          revealTime = new Date(camera.customRevealAt);
          break;
          
        default:
          // Default to 24h if revealDelayType is invalid
          revealTime = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
          break;
      }
      
      const revealed = currentTime >= revealTime;
      
      console.log(`Camera ${cameraId} reveal check:`, {
        currentTime: currentTime.toISOString(),
        revealTime: revealTime.toISOString(),
        revealDelayType: camera.revealDelayType,
        revealed,
        endDate: endDate.toISOString(),
      });
      
      // Return properly typed response
      return {
        revealed,
        revealTime: revealTime.toISOString(),
        revealDelayType: camera.revealDelayType,
      };
      
    } catch (error) {
      console.error('Error checking camera reveal status:', error);
      throw new Error("Failed to check reveal status");
    }
  });