import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Test endpoint to verify backend is working
app.get("/test", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Backend test endpoint working",
    timestamp: new Date().toISOString(),
    url: c.req.url
  });
});

// Debug endpoint to check tRPC routes
app.get("/debug", (c) => {
  return c.json({ 
    status: "ok", 
    message: "tRPC Debug endpoint",
    availableRoutes: [
      "/api/trpc/example.hi",
      "/api/trpc/camera.create",
      "/api/trpc/camera.join",
      "/api/trpc/camera.isRevealed",
      "/api/trpc/photo.upload",
      "/api/trpc/photo.list",
      "/api/trpc/photo.getSignedUrl"
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check for tRPC
app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    message: "tRPC API is running",
    timestamp: new Date().toISOString()
  });
});

// Supabase connection test
app.get("/supabase-test", async (c) => {
  try {
    const { supabase } = await import("../lib/supabase");
    
    // Test connection by trying to select from cameras table
    const { data, error } = await supabase
      .from('cameras')
      .select('count')
      .limit(1);
    
    if (error) {
      return c.json({ 
        status: "error", 
        message: "Supabase connection failed",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return c.json({ 
      status: "ok", 
      message: "Supabase connection successful",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ 
      status: "error", 
      message: "Supabase test failed",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default app;