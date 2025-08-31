import { z } from "zod";
import { publicProcedure } from "../../../create-context";

const joinCameraInput = z.object({
  cameraId: z.string().min(1, "Camera ID is required"),
  guestUserId: z.string().min(1, "Guest user ID is required"),
});

export const joinCameraProcedure = publicProcedure
  .input(joinCameraInput)
  .mutation(async ({ input, ctx }) => {
    const { cameraId, guestUserId } = input;
    
    // TODO: Replace with actual database calls when available
    // For now, we'll simulate the database operations
    
    try {
      // Simulate fetching camera from database
      // const camera = await ctx.db.collection('camera').findById(cameraId);
      
      // Mock camera data for simulation
      const mockCamera = {
        id: cameraId,
        name: `Event Camera ${cameraId.slice(-6)}`,
        participantLimit: 25,
        guests: ["user1", "user2"], // Mock existing guests
        isActive: true,
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        revealDelayType: 'immediate',
        filter: 'none',
        allowCameraRoll: true,
        maxPhotosPerPerson: 20, // Default to free tier limit
      };
      
      // Check if camera exists
      if (!mockCamera) {
        return {
          success: false,
          error: "Camera not found",
        };
      }
      
      // Check if camera is still active
      if (!mockCamera.isActive) {
        return {
          success: false,
          error: "Camera is no longer active",
        };
      }
      
      // Check if user is already in the camera
      if (mockCamera.guests.includes(guestUserId)) {
        return {
          success: false,
          error: "User is already in this camera",
        };
      }
      
      // Check participant limit
      const currentGuestCount = mockCamera.guests.length;
      if (currentGuestCount >= mockCamera.participantLimit) {
        return {
          success: false,
          error: "Camera is full",
        };
      }
      
      // Add guest to camera
      // TODO: Replace with actual database update
      // await ctx.db.collection('camera').updateById(cameraId, {
      //   $push: { guests: guestUserId }
      // });
      
      console.log(`Guest ${guestUserId} joined camera ${cameraId}`);
      
      return {
        success: true,
        message: "Successfully joined camera",
        guestCount: currentGuestCount + 1,
        participantLimit: mockCamera.participantLimit,
        camera: {
          id: mockCamera.id,
          name: mockCamera.name,
          endDate: mockCamera.endDate,
          revealDelayType: mockCamera.revealDelayType,
          filter: mockCamera.filter,
          allowCameraRoll: mockCamera.allowCameraRoll,
          maxPhotosPerPerson: mockCamera.maxPhotosPerPerson,
          participantLimit: mockCamera.participantLimit,
          isActive: mockCamera.isActive,
        },
      };
      
    } catch (error) {
      console.error('Error joining camera:', error);
      return {
        success: false,
        error: "Failed to join camera",
      };
    }
  });