// app/api/users/[username]/follow/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import Follow from "@/models/followModel";
import Notification from "@/models/notification";
import { sendEmail } from "@/lib/email/email";
import {
  buildNewFollowerEmail,
  newFollowerSubject,
} from "@/lib/email/templates/newFollower";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function getTargetUser(usernameRaw) {
  const username = String(usernameRaw || "")
    .trim()
    .toLowerCase();
  if (!username) return null;
  return User.findOne(
    { username },
    {
      _id: 1,
      username: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      notificationSettings: 1,
    }
  ).lean();
}

// counts shown on a *user* profile
async function countsFor(userId) {
  // Followers of this user = everyone following this user target
  const followers = await Follow.countDocuments({
    targetType: "user",
    followingUserId: userId,
  });

  // Following (how many things this user follows) = any targetType
  const following = await Follow.countDocuments({
    followerId: userId,
  });

  return { followers, following };
}

const bool = (v, fallback = false) =>
  typeof v === "boolean" ? v : v == null ? fallback : !!v;

/* ---------- notifications ---------- */

async function createInAppNotification({
  recipientId,
  actorId,
  actorUsername,
  actorName,
}) {
  try {
    const body = `${
      actorName || "Someone"
    } (@${actorUsername}) started following you.`;
    const profilePath = `/${actorUsername}`;

    await Notification.create({
      user: recipientId,
      notificationType: "followers.newFollower",
      notificationBody: body,

      notificationLink: profilePath,
      url: profilePath,
      linkUrl: profilePath,
      href: profilePath,

      actorId,
      read: false,
      isRead: false,
      seen: false,
    });
  } catch (e) {
    console.warn("[follow] in-app notification create failed:", e?.message);
  }
}

async function sendNewFollowerEmail({ to, actorUsername, actorName }) {
  if (!to) return;
  const base =
    process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL || "";
  const profileUrl = `${base}/${encodeURIComponent(actorUsername)}`;
  try {
    const html = buildNewFollowerEmail({
      actorUsername,
      actorName,
      profileUrl,
    });
    await sendEmail({ to, subject: newFollowerSubject, html });
  } catch (e) {
    console.warn("[follow] email send failed:", e?.message);
  }
}

/* ---------- routes ---------- */

export async function GET(_req, { params }) {
  await connectDB();
  const { username } = await params;

  const viewer = await getCurrentUser().catch(() => null);
  const target = await getTargetUser(username);
  if (!target) return json({ error: "User not found" }, 404);

  let isFollowing = false;
  if (viewer?._id) {
    isFollowing = !!(await Follow.findOne({
      followerId: viewer._id,
      targetType: "user",
      followingUserId: target._id,
    }).lean());
  }

  const c = await countsFor(target._id);
  return json({ ok: true, isFollowing, counts: c });
}

export async function POST(_req, { params }) {
  await connectDB();
  const { username } = await params;

  const viewer = await getCurrentUser();
  if (!viewer) return json({ error: "Unauthorized" }, 401);

  const target = await getTargetUser(username);
  if (!target) return json({ error: "User not found" }, 404);
  if (String(target._id) === String(viewer._id)) {
    return json({ error: "Cannot follow yourself" }, 400);
  }

  // Idempotent upsert – correct fields for a *user* target
  const res = await Follow.updateOne(
    {
      followerId: viewer._id,
      targetType: "user",
      followingUserId: target._id,
    },
    {
      $setOnInsert: {
        followerId: viewer._id,
        targetType: "user",
        followingUserId: target._id,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  const actuallyInserted = res.upsertedCount > 0;

  // Only notify on first-time follow
  if (actuallyInserted) {
    const prefs = target?.notificationSettings?.followers?.newFollower;
    const allowInApp = bool(prefs?.inApp, true); // default ON
    const allowEmail = bool(prefs?.email, false); // default OFF
    const actorName =
      [viewer.firstName, viewer.lastName].filter(Boolean).join(" ") ||
      viewer.username ||
      "Someone";

    if (allowInApp) {
      await createInAppNotification({
        recipientId: target._id,
        actorId: viewer._id,
        actorUsername: viewer.username,
        actorName,
      });
    }

    if (allowEmail && target.email) {
      await sendNewFollowerEmail({
        to: target.email,
        actorUsername: viewer.username,
        actorName,
      });
    }
  }

  const c = await countsFor(target._id);

  // Truth from DB
  const isFollowing = !!(await Follow.exists({
    followerId: viewer._id,
    targetType: "user",
    followingUserId: target._id,
  }));

  return json(
    { ok: true, isFollowing, counts: c },
    actuallyInserted ? 201 : 200
  );
}

export async function DELETE(_req, { params }) {
  await connectDB();
  const { username } = await params;

  const viewer = await getCurrentUser();
  if (!viewer) return json({ error: "Unauthorized" }, 401);

  const target = await getTargetUser(username);
  if (!target) return json({ error: "User not found" }, 404);

  await Follow.deleteOne({
    followerId: viewer._id,
    targetType: "user",
    followingUserId: target._id,
  });

  const c = await countsFor(target._id);
  const stillFollowing = !!(await Follow.exists({
    followerId: viewer._id,
    targetType: "user",
    followingUserId: target._id,
  }));

  return json({ ok: true, isFollowing: !!stillFollowing, counts: c });
}
