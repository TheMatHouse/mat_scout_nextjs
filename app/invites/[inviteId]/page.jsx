export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import TeamInvitation from "@/models/teamInvitationModel";
import Team from "@/models/teamModel";
import AcceptInviteButton from "./AcceptInviteButton";

/* ============================================================
   Invite Page (Server Component)
============================================================ */
export default async function InvitePage({ params }) {
  await connectDB();

  const { inviteId } = await params;

  const invite = await TeamInvitation.findById(inviteId).lean();
  if (!invite) {
    notFound();
  }

  if (invite.status !== "pending") {
    return (
      <InviteMessage
        title="Invitation Unavailable"
        message="This invitation has already been used or is no longer valid."
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

  // If not logged in → prompt login/register with redirect back
  if (!user) {
    const redirectTo = `/invites/${inviteId}`;

    return (
      <InviteContainer>
        <h1 className="text-2xl font-bold mb-4">
          You’ve been invited to join {team.teamName}
        </h1>

        <p className="mb-6">
          Please sign in or create an account to accept this invitation.
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

  // Logged in — ensure email matches
  if (invite.email !== user.email.toLowerCase()) {
    return (
      <InviteMessage
        title="Wrong Account"
        message={`This invitation was sent to ${invite.email}. You are currently logged in as ${user.email}.`}
      />
    );
  }

  return (
    <InviteContainer>
      <h1 className="text-2xl font-bold mb-2">
        You’ve been invited to join {team.teamName}
      </h1>

      <p className="mb-4">
        Role: <strong>{invite.role || "member"}</strong>
      </p>

      <AcceptInviteButton inviteId={inviteId} />
    </InviteContainer>
  );
}

/* ============================================================
   Components
============================================================ */

function InviteContainer({ children }) {
  return (
    <div className="max-w-xl mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      {children}
    </div>
  );
}

function InviteMessage({ title, message }) {
  return (
    <InviteContainer>
      <h1 className="text-xl font-bold mb-3">{title}</h1>
      <p>{message}</p>
    </InviteContainer>
  );
}
