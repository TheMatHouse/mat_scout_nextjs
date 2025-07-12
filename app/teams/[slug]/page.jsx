"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import TeamInfoDisplay from "@/components/teams/TeamInfoDisplay";
import { UsersIcon } from "lucide-react";
import { toast } from "react-toastify";

export default function TeamInfoPage() {
  const { user } = useUser();
  const { slug } = useParams();
  const { team } = useTeam();

  const [memberships, setMemberships] = useState([]);
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false); // 🔹 for all join/leave buttons

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
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
      } catch (err) {
        console.error("Error loading memberships/family:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, slug]);

  const userMember = memberships.find(
    (m) => !m.familyMemberId && String(m.userId) === String(user?._id)
  );

  const handleJoin = async (familyMemberId = null) => {
    try {
      setButtonLoading(true);

      const res = await fetch(`/api/teams/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: familyMemberId
          ? JSON.stringify({ familyMemberId })
          : JSON.stringify({}),
      });

      console.log("📥 Join API response status:", res.status);

      let result = null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await res.json();
        console.log("📥 Join API response body:", result);
      } else {
        console.warn("⚠️ No JSON response body.");
      }

      if (!res.ok) {
        throw new Error(result?.error || "Join failed");
      }

      toast.success("Join request submitted");

      // Fetch updated membership
      const resM = await fetch(`/api/teams/${slug}/membership`);
      const dataM = await resM.json();

      setMemberships(Array.isArray(dataM.memberships) ? dataM.memberships : []);
    } catch (err) {
      console.error("❌ Join error:", err);
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

      const resM = await fetch(`/api/teams/${slug}/membership`);
      const dataM = await resM.json();
      setMemberships(Array.isArray(dataM.memberships) ? dataM.memberships : []);
    } catch (err) {
      console.error("Leave error:", err);
      toast.error("Failed to leave team.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Membership Section */}
      <div className="border rounded-md p-4 shadow-sm bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-3">Your Membership</h2>
        {userMember ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>
              {userMember.role === "pending" ? (
                <span>
                  Your membership is{" "}
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-200">
                    pending
                  </span>
                  .
                </span>
              ) : (
                <span>
                  You are a{" "}
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-200">
                    {userMember.role}
                  </span>{" "}
                  of this team.
                </span>
              )}
            </span>
            <button
              onClick={() => handleLeave({ membershipId: userMember._id })}
              disabled={buttonLoading || userMember.role === "manager"}
              className={`inline-flex items-center justify-center min-w-[120px] px-4 py-2 text-sm font-semibold rounded transition disabled:opacity-50 ${
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
              className="inline-flex items-center justify-center min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {buttonLoading ? "Joining..." : "Join Team"}
            </button>
          </div>
        )}
      </div>

      {/* Family Members Section */}
      {family.length > 0 && (
        <div className="border rounded-md p-4 shadow-sm bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                    className="inline-flex items-center justify-center min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-yellow-600 text-white hover:bg-yellow-700 transition disabled:opacity-50"
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
                    className="inline-flex items-center justify-center min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {buttonLoading ? "Leaving..." : "Leave Team"}
                  </button>
                );
              } else {
                action = (
                  <button
                    onClick={() => handleJoin(fm._id)}
                    disabled={buttonLoading}
                    className="inline-flex items-center justify-center min-w-[120px] px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
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
                      Status:{" "}
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                          status === "Pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : status === "Not a member"
                            ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {status}
                      </span>
                    </p>
                  </div>
                  <div>{action}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Info */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <TeamInfoDisplay team={team} />
      </div>
    </div>
  );
}
