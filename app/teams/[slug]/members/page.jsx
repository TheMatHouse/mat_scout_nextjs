// app/(teams)/team/[slug]/members/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
import MemberRow from "@/components/teams/MemberRow";
import Spinner from "@/components/shared/Spinner";
import ModalLayout from "@/components/shared/ModalLayout";
import InviteMemberForm from "@/components/teams/forms/InviteMemberForm";
import InvitesTable from "@/components/teams/InvitesTable";
import { toast } from "react-toastify";

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const { team } = useTeam();
  const { user } = useUser();

  const [viewerRole, setViewerRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invitations state (staff only)
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const parseJsonSafe = async (res) => {
    const txt = await res.text();
    try {
      return { data: JSON.parse(txt), raw: txt };
    } catch {
      return { data: null, raw: txt };
    }
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`, {
        cache: "no-store",
      });

      // Handle auth/forbidden early
      if (res.status === 401 || res.status === 403) {
        toast.error("You are not authorized to view team members.");
        router.replace(`/teams/${slug}`);
        return;
      }

      const { data } = await parseJsonSafe(res);

      if (!res.ok) {
        const msg =
          data?.error || data?.message || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      setViewerRole(data?.viewerRole || null);
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (e) {
      console.error("Error loading members:", e);
      toast.error("Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/invites?ts=${Date.now()}`, {
        cache: "no-store",
      });

      const { data } = await parseJsonSafe(res);
      if (!res.ok) {
        setInvites([]);
        return;
      }

      setInvites(Array.isArray(data?.invites) ? data.invites : []);
    } catch {
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

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

  const isStaff = ["owner", "manager", "coach"].includes(
    (viewerRole || "").toLowerCase()
  );

  const pending = members.filter((m) => m.role === "pending");
  const active = members.filter((m) =>
    ["member", "manager", "coach"].includes(m.role)
  );

  const managerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "Team Manager";

  const handleResendInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/teams/${slug}/invites/${inviteId}/resend`, {
        method: "POST",
      });
      const { data } = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.message || "Failed to resend invite");
      toast.success("Invitation resent.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not resend invite.");
    } finally {
      fetchInvites();
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/teams/${slug}/invites/${inviteId}/revoke`, {
        method: "POST",
      });
      const { data } = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.message || "Failed to revoke invite");
      toast.success(data?.message || "Invitation revoked.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not revoke invite.");
    } finally {
      fetchInvites();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* Header that wraps cleanly on small screens */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Team Members
          </h1>
          <p className="text-gray-600 dark:text-gray-200 text-sm mt-1">
            {isStaff
              ? "Manage pending requests and team members."
              : "View the team roster."}
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setInviteOpen(true)}
            className="btn btn-primary self-start sm:self-auto shrink-0"
          >
            Invite members
          </button>
        )}
      </div>

      {/* Pending Invitations (staff only) */}
      {isStaff && (
        <InvitesTable
          slug={slug}
          invites={invites}
          loading={invitesLoading}
          onResend={handleResendInvite}
          onRevoke={handleRevokeInvite}
        />
      )}

      {/* Pending Requests (staff only) */}
      {isStaff && (
        <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Pending Requests
          </h2>

          {/* Horizontal scroll safety wrapper on small screens */}
          <div className="overflow-x-hidden">
            <div className="px-5">
              {pending.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pending.map((m) => (
                    <div
                      key={m.id}
                      className="py-3"
                    >
                      {/* Each row can be wider than viewport; allow row to layout naturally */}
                      <div className="min-w-[640px] sm:min-w-0">
                        <MemberRow
                          member={m}
                          slug={slug}
                          isManager={isStaff && !m.isOwner}
                          onRoleChange={() => {
                            fetchMembers();
                            fetchInvites();
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-200 text-sm">
                  No pending requests.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Active Members (everyone) */}
      <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Active Members
        </h2>

        {/* Horizontal scroll safety wrapper on small screens */}
        <div className="overflow-x-hidden">
          <div className="px-5">
            {active.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {active.map((m) => (
                  <div
                    key={m.id}
                    className="py-3"
                  >
                    <div className="min-w-[640px] sm:min-w-0">
                      <MemberRow
                        member={m}
                        slug={slug}
                        isManager={isStaff && !m.isOwner /* lock owner row */}
                        onRoleChange={fetchMembers}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-200 text-sm">
                No active members yet.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Invite modal (staff only) */}
      <ModalLayout
        isOpen={isStaff && inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        description="Send an invitation to join this team."
        withCard
      >
        <InviteMemberForm
          slug={slug}
          setOpen={setInviteOpen}
          onSuccess={() => {
            fetchInvites();
            fetchMembers();
          }}
          team={team}
          managerName={managerName}
        />
      </ModalLayout>
    </div>
  );
}
