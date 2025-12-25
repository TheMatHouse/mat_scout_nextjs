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
  console.log("test");
  await connectDB();

  const { inviteId } = await params;

  const invite = await TeamInvitation.findById(inviteId).lean();
  if (!invite) notFound();

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

  const now = new Date();

  /* ------------------------------------------------------------
     Revoked
  ------------------------------------------------------------ */
  if (invite.status === "revoked") {
    return (
      <InviteMessage
        title="Invitation Revoked"
        message="This invitation was revoked by the team manager."
      >
        <RequestNewInvite teamId={invite.teamId} />
      </InviteMessage>
    );
  }

  /* ------------------------------------------------------------
     Expired
  ------------------------------------------------------------ */
  if (invite.expiresAt && invite.expiresAt < now) {
    return (
      <InviteMessage
        title="Invitation Expired"
        message="This invitation has expired."
      >
        <RequestNewInvite teamId={invite.teamId} />
      </InviteMessage>
    );
  }

  /* ------------------------------------------------------------
     Already used
  ------------------------------------------------------------ */
  if (invite.status !== "pending") {
    return (
      <InviteMessage
        title="Invitation Unavailable"
        message="This invitation has already been used or is no longer valid."
      />
    );
  }

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  /* ------------------------------------------------------------
     Not logged in
  ------------------------------------------------------------ */
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

  /* ------------------------------------------------------------
     Wrong email
  ------------------------------------------------------------ */
  if (invite.email !== user.email.toLowerCase()) {
    return (
      <InviteMessage
        title="Wrong Account"
        message={`This invitation was sent to ${invite.email}. You are logged in as ${user.email}.`}
      />
    );
  }

  /* ------------------------------------------------------------
     Valid pending invite
  ------------------------------------------------------------ */
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

const InviteMessage = ({ title, message, children }) => {
  return (
    <InviteContainer>
      <h1 className="text-xl font-bold mb-3">{title}</h1>
      <p className="mb-4">{message}</p>
      {children}
    </InviteContainer>
  );
};

const RequestNewInvite = ({ teamId }) => {
  const handleRequest = async () => {
    try {
      await fetch("/api/invites/request-new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });

      alert("Request sent to the team managers.");
    } catch {
      alert("Failed to send request. Please contact the team manager.");
    }
  };

  return (
    <button
      onClick={handleRequest}
      className="btn btn-secondary"
    >
      Request a new invitation
    </button>
  );
};
