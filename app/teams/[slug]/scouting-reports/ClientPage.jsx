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
import { decryptScoutingBody } from "@/lib/crypto/teamLock";

import {
  getVisibleReports,
  canView,
  canEdit,
  canDelete,
  canCreate,
} from "./logic/roleUtils";

/* -------------------------------------------------------------------------- */
/* SAFE HELPERS */
/* -------------------------------------------------------------------------- */

const genderLabel = (g) => {
  const s = String(g ?? "").toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
};

const computeDivisionDisplay = (division) => {
  if (!division) return "—";
  if (typeof division === "string") return division;
  const name = division?.name || "";
  const g = genderLabel(division?.gender);
  return name ? (g ? `${name} — ${g}` : name) : "—";
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
  if (div._id) return String(div._id);
  if (div.id) return String(div.id);
  return "";
}

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

/* -------------------------------------------------------------------------- */
/* PREVIEW PAYLOAD */
/* -------------------------------------------------------------------------- */

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
  };
};

/* -------------------------------------------------------------------------- */
/* DECRYPT + NORMALIZE REPORTS */
/* -------------------------------------------------------------------------- */

async function normalizeReportsForDisplay(teamForCrypto, reports) {
  if (!Array.isArray(reports)) return [];
  if (!teamForCrypto) return reports;

  const out = [];
  let decryptErrors = 0;

  for (const r of reports) {
    let merged = { ...r };

    try {
      const decrypted = await decryptScoutingBody(teamForCrypto, r);
      merged = {
        ...r,
        ...decrypted,
        athleteAttacks: Array.isArray(decrypted?.athleteAttacks)
          ? decrypted.athleteAttacks
          : [],
        athleteAttackNotes: decrypted?.athleteAttackNotes || "",
      };
    } catch (err) {
      decryptErrors++;
      console.warn("[SCOUTING] decrypt failed", r?._id, err);
    }

    out.push(merged);
  }

  if (decryptErrors > 0) {
    toast.error(
      `Unable to decrypt ${decryptErrors} scouting report${
        decryptErrors === 1 ? "" : "s"
      }.`
    );
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* MAIN PAGE */
/* -------------------------------------------------------------------------- */

function TeamScoutingReportsPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]); // FIXED
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);

  const [membersMap, setMembersMap] = useState(() => new Map());
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [divisionMap, setDivisionMap] = useState({});
  const [weightsMap, setWeightsMap] = useState({});

  /* ------------------------------------------------------------------ */
  /* FETCH REPORTS */
  /* ------------------------------------------------------------------ */

  const fetchReports = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/teams/${slug}/scouting-reports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error("Failed to load scouting reports");

      const data = await res.json();
      const list = Array.isArray(data.scoutingReports)
        ? data.scoutingReports
        : [];

      const finalList = await normalizeReportsForDisplay(team, list);
      setReports(finalList);

      await Promise.all([
        hydrateDivisionMap(finalList),
        hydrateWeightsMap(finalList),
      ]);
    } catch (err) {
      console.error("[SCOUTING] fetchReports", err);
      toast.error("Error loading scouting reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug || !isUnlocked || !team) return;
    fetchReports();
  }, [slug, isUnlocked, team]);

  /* ------------------------------------------------------------------ */
  /* CURRENT USER */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        setUser(await res.json());
      } catch {}
    })();
  }, []);

  /* ------------------------------------------------------------------ */
  /* TEAM MEMBERS — FIXED VERSION */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json.members) ? json.members : [];

        setTeamMembers(list); // <-- MOST IMPORTANT FIX

        const map = new Map();
        list.forEach((m) => {
          const id = String(m.familyMemberId || m.userId || "");
          if (id) map.set(id, m.name || m.username || "Unknown");
        });

        setMembersMap(map);
      } catch (e) {
        console.error(e);
        setTeamMembers([]);
        setMembersMap(new Map());
      }
    })();
  }, [slug]);

  /* ------------------------------------------------------------------ */
  /* HYDRATE DIVISION + WEIGHTS */
  /* ------------------------------------------------------------------ */

  async function hydrateDivisionMap(reportsList) {
    const entries = {};

    (reportsList || []).forEach((r) => {
      const divObj =
        r?.division && typeof r.division === "object" ? r.division : null;
      if (divObj?._id) {
        entries[divObj._id] = computeDivisionDisplay(divObj);
      }
    });

    setDivisionMap((prev) => ({ ...prev, ...entries }));
  }

  async function hydrateWeightsMap(reportsList) {
    const divIds = Array.from(
      new Set(
        (reportsList || [])
          .map((r) => getDivisionId(r?.division))
          .filter(Boolean)
      )
    );

    const entries = {};
    await Promise.all(
      divIds.map(async (id) => {
        const weights = await fetchDivisionWeights(id);
        if (weights) entries[id] = weights;
      })
    );

    setWeightsMap((prev) => ({ ...prev, ...entries }));
  }

  /* ------------------------------------------------------------------ */
  /* TABLE ROWS */
  /* ------------------------------------------------------------------ */

  const tableRows = useMemo(() => {
    if (!team || !user) return [];

    const visible = getVisibleReports(team, teamMembers, user, reports);

    return visible.map((r) => {
      const namesArr =
        Array.isArray(r?.reportFor) && r.reportFor.length
          ? r.reportFor.map(
              (rf) =>
                membersMap.get(String(rf.athleteId)) || r.createdByName || "—"
            )
          : [];

      const divisionId = getDivisionId(r?.division);
      const divisionDisplay =
        divisionMap[divisionId] || computeDivisionDisplay(r?.division);

      let weightDisplay = "—";
      if (r?.weightLabel) {
        weightDisplay = ensureWeightDisplay(r.weightLabel, r?.weightUnit);
      } else if (divisionId && weightsMap[divisionId]) {
        const w = weightsMap[divisionId];
        const item = w.items?.find(
          (it) =>
            String(it._id) === String(r.weightCategory) ||
            String(it.label) === String(r.weightCategory)
        );
        if (item?.label)
          weightDisplay = ensureWeightDisplay(item.label, w.unit);
      }

      return {
        ...r,
        reportForNamesArr: namesArr,
        reportForSort: namesArr.join(" ").toLowerCase(),
        divisionDisplay,
        weightDisplay,
      };
    });
  }, [reports, membersMap, divisionMap, weightsMap, team, user, teamMembers]);

  /* ------------------------------------------------------------------ */
  /* EXPORT EXCEL */
  /* ------------------------------------------------------------------ */

  const exportReportsToExcel = () => {
    const dataToExport = tableRows.map((r) => ({
      Type: r.matchType,
      "Report For": r.reportForNamesArr?.join(", ") || "—",
      "Athlete First": r.athleteFirstName,
      "Athlete Last": r.athleteLastName,
      Club: r.athleteClub,
      Country: r.athleteCountry,
      Division: r.divisionDisplay,
      "Weight Class": r.weightDisplay,
      "Created By": r.createdByName,
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

  /* ------------------------------------------------------------------ */
  /* DELETE REPORT */
  /* ------------------------------------------------------------------ */

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

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Report deleted");
      setReports((prev) => prev.filter((r) => r._id !== report._id));
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  /* ------------------------------------------------------------------ */
  /* TABLE COLUMNS — RESTORED (THIS FIXES YOUR CRASH) */
  /* ------------------------------------------------------------------ */

  const columns = [
    {
      accessorKey: "matchType",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
        >
          Type <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: "reportFor",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
        >
          Report For <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.reportForNamesArr?.length
          ? row.original.reportForNamesArr.map((n, i) => <div key={i}>{n}</div>)
          : "—",
    },
    {
      accessorKey: "athleteFirstName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting()}
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
          onClick={() => column.toggleSorting()}
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
          onClick={() => column.toggleSorting()}
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
          onClick={() => column.toggleSorting()}
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
          onClick={() => column.toggleSorting()}
        >
          Created By <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },

    /* ---------- ACTIONS ---------- */
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const report = row.original;

        return (
          <div className="flex justify-center gap-3">
            {/* VIEW */}
            {canView(report, team, teamMembers, user) && (
              <button
                onClick={() => {
                  setPreviewPayload(buildPreviewPayload(report));
                  setPreviewOpen(true);
                }}
                title="View Details"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700"
              >
                <Eye className="w-5 h-5 text-blue-400 dark:text-white" />
              </button>
            )}

            {/* EDIT */}
            {canEdit(report, team, teamMembers, user) && (
              <button
                onClick={() => {
                  setSelectedReport(report);
                  setOpen(true);
                }}
                title="Edit"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700"
              >
                <Edit className="w-5 h-5 text-green-500" />
              </button>
            )}

            {/* DELETE */}
            {canDelete(report, team, teamMembers, user) && (
              <button
                onClick={() => handleDeleteReport(report)}
                title="Delete"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-700"
              >
                <Trash className="w-5 h-5 text-red-500" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  /* ------------------------------------------------------------------ */
  /* LOADING STATE (AFTER UNLOCK) */
  /* ------------------------------------------------------------------ */

  if (loading && isUnlocked) {
    return (
      <TeamUnlockGate
        slug={slug}
        team={team}
        onTeamResolved={(resolved) => setTeam((prev) => prev || resolved)}
        onUnlocked={() => setIsUnlocked(true)}
      >
        <div className="flex flex-col justify-center items-center h-[70vh]">
          <Spinner size={64} />
          <p className="text-gray-300 mt-3 text-lg">
            Loading scouting reports…
          </p>
        </div>
      </TeamUnlockGate>
    );
  }

  /* ------------------------------------------------------------------ */
  /* MAIN RENDER */
  /* ------------------------------------------------------------------ */

  return (
    <TeamUnlockGate
      slug={slug}
      team={team}
      onTeamResolved={(resolved) => setTeam((prev) => prev || resolved)}
      onUnlocked={() => setIsUnlocked(true)}
    >
      <div>
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Scouting Reports</h1>
            <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
              Manage scouting reports for your team.
            </p>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-3 sm:justify-end">
            {team && user && canCreate(team, teamMembers, user) && (
              <button
                className="bg-ms-blue text-white px-4 py-2 rounded-md"
                onClick={() => {
                  setSelectedReport(null);
                  setOpen(true);
                }}
              >
                ➕ Add Scouting Report
              </button>
            )}

            {tableRows.length > 0 && (
              <button
                className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded-md"
                onClick={exportReportsToExcel}
              >
                Export to Excel
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        {tableRows.length === 0 ? (
          <div className="rounded-md border p-6 text-sm text-gray-800 dark:text-gray-100">
            No visible scouting reports for your role.
          </div>
        ) : (
          <div className="w-full">
            <ReportDataTable
              columns={columns}
              data={tableRows}
            />
          </div>
        )}

        {/* EDIT / CREATE */}
        <ModalLayout
          isOpen={open}
          onClose={() => setOpen(false)}
          title={
            selectedReport ? "Edit Scouting Report" : "Add Scouting Report"
          }
          withCard
        >
          <ScoutingReportForm
            key={selectedReport?._id}
            report={selectedReport}
            team={team}
            user={user}
            setOpen={setOpen}
            onSuccess={fetchReports}
          />
        </ModalLayout>

        {/* PREVIEW */}
        {previewOpen && previewPayload && (
          <ModalLayout
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            title={`Scouting Report – ${
              previewPayload.athleteFirstName || ""
            } ${previewPayload.athleteLastName || ""}`}
            withCard
            size="xl"
          >
            <PreviewReportModal
              previewOpen={previewOpen}
              setPreviewOpen={setPreviewOpen}
              report={previewPayload}
              reportType="scouting"
            />
          </ModalLayout>
        )}
      </div>
    </TeamUnlockGate>
  );
}

export default TeamScoutingReportsPage;
