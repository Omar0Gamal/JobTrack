import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/env";
import { cleanupStaleGuestsAction } from "@/server/actions/demo.actions";

async function handleCleanup(request: NextRequest): Promise<NextResponse> {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on this server" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing Bearer token" },
      { status: 401 }
    );
  }

  try {
    const result = await cleanupStaleGuestsAction();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during cleanup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCleanup(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCleanup(request);
}
