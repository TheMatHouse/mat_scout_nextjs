"use client";

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

const ManagerMembersClient = ({ slug: slugProp }) => {
  const params = useParams();
  const router = useRouter();
  const slug = slugProp || params?.slug;

  const { team } = useTeam();
  const { user } = useUser();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);

  async function parseJsonSafe(res) {
    const txt = await res.text();
    try {
      return { data: JSON.parse(txt), raw: txt };
    } catch {
      return { data: null, raw: txt };
    }
  }

  /* -------------------------------------------------------------
     Fetch Members
  ------------------------------------------------------------- */
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`, {
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        toast.error("You are not authorized to view team members.");
        router.replace(`/teams/${slug}`);
        return;
      }

      if (!res.ok) throw new Error("Failed to load members");

      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error("Error loading members:", err);
      toast.error("Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  /* -------------------------------------------------------------
     Fetch Invites
  ------------------------------------------------------------- */
  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/invites?ts=${Date.now()}`, {
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        setInvites([]);
        return;
      }

      if (!res.ok) throw new Error("Failed to load invites");

      const data = await res.json();
      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (err) {
      console.error("Error loading invites:", err);
      toast.error("Failed to load invites.");
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

  // -------------------------------------------------------------
  // 🔑 FIX: derive viewer role correctly
  // -------------------------------------------------------------
  const currentUserMembership = members.find((m) => m.userId === user?._id);

  const isOwner = team?.user === user?._id;

  const viewerRole = isOwner ? "owner" : currentUserMembership?.role || null;

  const isManager = viewerRole === "manager";
  const isCoach = viewerRole === "coach";

  const pending = members.filter((m) => m.role === "pending");
  const active = members.filter((m) =>
    ["member", "manager", "coach"].includes(m.role)
  );

  const managerName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "Team Manager";

  /* -------------------------------------------------------------
     Invite Actions
  ------------------------------------------------------------- */
  const handleResendInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/teams/${slug}/invites/${inviteId}/resend`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const { data } = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Failed to resend invite");

      toast.success("Invitation resent.");
      fetchInvites();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not resend invite.");
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/teams/${slug}/invites/${inviteId}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });

      const { data } = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Failed to revoke invite");

      toast.success("Invitation revoked.");
      fetchInvites();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not revoke invite.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Team Members
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage pending requests and team members.
        </p>
      </div>

      {/* Grow Your Team – Primary Action Section */}
      {(isOwner || isManager || isCoach) && (
        <section>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-6 shadow-xl border border-white/10">
            {/* subtle highlight */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,white,transparent_60%)]" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Grow your team
                </h2>
                <p className="text-sm text-white/90 mt-2 max-w-lg">
                  Invite athletes directly or print a QR code flyer for your gym
                  wall so members can request access instantly.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setInviteOpen(true)}
                  className="btn bg-white text-ms-blue hover:bg-gray-100 font-semibold px-6"
                >
                  Invite Members
                </button>

                <button
                  onClick={() =>
                    window.open(`/api/teams/${slug}/flyer/pdf`, "_blank")
                  }
                  className="btn bg-white/90 text-ms-blue hover:bg-white font-semibold px-6"
                >
                  Print QR Flyer
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Invites Table */}
      {(isOwner || isManager || isCoach) && (
        <InvitesTable
          slug={slug}
          invites={invites}
          loading={invitesLoading}
          onResend={handleResendInvite}
          onRevoke={handleRevokeInvite}
        />
      )}

      {/* Pending Requests */}
      <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Pending Requests
        </h2>

        {pending.length ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pending.map((m) => (
              <div
                key={m.id}
                className="py-3"
              >
                <MemberRow
                  member={m}
                  slug={slug}
                  viewerRole={viewerRole}
                  viewerIsOwner={isOwner}
                  onRoleChange={() => {
                    fetchMembers();
                    fetchInvites();
                  }}
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

      {/* Active Members */}
      <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Active Members
        </h2>

        {active.length ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {active.map((m) => (
              <div
                key={m.id}
                className="py-3"
              >
                <MemberRow
                  member={m}
                  slug={slug}
                  viewerRole={viewerRole}
                  viewerIsOwner={isOwner}
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

      {/* Invite Modal */}
      <ModalLayout
        isOpen={inviteOpen}
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
};

export default ManagerMembersClient;
