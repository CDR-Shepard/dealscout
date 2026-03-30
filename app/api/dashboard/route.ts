import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function GET() {
  try {
    const [totalLeads, hotDeals, recentScouts, topProperties] =
      await Promise.all([
        prisma.savedProperty.count({
          where: { userId: DEFAULT_USER_ID },
        }),
        prisma.savedProperty.count({
          where: {
            userId: DEFAULT_USER_ID,
            distressScore: { gte: 80 },
          },
        }),
        prisma.scoutSession.findMany({
          where: { userId: DEFAULT_USER_ID },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.savedProperty.findMany({
          where: {
            userId: DEFAULT_USER_ID,
            pipelineStage: { notIn: ["dead", "closed"] },
          },
          orderBy: { distressScore: "desc" },
          take: 5,
        }),
      ]);

    const pipelineMao = await prisma.savedProperty.aggregate({
      where: {
        userId: DEFAULT_USER_ID,
        pipelineStage: { notIn: ["dead", "closed"] },
      },
      _sum: { maxAllowableOffer: true },
    });

    return NextResponse.json({
      success: true,
      totalLeads,
      hotDeals,
      pipelineValue: pipelineMao._sum.maxAllowableOffer ?? 0,
      recentScouts,
      topProperties,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed: ${err}` },
      { status: 500 }
    );
  }
}
