"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, use } from "react";
import { slugToStyleMap } from "@/lib/styleSlugMap";
import { useSearchParams } from "next/navigation";
import { Eye, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";

export default function FamilyMatchReportsPage({ params }) {
  const { username } = use(params);
  const searchParams = useSearchParams();

  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStyle, setSelectedStyle] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");

  const [sortBy, setSortBy] = useState("matchDate");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    const styleSlug = searchParams.get("style");
    if (styleSlug && slugToStyleMap[styleSlug]) {
      setSelectedStyle(slugToStyleMap[styleSlug]);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`/api/family/${username}/match-reports`);
        if (!res.ok) throw new Error("Failed to load match reports");

        const data = await res.json();
        const publicReports = data.reports?.filter((r) => r.isPublic) || [];
        setReports(publicReports);
      } catch (err) {
        console.error("🔴", err);
        setError("Unable to load match reports.");
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchReports();
  }, [username]);

  useEffect(() => {
    let filtered = [...reports];

    if (selectedStyle !== "All") {
      filtered = filtered.filter((r) => r.matchType === selectedStyle);
    }

    if (resultFilter !== "All") {
      filtered = filtered.filter((r) => r.result === resultFilter);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "matchDate") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = aVal?.toString().toLowerCase() || "";
        bVal = bVal?.toString().toLowerCase() || "";
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredReports(filtered);
  }, [reports, selectedStyle, resultFilter, sortBy, sortDirection]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp
        className="inline-block ml-1"
        size={14}
      />
    ) : (
      <ChevronDown
        className="inline-block ml-1"
        size={14}
      />
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-white text-center">
        <p>Loading match reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400 text-center">
        <p>{error}</p>
      </div>
    );
  }

  if (filteredReports.length === 0) {
    return (
      <div className="p-6 text-white text-center">
        <p>
          This family member has no public match reports or none match the
          selected filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Match Reports</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <label className="text-white">
            Filter by Style:
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="ml-2 p-2 border rounded bg-background text-white"
            >
              <option value="All">All</option>
              <option value="Judo">Judo</option>
              <option value="Brazilian Jiu Jitsu">Brazilian Jiu Jitsu</option>
              <option value="Wrestling">Wrestling</option>
            </select>
          </label>
          <label className="text-white">
            Result:
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="ml-2 p-2 border rounded bg-background text-white"
            >
              <option value="All">All</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-md border border-border bg-background">
          <table className="min-w-full divide-y divide-border text-sm md:text-base text-left text-white">
            <thead className="hidden md:table-header-group bg-muted text-muted-foreground uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort("eventName")}
                  className="px-4 py-3 cursor-pointer"
                >
                  Event {renderSortIcon("eventName")}
                </th>
                <th
                  onClick={() => handleSort("opponentName")}
                  className="px-4 py-3 cursor-pointer"
                >
                  Opponent {renderSortIcon("opponentName")}
                </th>
                <th
                  onClick={() => handleSort("result")}
                  className="px-4 py-3 cursor-pointer"
                >
                  Result {renderSortIcon("result")}
                </th>
                <th
                  onClick={() => handleSort("matchDate")}
                  className="px-4 py-3 cursor-pointer"
                >
                  Date {renderSortIcon("matchDate")}
                </th>
                <th
                  onClick={() => handleSort("matchType")}
                  className="px-4 py-3 cursor-pointer"
                >
                  Style {renderSortIcon("matchType")}
                </th>
                <th className="px-4 py-3 text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report._id}
                  className="block md:table-row border-b border-border hover:bg-muted transition-colors"
                >
                  <td className="block md:table-cell px-4 py-3">
                    <span className="md:hidden font-semibold">Event: </span>
                    {report.eventName}
                  </td>
                  <td className="block md:table-cell px-4 py-3">
                    <span className="md:hidden font-semibold">Opponent: </span>
                    {report.opponentName}
                  </td>
                  <td className="block md:table-cell px-4 py-3 font-semibold">
                    <span className="md:hidden font-semibold">Result: </span>
                    {report.result === "Won" ? (
                      <span className="text-green-400">Win</span>
                    ) : (
                      <span className="text-red-400">Loss</span>
                    )}
                  </td>
                  <td className="block md:table-cell px-4 py-3">
                    <span className="md:hidden font-semibold">Date: </span>
                    {report.matchDate
                      ? format(new Date(report.matchDate), "PPP")
                      : "N/A"}
                  </td>
                  <td className="block md:table-cell px-4 py-3">
                    <span className="md:hidden font-semibold">Style: </span>
                    {report.matchType}
                  </td>
                  <td className="block md:table-cell px-4 py-3 text-center">
                    <span className="md:hidden font-semibold">View: </span>
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setOpen(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Preview Report"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {open && selectedReport && (
        <PreviewReportModal
          previewOpen={open}
          setPreviewOpen={setOpen}
          report={selectedReport}
          reportType="match"
        />
      )}
    </>
  );
}
