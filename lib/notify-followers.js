// lib/notify-followers.js
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Follow from "@/models/followModel";
import Notification from "@/models/notification";
import { sendEmail } from "@/lib/email/email";

import {
  buildNewFollowerEmail,
  newFollowerSubject,
} from "@/lib/email/templates/newFollower";

import {
  buildFollowedMatchReportEmail,
  followedMatchReportSubject,
} from "@/lib/email/templates/followedMatchReport";

import {
  buildFollowedAvatarChangeEmail,
  followedAvatarChangeSubject,
} from "@/lib/email/templates/followedAvatarChange";

import {
  buildFollowedProfileUpdateEmail,
  followedProfileUpdateSubject,
} from "@/lib/email/templates/followedProfileUpdate";

/* ---------------- helpers ---------------- */

const bool = (v, fallback = false) =>
  typeof v === "boolean" ? v : v == null ? fallback : !!v;

function profileUrlOf(username) {
  const base =
    process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${base}/${encodeURIComponent(username)}`;
}

function safeFullName(u) {
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ");
}

async function createInApp({ userId, type, title, body, link, actorId }) {
  try {
    await Notification.create({
      user: userId, // REQUIRED by your schema
      actor: actorId || undefined,
      notificationType: type, // REQUIRED
      notificationTitle: title || "",
      notificationBody: body || "",
      notificationLink: link || "",
      isRead: false,
    });
  } catch (e) {
    console.warn("[notifyFollowers] in-app create failed:", e?.message);
  }
}

/* -------------------------------------------------------------------------- */
/* main                                                                      */
/* -------------------------------------------------------------------------- */

export async function notifyFollowers(actorUserId, kind, payload = {}) {
  await connectDB();

  // Minimal actor details (for “followed.*” fanout & display)
  const actor = await User.findById(actorUserId, {
    _id: 1,
    username: 1,
    firstName: 1,
    lastName: 1,
  }).lean();
  if (!actor) return;

  const actorName = safeFullName(actor) || actor.username;

  switch (kind) {
    /* ------------------------------------------------------------------ *
     * A) Someone followed a user
     *    payload: { recipientUserId, followerUser }
     * ------------------------------------------------------------------ */
    case "followers.newFollower": {
      const { recipientUserId, followerUser } = payload || {};
      if (!recipientUserId || !followerUser) return;

      const recipient = await User.findById(recipientUserId, {
        _id: 1,
        email: 1,
        username: 1,
        notificationSettings: 1,
      }).lean();
      if (!recipient) return;

      const prefs = recipient?.notificationSettings?.followers?.newFollower;
      const allowInApp = bool(prefs?.inApp, true);
      const allowEmail = bool(prefs?.email, false);

      const followerName = safeFullName(followerUser) || followerUser.username;
      const link = profileUrlOf(followerUser.username);

      if (allowInApp) {
        await createInApp({
          userId: recipient._id,
          actorId: followerUser._id,
          type: "followers.newFollower",
          title: "New follower",
          body: `${followerName} (@${followerUser.username}) started following you.`,
          link,
        });
      }

      if (allowEmail && recipient.email) {
        try {
          const html = buildNewFollowerEmail({
            actorUsername: followerUser.username,
            actorName: followerName,
            profileUrl: link,
          });
          await sendEmail({
            to: recipient.email,
            subject: newFollowerSubject,
            html,
          });
        } catch (e) {
          console.warn(
            "[notifyFollowers] newFollower email failed:",
            e?.message
          );
        }
      }
      return;
    }

    /* ------------------------------------------------------------------ *
     * B) Someone followed a family member (notify the owner)
     *    payload: { family, followerUser }
     * ------------------------------------------------------------------ */
    case "followers.newFollower.family": {
      const { family, followerUser } = payload || {};
      if (!family || !family.userId || !followerUser) return;

      const owner = await User.findById(family.userId, {
        _id: 1,
        email: 1,
        username: 1,
        notificationSettings: 1,
      }).lean();
      if (!owner) return;

      // Reuse the same prefs group as a normal new follower
      const prefs = owner?.notificationSettings?.followers?.newFollower;
      const allowInApp = bool(prefs?.inApp, true);
      const allowEmail = bool(prefs?.email, false);

      const followerName = safeFullName(followerUser) || followerUser.username;
      const familyName = safeFullName(family) || family.username;

      const followerLink = profileUrlOf(followerUser.username);

      if (allowInApp) {
        await createInApp({
          userId: owner._id,
          actorId: followerUser._id,
          type: "followers.newFollower.family",
          title: "New follower (family)",
          body: `${followerName} (@${followerUser.username}) started following your family member ${familyName} (@${family.username}).`,
          link: followerLink,
        });
      }

      if (allowEmail && owner.email) {
        try {
          const subject = `New follower for ${familyName}`;
          const html = `
            <p><strong>${followerName}</strong> (@${followerUser.username}) started following your family member <strong>${familyName}</strong> (@${family.username}).</p>
            <p><a href="${followerLink}">View their profile</a></p>
          `;
          await sendEmail({
            to: owner.email,
            subject,
            html,
          });
        } catch (e) {
          console.warn(
            "[notifyFollowers] newFollower.family email failed:",
            e?.message
          );
        }
      }
      return;
    }

    /* ------------------------------------------------------------------ *
     * C) Followed user created a match report
     *    payload: { matchReportId?, matchType?, eventName?, matchDate? }
     * ------------------------------------------------------------------ */
    case "followed.match_report.created": {
      // Prefer new schema (targetType + followingUserId), fallback to legacy field
      const links = await Follow.find(
        {
          $or: [
            { targetType: "user", followingUserId: actor._id },
            { followingId: actor._id }, // legacy fallback
          ],
        },
        { followerId: 1 }
      ).lean();
      if (!links?.length) return;

      const followerIds = links.map((l) => l.followerId).filter(Boolean);
      const followers = await User.find(
        { _id: { $in: followerIds } },
        { _id: 1, email: 1, username: 1, notificationSettings: 1 }
      ).lean();

      const matchType = (payload.matchType || "").trim();
      const eventName = (payload.eventName || "").trim();
      const matchDateISO = payload.matchDate || null;
      const dateText = matchDateISO
        ? new Date(matchDateISO).toLocaleDateString()
        : "";

      const link = `${profileUrlOf(actor.username)}/match-reports${
        matchType ? `?style=${encodeURIComponent(matchType)}` : ""
      }`;

      const title = `New match report from ${actorName}`;
      const bodyParts = [
        matchType ? `Style: ${matchType}` : null,
        eventName ? `Event: ${eventName}` : null,
        dateText ? `Date: ${dateText}` : null,
      ].filter(Boolean);
      const bodyText =
        bodyParts.length > 0
          ? `${actorName} posted a new match report. ${bodyParts.join(" • ")}.`
          : `${actorName} posted a new match report.`;

      await Promise.all(
        followers.map(async (f) => {
          const prefs = f?.notificationSettings?.followed?.matchReports;
          const allowInApp = bool(prefs?.inApp, true);
          const allowEmail = bool(prefs?.email, false);

          if (allowInApp) {
            await createInApp({
              userId: f._id,
              actorId: actor._id,
              type: "followed.match_report.created",
              title,
              body: bodyText,
              link,
            });
          }

          if (allowEmail && f.email) {
            try {
              const html = buildFollowedMatchReportEmail({
                actorName,
                actorUsername: actor.username,
                matchType,
                eventName,
                matchDate: matchDateISO,
                link,
              });
              await sendEmail({
                to: f.email,
                subject: followedMatchReportSubject(actorName),
                html,
              });
            } catch (e) {
              console.warn(
                "[notifyFollowers] matchReport email failed:",
                e?.message
              );
            }
          }
        })
      );
      return;
    }

    /* ------------------------------------------------------------------ *
     * D) Followed user changed avatar
     *    payload: { url? }  (we’ll build link to profile anyway)
     * ------------------------------------------------------------------ */
    case "followed.avatar.changed": {
      const links = await Follow.find(
        {
          $or: [
            { targetType: "user", followingUserId: actor._id },
            { followingId: actor._id }, // legacy
          ],
        },
        { followerId: 1 }
      ).lean();
      if (!links?.length) return;

      const followerIds = links.map((l) => l.followerId).filter(Boolean);
      const followers = await User.find(
        { _id: { $in: followerIds } },
        { _id: 1, email: 1, username: 1, notificationSettings: 1 }
      ).lean();

      const link = profileUrlOf(actor.username);
      const title = `${actorName} updated their profile photo`;
      const bodyText = `${actorName} just changed their profile picture.`;

      await Promise.all(
        followers.map(async (f) => {
          const prefs = f?.notificationSettings?.followed?.avatarChanges;
          const allowInApp = bool(prefs?.inApp, true);
          const allowEmail = bool(prefs?.email, false);

          if (allowInApp) {
            await createInApp({
              userId: f._id,
              actorId: actor._id,
              type: "followed.avatar.changed",
              title,
              body: bodyText,
              link,
            });
          }

          if (allowEmail && f.email) {
            try {
              const html = buildFollowedAvatarChangeEmail({
                actorName,
                actorUsername: actor.username,
                link,
              });
              await sendEmail({
                to: f.email,
                subject: followedAvatarChangeSubject(actorName),
                html,
              });
            } catch (e) {
              console.warn(
                "[notifyFollowers] avatarChange email failed:",
                e?.message
              );
            }
          }
        })
      );
      return;
    }

    /* ------------------------------------------------------------------ *
     * E) Followed user updated profile fields
     *    payload: { changedFields: [{key, oldValue, newValue}], url? }
     * ------------------------------------------------------------------ */
    case "followed.profile.updated": {
      const links = await Follow.find(
        {
          $or: [
            { targetType: "user", followingUserId: actor._id },
            { followingId: actor._id }, // legacy
          ],
        },
        { followerId: 1 }
      ).lean();
      if (!links?.length) return;

      const followerIds = links.map((l) => l.followerId).filter(Boolean);
      const followers = await User.find(
        { _id: { $in: followerIds } },
        { _id: 1, email: 1, username: 1, notificationSettings: 1 }
      ).lean();

      const changed = Array.isArray(payload.changedFields)
        ? payload.changedFields
        : [];
      const link = profileUrlOf(actor.username);

      const title = `${actorName} updated their profile`;
      const summary =
        changed.length > 0
          ? changed
              .slice(0, 3)
              .map((c) => c.key)
              .join(", ")
          : "profile details";

      const bodyText = `${actorName} updated ${summary}.`;

      await Promise.all(
        followers.map(async (f) => {
          const prefs = f?.notificationSettings?.followed?.profileUpdates;
          const allowInApp = bool(prefs?.inApp, true);
          const allowEmail = bool(prefs?.email, false);

          if (allowInApp) {
            await createInApp({
              userId: f._id,
              actorId: actor._id,
              type: "followed.profile.updated",
              title,
              body: bodyText,
              link,
            });
          }

          if (allowEmail && f.email) {
            try {
              const html = buildFollowedProfileUpdateEmail({
                actorName,
                actorUsername: actor.username,
                changedFields: changed,
                link,
              });
              await sendEmail({
                to: f.email,
                subject: followedProfileUpdateSubject(actorName),
                html,
              });
            } catch (e) {
              console.warn(
                "[notifyFollowers] profileUpdate email failed:",
                e?.message
              );
            }
          }
        })
      );
      return;
    }

    default:
      return;
  }
}
