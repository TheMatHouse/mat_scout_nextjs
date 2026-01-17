export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import PendingPrivateShareInvite from "@/models/pendingPrivateShareInviteModel";
import PrivateShare from "@/models/privateShareModel";
import User from "@/models/userModel";

/* ============================================================
   Share Invite Page (Server Component, Auto-Accept)
============================================================ */
const ShareInvitePage = async ({ params }) => {
  await connectDB();

  const { token } = await params;
  if (!token) notFound();

  const invite = await PendingPrivateShareInvite.findOne({ token }).lean();
  if (!invite) notFound();

  /* ------------------------------------------------------------
     Expiration check
  ------------------------------------------------------------ */
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return (
      <InviteContainer>
        <InviteMessage
          title="Invite Expired"
          message="This sharing invite has expired."
        />
      </InviteContainer>
    );
  }

  const user = await getCurrentUser();

  /* ------------------------------------------------------------
     Not logged in → show auth options
  ------------------------------------------------------------ */
  if (!user) {
    const redirectTo = `/share/${token}`;

    return (
      <InviteContainer>
        <h1 className="text-2xl font-bold mb-4">
          You’ve been invited to view shared reports
        </h1>

        <p className="mb-6">
          Please sign in or create an account to access this content.
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
     Wrong account (email mismatch)
  ------------------------------------------------------------ */
  if (invite.email !== user.email.toLowerCase()) {
    return (
      <InviteContainer>
        <InviteMessage
          title="Wrong Account"
          message={`This invite was sent to ${invite.email}. You are logged in as ${user.email}.`}
        />

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Please log out and sign in with the correct email address.
        </p>
      </InviteContainer>
    );
  }

  /* ------------------------------------------------------------
     AUTO-ACCEPT (server-side, idempotent)
  ------------------------------------------------------------ */
  await PrivateShare.updateOne(
    {
      ownerId: invite.ownerId,
      documentType: invite.documentType,
      scope: invite.scope,
      ...(invite.documentId && { documentId: invite.documentId }),
      "sharedWith.athleteType": "user",
      "sharedWith.athleteId": user._id,
    },
    {
      $setOnInsert: {
        ownerId: invite.ownerId,
        documentType: invite.documentType,
        scope: invite.scope,
        ...(invite.documentId && { documentId: invite.documentId }),
        sharedWith: {
          athleteType: "user",
          athleteId: user._id,
        },
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  await PendingPrivateShareInvite.updateOne(
    { _id: invite._id },
    {
      $set: {
        acceptedAt: new Date(),
        acceptedByUserId: user._id,
      },
    }
  );

  /* ------------------------------------------------------------
     Redirect to shared content
  ------------------------------------------------------------ */
  redirect("/dashboard/matches?view=shared");
};

export default ShareInvitePage;

/* ============================================================
   UI Helpers
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
    <>
      <h1 className="text-xl font-bold mb-3">{title}</h1>
      <p>{message}</p>
    </>
  );
};
