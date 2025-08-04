"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import TeamInfoDisplay from "@/components/teams/TeamInfoDisplay";
import { UsersIcon } from "lucide-react";
import { toast } from "react-toastify";

export default function TeamPageClient({ slug, initialData }) {
  const { user } = useUser();
  const [team, setTeam] = useState(initialData);
  const [memberships, setMemberships] = useState([]);
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (!initialData) {
          const teamRes = await fetch(`/api/teams/${slug}`);
          const teamData = await teamRes.json();
          setTeam(teamData?.team || null);
        }

        if (user) {
          const resM = await fetch(`/api/teams/${slug}/membership`);
          const dataM = await resM.json();
          setMemberships(
            Array.isArray(dataM.memberships) ? dataM.memberships : []
          );

          const resF = await fetch(`/api/family`);
          const dataF = await resF.json();
          setFamily(
            Array.isArray(dataF.familyMembers) ? dataF.familyMembers : []
          );
        }
      } catch (err) {
        console.error("Error loading team/memberships/family:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, user, initialData]);

  const userMember = memberships.find(
    (m) => !m.familyMemberId && String(m.userId) === String(user?._id)
  );

  const handleJoin = async (familyMemberId = null) => {
    try {
      setButtonLoading(true);
      const res = await fetch(`/api/teams/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyMemberId ? { familyMemberId } : {}),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Join failed");

      toast.success("Join request submitted");
      refreshMemberships();
    } catch (err) {
      console.error("Join error:", err);
      toast.error("Failed to join team.");
    } finally {
      setButtonLoading(false);
    }
  };

  const handleLeave = async ({ membershipId }) => {
    try {
      const res = await fetch(`/api/teams/${slug}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      if (!res.ok) throw new Error("Leave failed");

      toast.success("Left the team");
      refreshMemberships();
    } catch (err) {
      console.error("Leave error:", err);
      toast.error("Failed to leave team.");
    }
  };

  const refreshMemberships = async () => {
    const resM = await fetch(`/api/teams/${slug}/membership`);
    const dataM = await resM.json();
    setMemberships(Array.isArray(dataM.memberships) ? dataM.memberships : []);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spinner size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ✅ Membership Section */}
      <div className="border rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
          Your Membership
        </h2>
        {userMember ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>
              {userMember.role === "pending" ? (
                <>
                  Your membership is{" "}
                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    pending
                  </span>
                </>
              ) : (
                <>
                  You are a{" "}
                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {userMember.role}
                  </span>{" "}
                  of this team.
                </>
              )}
            </span>
            <button
              onClick={() => handleLeave({ membershipId: userMember._id })}
              disabled={buttonLoading || userMember.role === "manager"}
              className={`min-w-[120px] px-4 py-2 text-sm font-semibold rounded transition disabled:opacity-50 ${
                userMember.role === "pending"
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {buttonLoading
                ? userMember.role === "pending"
                  ? "Withdrawing..."
                  : "Leaving..."
                : userMember.role === "pending"
                ? "Withdraw"
                : "Leave Team"}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => handleJoin()}
              disabled={buttonLoading}
              className="min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {buttonLoading ? "Joining..." : "Join Team"}
            </button>
          </div>
        )}
      </div>

      {/* ✅ Family Members Section */}
      {family.length > 0 && (
        <div className="border rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <UsersIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Family Members
          </h2>
          <div className="space-y-4">
            {family.map((fm) => {
              const m = memberships.find(
                (m) => String(m.familyMemberId) === String(fm._id)
              );
              let status = "Not a member";
              let action = null;

              if (m?.role === "pending") {
                status = "Pending";
                action = (
                  <button
                    onClick={() => handleLeave({ membershipId: m._id })}
                    disabled={buttonLoading}
                    className="min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {buttonLoading ? "Withdrawing..." : "Withdraw"}
                  </button>
                );
              } else if (["member", "manager"].includes(m?.role)) {
                status = m.role.charAt(0).toUpperCase() + m.role.slice(1);
                action = (
                  <button
                    onClick={() => handleLeave({ membershipId: m._id })}
                    disabled={buttonLoading}
                    className="min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {buttonLoading ? "Leaving..." : "Leave Team"}
                  </button>
                );
              } else {
                action = (
                  <button
                    onClick={() => handleJoin(fm._id)}
                    disabled={buttonLoading}
                    className="min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {buttonLoading ? "Adding..." : "Add to Team"}
                  </button>
                );
              }

              return (
                <div
                  key={fm._id}
                  className="flex items-center justify-between border p-3 rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      {fm.firstName} {fm.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Status: {status}
                    </p>
                  </div>
                  <div>{action}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ Team Info */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <TeamInfoDisplay team={team} />
      </div>
    </div>
  );
}
