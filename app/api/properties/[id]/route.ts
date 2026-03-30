import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const property = await prisma.savedProperty.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ success: true, property });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to update: ${err}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.savedProperty.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to delete: ${err}` },
      { status: 500 }
    );
  }
}
