// app/api/dashboard/[userId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

const trim = (v) => (typeof v === "string" ? v.trim() : v);
const notSpecified = (v) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : "not specified";
};

export async function PATCH(request, context) {
  await connectDB();

  const { userId } = await context.params; // ✅ must await in Next 15
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    const data = await request.json();

    // Build base update (don’t write undefineds)
    const baseUpdate = {
      firstName: trim(data.firstName),
      lastName: trim(data.lastName),
      email: trim(data.email),
      username: trim(data.username),
      city: trim(data.city),
      state: trim(data.state),
      country: notSpecified(data.country), // ✅ normalize blanks
      gender: notSpecified(data.gender), // ✅ normalize blanks
      bMonth: trim(data.bMonth),
      bDay: trim(data.bDay),
      bYear: trim(data.bYear),
      allowPublic:
        data.allowPublic === "Public" || data.allowPublic === true
          ? true
          : false,
    };

    // Remove undefined keys so we don't overwrite with undefined
    for (const k of Object.keys(baseUpdate)) {
      if (typeof baseUpdate[k] === "undefined") delete baseUpdate[k];
    }

    let updatedUser;

    if (data.password) {
      // ✅ If changing password, use .save() so hashing middleware runs
      const userDoc = await User.findById(userId);
      if (!userDoc) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }
      Object.assign(userDoc, baseUpdate);
      userDoc.password = String(data.password);
      updatedUser = await userDoc.save();
    } else {
      // ✅ Normal field updates via atomic update
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: baseUpdate },
        { new: true, runValidators: true }
      );
    }

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const safe = updatedUser.toObject?.() || updatedUser;
    delete safe.password;

    return NextResponse.json(
      { message: "User updated successfully", user: safe },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Error updating user:", err);

    // Nice duplicate key message for username/email conflicts
    if (err?.code === 11000) {
      const field = Object.keys(err?.keyPattern || {})[0] || "field";
      return NextResponse.json(
        { message: `That ${field} is already taken.` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
