// app/teams/[slug]/scouting-reports/ClientPage.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash, ArrowUpDown } from "lucide-react";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/teams/forms/ScoutingReportForm";
import { ReportDataTable } from "@/components/shared/report-data-table";
import ModalLayout from "@/components/shared/ModalLayout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Spinner from "@/components/shared/Spinner";
import TeamUnlockGate from "@/components/teams/TeamUnlockGate";
import { decryptScoutingBody, maybeDecryptNotes } from "@/lib/crypto/teamLock";

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

/* ---------- Preview payload helpers (mirror DashboardScouting) ---------- */
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
            : null
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

const TeamScoutingReportsPage = () => {
  const { slug } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);

  const [membersMap, setMembersMap] = useState(() => new Map());
  const [isUnlocked, setIsUnlocked] = useState(false);

  // pretty division map: { divisionId: "IJF Junior (U21) — Women" }
  const [divisionMap, setDivisionMap] = useState({});
  // per-division weights cache: { divisionId: { unit, items: [{_id,label}] } }
  const [weightsMap, setWeightsMap] = useState({});

  // ---- helpers to hydrate division + weight labels from APIs ----
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
          .filter(Boolean)
      )
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
            }
          );
          const data = await res.json().catch(() => ({}));
          const divs = Array.isArray(data?.divisions) ? data.divisions : [];
          divs.forEach((d) => {
            if (d?._id) fetched[d._id] = computeDivisionDisplay(d);
          });
        } catch {
          // non-fatal
        }
      })
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
          .filter(Boolean)
      )
    );
    if (!divIds.length) return;

    const entries = {};
    await Promise.all(
      divIds.map(async (id) => {
        const weights = await fetchDivisionWeights(id);
        if (weights) entries[id] = weights;
      })
    );
    if (Object.keys(entries).length) {
      setWeightsMap((prev) => ({ ...prev, ...entries }));
    }
  };

  // ---- reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/teams/${slug}/scouting-reports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list = data.scoutingReports || [];

      // Decrypt any encrypted reports so the table shows real data
      let finalList = list;

      try {
        if (list.length && team) {
          finalList = await Promise.all(
            list.map(async (r) => {
              try {
                if (r.crypto && r.crypto.ciphertextB64) {
                  const decrypted = await decryptScoutingBody(team, r);
                  if (decrypted) {
                    return {
                      ...r,
                      ...decrypted,
                      athleteAttacks: Array.isArray(decrypted.athleteAttacks)
                        ? decrypted.athleteAttacks
                        : [],
                      athleteAttackNotes: decrypted.athleteAttackNotes || "",
                    };
                  }
                } else if (r.athleteAttackNotes) {
                  // Backward compat: old “notes-only” encryption
                  const { plaintext } = await maybeDecryptNotes(
                    team,
                    r.athleteAttackNotes
                  );
                  return {
                    ...r,
                    athleteAttackNotes: plaintext || r.athleteAttackNotes,
                  };
                }
              } catch {
                // fall through and return original report
              }
              return r;
            })
          );
        }
      } catch {
        finalList = list;
      }

      setReports(finalList);
      await Promise.all([
        hydrateDivisionMap(finalList),
        hydrateWeightsMap(finalList),
      ]);
    } catch {
      toast.error("Error loading scouting reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug || !isUnlocked || !team) return;
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isUnlocked, team]);

  // ---- current user
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        setUser(await res.json());
      } catch {}
    })();
  }, []);

  // ---- members map
  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`, {
          cache: "no-store",
        });
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
              membersMap.get(String(r.athleteId ?? rf.athleteId)) || "Unknown"
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
          r?.weightUnit
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
                  String(weightId).toLowerCase()
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

  const handleDeleteReport = async (report) => {
    if (!window.confirm("This report will be permanently deleted. Continue?"))
      return;
    try {
      const res = await fetch(
        `/api/teams/${slug}/scouting-reports/${report._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      toast.success(data?.message || "Report deleted");
      setReports((prev) => prev.filter((r) => r._id !== report._id));
      setSelectedReport(null);
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Failed to delete report");
    }
  };

  const exportReportsToExcel = () => {
    const dataToExport = tableRows.map((r) => ({
      Type: r.matchType,
      "Report For":
        Array.isArray(r.reportForNamesArr) && r.reportForNamesArr.length
          ? r.reportForNamesArr.join(", ")
          : "—",
      "Athlete First": r.athleteFirstName,
      "Athlete Last": r.athleteLastName,
      "Nat. Rank": r.athleteNationalRank,
      "World Rank": r.athleteWorldRank,
      Club: r.athleteClub,
      Country: r.athleteCountry,
      Division: r.divisionDisplay || "—",
      "Weight Class": r.weightDisplay || "—",
      "Created By": r.createdByName || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `scouting-reports-${slug}.xlsx`
    );
  };

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
      id: "natRank",
      accessorFn: (row) => Number(row?.athleteNationalRank ?? 0),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nat. Rank <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.athleteNationalRank ?? "—",
      meta: { className: "hidden sm:table-cell" },
    },
    {
      id: "worldRank",
      accessorFn: (row) => Number(row?.athleteWorldRank ?? 0),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          World Rank <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.athleteWorldRank ?? "—",
      meta: { className: "hidden sm:table-cell" },
    },
    {
      accessorKey: "athleteCountry",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Country <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: { className: "hidden md:table-cell" },
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
          <div className="flex justify-center gap-3">
            <button
              onClick={async () => {
                let effective = report;

                try {
                  if (report.crypto && report.crypto.ciphertextB64 && team) {
                    const decrypted = await decryptScoutingBody(team, report);
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
                    // Backward compat: old notes-only encryption
                    const { plaintext } = await maybeDecryptNotes(
                      team,
                      report.athleteAttackNotes
                    );
                    effective = {
                      ...report,
                      athleteAttackNotes:
                        plaintext || report.athleteAttackNotes,
                    };
                  }
                } catch {
                  // If decrypt fails, we just fall back to the raw report
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
            <button
              onClick={() => {
                setSelectedReport(report);
                setOpen(true);
              }}
              title="Edit Report"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Edit className="w-5 h-5 text-green-500" />
            </button>
            <button
              onClick={() => handleDeleteReport(report)}
              title="Delete Report"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash className="w-5 h-5 text-red-500" />
            </button>
          </div>
        );
      },
    },
  ];

  if (loading && isUnlocked) {
    return (
      <TeamUnlockGate
        slug={slug}
        team={team}
        onTeamResolved={(resolved) => setTeam((prev) => prev || resolved)}
        onUnlocked={() => setIsUnlocked(true)}
      >
        <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
          <Spinner size={64} />
          <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
            Loading scouting reports…
          </p>
        </div>
      </TeamUnlockGate>
    );
  }

  return (
    <TeamUnlockGate
      slug={slug}
      team={team}
      onTeamResolved={(resolved) => setTeam((prev) => prev || resolved)}
      onUnlocked={() => setIsUnlocked(true)}
    >
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scouting Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create a scouting report to help your athletes prepare for
              upcoming matches.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 sm:justify-end">
            <button
              className="btn-primary px-4 py-2 rounded-md"
              onClick={() => {
                setSelectedReport(null);
                setOpen(true);
              }}
            >
              ➕ Add Scouting Report
            </button>
            <button
              className="btn-secondary px-4 py-2 rounded-md"
              onClick={exportReportsToExcel}
            >
              Export to Excel
            </button>
          </div>
        </div>

        {tableRows.length === 0 ? (
          <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
            No reports yet. Click{" "}
            <span className="font-medium">Add Scouting Report</span> to create
            your first scouting report.
          </div>
        ) : (
          <div className="w-full">
            <ReportDataTable
              columns={columns}
              data={tableRows}
            />
          </div>
        )}

        <ModalLayout
          isOpen={open}
          onClose={() => setOpen(false)}
          title={
            selectedReport ? "Edit Scouting Report" : "Add Scouting Report"
          }
          description="Fill out all scouting details below."
          withCard
        >
          <ScoutingReportForm
            key={selectedReport?._id}
            team={team}
            user={user}
            report={selectedReport}
            setOpen={setOpen}
            onSuccess={fetchReports}
          />
        </ModalLayout>

        {previewOpen && previewPayload && (
          <ModalLayout
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            title={`Scouting Report – ${
              previewPayload.athleteFirstName || ""
            } ${previewPayload.athleteLastName || ""}`}
            description="Review scouting details."
            withCard
            size="xl" // ⬅️ only the preview gets extra-wide
          >
            {console.log("previewPayload ", previewPayload)}
            {previewOpen && previewPayload && (
              <PreviewReportModal
                previewOpen={previewOpen}
                setPreviewOpen={setPreviewOpen}
                report={previewPayload}
                reportType="scouting"
                //divisions={divisions}
              />
            )}
          </ModalLayout>
        )}
      </div>
    </TeamUnlockGate>
  );
};

export default TeamScoutingReportsPage;
