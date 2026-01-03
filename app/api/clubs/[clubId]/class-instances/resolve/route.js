export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import { isClubAttendanceEnabled } from "@/lib/featureFlags";

import ClubScheduleTemplate from "@/models/teamScheduleTemplateModel";
import ClassInstance from "@/models/classInstanceModel";

export async function POST(req, { params }) {
  if (!isClubAttendanceEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clubId } = await params;
    const now = new Date();

    const day = now.getDay();
    const minutesNow = now.getHours() * 60 + now.getMinutes();

    const templates = await ClubScheduleTemplate.find({
      club: clubId,
      dayOfWeek: day,
      active: true,
    });

    let matchedTemplate = null;

    for (const t of templates) {
      const [h, m] = t.startTime.split(":").map(Number);
      const startMinutes = h * 60 + m;

      if (Math.abs(startMinutes - minutesNow) <= 30) {
        matchedTemplate = t;
        break;
      }
    }

    if (!matchedTemplate) {
      return NextResponse.json({ classInstance: null });
    }

    const startAt = new Date(now);
    const [sh, sm] = matchedTemplate.startTime.split(":").map(Number);
    startAt.setHours(sh, sm, 0, 0);

    const endAt = new Date(startAt);
    endAt.setMinutes(endAt.getMinutes() + matchedTemplate.durationMinutes);

    let instance = await ClassInstance.findOne({
      club: clubId,
      startAt,
    });

    if (!instance) {
      instance = await ClassInstance.create({
        club: clubId,
        scheduleTemplate: matchedTemplate._id,
        name: matchedTemplate.name,
        startAt,
        endAt,
        classType: matchedTemplate.classType,
        createdBy: "system",
      });
    }

    return NextResponse.json({ classInstance: instance });
  } catch (err) {
    console.error("Resolve class instance failed:", err);
    return NextResponse.json(
      { error: "Failed to resolve class" },
      { status: 500 }
    );
  }
}
