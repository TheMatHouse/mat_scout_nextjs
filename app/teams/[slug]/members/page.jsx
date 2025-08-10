"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
import MemberRow from "@/components/teams/MemberRow";
import Spinner from "@/components/shared/Spinner";
import ModalLayout from "@/components/shared/ModalLayout";
import InviteMemberForm from "@/components/teams/forms/InviteMemberForm";

export default function MembersPage() {
  const params = useParams();
  const slug = params.slug;

  const { team } = useTeam();
  const { user } = useUser();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error("Error loading members:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading your team members...
        </p>
      </div>
    );
  }

  const currentUserMembership = members.find((m) => m.userId === user?._id);
  const isManager = currentUserMembership?.role === "manager";
  const isCoach = currentUserMembership?.role === "coach";

  const pending = members.filter((m) => m.role === "pending");
  const active = members.filter((m) =>
    ["member", "manager", "coach"].includes(m.role)
  );

  const managerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "Team Manager";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Members
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Manage pending requests and team members.
          </p>
        </div>

        {(isManager || isCoach) && (
          <button
            onClick={() => setInviteOpen(true)}
            className="btn btn-primary"
          >
            Invite members
          </button>
        )}
      </div>

      <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Pending Requests
        </h2>
        {pending.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pending.map((m) => (
              <div
                key={m.id}
                className="py-3"
              >
                <MemberRow
                  member={m}
                  slug={slug}
                  isManager={isManager}
                  onRoleChange={fetchMembers}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No pending requests.
          </p>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Active Members
        </h2>
        {active.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {active.map((m) => (
              <div
                key={m.id}
                className="py-3"
              >
                <MemberRow
                  member={m}
                  slug={slug}
                  isManager={isManager}
                  onRoleChange={fetchMembers}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No active members yet.
          </p>
        )}
      </section>

      <ModalLayout
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        description="Send an invitation to join this team."
        withCard
      >
        {/* Invite form with team + manager name for default message */}
        <InviteMemberForm
          slug={slug}
          setOpen={setInviteOpen}
          onSuccess={fetchMembers}
          team={team}
          managerName={managerName}
        />
      </ModalLayout>
    </div>
  );
}
