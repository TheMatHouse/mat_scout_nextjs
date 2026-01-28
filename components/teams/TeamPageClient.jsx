// components/teams/TeamPageClient.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import Spinner from "@/components/shared/Spinner";
import { toast } from "react-toastify";
import { MapPin, Mail, Phone, CalendarDays, LogOut, Plus } from "lucide-react";

/* ---------- id helpers ---------- */
const asId = (v) =>
  v && (v._id || v.id || v.userId || v)
    ? String(v._id || v.id || v.userId || v)
    : "";

/** Owner check — includes your actual field: team.user */
function isOwner(team, userId) {
  if (!team || !userId) return false;
  const uid = String(userId);
  const ownerCandidates = [
    team.user, // ✅ your Team owner field
    team.userId,
    team.ownerId,
    team.owner,
    team.ownerID,
    team.createdBy,
    team.createdById,
    team.createdByID,
  ];
  return ownerCandidates.filter(Boolean).map(asId).includes(uid);
}

/** Manager check — look across common arrays */
function isManager(team, userId) {
  if (!team || !userId) return false;
  const uid = String(userId);
  const managerLists = []
    .concat(team.managers || [])
    .concat(team.admins || [])
    .concat(team.teamManagers || [])
    .concat(team.moderators || []);
  return managerLists.some((m) => asId(m) === uid);
}

export default function TeamPageClient({ slug, initialData }) {
  const { user } = useUser();
  const [team, setTeam] = useState(initialData || null);
  const [memberships, setMemberships] = useState([]);
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [buttonLoading, setButtonLoading] = useState(false);

  // Normalize id from API shape (id) or legacy (_id)
  const userId = user?.id || user?._id || null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!initialData) {
          const teamRes = await fetch(`/api/teams/${slug}`, {
            cache: "no-store",
          });
          const teamData = await teamRes.json();
          if (!cancelled) setTeam(teamData?.team || null);
        }

        if (user) {
          const resM = await fetch(`/api/teams/${slug}/membership`, {
            cache: "no-store",
          });
          const dataM = await resM.json();
          if (!cancelled) {
            setMemberships(
              Array.isArray(dataM.memberships)
                ? dataM.memberships.filter((m) => !m.deletedAt)
                : [],
            );
          }

          const resF = await fetch(`/api/family`, { cache: "no-store" });
          const dataF = await resF.json();
          if (!cancelled) {
            setFamily(
              Array.isArray(dataF.familyMembers) ? dataF.familyMembers : [],
            );
          }
        }
      } catch (err) {
        console.error("Error loading team/memberships/family:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [slug, user, initialData]);

  /* ---------- robust membership derivation ---------- */
  const rowMembership = useMemo(() => {
    if (!userId) return undefined;
    return (Array.isArray(memberships) ? memberships : []).find(
      (m) => !m.familyMemberId && String(m.userId) === String(userId),
    );
  }, [memberships, userId]);

  // If you’re owner/manager but there’s no row yet, synthesize one so UI shows you as a member
  const syntheticMembership = useMemo(() => {
    if (!userId || !team) return null;
    if (isOwner(team, userId)) {
      return {
        _id: null,
        userId: String(userId),
        role: "owner",
        status: "active",
        synthetic: true,
      };
    }
    if (isManager(team, userId)) {
      return {
        _id: null,
        userId: String(userId),
        role: "manager",
        status: "active",
        synthetic: true,
      };
    }
    return null;
  }, [team, userId]);

  const userMembership = syntheticMembership || rowMembership;

  const refreshMemberships = async () => {
    const resM = await fetch(`/api/teams/${slug}/membership`, {
      cache: "no-store",
    });
    const dataM = await resM.json();
    setMemberships(Array.isArray(dataM.memberships) ? dataM.memberships : []);
  };

  const handleJoin = async (familyMemberId = null) => {
    try {
      setButtonLoading(true);
      const res = await fetch(`/api/teams/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(familyMemberId ? { familyMemberId } : {}),
      });

      let result;
      try {
        result = await res.json();
      } catch {}

      if (!res.ok) {
        const msg = result?.error || "";
        if (res.status === 409 || /pending|already|exists/i.test(msg)) {
          toast.info("You already have a request to join this team.");
        } else {
          toast.error(msg || "Failed to join team.");
        }
        return;
      }

      toast.success("Join request submitted");
      await refreshMemberships();
    } catch (err) {
      console.error("Join error:", err);
      toast.error("Failed to join team.");
    } finally {
      setButtonLoading(false);
    }
  };

  const handleLeave = async ({ membershipId }) => {
    try {
      setButtonLoading(true);
      const res = await fetch(`/api/teams/${slug}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ membershipId }),
      });
      let result;
      try {
        result = await res.json();
      } catch {}
      if (!res.ok) throw new Error(result?.error || "Leave failed");
      toast.success("Left the team");
      await refreshMemberships();
    } catch (err) {
      console.error("Leave error:", err);
      toast.error("Failed to leave team.");
    } finally {
      setButtonLoading(false);
    }
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

  const roleLabel = (r) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : "—");
  const role = (userMembership?.role || "").toLowerCase();
  const status = (userMembership?.status || "active").toLowerCase();
  const isPending = status === "pending" || role === "pending";
  const cannotLeave = role === "manager" || role === "owner";
  const hasRow = !!userMembership?._id; // synthetic membership has no _id

  return (
    // ⛑️ Clamp width at the top so nothing inside can widen the viewport
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-w-0">
        {/* CONTENT GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
          {/* LEFT – About + Contact */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* About */}
            <div className="rounded-xl border border-border bg-card shadow min-w-0">
              <div className="p-5 md:p-6">
                <h2 className="text-xl font-semibold mb-3">
                  About {team.teamName}
                </h2>
                <div
                  className="prose dark:prose-invert max-w-none text-sm md:text-base break-words"
                  dangerouslySetInnerHTML={{
                    __html: team.info?.trim()
                      ? team.info
                      : "<p>This team hasn’t added info yet.</p>",
                  }}
                />
              </div>
            </div>

            {/* Contact & Location */}
            <div className="rounded-xl border border-border bg-card shadow min-w-0">
              <div className="p-5 md:p-6 space-y-4">
                <h2 className="text-xl font-semibold">
                  Contact &amp; Location
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
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
          <div className="space-y-6 min-w-0">
            {/* Your Membership */}
            <div className="rounded-xl border border-border bg-card shadow min-w-0">
              <div className="p-5 md:p-6 space-y-3">
                <h2 className="text-xl font-semibold">Your Membership</h2>

                {user ? (
                  userMembership ? (
                    isPending ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Your join request is <strong>Pending</strong>.
                        </p>
                        <button
                          onClick={() =>
                            hasRow &&
                            handleLeave({ membershipId: userMembership._id })
                          }
                          disabled={buttonLoading || !hasRow}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-60"
                          title={
                            !hasRow
                              ? "No pending row to withdraw"
                              : "Withdraw your request"
                          }
                        >
                          <LogOut className="w-4 h-4" />
                          Withdraw Request
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">
                          Role:{" "}
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {roleLabel(userMembership.role)}
                          </span>
                        </p>
                        <button
                          onClick={() =>
                            hasRow &&
                            handleLeave({ membershipId: userMembership._id })
                          }
                          disabled={buttonLoading || cannotLeave || !hasRow}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          title={
                            cannotLeave
                              ? "Managers/Owners cannot leave from here"
                              : !hasRow
                                ? "No membership row to leave"
                                : "Leave team"
                          }
                        >
                          <LogOut className="w-4 h-4" />
                          Leave Team
                        </button>
                      </>
                    )
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
                        <Plus size={16} />
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
              <div className="rounded-xl border border-border bg-card shadow min-w-0">
                <div className="p-5 md:p-6 space-y-4">
                  <h2 className="text-xl font-semibold">Family Members</h2>

                  <div className="space-y-3 min-w-0">
                    {family.map((fm) => {
                      const m = memberships.find(
                        (m) => String(m.familyMemberId) === String(fm._id),
                      );
                      const mRole = (m?.role || "").toLowerCase();
                      const mStatus = (m?.status || "active").toLowerCase();
                      const mPending =
                        mStatus === "pending" || mRole === "pending";

                      let statusLabel = m
                        ? mPending
                          ? "Pending"
                          : roleLabel(mRole)
                        : "Not a member";
                      let button = (
                        <button
                          onClick={() => handleJoin(fm._id)}
                          disabled={buttonLoading}
                          className="btn-add"
                        >
                          <Plus size={16} />
                          {buttonLoading ? "Adding..." : "Add to Team"}
                        </button>
                      );

                      if (m) {
                        if (mPending) {
                          button = (
                            <button
                              onClick={() =>
                                handleLeave({ membershipId: m._id })
                              }
                              disabled={buttonLoading}
                              className="inline-flex items-center gap-2 rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700 disabled:opacity-60"
                            >
                              Withdraw
                            </button>
                          );
                        } else if (
                          ["member", "manager", "owner", "coach"].includes(
                            mRole,
                          )
                        ) {
                          button = (
                            <button
                              onClick={() =>
                                handleLeave({ membershipId: m._id })
                              }
                              disabled={buttonLoading}
                              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              Leave Team
                            </button>
                          );
                        }
                      }

                      return (
                        <div
                          key={fm._id}
                          className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 min-w-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {fm.firstName} {fm.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Status: {statusLabel}
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
    </div>
  );
}

/** Compact labeled info row */
function InfoItem({ icon, label, value, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-border bg-background/60 p-4 min-w-0 ${className}`}
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted">
          {icon}
        </span>
        {label.toUpperCase()}
      </div>
      <div className="text-sm break-words">{value || "—"}</div>
    </div>
  );
}
