// app/api/family/[username]/follow/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Follow from "@/models/followModel";
import FamilyMember from "@/models/familyMemberModel";
import User from "@/models/userModel";
import Notification from "@/models/notification";
import { sendEmail } from "@/lib/email/email"; // ✅ unified email helper

// GET → is current user following this family member?
export async function GET(_req, { params }) {
  const { username } = await params;
  await connectDB();

  const me = await getCurrentUser();
  if (!me?._id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fam = await FamilyMember.findOne({ username }).select("_id").lean();
  if (!fam)
    return NextResponse.json(
      { error: "Family member not found" },
      { status: 404 }
    );

  const existing = await Follow.findOne({
    followerId: me._id,
    targetType: "family",
    followingFamilyId: fam._id,
  })
    .select("_id")
    .lean();

  return NextResponse.json({ isFollowing: !!existing });
}

// POST → follow a family member (idempotent)
export async function POST(_req, { params }) {
  const { username } = await params;
  await connectDB();

  const me = await getCurrentUser();
  if (!me?._id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fam = await FamilyMember.findOne({ username })
    .select("_id userId firstName lastName username")
    .lean();
  if (!fam)
    return NextResponse.json(
      { error: "Family member not found" },
      { status: 404 }
    );

  // Upsert follow record
  const res = await Follow.updateOne(
    { followerId: me._id, targetType: "family", followingFamilyId: fam._id },
    {
      $setOnInsert: {
        followerId: me._id,
        targetType: "family",
        followingFamilyId: fam._id,
      },
    },
    { upsert: true }
  );

  // Only act if this is a *new* follow
  if (res?.upsertedId) {
    const actor = await User.findById(me._id)
      .select("username displayName")
      .lean()
      .catch(() => null);

    const owner = await User.findById(fam.userId)
      .select("email username displayName notificationPrefs")
      .lean()
      .catch(() => null);

    if (actor && owner) {
      const body = `${actor.displayName || actor.username} started following ${
        fam.firstName
      } ${fam.lastName}`;
      const link = `/family/${fam.username}`;

      // In-app notification (default ON unless explicitly disabled)
      const appOn = owner?.notificationPrefs?.follow?.app !== false;
      if (appOn) {
        await Notification.create({
          user: owner._id,
          notificationType: "family_followed",
          notificationBody: body,
          notificationLink: link,
        });
      }

      // Email notification (default ON unless explicitly disabled)
      const emailOn = owner?.notificationPrefs?.follow?.email !== false;
      if (emailOn && owner.email) {
        try {
          await sendEmail({
            to: owner.email,
            subject: "New family follower",
            html: `
              <p><strong>${
                actor.displayName || actor.username
              }</strong> started following your family member <strong>${
              fam.firstName
            } ${fam.lastName}</strong>.</p>
              <p><a href="${
                (process.env.NEXT_PUBLIC_APP_URL || "") + link
              }">View profile</a></p>
            `,
          });
          console.log(
            "[family_followed] email sent via sendEmail to",
            owner.email
          );
        } catch (e) {
          console.error("sendEmail family_followed failed:", e?.message);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, isFollowing: true });
}

// DELETE → unfollow a family member
export async function DELETE(_req, { params }) {
  const { username } = await params;
  await connectDB();

  const me = await getCurrentUser();
  if (!me?._id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fam = await FamilyMember.findOne({ username }).select("_id").lean();
  if (!fam)
    return NextResponse.json(
      { error: "Family member not found" },
      { status: 404 }
    );

  await Follow.findOneAndDelete({
    followerId: me._id,
    targetType: "family",
    followingFamilyId: fam._id,
  });

  return NextResponse.json({ ok: true, isFollowing: false });
}
