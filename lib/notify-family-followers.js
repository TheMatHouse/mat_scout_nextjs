// lib/notify-family-followers.js
import Follow from "@/models/followModel";
import FamilyMember from "@/models/familyMemberModel";
import User from "@/models/userModel";
import Notification from "@/models/notification";
import { sendEmail } from "@/lib/email/email";

/** Heuristic: is this a 24-char hex string (likely an ObjectId)? */
function looksLikeObjectId(v) {
  return typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v.trim());
}

/** Case-insensitive exact username regex */
function exactI(v) {
  if (typeof v !== "string") return null;
  const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

/**
 * Resolve a FamilyMember by _id or username.
 * Accepts either an ObjectId-like string or a username string.
 */
async function resolveFamilyMember(familyIdOrUsername) {
  if (!familyIdOrUsername) return null;

  // Try ObjectId path first
  if (looksLikeObjectId(familyIdOrUsername)) {
    const fam = await FamilyMember.findById(familyIdOrUsername)
      .select("_id userId firstName lastName username")
      .lean();
    if (fam) return fam;
  }

  // Fallback: treat as username
  const rx = exactI(String(familyIdOrUsername));
  if (!rx) return null;
  const famByUsername = await FamilyMember.findOne({ username: rx })
    .select("_id userId firstName lastName username")
    .lean();
  return famByUsername || null;
}

/**
 * Fan-out to followers of a FamilyMember for activity events.
 *
 * @param {Object} args
 * @param {string|import("mongoose").Types.ObjectId} args.familyId  // may be FamilyMember _id OR username
 * @param {string} args.type  // "family_match_report_created" | "family_style_created" | "family_avatar_updated" | "family_profile_updated"
 * @param {string|import("mongoose").Types.ObjectId} [args.actorUserId] // user who caused the event
 * @param {Object} [args.payload] // optional extra data (e.g. styleName, reportId, link override)
 */
export async function notifyFamilyFollowers({
  familyId,
  type,
  actorUserId,
  payload = {},
}) {
  if (!familyId || !type) return;

  const fam = await resolveFamilyMember(familyId);
  if (!fam) {
    console.log(
      "[notifyFamilyFollowers] could not resolve family member from:",
      familyId
    );
    return;
  }

  const follows = await Follow.find({
    targetType: "family",
    followingFamilyId: fam._id,
  })
    .select("followerId")
    .lean();

  if (!follows?.length) {
    console.log(
      `[notifyFamilyFollowers] no followers for familyId=${fam._id} (@${fam.username})`
    );
    return;
  }

  const displayName =
    `${fam.firstName || ""} ${fam.lastName || ""}`.trim() || "Family member";

  // Default link to family profile unless overridden
  const link =
    typeof payload.link === "string" && payload.link.trim()
      ? payload.link.trim()
      : `/family/${fam.username}`;

  // Map event type to a preference key in notificationPrefs
  const prefKeyByType = {
    family_match_report_created: "match",
    family_style_created: "style",
    family_avatar_updated: "profile",
    family_profile_updated: "profile",
  };
  const prefKey = prefKeyByType[type] || "profile";

  // Build message strings
  let notifBody = "";
  let emailSubject = "";

  switch (type) {
    case "family_match_report_created":
      notifBody = `${displayName} posted a new match report.`;
      emailSubject = `${displayName} posted a new match report`;
      break;
    case "family_style_created":
      notifBody = `${displayName} added a new style${
        payload?.styleName ? `: ${payload.styleName}` : ""
      }.`;
      emailSubject = `${displayName} added a new style`;
      break;
    case "family_avatar_updated":
      notifBody = `${displayName} updated their avatar.`;
      emailSubject = `${displayName} updated their avatar`;
      break;
    case "family_profile_updated":
    default:
      notifBody = `${displayName} updated their profile.`;
      emailSubject = `${displayName} updated their profile`;
      break;
  }

  console.log(
    `[notifyFamilyFollowers] fanout type=${type} fam=@${fam.username} followers=${follows.length} prefKey=${prefKey}`
  );

  await Promise.allSettled(
    follows.map(async ({ followerId }) => {
      const recipient = await User.findById(followerId)
        .select("email notificationPrefs username displayName")
        .lean();
      if (!recipient) return;

      // Optional: don't notify the actor if they follow their own family member
      if (actorUserId && String(recipient._id) === String(actorUserId)) return;

      // Respect prefs: default ON unless explicitly disabled
      const appOn = recipient?.notificationPrefs?.[prefKey]?.app !== false;
      const emailOn = recipient?.notificationPrefs?.[prefKey]?.email !== false;

      console.log(
        `[notifyFamilyFollowers] -> user=${
          recipient.username || recipient._id
        } appOn=${appOn} emailOn=${emailOn} hasEmail=${!!recipient.email}`
      );

      if (appOn) {
        await Notification.create({
          user: recipient._id,
          notificationType: type,
          notificationBody: notifBody,
          notificationLink: link,
        });
      }

      if (emailOn && recipient.email) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: emailSubject,
            html: `
              <p><strong>${displayName}</strong> ${notifBody.replace(
              `${displayName} `,
              ""
            )}</p>
              <p><a href="${
                (process.env.NEXT_PUBLIC_APP_URL || "") + link
              }">View</a></p>
            `,
          });
          console.log(
            `[notifyFamilyFollowers] email sent (${type}) -> ${recipient.email}`
          );
        } catch (e) {
          console.error(
            `[notifyFamilyFollowers] sendEmail failed (${type}) -> ${recipient.email}:`,
            e?.message
          );
        }
      } else {
        if (!emailOn) {
          console.log(
            `[notifyFamilyFollowers] email skipped (${type}) for ${
              recipient.username || recipient._id
            }: emailOn=false`
          );
        } else if (!recipient.email) {
          console.log(
            `[notifyFamilyFollowers] email skipped (${type}) for ${
              recipient.username || recipient._id
            }: missing recipient.email`
          );
        }
      }
    })
  );
}
