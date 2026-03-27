import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch all schedules, sorting them by date (newest first)
    const schedules = await prisma.manpowerSchedule.findMany({
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch schedules" }, 
      { status: 500 }
    );
  }
}