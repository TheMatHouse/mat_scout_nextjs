"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpDown } from "lucide-react";

import Spinner from "@/components/shared/Spinner";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import { ReportDataTable } from "@/components/shared/report-data-table";
import { decryptScoutingBody, maybeDecryptNotes } from "@/lib/crypto/teamLock";
import { verifyPasswordLocally } from "@/lib/crypto/locker";

/* ---------------- safe display helpers --------------- */
const genderLabel = (g) => {
  const s = String(g ?? "").toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
};

const computeDivisionDisplay = (division) => {
  if (!division) return "—";
  if (typeof division === "string") return division; // legacy id/label
  if (typeof division === "object") {
    const name = division?.name || "";
    const glab = genderLabel(division?.gender);
    return name ? (glab ? `${name} — ${glab}` : name) : "—";
  }
  return "—";
};

function ensureWeightDisplay(label, unit) {
  if (!label) return "";
  const low = String(label).toLowerCase();
  if (low.includes("kg") || low.includes("lb")) return label;
  return unit ? `${label} ${unit}` : label;
}

function getDivisionId(div) {
  if (!div) return "";
  if (typeof div === "string") return div;
  if (typeof div === "object") {
    if (div._id) return String(div._id);
    if (div.id) return String(div.id);
  }
  return "";
}

// Fetch weights for a division via the canonical route
async function fetchDivisionWeights(divisionId) {
  const id = encodeURIComponent(String(divisionId));
  const url = `/api/divisions/${id}/weights`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const wc =
      data?.weightCategory ||
      data?.weights ||
      data?.weight ||
      data?.data ||
      data?.category ||
      data;
    if (!wc) return null;

    const unit = wc.unit || wc.weightUnit || "";
    const items = Array.isArray(wc.items) ? wc.items : [];
    const normItems = items
      .map((it) => ({
        _id: String(it._id ?? it.id ?? it.value ?? it.label ?? "").trim(),
        label: String(it.label ?? it.value ?? "").trim(),
      }))
      .filter((x) => x._id && x.label);
    if (!normItems.length) return null;
    return { unit, items: normItems };
  } catch {
    return null;
  }
}

/* ---------- Preview payload helpers (mirror ClientPage) ---------- */
const toSafeStr = (v) => (v == null ? "" : String(v));
const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const buildPreviewPayload = (r) => {
  const divisionDisplay = computeDivisionDisplay(r?.division);

  const weightLabel = toSafeStr(r?.weightLabel).trim();
  const weightUnit = toSafeStr(r?.weightUnit).trim();
  const rawCategoryLabel =
    (typeof r?.weightCategory === "object"
      ? toSafeStr(r?.weightCategory?.label || r?.weightCategory?.name)
      : toSafeStr(r?.weightCategory)) || "";

  let weightDisplay = weightLabel || rawCategoryLabel || "";
  if (weightDisplay && weightUnit && !/\b(kg|lb)s?\b/i.test(weightDisplay)) {
    weightDisplay = `${weightDisplay} ${weightUnit}`;
  }

  const videos = Array.isArray(r?.videos)
    ? r.videos
        .map((v) =>
          v && typeof v === "object"
            ? {
                title: toSafeStr(v.title || v.videoTitle),
                notes: toSafeStr(v.notes || v.videoNotes),
                url: toSafeStr(v.url || v.videoURL || v.urlCanonical),
                startSeconds: toNonNegInt(v.startSeconds),
              }
            : null,
        )
        .filter(Boolean)
    : [];

  const legacyVideoURL = toSafeStr(r?.video?.videoURL || r?.videoURL);
  const legacyVideoTitle = toSafeStr(r?.video?.videoTitle || r?.videoTitle);
  const legacyVideoNotes = toSafeStr(r?.video?.videoNotes || r?.videoNotes);

  return {
    _id: toSafeStr(r?._id),
    matchType: toSafeStr(r?.matchType),
    eventName: toSafeStr(r?.eventName),
    matchDate: r?.matchDate || null,
    createdByName: toSafeStr(r?.createdByName),
    result: toSafeStr(r?.result),
    score: toSafeStr(r?.score),
    isPublic: !!r?.isPublic,

    athleteFirstName: toSafeStr(r?.athleteFirstName),
    athleteLastName: toSafeStr(r?.athleteLastName),
    athleteCountry: toSafeStr(r?.athleteCountry),
    athleteNationalRank: toSafeStr(r?.athleteNationalRank),
    athleteWorldRank: toSafeStr(r?.athleteWorldRank),
    athleteClub: toSafeStr(r?.athleteClub),
    athleteGrip: toSafeStr(r?.athleteGrip),

    divisionDisplay,
    division: divisionDisplay,

    weightDisplay: weightDisplay || "—",
    weightLabel,
    weightUnit,

    opponentAttacks: Array.isArray(r?.opponentAttacks)
      ? r.opponentAttacks.map(toSafeStr)
      : [],
    athleteAttacks: Array.isArray(r?.athleteAttacks)
      ? r.athleteAttacks.map(toSafeStr)
      : [],
    opponentAttackNotes: toSafeStr(r?.opponentAttackNotes),
    athleteAttackNotes: toSafeStr(r?.athleteAttackNotes),

    opponentName: toSafeStr(r?.opponentName),
    opponentCountry: toSafeStr(r?.opponentCountry),
    opponentClub: toSafeStr(r?.opponentClub),
    opponentRank: toSafeStr(r?.opponentRank),
    opponentGrip: toSafeStr(r?.opponentGrip),
    myRank: toSafeStr(r?.myRank),

    videos,
    videoURL: legacyVideoURL,
    videoTitle: legacyVideoTitle,
    videoNotes: legacyVideoNotes,
  };
};

/* ---------- local version of the TeamUnlockGate logic ---------- */

const STORAGE_KEY = (teamId) => `ms:teamlock:${teamId}`;

function DashboardTeamScoutingReportsPage() {
  const params = useParams();
  const rawTeamSlug = params?.teamSlug || params?.slug || "";
  const slug = decodeURIComponent(String(rawTeamSlug));

  const [team, setTeam] = useState(null);
  const [security, setSecurity] = useState(null);
  const [hasLock, setHasLock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [securityError, setSecurityError] = useState(false);
  const [password, setPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [error, setError] = useState("");

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);

  const [membersMap, setMembersMap] = useState(() => new Map());
  const [divisionMap, setDivisionMap] = useState({});
  const [weightsMap, setWeightsMap] = useState({});

  // If somehow slug is missing, avoid infinite spinner
  if (!slug) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <p className="text-lg font-semibold text-red-500">
          No team slug found for this route.
        </p>
      </div>
    );
  }

  // ---- INITIAL SECURITY CHECK (copied from TeamUnlockGate) ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setChecking(true);
        setError("");
        setSecurityError(false);

        const res = await fetch(
          `/api/teams/${encodeURIComponent(slug)}/security`,
          {
            credentials: "include",
            headers: { accept: "application/json" },
          },
        );

        if (!res.ok) {
          console.error("Dashboard team /security error:", res.status);
          if (!cancelled) {
            setSecurityError(true);
          }
          return;
        }

        const json = await res.json().catch(() => ({}));
        const t = json?.team || {};
        const sec = t.security || {};
        const lockEnabled = !!sec.lockEnabled;

        if (cancelled) return;

        if (t?._id) {
          setTeam(t);
        }

        // No lock => just render reports
        if (!lockEnabled) {
          setHasLock(false);
          setUnlocked(true);
          return;
        }

        const normalizedSec = {
          lockEnabled: true,
          encVersion: sec.encVersion || "v1",
          kdf: {
            saltB64: sec.kdf?.saltB64 || "",
            iterations: sec.kdf?.iterations || 250000,
          },
          verifierB64: sec.verifierB64 || "",
        };

        setHasLock(true);
        setSecurity(normalizedSec);

        const teamId = t?._id;
        if (!teamId) {
          toast.error("Unable to verify team lock.");
          setSecurityError(true);
          return;
        }

        // Try cached password first (same as TeamUnlockGate)
        const cached = sessionStorage.getItem(STORAGE_KEY(teamId)) || "";
        if (cached && normalizedSec.kdf.saltB64 && normalizedSec.verifierB64) {
          const ok = await verifyPasswordLocally(cached, normalizedSec).catch(
            (err) => {
              console.warn(
                "Dashboard verifyPasswordLocally (cached) failed:",
                err,
              );
              return false;
            },
          );
          if (ok) {
            setUnlocked(true);
            return;
          }
        }
      } catch (err) {
        console.error("Dashboard team lock error:", err);
        toast.error("Error checking team lock.");
        if (!cancelled) {
          setSecurityError(true);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ---- HANDLE PASSWORD SUBMIT (copied from TeamUnlockGate) ----
  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    if (!security) {
      toast.error("Missing team security configuration.");
      return;
    }

    setSubmittingPassword(true);
    setError("");

    try {
      const ok = await verifyPasswordLocally(password, security).catch(
        (err) => {
          console.warn("Dashboard verifyPasswordLocally failed:", err);
          return false;
        },
      );

      if (!ok) {
        setError("Incorrect team password.");
        return;
      }

      const teamId = team?._id;
      if (teamId) {
        try {
          sessionStorage.setItem(STORAGE_KEY(teamId), password);
        } catch (storageErr) {
          console.warn(
            "Unable to cache team password in sessionStorage:",
            storageErr,
          );
        }
      }

      setUnlocked(true);
      setPassword("");
    } catch (err) {
      console.error("Unlock error:", err);
      toast.error(err?.message || "Error verifying password.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  // ---- hydrate division + weight labels ----
  const hydrateDivisionMap = async (reportsList) => {
    const entries = {};

    (reportsList || []).forEach((r) => {
      const divId = getDivisionId(r?.division);
      const divObj =
        r?.division && typeof r.division === "object" ? r.division : null;
      if (divId && divObj && !entries[divId]) {
        entries[divId] = computeDivisionDisplay(divObj);
      }
    });

    const styles = Array.from(
      new Set(
        (reportsList || [])
          .map((r) => (r?.matchType || "").trim())
          .filter(Boolean),
      ),
    );
    const fetched = {};
    await Promise.all(
      styles.map(async (styleName) => {
        try {
          const res = await fetch(
            `/api/divisions?styleName=${encodeURIComponent(styleName)}`,
            {
              cache: "no-store",
              credentials: "same-origin",
              headers: { accept: "application/json" },
            },
          );
          const data = await res.json().catch(() => ({}));
          const divs = Array.isArray(data?.divisions) ? data.divisions : [];
          divs.forEach((d) => {
            if (d?._id) fetched[d._id] = computeDivisionDisplay(d);
          });
        } catch {
          // non-fatal
        }
      }),
    );

    if (Object.keys(entries).length || Object.keys(fetched).length) {
      setDivisionMap((prev) => ({ ...prev, ...entries, ...fetched }));
    }
  };

  const hydrateWeightsMap = async (reportsList) => {
    const divIds = Array.from(
      new Set(
        (reportsList || [])
          .map((r) => getDivisionId(r?.division))
          .filter(Boolean),
      ),
    );
    if (!divIds.length) return;

    const entries = {};
    await Promise.all(
      divIds.map(async (id) => {
        const weights = await fetchDivisionWeights(id);
        if (weights) entries[id] = weights;
      }),
    );
    if (Object.keys(entries).length) {
      setWeightsMap((prev) => ({ ...prev, ...entries }));
    }
  };

  // ---- reports (only after unlock) ----
  const fetchReports = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/teams/${encodeURIComponent(
          slug,
        )}/scouting-reports?ts=${Date.now()}`,
      );
      if (!res.ok) throw new Error("Failed to load scouting reports");
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.scoutingReports)
        ? data.scoutingReports
        : [];

      let finalList = list;

      if (list.length && team) {
        const decryptedList = [];

        for (const r of list) {
          let next = r;

          try {
            // Full-body encryption
            if (r.crypto && r.crypto.ciphertextB64) {
              const decrypted = await decryptScoutingBody(team, r).catch(
                (err) => {
                  console.warn(
                    "Dashboard decryptScoutingBody failed for report",
                    r._id,
                    err,
                  );
                  return null;
                },
              );

              if (decrypted) {
                next = {
                  ...r,
                  ...decrypted,
                  athleteAttacks: Array.isArray(decrypted.athleteAttacks)
                    ? decrypted.athleteAttacks
                    : [],
                  athleteAttackNotes: decrypted.athleteAttackNotes || "",
                };
              }
            } else if (r.athleteAttackNotes) {
              // Legacy: notes-only encryption
              const result = await maybeDecryptNotes(
                team,
                r.athleteAttackNotes,
              ).catch((err) => {
                console.warn(
                  "Dashboard maybeDecryptNotes failed for report",
                  r._id,
                  err,
                );
                return { plaintext: null };
              });

              const plaintext = result?.plaintext ?? null;

              next = {
                ...r,
                athleteAttackNotes: plaintext || r.athleteAttackNotes,
              };
            }
          } catch (err) {
            console.warn(
              "Dashboard decrypt error (ignored) for report",
              r._id,
              err,
            );
          }

          decryptedList.push(next);
        }

        finalList = decryptedList;
      }

      setReports(finalList);

      await Promise.all([
        hydrateDivisionMap(finalList),
        hydrateWeightsMap(finalList),
      ]);
    } catch (err) {
      console.error("Error loading scouting reports in dashboard:", err);
      toast.error("Error loading scouting reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug || !unlocked || !team) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, unlocked, team]);

  // ---- members map ----
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/teams/${encodeURIComponent(slug)}/members?ts=${Date.now()}`,
          {
            cache: "no-store",
          },
        );
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json.members) ? json.members : [];
        const map = new Map();
        list.forEach((m) => {
          const id = String(m.familyMemberId || m.userId || "");
          if (id) map.set(id, m.name || m.username || "Unknown");
        });
        setMembersMap(map);
      } catch (e) {
        console.error(e);
        setMembersMap(new Map());
      }
    })();
  }, [slug]);

  const tableRows = useMemo(() => {
    const namesArrFor = (r) =>
      Array.isArray(r?.reportFor) && r.reportFor.length
        ? r.reportFor.map(
            (rf) =>
              membersMap.get(String(r.athleteId ?? rf.athleteId)) || "Unknown",
          )
        : [];

    return (Array.isArray(reports) ? reports : []).map((r) => {
      const namesArr = namesArrFor(r);

      const divisionId = getDivisionId(r?.division);
      const divisionDisplay =
        (divisionId && divisionMap[divisionId]) ||
        computeDivisionDisplay(r?.division);

      let weightDisplay = "—";
      if (r?.weightLabel && String(r.weightLabel).trim()) {
        weightDisplay = ensureWeightDisplay(
          String(r.weightLabel).trim(),
          r?.weightUnit,
        );
      } else {
        const divId = divisionId;
        const w = divId ? weightsMap[divId] : null;
        if (w && Array.isArray(w.items)) {
          const weightId =
            r?.weightCategory || r?.weightItemId || r?.weightClassId || "";
          if (weightId) {
            const item = w.items.find(
              (it) =>
                String(it._id) === String(weightId) ||
                String(it.label).toLowerCase() ===
                  String(weightId).toLowerCase(),
            );
            if (item?.label) {
              const unit = r?.weightUnit || w.unit || "";
              weightDisplay = ensureWeightDisplay(item.label, unit);
            }
          }
        }
      }

      return {
        ...r,
        reportForNamesArr: namesArr,
        reportForSort: namesArr.join(" ").toLowerCase(),
        _createdAtTs: r?.createdAt ? new Date(r.createdAt).getTime() : 0,
        divisionDisplay,
        weightDisplay,
      };
    });
  }, [reports, membersMap, divisionMap, weightsMap]);

  const columns = [
    {
      accessorKey: "matchType",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: "reportFor",
      accessorFn: (row) => row.reportForSort || "",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Report For <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const names = row.original.reportForNamesArr || [];
        if (!names.length) return "—";
        return (
          <div className="whitespace-pre-wrap leading-5">
            {names.map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "athleteFirstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          First Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "athleteLastName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "divisionDisplay",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Division <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "weightDisplay",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Weight Class <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "createdByName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created By <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.createdByName || "—",
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const report = row.original;
        return (
          <div className="flex justify-center">
            <button
              onClick={async () => {
                let effective = report;

                try {
                  if (report.crypto && report.crypto.ciphertextB64 && team) {
                    const decrypted = await decryptScoutingBody(
                      team,
                      report,
                    ).catch((err) => {
                      console.warn(
                        "Dashboard preview decryptScoutingBody failed for report",
                        report._id,
                        err,
                      );
                      return null;
                    });

                    if (decrypted) {
                      effective = {
                        ...report,
                        ...decrypted,
                        athleteAttacks: Array.isArray(decrypted.athleteAttacks)
                          ? decrypted.athleteAttacks
                          : [],
                        athleteAttackNotes: decrypted.athleteAttackNotes || "",
                      };
                    }
                  } else if (report.athleteAttackNotes && team) {
                    const res = await maybeDecryptNotes(
                      team,
                      report.athleteAttackNotes,
                    ).catch((err) => {
                      console.warn(
                        "Dashboard preview maybeDecryptNotes failed for report",
                        report._id,
                        err,
                      );
                      return { plaintext: null };
                    });

                    const plaintext = res?.plaintext ?? null;

                    effective = {
                      ...report,
                      athleteAttackNotes:
                        plaintext || report.athleteAttackNotes,
                    };
                  }
                } catch (err) {
                  console.warn(
                    "Dashboard preview decrypt error (ignored) for report",
                    report._id,
                    err,
                  );
                  effective = report;
                }

                setPreviewPayload(buildPreviewPayload(effective));
                setPreviewOpen(true);
              }}
              title="View Details"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-ms-blue"
            >
              <Eye className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        );
      },
    },
  ];

  // ---------- RENDER STATES ----------

  if (checking) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-900 dark:text-gray-100 mt-2 text-lg">
          Checking team lock…
        </p>
      </div>
    );
  }

  if (securityError) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Unable to verify team lock
          </h2>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (hasLock && !unlocked) {
    // Locked UI (same UX as TeamUnlockGate, but inside the dashboard page)
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <div className="w-full max-w-sm rounded-2xl border bg-[var(--color-card)] p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Team Password Required
          </h2>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            This team has a lock enabled. Enter the team password to view
            scouting reports.
          </p>

          <form
            onSubmit={handleUnlockSubmit}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Team Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 px-4 py-3"
                placeholder="Enter team password"
                autoComplete="off"
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submittingPassword || !password}
                className="btn-submit"
              >
                {submittingPassword ? "Unlocking…" : "Unlock"}
              </Button>
            </div>
          </form>

          <p className="text-xs text-gray-900 dark:text-gray-100">
            The password is never stored on the server. A key is derived locally
            and verified against the team&apos;s lock settings.
          </p>
        </div>
      </div>
    );
  }

  // Unlocked (or no lock) → show reports table
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Team Scouting Reports
          </h1>
          <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
            These are scouting reports created for athletes on this team in your
            dashboard.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
          <Spinner size={64} />
          <p className="text-gray-900 dark:text-gray-100 mt-2 text-lg">
            Loading scouting reports…
          </p>
        </div>
      ) : tableRows.length === 0 ? (
        <div className="rounded-md border border-border p-6 text-sm text-gray-900 dark:text-gray-100">
          No scouting reports have been created for this team yet.
        </div>
      ) : (
        <div className="w-full">
          <ReportDataTable
            columns={columns}
            data={tableRows}
          />
        </div>
      )}

      {previewOpen && previewPayload && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={previewPayload}
          reportType="scouting"
        />
      )}
    </div>
  );
}

export default DashboardTeamScoutingReportsPage;
