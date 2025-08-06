"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, use } from "react";
import { slugToStyleMap } from "@/lib/styleSlugMap";
import { useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import PreviewReportModal from "@/components/dashboard/PreviewReportModal";

export default function UserMatchReportsPage({ params }) {
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
        const res = await fetch(`/api/users/${username}/match-reports`);
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
        <p>No public match reports found for this user.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Match Reports</h1>

        <div className="mb-4 flex flex-wrap gap-4 items-center text-white">
          <div>
            <label className="mr-2 font-semibold">Filter by Style:</label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="bg-background text-white border border-border rounded px-2 py-1"
            >
              <option value="All">All</option>
              {[...new Set(reports.map((r) => r.matchType))]
                .filter(Boolean)
                .map((style) => (
                  <option
                    key={style}
                    value={style}
                  >
                    {style}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mr-2 font-semibold">Filter by Result:</label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-background text-white border border-border rounded px-2 py-1"
            >
              <option value="All">All</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg shadow-md border border-border bg-background">
          <table className="min-w-full divide-y divide-border text-sm md:text-base text-left text-white">
            <thead className="bg-muted text-muted-foreground uppercase tracking-wider">
              <tr>
                {[
                  { key: "eventName", label: "Event" },
                  { key: "opponentName", label: "Opponent" },
                  { key: "result", label: "Result" },
                  { key: "matchDate", label: "Date" },
                  { key: "matchType", label: "Style" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 cursor-pointer hover:underline"
                    title={`Sort by ${label}`}
                  >
                    {label}
                    {sortBy === key
                      ? sortDirection === "asc"
                        ? " ↑"
                        : " ↓"
                      : " ↕"}
                  </th>
                ))}
                <th className="px-4 py-3 text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report._id}
                  className="border-b border-border hover:bg-muted transition-colors"
                >
                  <td className="px-4 py-3">{report.eventName}</td>
                  <td className="px-4 py-3">{report.opponentName}</td>
                  <td className="px-4 py-3 font-semibold">
                    {report.result === "Won" ? (
                      <span className="text-green-400">Win</span>
                    ) : (
                      <span className="text-red-400">Loss</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {report.matchDate
                      ? format(new Date(report.matchDate), "PPP")
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3">{report.matchType}</td>
                  <td className="px-4 py-3 text-center">
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
