// components/dashboard/scouting/MyScoutingReportsTab.jsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { ArrowUpDown, Eye, Edit, Trash, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportDataTable } from "@/components/shared/report-data-table";
import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/dashboard/forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";
import MatchReportCard from "@/components/shared/MatchReportCard";

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

/* ---------- helpers ---------- */
function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.userStyles)) return payload.userStyles;
  if (payload && Array.isArray(payload.styles)) return payload.styles;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

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

/* ---------- NEW: Build a primitive-only payload for the preview modal ---------- */
const toSafeStr = (v) => (v == null ? "" : String(v));
const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const buildPreviewPayload = (r) => {
  // division is always turned into a STRING for preview
  const divisionDisplay = computeDivisionDisplay(r?.division);

  // weight snapshot first, with unit if not already in label
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

  // normalize videos with only primitives
  const videos = Array.isArray(r?.videos)
    ? r.videos
        .map((v) =>
          v && typeof v === "object"
            ? {
                title: toSafeStr(v.title || v.videoTitle),
                notes: toSafeStr(v.notes || v.videoNotes),
                url: toSafeStr(v.url || v.videoURL),
                startSeconds: toNonNegInt(v.startSeconds),
              }
            : null
        )
        .filter(Boolean)
    : [];

  // include legacy single-video fields (optional)
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

    // ---- Athlete fields (the ones the modal expects) ----
    athleteFirstName: toSafeStr(r?.athleteFirstName),
    athleteLastName: toSafeStr(r?.athleteLastName),
    athleteCountry: toSafeStr(r?.athleteCountry),
    athleteNationalRank: toSafeStr(r?.athleteNationalRank),
    athleteWorldRank: toSafeStr(r?.athleteWorldRank),
    athleteClub: toSafeStr(r?.athleteClub),
    athleteGrip: toSafeStr(r?.athleteGrip),

    // Keep both of these as strings for display
    divisionDisplay,
    division: divisionDisplay,

    weightDisplay: weightDisplay || "—",
    weightLabel,
    weightUnit,

    // Techniques + notes
    opponentAttacks: Array.isArray(r?.opponentAttacks)
      ? r.opponentAttacks.map(toSafeStr)
      : [],
    athleteAttacks: Array.isArray(r?.athleteAttacks)
      ? r.athleteAttacks.map(toSafeStr)
      : [],
    opponentAttackNotes: toSafeStr(r?.opponentAttackNotes),
    athleteAttackNotes: toSafeStr(r?.athleteAttackNotes),

    // Opponent fields (mostly used by match reports—harmless to include)
    opponentName: toSafeStr(r?.opponentName),
    opponentCountry: toSafeStr(r?.opponentCountry),
    opponentClub: toSafeStr(r?.opponentClub),
    opponentRank: toSafeStr(r?.opponentRank),
    opponentGrip: toSafeStr(r?.opponentGrip),
    myRank: toSafeStr(r?.myRank),

    videos,
    // legacy single-video (modal tolerates absence)
    videoURL: legacyVideoURL,
    videoTitle: legacyVideoTitle,
    videoNotes: legacyVideoNotes,
  };
};

const MyScoutingReportsTab = ({ user }) => {
  const router = useRouter();

  // raw reports (normalized)
  const [scoutingReports, setScoutingReports] = useState([]);
  // pretty division map: { divisionId: "IJF Junior (U21) — Women" }
  const [divisionMap, setDivisionMap] = useState({});

  // per-division weights cache: { divisionId: { unit, items: [{_id,label}] } }
  const [weightsMap, setWeightsMap] = useState({});

  // loading state for the list
  const [reportsLoading, setReportsLoading] = useState(false);

  // modal state
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null); // raw for edit
  const [previewPayload, setPreviewPayload] = useState(null); // sanitized for preview

  // styles for the form
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesForForm, setStylesForForm] = useState([]);

  // techniques for the form
  const [techniquesLoading, setTechniquesLoading] = useState(false);
  const [techniquesForForm, setTechniquesForForm] = useState([]);

  // StrictMode guard so we don't double-fetch in dev
  const didFetchRef = useRef(false);
  // Skip component spinner on first mount (route-level loading.tsx likely shows)
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!user?._id) return;
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchReports({ showSpinner: false }).finally(() => {
      firstLoadRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const fetchReports = async ({ showSpinner = true } = {}) => {
    if (showSpinner) setReportsLoading(true);

    const is24Hex = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

    try {
      const uid = encodeURIComponent(String(user._id));
      const res = await fetch(`/api/dashboard/${uid}/scoutingReports`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (!res.ok)
        throw new Error(
          `Failed to fetch scouting reports (HTTP ${res.status})`
        );

      const raw = await res.json();

      // De-ghost + de-dupe by _id
      const byId = new Map();
      (Array.isArray(raw) ? raw : []).forEach((r) => {
        const id = String(r?._id ?? "");
        if (!is24Hex(id)) return;
        if (byId.has(id)) return;
        byId.set(id, r);
      });

      // Optional: newest first if createdAt exists
      const cleaned = Array.from(byId.values()).sort((a, b) => {
        const ta = Date.parse(a?.createdAt || 0) || 0;
        const tb = Date.parse(b?.createdAt || 0) || 0;
        return tb - ta;
      });

      // Normalize for UI (precompute divisionDisplay as a string)
      const normalized = cleaned.map((r) => {
        const divisionId = r?.division?._id || r?.division || null;
        const divisionName = r?.division?.name || r?.divisionName || "";
        const divisionDisplay = computeDivisionDisplay(r?.division);
        const weightText = r?.weightLabel
          ? `${r.weightLabel}${r?.weightUnit ? ` ${r.weightUnit}` : ""}`
          : "";
        const athleteFullName = [r?.athleteFirstName, r?.athleteLastName]
          .filter(Boolean)
          .join(" ");

        return {
          ...r,
          divisionId,
          divisionName,
          divisionDisplay, // <-- guaranteed string
          weightText,
          athleteFullName,
        };
      });

      setScoutingReports(normalized);

      await Promise.all([
        hydrateDivisionMap(normalized),
        hydrateWeightsMap(normalized),
      ]);
    } catch (err) {
      console.error("[fetchReports] error:", err);
      toast.error("Failed to fetch scouting reports");
    } finally {
      if (showSpinner) setReportsLoading(false);
    }
  };

  const hydrateDivisionMap = async (reports) => {
    const entries = {};
    (reports || []).forEach((r) => {
      const divId = getDivisionId(r?.division);
      const divObj =
        r?.division && typeof r.division === "object" ? r.division : null;
      if (divId && divObj && !entries[divId]) {
        entries[divId] = computeDivisionDisplay(divObj);
      }
    });

    setDivisionMap((prev) => ({ ...prev, ...entries }));

    const styles = Array.from(
      new Set(
        (reports || []).map((r) => (r?.matchType || "").trim()).filter(Boolean)
      )
    );
    if (!styles.length) return;

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
          /* non-fatal */
        }
      })
    );
    if (Object.keys(fetched).length) {
      setDivisionMap((prev) => ({ ...prev, ...fetched }));
    }
  };

  const hydrateWeightsMap = async (reports) => {
    const divIds = Array.from(
      new Set(
        (reports || []).map((r) => getDivisionId(r?.division)).filter(Boolean)
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

  // ===== Styles & Techniques for the form =====
  const loadStylesForModal = useCallback(async () => {
    if (!user?._id) return;
    setStylesLoading(true);
    try {
      if (Array.isArray(user.userStyles) && user.userStyles.length > 0) {
        setStylesForForm(user.userStyles);
        return;
      }
      const res1 = await fetch(`/api/dashboard/${user._id}/userStyles`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      let arr = [];
      if (res1.ok) {
        const data1 = await res1.json();
        arr = extractArray(data1);
      }
      if (!arr.length) {
        const res2 = await fetch(`/api/userStyles`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });
        if (res2.ok) {
          const data2 = await res2.json();
          arr = extractArray(data2);
        }
      }
      if (!arr.length) {
        const res3 = await fetch(`/api/dashboard/${user._id}/styles`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        });
        if (res3.ok) {
          const data3 = await res3.json();
          arr = extractArray(data3);
        }
      }
      setStylesForForm(arr);
    } catch (e) {
      console.error("Failed to load styles:", e);
      setStylesForForm([]);
    } finally {
      setStylesLoading(false);
    }
  }, [user?._id, user?.userStyles]);

  const loadTechniquesForModal = useCallback(async () => {
    setTechniquesLoading(true);
    try {
      const res = await fetch("/api/techniques", {
        headers: { accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });
      let data = [];
      try {
        data = await res.json();
      } catch {
        data = [];
      }
      setTechniquesForForm(extractArray(data));
    } catch (e) {
      console.error("Failed to load techniques:", e);
      setTechniquesForForm([]);
    } finally {
      setTechniquesLoading(false);
    }
  }, []);

  // ----- Delete handler -----
  const handleDeleteReport = async (report) => {
    if (
      !window.confirm("This report will be permanently deleted! Are you sure?")
    )
      return;

    const uid = encodeURIComponent(String(user._id));
    const rid = encodeURIComponent(String(report._id));
    const url = `/api/dashboard/${uid}/scoutingReports/${rid}`;

    try {
      const resp = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
      });

      let data = {};
      try {
        if (resp.headers.get("content-type")?.includes("application/json")) {
          data = await resp.json();
        }
      } catch {}

      if (resp.status === 200) {
        toast.success(data?.message || "Scouting report deleted.");
        setScoutingReports((prev) =>
          prev.filter((r) => String(r._id) !== String(report._id))
        );
        setPreviewPayload(null);
        setSelectedReport(null);
        await fetchReports({ showSpinner: false });
        return;
      }

      if (resp.status === 404) {
        toast.error(data?.message || "Report not found.");
        return;
      }

      if (resp.status === 403) {
        toast.error(data?.message || "Not allowed to delete this report.");
        return;
      }

      toast.error(
        data?.message || `Failed to delete report (HTTP ${resp.status}).`
      );
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Network error while deleting report.");
    }
  };

  // ----- Derive table rows -----
  const tableData = useMemo(() => {
    return (scoutingReports || []).map((r) => {
      // We already computed r.divisionDisplay above, but keep a defensive fallback:
      const divDisplay =
        typeof r.divisionDisplay === "string"
          ? r.divisionDisplay
          : computeDivisionDisplay(r.division);

      let weightDisplay = "—";
      if (r?.weightLabel && String(r.weightLabel).trim()) {
        weightDisplay = ensureWeightDisplay(
          String(r.weightLabel).trim(),
          r?.weightUnit
        );
      } else {
        const divId = getDivisionId(r?.division);
        const w = divId ? weightsMap[divId] : null;
        if (w && Array.isArray(w.items) && r?.weightItemId) {
          const item = w.items.find(
            (it) =>
              String(it._id) === String(r.weightItemId) ||
              String(it.label).toLowerCase() ===
                String(r.weightItemId).toLowerCase()
          );
          if (item?.label) {
            const unit = r?.weightUnit || w.unit || "";
            weightDisplay = ensureWeightDisplay(item.label, unit);
          }
        }
      }

      return { ...r, divisionDisplay: divDisplay, weightDisplay };
    });
  }, [scoutingReports, weightsMap]);

  // ===== Columns =====
  const columns = useMemo(
    () => [
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
      { accessorKey: "athleteFirstName", header: "Athlete First" },
      {
        accessorKey: "athleteLastName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Athlete Last <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "athleteNationalRank", header: "National Rank" },
      { accessorKey: "athleteWorldRank", header: "World Rank" },
      {
        accessorKey: "athleteClub",
        header: "Club",
        meta: { className: "hidden md:table-cell" },
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
        meta: { className: "hidden md:table-cell" },
        sortingFn: (rowA, rowB) =>
          String(rowA.getValue("divisionDisplay")).localeCompare(
            String(rowB.getValue("divisionDisplay")),
            undefined,
            { sensitivity: "base" }
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
        meta: { className: "hidden md:table-cell" },
        sortingFn: (rowA, rowB) =>
          String(rowA.getValue("weightDisplay")).localeCompare(
            String(rowB.getValue("weightDisplay")),
            undefined,
            { numeric: true }
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
                onClick={() => {
                  setPreviewPayload(buildPreviewPayload(report)); // << sanitized
                  setPreviewOpen(true);
                }}
                title="View Details"
                className="icon-btn"
              >
                <Eye className="w-5 h-5 text-blue-500" />
              </button>
              <button
                onClick={async () => {
                  setSelectedReport(report); // raw for edit
                  setOpen(true);
                  await Promise.all([
                    loadStylesForModal(),
                    loadTechniquesForModal(),
                  ]);
                }}
                title="Edit Report"
                className="icon-btn"
              >
                <Edit className="w-5 h-5 text-green-500" />
              </button>
              <button
                onClick={() => handleDeleteReport(report)}
                title="Delete Report"
                className="icon-btn"
              >
                <Trash className="w-5 h-5 text-red-500" />
              </button>
            </div>
          );
        },
      },
    ],
    [loadStylesForModal, loadTechniquesForModal]
  );

  const openingModal = stylesLoading || techniquesLoading;

  // Excel export URL for the signed-in user
  const exportUrl = `/api/records/scouting?download=1`;

  return (
    <>
      {/* Header: title + add (left), export (right) */}
      <div className="mb-6">
        {/* Row 1 — title on left, Add Scouting Report on right */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold">My Scouting Reports</h1>

          <Button
            className="btn btn-primary"
            onClick={async () => {
              setSelectedReport(null);
              setOpen(true);
              await Promise.all([
                loadStylesForModal(),
                loadTechniquesForModal(),
              ]);
            }}
          >
            Add Scouting Report
          </Button>
        </div>

        {/* Row 2 — Export button (right aligned) */}
        <div className="flex justify-end mt-3">
          <Button
            variant="outline"
            onClick={() =>
              window.open(exportUrl, "_blank", "noopener,noreferrer")
            }
            className="flex items-center gap-2"
            title="Export my scouting reports to Excel"
          >
            <FileDown className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={selectedReport ? "Edit Scouting Report" : "Add Scouting Report"}
        description="Fill out all scouting details below."
        withCard={true}
      >
        {openingModal ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={40} />
          </div>
        ) : stylesForForm.length > 0 ? (
          <ScoutingReportForm
            athlete={user}
            styles={stylesForForm}
            techniques={techniquesForForm}
            userType="user"
            report={selectedReport}
            setOpen={setOpen}
            onSuccess={() => fetchReports({ showSpinner: false })}
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-base text-muted-foreground mb-4">
              You must add a style/sport before creating a scouting report.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/styles");
              }}
              className="bg-ms-blue-gray hover:bg-ms-blue text-white"
            >
              Go to Styles
            </Button>
          </div>
        )}
      </ModalLayout>

      {/* Unified loading state */}
      {reportsLoading ? (
        <div className="flex flex-col justify-center items-center h-[40vh]">
          <Spinner size={52} />
          <p className="mt-2 text-base text-muted-foreground">
            Loading scouting reports…
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards — shared MatchReportCard with scouting field mapping */}
          <div className="grid grid-cols-1 sm:hidden gap-4 mb-6">
            {tableData.length > 0 ? (
              tableData.map((report) => {
                const athleteName = [
                  report.athleteFirstName,
                  report.athleteLastName,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <MatchReportCard
                    key={
                      report._id || `${athleteName}-${report.matchDate || ""}`
                    }
                    personLabel="Athlete"
                    match={{
                      _id: report._id,
                      matchType: report.matchType || "",
                      matchDate: report.matchDate || null,
                      opponentName: athleteName || "—",
                      eventName: report.eventName || "",
                      divisionDisplay:
                        typeof report.divisionDisplay === "string"
                          ? report.divisionDisplay
                          : "",
                      weightDisplay: report.weightDisplay || "",
                      method: report.athleteGrip || "",
                      myRank:
                        report.athleteNationalRank ||
                        report.athleteWorldRank ||
                        "",
                      opponentRank: "",
                      result: "",
                      score: "",
                    }}
                    onView={() => {
                      setPreviewPayload(buildPreviewPayload(report));
                      setPreviewOpen(true);
                    }}
                    onEdit={async () => {
                      setSelectedReport(report);
                      setOpen(true);
                      await Promise.all([
                        loadStylesForModal(),
                        loadTechniquesForModal(),
                      ]);
                    }}
                    onDelete={() => handleDeleteReport(report)}
                  />
                );
              })
            ) : (
              <p className="text-gray-400">No scouting reports found.</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[800px]">
              <ReportDataTable
                columns={columns}
                data={tableData}
              />
            </div>
          </div>
        </>
      )}

      {/* Preview modal */}
      {previewOpen && previewPayload && (
        <PreviewReportModal
          previewOpen={previewOpen}
          setPreviewOpen={setPreviewOpen}
          report={previewPayload} // << primitive-only payload
          reportType="scouting"
        />
      )}
    </>
  );
};

export default MyScoutingReportsTab;
