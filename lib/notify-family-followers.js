import Follow from "@/models/followModel";
import FamilyMember from "@/models/familyMemberModel";
import User from "@/models/userModel";
import Notification from "@/models/notification";
import { sendEmail } from "@/lib/email/email";

/** 24-char hex test for ObjectId-ish */
function looksLikeObjectIdString(v) {
  return typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v.trim());
}

/** Exact, case-insensitive username regex */
function exactI(v) {
  if (typeof v !== "string") return null;
  const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

/** Resolve FamilyMember by _id (string or ObjectId) OR username */
async function resolveFamilyMember(familyIdOrUsername) {
  if (!familyIdOrUsername) return null;

  // If it's an ObjectId object (or anything Mongoose can accept), try findById first
  if (typeof familyIdOrUsername !== "string") {
    try {
      const famByObj = await FamilyMember.findById(familyIdOrUsername)
        .select("_id userId firstName lastName username")
        .lean();
      if (famByObj) return famByObj;
    } catch {
      // fall through
    }
  }

  // If it's a 24-hex string, try findById
  if (looksLikeObjectIdString(familyIdOrUsername)) {
    const famById = await FamilyMember.findById(familyIdOrUsername)
      .select("_id userId firstName lastName username")
      .lean();
    if (famById) return famById;
  }

  // Finally treat as username
  const rx = exactI(String(familyIdOrUsername));
  if (!rx) return null;
  const famByUsername = await FamilyMember.findOne({ username: rx })
    .select("_id userId firstName lastName username")
    .lean();
  return famByUsername || null;
}

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

  // Cover new + legacy follow shapes in a single query
  const orShapes = [
    { targetType: "family", followingFamilyId: fam._id },
    { targetType: "family", followingId: fam._id },
    { targetType: "family", followingFamilyUsername: fam.username },
    // missing targetType:
    { followingFamilyId: fam._id },
    { followingId: fam._id },
    { followingFamilyUsername: fam.username },
    // super-legacy alternates:
    { targetType: "family", targetId: fam._id },
    { targetType: "family", targetUsername: fam.username },
    { entityId: fam._id },
  ];

  const follows = await Follow.find({ $or: orShapes })
    .select("followerId")
    .lean();

  console.log(
    `[notifyFamilyFollowers] family=@${fam.username} _id=${
      fam._id
    } followersFound=${follows?.length || 0}`
  );
  if (!follows?.length) return;

  // Distinct followerIds
  const followerIds = [
    ...new Set(
      (follows || [])
        .map((f) => String(f.followerId || ""))
        .filter((s) => s.length > 0)
    ),
  ];

  const displayName =
    `${fam.firstName || ""} ${fam.lastName || ""}`.trim() || "Family member";

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";
  const relativeLink =
    typeof payload.link === "string" && payload.link.trim()
      ? payload.link.trim()
      : `/family/${fam.username}`;
  const absoluteLink = appBase
    ? `${appBase.replace(/\/$/, "")}${relativeLink}`
    : relativeLink;

  // Map event type to prefs bucket
  const prefKeyByType = {
    family_match_report_created: "match",
    family_style_created: "style",
    family_avatar_updated: "profile",
    family_profile_updated: "profile",
  };
  const prefKey = prefKeyByType[type] || "profile";

  // Subject + body strings
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
    `[notifyFamilyFollowers] type=${type} notifying=${followerIds.length} prefKey=${prefKey} link=${relativeLink}`
  );

  await Promise.allSettled(
    followerIds.map(async (uid) => {
      const recipient = await User.findById(uid)
        .select("email notificationPrefs username firstName lastName")
        .lean();
      if (!recipient) return;

      // Don’t notify the actor if they follow their own family member
      if (actorUserId && String(recipient._id) === String(actorUserId)) return;

      const prefs = recipient.notificationPrefs || {};
      const appOn = prefs?.[prefKey]?.app !== false; // default ON
      const emailOn = prefs?.[prefKey]?.email !== false; // default ON

      console.log(
        `[notifyFamilyFollowers] -> to=${
          recipient.username || recipient._id
        } appOn=${appOn} emailOn=${emailOn} hasEmail=${!!recipient.email}`
      );

      if (appOn) {
        await Notification.create({
          user: recipient._id,
          notificationType: type,
          notificationBody: notifBody,
          notificationLink: relativeLink, // store relative
        });
      }

      if (emailOn && recipient.email) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: emailSubject,
            html: `
              <p>${notifBody}</p>
              <p><a href="${absoluteLink}">View</a></p>
            `,
          });
        } catch (e) {
          console.error(
            `[notifyFamilyFollowers] sendEmail failed (${type}) -> ${recipient.email}:`,
            e?.message
          );
        }
      }
    })
  );
}
