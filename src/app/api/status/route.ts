import { NextResponse } from "next/server";
import { isSupabaseReady, createServerClient } from "@/lib/supabase/server";
import fs from "fs";

export const dynamic = "force-dynamic";

function detectLocalBlender(): { available: boolean; path?: string } {
  const custom = process.env.BLENDER_PATH;
  if (custom && fs.existsSync(custom)) {
    return { available: true, path: custom };
  }

  const standardPaths = [
    "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
    "/usr/bin/blender",
    "/usr/local/bin/blender",
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) {
      return { available: true, path: p };
    }
  }

  return { available: false };
}

export async function GET() {
  const isConfigured = isSupabaseReady();
  const blenderInfo = detectLocalBlender();
  let workerQueueCount = 0;

  if (isConfigured) {
    const supabase = createServerClient();
    if (supabase) {
      try {
        const { count } = await supabase
          .from("conversion_jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "queued");
        workerQueueCount = count || 0;
      } catch {
        // non-fatal
      }
    }
  }

  return NextResponse.json({
    isSupabaseConfigured: isConfigured,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "No configurado",
    isBlenderAvailable: blenderInfo.available,
    blenderPath: blenderInfo.path,
    workerQueueCount,
    environment: process.env.NODE_ENV || "development",
  });
}

