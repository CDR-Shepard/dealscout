import { NextRequest, NextResponse } from "next/server";
import { scoreBatch } from "@/lib/ai/scoring";
import type { HomeHarvestProperty } from "@/lib/homeharvest/types";

export async function POST(request: NextRequest) {
  try {
    const { properties } = (await request.json()) as {
      properties: HomeHarvestProperty[];
    };

    if (!properties?.length) {
      return NextResponse.json(
        { error: "No properties provided" },
        { status: 400 }
      );
    }

    const scores = await scoreBatch(properties);
    return NextResponse.json({ success: true, scores });
  } catch (err) {
    return NextResponse.json(
      { error: `Scoring failed: ${err}` },
      { status: 500 }
    );
  }
}
