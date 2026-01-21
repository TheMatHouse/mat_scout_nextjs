"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";

import PreviewReportModal from "@/components/shared/PreviewReportModal";
import ScoutingReportForm from "@/components/teams/forms/ScoutingReportForm";
import ModalLayout from "@/components/shared/ModalLayout";
import Spinner from "@/components/shared/Spinner";
import TeamUnlockGate from "@/components/teams/TeamUnlockGate";
import ScoutingReportCard from "@/components/shared/ScoutingReportCard";

import { decryptScoutingBody } from "@/lib/crypto/teamLock";
import { canView, canEdit, canDelete } from "./logic/roleUtils";

/* ---------------- helpers ---------------- */

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

/* ---------------- main ---------------- */

function TeamScoutingReportsPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);

  const [open, setOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);

  /* ---------------- filters ---------------- */

  const [filterReportFor, setFilterReportFor] = useState("");
  const [filterAthlete, setFilterAthlete] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterWeight, setFilterWeight] = useState("");

  const hasActiveFilters =
    filterReportFor ||
    filterAthlete ||
    filterCountry ||
    filterDivision ||
    filterWeight;

  /* ---------------- pagination ---------------- */

  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------------- fetch + decrypt ---------------- */

  const fetchReports = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/teams/${slug}/scouting-reports?ts=${Date.now()}`
      );
      if (!res.ok) throw new Error();

      const data = await res.json();
      const rawReports = Array.isArray(data.scoutingReports)
        ? data.scoutingReports
        : [];

      const finalReports = [];

      for (const r of rawReports) {
        if (r.athleteFirstName || r.athleteCountry) {
          finalReports.push(r);
          continue;
        }

        try {
          const decrypted = await decryptScoutingBody(team, r);
          finalReports.push({ ...r, ...decrypted });
        } catch {
          finalReports.push(r);
        }
      }

      setReports(finalReports);
    } catch {
      toast.error("Failed to load scouting reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug || !isUnlocked || !team) return;
    fetchReports();
  }, [slug, isUnlocked, team]);

  /* ---------------- user + members ---------------- */

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) setUser(await res.json());
    })();
  }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const res = await fetch(`/api/teams/${slug}/members`);
      const data = await res.json();
      setTeamMembers(Array.isArray(data.members) ? data.members : []);
    })();
  }, [slug]);

  /* ---------------- normalize ---------------- */

  const normalizedReports = useMemo(() => {
    const memberMap = new Map();
    teamMembers.forEach((m) => {
      const id = String(m.userId || m.familyMemberId || "");
      if (id) memberMap.set(id, m.name || m.username || "—");
    });

    return reports.map((r) => {
      const reportForNamesArr = Array.isArray(r.reportFor)
        ? r.reportFor
            .map((rf) => memberMap.get(String(rf.athleteId)))
            .filter(Boolean)
        : [];

      const athleteDisplay = `${r.athleteFirstName || ""} ${
        r.athleteLastName || ""
      }`.trim();

      const countryDisplay = r.athleteCountry || "";

      const weightDisplay = (() => {
        if (!r.weightLabel) return "";
        if (/\bkg\b/i.test(r.weightLabel)) return r.weightLabel;
        return r.weightUnit
          ? `${r.weightLabel} ${r.weightUnit}`
          : r.weightLabel;
      })();

      return {
        ...r,
        reportForNamesArr,
        reportForDisplay: reportForNamesArr.join(", "),
        athleteDisplay,
        countryDisplay,
        divisionDisplay: computeDivisionDisplay(r.division),
        weightDisplay,
      };
    });
  }, [reports, teamMembers]);

  /* ---------------- filter options ---------------- */

  const reportForOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedReports.flatMap((r) => r.reportForNamesArr))
      ),
    [normalizedReports]
  );

  const athleteOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedReports.map((r) => r.athleteDisplay).filter(Boolean))
      ),
    [normalizedReports]
  );

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedReports.map((r) => r.countryDisplay).filter(Boolean))
      ),
    [normalizedReports]
  );

  const divisionOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedReports.map((r) => r.divisionDisplay).filter(Boolean))
      ),
    [normalizedReports]
  );

  const weightOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedReports.map((r) => r.weightDisplay).filter(Boolean))
      ),
    [normalizedReports]
  );

  /* ---------------- filtering ---------------- */

  const filteredReports = useMemo(() => {
    return normalizedReports.filter((r) => {
      if (
        filterAthlete &&
        !r.athleteDisplay.toLowerCase().includes(filterAthlete.toLowerCase())
      )
        return false;

      if (filterReportFor && !r.reportForNamesArr.includes(filterReportFor))
        return false;

      if (filterCountry && r.countryDisplay !== filterCountry) return false;
      if (filterDivision && r.divisionDisplay !== filterDivision) return false;
      if (filterWeight && r.weightDisplay !== filterWeight) return false;

      return true;
    });
  }, [
    normalizedReports,
    filterAthlete,
    filterReportFor,
    filterCountry,
    filterDivision,
    filterWeight,
  ]);

  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);

  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterAthlete,
    filterReportFor,
    filterCountry,
    filterDivision,
    filterWeight,
  ]);

  /* ---------------- loading ---------------- */

  if (loading && isUnlocked) {
    return (
      <TeamUnlockGate
        slug={slug}
        team={team}
        onTeamResolved={(t) => setTeam((p) => p || t)}
        onUnlocked={() => setIsUnlocked(true)}
      >
        <div className="flex justify-center items-center h-[60vh]">
          <Spinner size={64} />
        </div>
      </TeamUnlockGate>
    );
  }

  /* ---------------- render ---------------- */

  return (
    <TeamUnlockGate
      slug={slug}
      team={team}
      onTeamResolved={(t) => setTeam((p) => p || t)}
      onUnlocked={() => setIsUnlocked(true)}
    >
      <div>
        <h1 className="text-2xl font-bold mb-4">Scouting Reports</h1>

        {/* Filters */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <select
            className="w-44 border rounded px-3 py-2"
            value={filterReportFor}
            onChange={(e) => setFilterReportFor(e.target.value)}
          >
            <option value="">Report for</option>
            {reportForOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-44 border rounded px-3 py-2"
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
          >
            <option value="">Athlete</option>
            {athleteOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-40 border rounded px-3 py-2"
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
          >
            <option value="">Country</option>
            {countryOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-48 border rounded px-3 py-2"
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
          >
            <option value="">Division</option>
            {divisionOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          <select
            className="w-36 border rounded px-3 py-2"
            value={filterWeight}
            onChange={(e) => setFilterWeight(e.target.value)}
          >
            <option value="">Weight</option>
            {weightOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterReportFor("");
                setFilterAthlete("");
                setFilterCountry("");
                setFilterDivision("");
                setFilterWeight("");
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedReports.map((r) => (
            <ScoutingReportCard
              key={r._id}
              report={r}
              onView={
                canView(r, team, teamMembers, user)
                  ? () => {
                      setPreviewPayload(r);
                      setPreviewOpen(true);
                    }
                  : null
              }
              onEdit={
                canEdit(r, team, teamMembers, user)
                  ? () => {
                      setSelectedReport(r);
                      setOpen(true);
                    }
                  : null
              }
              onDelete={
                canDelete(r, team, teamMembers, user)
                  ? () => {
                      // handled elsewhere
                    }
                  : null
              }
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </TeamUnlockGate>
  );
}

export default TeamScoutingReportsPage;
