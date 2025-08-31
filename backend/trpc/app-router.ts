import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createCameraProcedure } from "./routes/camera/create/route";
import { joinCameraProcedure } from "./routes/camera/join/route";
import isRevealedRoute from "./routes/camera/is-revealed/route";
import { getCameraProcedure } from "./routes/camera/get/route";
import { saveNotificationProcedure } from "./routes/camera/save-notification/route";
import { uploadPhotoProcedure } from "./routes/photo/upload/route";
import { listPhotosProcedure } from "./routes/photo/list/route";
import { getSignedUrlProcedure } from "./routes/photo/get-signed-url/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  camera: createTRPCRouter({
    create: createCameraProcedure,
    join: joinCameraProcedure,
    isRevealed: isRevealedRoute,
    get: getCameraProcedure,
    saveNotification: saveNotificationProcedure,
  }),
  photo: createTRPCRouter({
    upload: uploadPhotoProcedure,
    list: listPhotosProcedure,
    getSignedUrl: getSignedUrlProcedure,
  }),
});

export type AppRouter = typeof appRouter;