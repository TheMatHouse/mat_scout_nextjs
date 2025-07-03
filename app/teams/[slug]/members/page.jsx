// app/teams/[slug]/members/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTeam } from "@/context/TeamContext";
import MemberRow from "@/components/teams/MemberRow";

export default function MembersPage() {
  const params = useParams();
  const slug = params.slug;
  const { team } = useTeam();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/members`);
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

  if (loading) return <p className="p-4">Loading...</p>;

  const currentUserMembership = members.find((m) => m.userId === team.user);
  const isManager = currentUserMembership?.role === "manager";

  const pending = members.filter((m) => m.role === "pending");
  const active = members.filter(
    (m) => m.role === "member" || m.role === "manager"
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pending Requests
        </h2>
        {pending.length > 0 ? (
          <div className="space-y-2">
            {pending.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                slug={slug}
                isManager={isManager}
                onRoleChange={fetchMembers}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No pending requests.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Team Members
        </h2>
        {active.length > 0 ? (
          <div className="space-y-2">
            {active.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                slug={slug}
                isManager={isManager}
                onRoleChange={fetchMembers}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No members yet.</p>
        )}
      </section>
    </div>
  );
}
