import { NextResponse } from "next/server";

/**
 * V1: Batch scoring is handled inline by the scout/run pipeline
 * (single-pass visual analysis per property).
 * This endpoint is reserved for v2 when batch deal-math scoring is added.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Batch scoring disabled in v1. Use /api/scout/run for visual distress analysis." },
    { status: 410 }
  );
}
