"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";
import { toast } from "react-toastify";
import {
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  LogOut,
  UserPlus,
} from "lucide-react";

export default function TeamPageClient({ slug, initialData }) {
  const { user } = useUser();
  const [team, setTeam] = useState(initialData || null);
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

  const userMember = useMemo(
    () =>
      memberships.find(
        (m) => !m.familyMemberId && String(m.userId) === String(user?._id)
      ),
    [memberships, user?._id]
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

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Team not found.
      </div>
    );
  }

  const fullAddress =
    [
      team.address,
      team.address2,
      [team.city, team.state].filter(Boolean).join(", "),
      team.postalCode,
      team.country,
    ]
      .filter(Boolean)
      .join(", ") || "—";

  const createdOn = team.createdAt
    ? new Date(team.createdAt).toLocaleDateString()
    : "—";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* CONTENT GRID (no hero, no duplicate header) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT – About + Contact */}
        <div className="lg:col-span-2 space-y-6">
          {/* About (rich text) */}
          <div className="rounded-xl border border-border bg-card shadow">
            <div className="p-5 md:p-6">
              <h2 className="text-xl font-semibold mb-3">
                About {team.teamName}
              </h2>
              <div
                className="prose dark:prose-invert max-w-none text-sm md:text-base"
                dangerouslySetInnerHTML={{
                  __html: team.info?.trim()
                    ? team.info
                    : "<p>This team hasn’t added info yet.</p>",
                }}
              />
            </div>
          </div>

          {/* Contact & Location */}
          <div className="rounded-xl border border-border bg-card shadow">
            <div className="p-5 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">Contact &amp; Location</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={team.email || "—"}
                />
                <InfoItem
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={team.phone || "—"}
                />
                <InfoItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Address"
                  value={fullAddress}
                  className="md:col-span-2"
                />
                <InfoItem
                  icon={<CalendarDays className="w-4 h-4" />}
                  label="Created"
                  value={createdOn}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT – Membership & Family */}
        <div className="space-y-6">
          {/* Your Membership (only place with Join/Leave) */}
          <div className="rounded-xl border border-border bg-card shadow">
            <div className="p-5 md:p-6 space-y-3">
              <h2 className="text-xl font-semibold">Your Membership</h2>

              {user ? (
                userMember ? (
                  <>
                    <p className="text-sm">
                      Role:{" "}
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {userMember.role}
                      </span>
                    </p>
                    <button
                      onClick={() =>
                        handleLeave({ membershipId: userMember._id })
                      }
                      disabled={buttonLoading || userMember.role === "manager"}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      title={
                        userMember.role === "manager"
                          ? "Managers cannot leave"
                          : "Leave team"
                      }
                    >
                      <LogOut className="w-4 h-4" />
                      Leave Team
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      You’re not a member yet.
                    </p>
                    <button
                      onClick={() => handleJoin()}
                      disabled={buttonLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[var(--ms-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--ms-blue-gray)] disabled:opacity-60"
                    >
                      <UserPlus className="w-4 h-4" />
                      {buttonLoading ? "Joining..." : "Join Team"}
                    </button>
                  </>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Log in to join this team.
                </p>
              )}
            </div>
          </div>

          {/* Family Members */}
          {user && family.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow">
              <div className="p-5 md:p-6 space-y-4">
                <h2 className="text-xl font-semibold">Family Members</h2>

                <div className="space-y-3">
                  {family.map((fm) => {
                    const m = memberships.find(
                      (m) => String(m.familyMemberId) === String(fm._id)
                    );

                    let status = "Not a member";
                    let button = (
                      <button
                        onClick={() => handleJoin(fm._id)}
                        disabled={buttonLoading}
                        className="inline-flex items-center gap-2 rounded-md bg-[var(--ms-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--ms-blue-gray)] disabled:opacity-60"
                      >
                        <UserPlus className="w-4 h-4" />
                        {buttonLoading ? "Adding..." : "Add to Team"}
                      </button>
                    );

                    if (m?.role === "pending") {
                      status = "Pending";
                      button = (
                        <button
                          onClick={() => handleLeave({ membershipId: m._id })}
                          disabled={buttonLoading}
                          className="inline-flex items-center gap-2 rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700 disabled:opacity-60"
                        >
                          Withdraw
                        </button>
                      );
                    } else if (
                      ["member", "manager", "coach"].includes(m?.role)
                    ) {
                      status = m.role[0].toUpperCase() + m.role.slice(1);
                      button = (
                        <button
                          onClick={() => handleLeave({ membershipId: m._id })}
                          disabled={buttonLoading}
                          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Leave Team
                        </button>
                      );
                    }

                    return (
                      <div
                        key={fm._id}
                        className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {fm.firstName} {fm.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Status: {status}
                          </p>
                        </div>
                        {button}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Compact labeled info row */
function InfoItem({ icon, label, value, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-border bg-background/60 p-4 ${className}`}
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted">
          {icon}
        </span>
        {label.toUpperCase()}
      </div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
