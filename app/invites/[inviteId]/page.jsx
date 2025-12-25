export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import TeamInvitation from "@/models/teamInvitationModel";
import Team from "@/models/teamModel";

import AcceptInviteButton from "./AcceptInviteButton";
import DeclineInviteButton from "./DeclineInviteButton";

/* ============================================================
   Invite Page (Server Component)
============================================================ */

const InvitePage = async ({ params }) => {
  await connectDB();

  // ✅ Next.js 15+ requirement
  const { inviteId } = await params;

  if (!inviteId) {
    notFound();
  }

  const invite = await TeamInvitation.findById(inviteId).lean();
  if (!invite) {
    notFound();
  }

  // ------------------------------------------------------------
  // Invalid / non-pending states
  // ------------------------------------------------------------
  if (invite.status !== "pending") {
    return (
      <InviteMessage
        title="Invitation Unavailable"
        message="This invitation has already been used, revoked, or declined."
      />
    );
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return (
      <InviteMessage
        title="Invitation Expired"
        message="This invitation has expired."
      />
    );
  }

  const team = await Team.findById(invite.teamId)
    .select("teamName teamSlug")
    .lean();

  if (!team) {
    return (
      <InviteMessage
        title="Team Not Found"
        message="This team no longer exists."
      />
    );
  }

  const user = await getCurrentUser();

  // ------------------------------------------------------------
  // Not logged in
  // ------------------------------------------------------------
  if (!user) {
    const redirectTo = `/invites/${inviteId}`;

    return (
      <InviteContainer>
        <h1 className="text-2xl font-bold mb-4">
          You’ve been invited to join {team.teamName}
        </h1>

        <p className="mb-6">
          Please sign in or create an account to respond to this invitation.
        </p>

        <div className="flex gap-4">
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="btn btn-primary"
          >
            Log In
          </Link>
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
            className="btn btn-secondary"
          >
            Create Account
          </Link>
        </div>
      </InviteContainer>
    );
  }

  // ------------------------------------------------------------
  // Wrong account
  // ------------------------------------------------------------
  if (invite.email !== user.email.toLowerCase()) {
    return (
      <InviteMessage
        title="Wrong Account"
        message={`This invitation was sent to ${invite.email}. You are logged in as ${user.email}.`}
      />
    );
  }

  // ------------------------------------------------------------
  // Valid invite
  // ------------------------------------------------------------
  return (
    <InviteContainer>
      <h1 className="text-2xl font-bold mb-2">
        You’ve been invited to join {team.teamName}
      </h1>

      <p className="mb-6">
        Role: <strong>{invite.payload?.role || "member"}</strong>
      </p>

      <div className="flex gap-4">
        <AcceptInviteButton inviteId={inviteId} />
        <DeclineInviteButton inviteId={inviteId} />
      </div>
    </InviteContainer>
  );
};

export default InvitePage;

/* ============================================================
   Components
============================================================ */

const InviteContainer = ({ children }) => {
  return (
    <div className="max-w-xl mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      {children}
    </div>
  );
};

const InviteMessage = ({ title, message }) => {
  return (
    <InviteContainer>
      <h1 className="text-xl font-bold mb-3">{title}</h1>
      <p>{message}</p>
    </InviteContainer>
  );
};
