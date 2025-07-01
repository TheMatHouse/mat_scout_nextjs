"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import TeamInfoDisplay from "@/components/teams/TeamInfoDisplay";

export default function TeamInfoPage() {
  const { user } = useUser();
  const team = useTeam();
  const params = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembership = async () => {
      if (!user || !params?.slug) return;

      try {
        const res = await fetch(`/api/teams/${params.slug}/membership`);
        const data = await res.json();
        setMember(data.member || null);
      } catch (err) {
        console.error("Error checking membership:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembership();
  }, [user, params.slug]);

  return (
    <div className="space-y-8 max-w-prose">
      {!loading && (
        <>
          {!member && (
            <div className="border border-gray-300 dark:border-zinc-700 rounded-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                You are not a member of this team.
              </h3>
              <form
                method="POST"
                action={`/api/teams/${params.slug}/join`}
              >
                <button
                  type="submit"
                  className="btn mt-2"
                >
                  Join Team
                </button>
              </form>
            </div>
          )}

          {member?.role === "pending" && (
            <div className="border border-blue-300 dark:border-blue-700 rounded-md p-4">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                Your membership request is pending.
              </h3>
              <form
                method="POST"
                action={`/api/teams/${params.slug}/withdraw`}
              >
                <button
                  type="submit"
                  className="btn mt-2"
                >
                  Withdraw Request
                </button>
              </form>
            </div>
          )}

          {(member?.role === "member" || member?.role === "manager") && (
            <div className="border border-green-300 dark:border-green-700 rounded-md p-4">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                You are a {member.role === "manager" ? "Manager" : "Member"} of
                this team.
              </h3>
              <form
                method="POST"
                action={`/api/teams/${params.slug}/leave`}
              >
                <button
                  type="submit"
                  className="btn mt-2"
                >
                  Leave Team
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Team Info Section */}
      <div>
        <div>
          <TeamInfoDisplay />
          {/* Other team sections... */}
        </div>
      </div>
    </div>
  );
}
