import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. GET ALL STAFF FROM DATABASE
export async function GET() {
  try {
    const staff = await prisma.branchStaff.findMany();
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// 2. ADD NEW STAFF TO DATABASE
export async function POST(req: Request) {
  try {
    const { name, branch } = await req.json();
    
    // Check if staff already exists for this branch
    const existing = await prisma.branchStaff.findFirst({
      where: { name, branch }
    });

    if (existing) {
      return NextResponse.json({ error: "Staff already exists in this branch" }, { status: 400 });
    }

    const newStaff = await prisma.branchStaff.create({
      data: { name, branch }
    });
    return NextResponse.json(newStaff);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add staff" }, { status: 500 });
  }
}

// 3. DELETE STAFF FROM DATABASE
export async function DELETE(req: Request) {
  try {
    const { name, branch } = await req.json();
    await prisma.branchStaff.deleteMany({
      where: { name, branch }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}