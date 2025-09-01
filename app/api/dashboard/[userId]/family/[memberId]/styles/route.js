import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const isValid = (id) => !!id && Types.ObjectId.isValid(id);

// GET: styles for this family member (owned by the logged-in user)
export async function GET(_req, { params }) {
  await connectDB();
  const { userId, memberId } = params || {};

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValid(userId) || !isValid(memberId)) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    const styles = await UserStyle.find(
      {
        userId: new Types.ObjectId(userId),
        familyMemberId: new Types.ObjectId(memberId),
      },
      { styleName: 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    const normalized = (styles || [])
      .map((s) => {
        const name = s?.styleName || s?.name || s?.title || s?.style || "";
        return name ? { styleName: name } : null;
      })
      .filter(Boolean);

    return NextResponse.json(normalized, { status: 200 });
  } catch (err) {
    console.error("Error fetching styles:", err);
    return NextResponse.json(
      { message: "Failed to fetch styles" },
      { status: 500 }
    );
  }
}

// POST: add a style for this family member
export async function POST(req, { params }) {
  await connectDB();
  const { userId, memberId } = params || {};

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isValid(userId) || !isValid(memberId)) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const styleName = String(body?.styleName || body?.name || "").trim();
    if (!styleName) {
      return NextResponse.json(
        { message: "styleName is required" },
        { status: 400 }
      );
    }

    const newStyle = await UserStyle.create({
      ...body,
      styleName,
      userId: new Types.ObjectId(userId),
      familyMemberId: new Types.ObjectId(memberId),
    });

    await FamilyMember.findByIdAndUpdate(memberId, {
      $addToSet: { userStyles: newStyle._id },
    });

    return NextResponse.json(
      {
        message: "Style added",
        createdStyle: { _id: newStyle._id, styleName },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating style:", err);
    return NextResponse.json(
      { message: "Failed to create style" },
      { status: 500 }
    );
  }
}
