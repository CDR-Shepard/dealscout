import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function GET() {
  try {
    const stages = [
      "scouted",
      "contacting",
      "negotiating",
      "under_contract",
      "closed",
      "dead",
    ];

    const counts: Record<string, number> = {};
    for (const stage of stages) {
      counts[stage] = await prisma.savedProperty.count({
        where: { userId: DEFAULT_USER_ID, pipelineStage: stage },
      });
    }

    const totalMao = await prisma.savedProperty.aggregate({
      where: {
        userId: DEFAULT_USER_ID,
        pipelineStage: { notIn: ["dead", "closed"] },
      },
      _sum: { maxAllowableOffer: true },
    });

    return NextResponse.json({
      success: true,
      stages: counts,
      totalPipelineValue: totalMao._sum.maxAllowableOffer ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed: ${err}` },
      { status: 500 }
    );
  }
}
