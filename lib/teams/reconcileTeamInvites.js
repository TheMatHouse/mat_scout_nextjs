// /lib/invites/reconcileTeamInvites.js
import { connectDB } from "@/lib/mongo";
import TeamInvitation from "@/models/teamInvitationModel";
import TeamMember from "@/models/teamMemberModel";

/**
 * Reconcile invites for the (teamId, user/email).
 * If a pending invite exists for the email that now belongs to an active TeamMember,
 * mark it accepted and link to the member.
 */
export async function reconcileTeamInvites({
  teamId,
  userId,
  email,
  acceptedByUserId,
}) {
  await connectDB();

  let member = null;
  if (userId) {
    member = await TeamMember.findOne({
      team: teamId,
      user: userId,
      role: { $ne: "pending" },
    }).select("_id user role");
  }
  // Normalize email
  const normEmail = (email || "").trim().toLowerCase();

  const pendingInvites = await TeamInvitation.find({
    team: teamId,
    status: "pending",
    ...(normEmail ? { email: normEmail } : {}),
  });

  if (!pendingInvites.length) return { updated: 0 };

  // If we didn't find a non-pending TeamMember above and we only have an email,
  // try to find an active member by that email.
  if (!member && normEmail) {
    member = await TeamMember.findOne({
      team: teamId,
      role: { $ne: "pending" },
    })
      .populate({ path: "user", select: "email" })
      .then((m) =>
        m && m.user && m.user.email?.toLowerCase() === normEmail ? m : null
      );
  }

  const updates = await Promise.all(
    pendingInvites.map(async (inv) => {
      inv.status = "accepted";
      inv.acceptedAt = new Date();
      if (acceptedByUserId) inv.acceptedBy = acceptedByUserId;
      if (member?._id) inv.acceptedMember = member._id;
      return inv.save();
    })
  );

  return { updated: updates.length };
}
