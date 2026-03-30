import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = "demo-user";

export async function GET() {
  try {
    const sessions = await prisma.scoutSession.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { properties: true } },
      },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch sessions: ${err}` },
      { status: 500 }
    );
  }
}
