export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import { deriveAttendanceAchievements } from "@/lib/attendance/deriveAchievements";

export async function GET() {
  await connectDB();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await deriveAttendanceAchievements(user._id);
  return NextResponse.json(data);
}
