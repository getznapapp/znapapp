import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const saveNotificationInput = z.object({
  cameraId: z.string().min(1, "Camera ID is required"),
  guestName: z.string().min(1, "Guest name is required"),
  email: z.string().email("Valid email is required"),
});

export const saveNotificationProcedure = publicProcedure
  .input(saveNotificationInput)
  .mutation(async ({ input, ctx }) => {
    const { cameraId, guestName, email } = input;
    
    try {
      // TODO: Replace with actual Supabase database call
      // For now, we'll simulate saving to database
      
      console.log('Saving notification preference:', {
        cameraId,
        guestName,
        email,
        timestamp: new Date().toISOString(),
      });
      
      // Simulate database save
      // await ctx.supabase
      //   .from('camera_notifications')
      //   .insert({
      //     camera_id: cameraId,
      //     guest_name: guestName,
      //     email: email,
      //     created_at: new Date().toISOString(),
      //   });
      
      return {
        success: true,
        message: "Notification preference saved successfully",
      };
      
    } catch (error) {
      console.error('Error saving notification preference:', error);
      return {
        success: false,
        error: "Failed to save notification preference",
      };
    }
  });