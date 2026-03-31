import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");

  try {
    const where: Record<string, unknown> = { userId: DEFAULT_USER_ID };
    if (stage) where.pipelineStage = stage;

    const properties = await prisma.savedProperty.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, properties });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch: ${err}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: DEFAULT_USER_ID },
      create: { id: DEFAULT_USER_ID, email: "demo@dealscout.ai", name: "Demo User" },
      update: {},
    });

    const property = await prisma.savedProperty.create({
      data: {
        userId: DEFAULT_USER_ID,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        latitude: body.latitude,
        longitude: body.longitude,
        listPrice: body.listPrice,
        distressScore: body.distressScore,
        aiReasoning: body.aiReasoning,
        distressSignals: body.distressSignals,
        primaryPhoto: body.primaryPhoto,
        pipelineStage: "scouted",
      },
    });

    return NextResponse.json({ success: true, property });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to save: ${err}` },
      { status: 500 }
    );
  }
}
