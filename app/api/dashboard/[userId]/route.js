// app/api/dashboard/[userId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { notifyFollowers } from "@/lib/notify-followers";

const trim = (v) => (typeof v === "string" ? v.trim() : v);
const notSpecified = (v) => {
  const s = typeof v === "string" ? String(v).trim() : "";
  return s ? s : "not specified";
};

// Human labels for notification summary
const WATCHED_FIELDS = {
  firstName: "First name",
  lastName: "Last name",
  username: "Username",
  city: "City",
  state: "State",
  country: "Country",
  gender: "Gender",
  bio: "Bio",
};

export async function PATCH(request, context) {
  await connectDB();

  const { userId } = await context.params; // Next 15: must await
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    const data = await request.json();

    // Load the previous snapshot for diffing
    const prev = await User.findById(userId, {
      _id: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      username: 1,
      city: 1,
      state: 1,
      country: 1,
      gender: 1,
      bMonth: 1,
      bDay: 1,
      bYear: 1,
      allowPublic: 1,
      bio: 1, // if you add later, diff will include it
    }).lean();

    if (!prev) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Build base update (no undefined)
    const baseUpdate = {
      firstName: trim(data.firstName),
      lastName: trim(data.lastName),
      email: trim(data.email),
      username: trim(data.username),
      city: trim(data.city),
      state: trim(data.state),
      country: notSpecified(data.country),
      gender: notSpecified(data.gender),
      bMonth: trim(data.bMonth),
      bDay: trim(data.bDay),
      bYear: trim(data.bYear),
      allowPublic:
        data.allowPublic === "Public" || data.allowPublic === true
          ? true
          : data.allowPublic === "Private" || data.allowPublic === false
          ? false
          : undefined,
      bio: typeof data.bio === "string" ? data.bio : undefined,
    };

    // Remove undefined keys so we don't overwrite with undefined
    for (const k of Object.keys(baseUpdate)) {
      if (typeof baseUpdate[k] === "undefined") delete baseUpdate[k];
    }

    let updatedUser;

    if (data.password) {
      // If changing password, use save() for hashing middleware
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
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: baseUpdate },
        { new: true, runValidators: true }
      );
    }

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // ---- Compute diff for profile-update notifications ----
    const changedFields = [];
    for (const [key, label] of Object.entries(WATCHED_FIELDS)) {
      const before = prev?.[key] ?? "";
      const after = updatedUser?.[key] ?? "";
      // compare as trimmed strings to avoid false negatives from whitespace
      if (String(before).trim() !== String(after).trim()) {
        changedFields.push(label);
      }
    }

    // Fan-out to followers if meaningful profile fields changed
    if (changedFields.length > 0) {
      try {
        await notifyFollowers(userId, "followed.profile.updated", {
          changedFields,
        });
      } catch (e) {
        console.warn(
          "[notifyFollowers] profile updated fanout failed:",
          e?.message
        );
      }
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
