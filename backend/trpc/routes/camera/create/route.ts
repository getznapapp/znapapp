import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { storeCameraSettings } from "../../../storage";
import { supabase } from "../../../../../lib/supabase";
import { generateCameraId } from "../../../../../lib/uuid";

const createCameraInput = z.object({
  name: z.string().min(1, "Camera name is required"),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date(),
  durationHours: z.number().positive().optional(),
  participantLimit: z.union([
    z.literal(20),
    z.literal(25),
    z.literal(30),
    z.literal(50),
    z.literal(999)
  ]),
  maxPhotosPerPerson: z.union([
    z.literal(20),
    z.literal(25),
    z.literal(30),
    z.literal(50)
  ]).default(20),
  allowCameraRoll: z.boolean().default(true),
  filter: z.enum(['none', 'disposable']).default('none'),
  paidUpgrade: z.boolean(),
  revealDelayType: z.enum(['immediate', '12h', '24h', 'custom']).default('24h'),
  customRevealAt: z.coerce.date().optional(),
});

export const createCameraProcedure = publicProcedure
  .input(createCameraInput)
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('=== BACKEND CAMERA CREATION START ===');
      console.log('Camera creation input:', input);
      console.log('Context:', ctx);
      
      // Validate custom reveal time if revealDelayType is custom
      if (input.revealDelayType === 'custom' && !input.customRevealAt) {
        throw new Error("Custom reveal time is required when reveal type is set to custom");
      }
      
      // Validate start time if provided (allow current time for instant cameras)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (input.startTime && input.startTime < fiveMinutesAgo) {
        console.log('Start time validation failed:', {
          startTime: input.startTime,
          now,
          fiveMinutesAgo,
          diff: input.startTime.getTime() - fiveMinutesAgo.getTime()
        });
        throw new Error("Start time must be in the future");
      }
    
    // Generate UUID camera ID
    const cameraId = generateCameraId();
    
    // Calculate custom reveal time if needed
    let customRevealAt = input.customRevealAt;
    if (input.revealDelayType === 'custom' && !customRevealAt) {
      throw new Error("Custom reveal time is required when reveal type is set to custom");
    }
    
    const cameraData = {
      id: cameraId,
      name: input.name,
      endDate: input.endTime.toISOString(),
      revealDelayType: input.revealDelayType,
      customRevealAt: customRevealAt?.toISOString() || null,
      createdAt: new Date().toISOString(),
      createdBy: null, // Will be updated when auth is implemented
      // Additional fields for internal use (not in Supabase table)
      startTime: input.startTime || new Date(),
      durationHours: input.durationHours,
      participantLimit: input.participantLimit,
      maxPhotosPerPerson: input.maxPhotosPerPerson,
      allowCameraRoll: input.allowCameraRoll,
      filter: input.filter,
      paidUpgrade: input.paidUpgrade,
      isActive: input.startTime ? input.startTime <= new Date() : true,
    };
    
    // Store camera in Supabase
    const supabaseData = {
      id: cameraData.id,
      name: cameraData.name,
      endDate: cameraData.endDate,
      revealDelayType: cameraData.revealDelayType,
      customRevealAt: cameraData.customRevealAt,
      createdAt: cameraData.createdAt,
      createdBy: cameraData.createdBy,
      maxPhotosPerPerson: input.maxPhotosPerPerson,
    };
    
    console.log('Inserting camera into Supabase:', supabaseData);
    
    const { data: supabaseCamera, error: supabaseError } = await supabase
      .from('cameras')
      .insert([supabaseData])
      .select()
      .single();
    
    if (supabaseError) {
      console.error('Supabase camera creation error:', supabaseError);
      throw new Error(`Failed to create camera: ${supabaseError.message}`);
    }
    
    console.log('Camera created in Supabase:', supabaseCamera);
    
    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the camera was created by immediately trying to retrieve it
    const { data: verifyCamera, error: verifyError } = await supabase
      .from('cameras')
      .select('*')
      .eq('id', cameraId)
      .single();
    
    if (verifyError) {
      console.error('Camera verification failed:', verifyError);
      
      // Try to list recent cameras to debug
      const { data: recentCameras } = await supabase
        .from('cameras')
        .select('id, name, createdAt')
        .order('createdAt', { ascending: false })
        .limit(5);
      
      console.log('Recent cameras in database:', recentCameras);
      
      throw new Error('Camera was created but could not be verified');
    }
    
    console.log('Camera creation verified:', verifyCamera);
    
      // Store camera settings for photo upload validation
      storeCameraSettings(cameraId, {
        maxPhotosPerPerson: input.maxPhotosPerPerson,
        participantLimit: input.participantLimit,
        allowCameraRoll: input.allowCameraRoll,
        filter: input.filter,
        revealDelayType: input.revealDelayType,
        customRevealAt: input.customRevealAt,
        endTime: input.endTime,
      });
      
      console.log('Camera created:', cameraData);
      
      return {
        success: true,
        cameraId: cameraId,
        camera: cameraData,
      };
    } catch (error) {
      console.error('Camera creation error:', error);
      throw error;
    }
  });